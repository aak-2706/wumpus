from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from google import genai
import os
from dotenv import load_dotenv

from wumpus_env import WumpusEnv
from q_agent import QLearningAgent

load_dotenv()

app = FastAPI(title="Wumpus RL API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

env   = WumpusEnv(size=4)
agent = QLearningAgent(state_size=env.state_size, action_size=env.action_size)
client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))


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

class ResetResponse(BaseModel):
    state: dict
    episode: int
    message: str


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "Wumpus RL API running"}

@app.post("/reset", response_model=ResetResponse)
def reset_game():
    env.reset()
    agent.new_episode()
    return ResetResponse(state=env.get_state_dict(), episode=agent.episode, message="Reset OK")

@app.post("/step", response_model=StepResponse)
def step_game():
    if env.done:
        raise HTTPException(status_code=400, detail="Episode done. Call /reset first.")
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
    }

@app.post("/explain")
async def explain_decision(req: ExplainRequest):
    if not os.getenv("GOOGLE_API_KEY"):
        return {"explanation": "Set GOOGLE_API_KEY in .env to enable AI explanations."}

    pos = req.state.get("agent_pos", [0, 0])
    perceptions = req.state.get("perceptions", {})

    prompt = f"""You are explaining a Q-learning agent's decision in Wumpus World.
Position: row={pos[0]}, col={pos[1]}
Perceptions: {perceptions}
Action chosen: {req.action_name}
Reward received: {req.reward}
Q-values for actions {env.ACTION_NAMES}: {dict(zip(env.ACTION_NAMES, req.q_values))}
Episode: {req.episode} | Total reward so far: {req.total_reward}

In 2-3 short sentences, explain WHY the agent chose this action. Be educational and concise."""

    try:
        response = client.models.generate_content(
            model='gemini-3.1-flash-lite-preview',
            contents=prompt
        )
        return {"explanation": response.text}

    except Exception as e:
        return {"explanation": f"Gemini unavailable: {e}"}

@app.post("/summarize_episode")
async def summarize_episode(req: EpisodeSummaryRequest):
    if not os.getenv("GOOGLE_API_KEY"):
        return {"summary": f"Episode {req.episode} done. Reward: {req.total_reward:.1f}"}

    outcome = "found the gold and won" if req.won else "died or ran out of moves"

    prompt = f"""Narrate this Wumpus World RL episode in 2 sentences (casual, educational):
Episode {req.episode}: Agent {outcome}. Reward: {req.total_reward:.1f}, Steps: {req.steps}, Epsilon: {req.epsilon:.3f}.
What does this mean for the agent's learning progress?"""

    try:
        response = client.models.generate_content(
            model='gemini-3.1-flash-lite-preview',
            contents=prompt
        )
        return {"summary": response.text}

    except Exception as e:
        return {"summary": f"Gemini unavailable: {e}"}
