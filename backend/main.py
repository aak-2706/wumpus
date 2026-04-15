import os
import asyncio
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from google import genai

from wumpus_env import WumpusEnv
from q_agent import QLearningAgent
from api_manager import api_manager

app = FastAPI(title="Wumpus RL API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

env   = WumpusEnv(size=4)
agent = QLearningAgent(state_size=env.state_size, action_size=env.action_size)

# ── Schemas ──────────────────────────────────────────────────────────────────

class StepResponse(BaseModel):
    state: dict
    action: int
    action_name: str
    reward: float
    done: bool
    episode: int
    total_steps: int
    epsilon: float
    total_reward: float
    q_values: list[float]

class ExplainRequest(BaseModel):
    state: dict
    action_name: str
    reward: float
    q_values: list[float]
    episode: int
    total_reward: float

class EpisodeSummaryRequest(BaseModel):
    episode: int
    total_reward: float
    steps: int
    won: bool
    epsilon: float
    reason: Optional[str] = None

class ResetResponse(BaseModel):
    state: dict
    episode: int
    message: str


# ── Core Logic Helpers ───────────────────────────────────────────────────────

def perform_step():
    state_key = env.get_state_key()
    action    = agent.choose_action(state_key)
    _, reward, done = env.step(action)
    next_key  = env.get_state_key()
    agent.update(state_key, action, reward, next_key, done)
    agent.total_reward += reward
    agent.step_count   += 1
    q_vals = agent.get_q_values(state_key)
    return StepResponse(
        state=env.get_state_dict(), action=action,
        action_name=env.ACTION_NAMES[action], reward=reward, done=done,
        episode=agent.episode, total_steps=agent.step_count,
        epsilon=round(agent.epsilon, 4), total_reward=round(agent.total_reward, 2),
        q_values=[round(v, 3) for v in q_vals],
    )

def _gen_content(client, **kwargs):
    return client.models.generate_content(**kwargs)

# Simple in-memory cache for explanations to save tokens and time
_explanation_cache = {}

async def get_explanation(step_data: StepResponse):
    if not api_manager.has_keys():
        return "Set GOOGLE_API_KEY in .env to enable AI explanations."
    
    pos = step_data.state.get("agent_pos", [0, 0])
    perceptions = step_data.state.get("perceptions", {})
    
    # Stable cache key: (pos, perceptions, action, reward)
    p_key = tuple(sorted(perceptions.items()))
    cache_key = (tuple(pos), p_key, step_data.action_name, step_data.reward)
    
    if cache_key in _explanation_cache:
        return _explanation_cache[cache_key]

    prompt = f"""Explain a Q-learning agent's decision in Wumpus World.
Position: {pos} | Perceptions: {perceptions}
Action: {step_data.action_name} | Reward: {step_data.reward}
Q-values: {dict(zip(env.ACTION_NAMES, step_data.q_values))}

2 short sentences why it chose this. Educational and concise."""
    try:
        response = await api_manager.call_with_failover(_gen_content, model='gemini-3.1-flash-lite-preview', contents=prompt)
        text = response.text
        # Cap cache size
        if len(_explanation_cache) < 1000:
            _explanation_cache[cache_key] = text
        return text
    except Exception as e:
        msg = str(e).lower()
        if "quota" in msg or "429" in msg:
            return "AI link saturated (429). All API keys hit rate limits. Please slow down."
        if "key" in msg or "401" in msg or "403" in msg:
            return "AI link error: Invalid or restricted API key. Check your configuration."
        return f"AI connection unstable: {e}"

async def get_summary(episode: int, total_reward: float, steps: int, won: bool, epsilon: float, reason: Optional[str] = None):
    if not api_manager.has_keys():
        return f"Episode {episode} done. Reward: {total_reward:.1f}"
    
    if won:
        outcome = "found the gold and won"
    elif reason == "pit":
        outcome = "fell into a pit and died"
    elif reason == "wumpus":
        outcome = "was eaten by the Wumpus"
    elif reason == "exhausted":
        outcome = "ran out of moves (exhaustion)"
    else:
        outcome = "died or ran out of moves"
        
    prompt = f"""Narrate this Wumpus World RL episode in 2 sentences (casual, educational):
Episode {episode}: Agent {outcome}. Reward: {total_reward:.1f}, Steps: {steps}, Epsilon: {epsilon:.3f}.
What does this mean for the agent's learning progress?"""
    try:
        response = await api_manager.call_with_failover(_gen_content, model='gemini-3.1-flash-lite-preview', contents=prompt)
        return response.text
    except Exception as e:
        return f"Gemini unavailable: {e}"


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    """Health check endpoint."""
    return {"status": "Wumpus RL API running"}

@app.post("/reset", response_model=ResetResponse)
def reset_game():
    """Resets the environment for a new episode."""
    env.reset()
    agent.new_episode()
    return ResetResponse(state=env.get_state_dict(), episode=agent.episode, message="Reset OK")

@app.post("/step", response_model=StepResponse)
def step_game():
    """Performs a single step in the environment."""
    if env.done:
        raise HTTPException(status_code=400, detail="Episode done. Call /reset first.")
    return perform_step()

@app.post("/full_reset")
def full_reset():
    global env, agent
    env   = WumpusEnv(size=4)
    agent = QLearningAgent(state_size=env.state_size, action_size=env.action_size)
    obs   = env.reset()
    return {
        "state": env.get_state_dict(),
        "episode": agent.episode,
        "message": "Full reset. Agent and Q-table cleared."
    }

@app.get("/stats")
def get_stats():
    return {
        "episode": agent.episode, "epsilon": round(agent.epsilon, 4),
        "total_steps": agent.step_count,
        "episode_rewards": agent.episode_rewards[-100:],
        "q_table_size": len(agent.q_table),
        "learning_rate": agent.lr, "discount": agent.gamma,
        "has_api_key": api_manager.has_keys(),
    }

@app.get("/download_knowledge", response_class=PlainTextResponse)
def download_knowledge():
    """Converts the Q-table into Predicate Logic implications."""
    lines = ["% Wumpus World - Agent Knowledge Representation (Trained Policy)",
             "% format: at(Row, Col) ∧ arrow(X) ∧ wumpus(S) ∧ [Breeze, Stench, Glitter] ⇒ action(A)", ""]
    
    actions = env.ACTION_NAMES
    
    # Sort keys for a cleaner output
    sorted_states = sorted(agent.q_table.keys())
    
    for state_key in sorted_states:
        q_values = agent.q_table[state_key]
        if all(v == 0.0 for v in q_values):
            continue
            
        parts = state_key.split("_")
        if len(parts) < 7: continue
        
        r, c, arrow, wumpus, b, s, g = parts
        best_idx = q_values.index(max(q_values))
        best_action = actions[best_idx]
        
        # Build logical predicate
        at      = f"at({r},{c})"
        has_arr = f"arrow({arrow})"
        w_alive = f"wumpus({'alive' if wumpus=='1' else 'dead'})"
        percept = []
        if b == '1': percept.append("breeze")
        if s == '1': percept.append("stench")
        if g == '1': percept.append("glitter")
        
        percept_str = " ∧ ".join(percept) if percept else "clear"
        logic_str = f"{at} ∧ {has_arr} ∧ {w_alive} ∧ {percept_str} ⇒ action({best_action})"
        lines.append(logic_str)
        
    if len(lines) <= 3:
        lines.append("% No knowledge learned yet. Episode history empty.")
        
    return "\n".join(lines)

@app.post("/explain")
async def explain_decision(req: ExplainRequest):
    step_data = StepResponse(
        state=req.state, action=0, action_name=req.action_name,
        reward=req.reward, done=False, episode=req.episode,
        total_steps=0, epsilon=0, total_reward=req.total_reward,
        q_values=req.q_values
    )
    explanation = await get_explanation(step_data)
    return {"explanation": explanation}

@app.post("/summarize_episode")
async def summarize_episode_route(req: EpisodeSummaryRequest):
    summary = await get_summary(req.episode, req.total_reward, req.steps, req.won, req.epsilon, req.reason)
    return {"summary": summary}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    state = {"running": False, "speed": 0.8, "episode_steps": 0, "ai_enabled": False}
    MAX_STEPS_PER_EPISODE = 60
    EXPLAIN_EVERY_N = 5

    async def game_loop():
        try:
            while True:
                if state["running"]:
                    if env.done or state["episode_steps"] >= MAX_STEPS_PER_EPISODE:
                        if not env.done:
                            env.done = True
                            env.done_reason = "exhausted"
                            # Send final state so frontend sees it's done
                            await websocket.send_json({
                                "type": "step", 
                                "data": {
                                    "state": env.get_state_dict(),
                                    "action": -1,
                                    "action_name": "NONE",
                                    "reward": 0,
                                    "done": True,
                                    "episode": agent.episode,
                                    "total_steps": agent.step_count,
                                    "epsilon": agent.epsilon,
                                    "total_reward": agent.total_reward,
                                    "q_values": [0] * env.action_size
                                }
                            })
                        
                        # Episode End - Start summary task but don't block the loop logic
                        if state["ai_enabled"]:
                            async def handle_summary(ep, reward, steps, won, eps, reason):
                                try:
                                    summary = await get_summary(ep, reward, steps, won, eps, reason)
                                    await websocket.send_json({"type": "summary", "data": summary})
                                except Exception:
                                    pass # WebSocket might be closed

                            asyncio.create_task(handle_summary(
                                agent.episode, agent.total_reward, state["episode_steps"],
                                env.has_gold, agent.epsilon, env.done_reason
                            ))
                        
                        # Stats update
                        stats = get_stats()
                        await websocket.send_json({"type": "stats", "data": stats})
                        
                        # Dynamic wait: Scale 3.0s base wait by (current_speed / 0.8s baseline)
                        # Min wait 1.5s, Max wait 4.0s
                        wait_time = max(1.5, min(4.0, 3.0 * (state["speed"] / 0.8)))
                        await asyncio.sleep(wait_time)
                        
                        # Reset for next episode
                        env.reset()
                        agent.new_episode()
                        state["episode_steps"] = 0
                        await websocket.send_json({
                            "type": "reset", 
                            "data": {"state": env.get_state_dict(), "episode": agent.episode}
                        })
                    else:
                        # Perform Step
                        step_data = perform_step()
                        state["episode_steps"] += 1
                        await websocket.send_json({"type": "step", "data": step_data.model_dump()})

                        # Periodic Stats
                        if agent.step_count % 10 == 0:
                            await websocket.send_json({"type": "stats", "data": get_stats()})
                        
                        # AI Explanation - Non-blocking
                        if state["ai_enabled"] and agent.step_count % EXPLAIN_EVERY_N == 0:
                            async def handle_explanation(data):
                                try:
                                    explanation = await get_explanation(data)
                                    await websocket.send_json({"type": "explain", "data": explanation})
                                except Exception:
                                    pass # WebSocket might be closed
                            asyncio.create_task(handle_explanation(step_data))
                    
                        await asyncio.sleep(state["speed"])
                else:
                    await asyncio.sleep(0.1)
        except Exception as e:
            print(f"Loop error: {e}")

    # Start the background loop task
    loop_task = asyncio.create_task(game_loop())

    try:
        while True:
            data = await websocket.receive_json()
            cmd = data.get("command")
            
            if cmd == "start":
                state["running"] = True
                if "speed" in data:
                    state["speed"] = data["speed"] / 1000.0
            elif cmd == "stop":
                state["running"] = False
            elif cmd == "set_speed":
                state["speed"] = data["speed"] / 1000.0
            elif cmd == "toggle_ai":
                state["ai_enabled"] = data.get("enabled", False)
            elif cmd == "reset":
                state["running"] = False
                # Full reset logic
                global env, agent
                env = WumpusEnv(size=4)
                agent = QLearningAgent(state_size=env.state_size, action_size=env.action_size)
                env.reset()
                state["episode_steps"] = 0
                await websocket.send_json({
                    "type": "full_reset", 
                    "data": {"state": env.get_state_dict(), "episode": agent.episode}
                })
                
    except WebSocketDisconnect:
        loop_task.cancel()
    except Exception as e:
        print(f"WS error: {e}")
        loop_task.cancel()
