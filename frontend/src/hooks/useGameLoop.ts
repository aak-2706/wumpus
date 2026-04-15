import { useState, useRef, useCallback, useEffect } from "react";
import type { StepResponse, StatsResponse, LogEntry, GameState } from "../types";
import { wsClient } from "../api/client";
/**
 * Main game loop hook to manage Wumpus World state, statistics, and AI interactions.
 * Connects to the backend via WebSocket and provides methods to control the simulation.
 * 
 * @returns {Object} Game state, controls, and AI-generated narration/summaries.
 */
export function useGameLoop() {
  const [gameState, setGameState]       = useState<GameState | null>(null);
  const [stats, setStats]               = useState<StatsResponse | null>(null);
  const [log, setLog]                   = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning]       = useState(false);
  const [speed, setSpeed]               = useState(800); // 1x Speed Default (Slower)
  const [lastStep, setLastStep]         = useState<StepResponse | null>(null);
  const [aiNarration, setAiNarration]   = useState("");
  const [episodeSummary, setEpisodeSummary] = useState("");
  const [visibilityMode, setVisibilityMode] = useState<"full" | "agent">("full");
  const [visitedCells, setVisitedCells] = useState<Set<string>>(new Set(["0,0"]));

  const logIdRef = useRef(0);

  const addLog = useCallback((entry: Omit<LogEntry, "id" | "timestamp">) => {
    setLog((prev) => [
      { ...entry, id: logIdRef.current++, timestamp: Date.now() },
      ...prev,
    ].slice(0, 80));
    
    // Track visited cells
    setVisitedCells(prev => {
      const next = new Set(prev);
      next.add(`${entry.pos[0]},${entry.pos[1]}`);
      return next;
    });
  }, []);

  useEffect(() => {
    wsClient.connect();
    const unsub = wsClient.onMessage((msg) => {
      switch (msg.type) {
        case "step": {
          const data = msg.data as StepResponse;
          // Batch updates to reduce re-renders
          setLastStep(data);
          setGameState(data.state);
          
          setLog((prev) => [
            { 
              episode: data.episode, 
              action: data.action_name,
              reward: data.reward, 
              pos: [data.state.agent_pos[0], data.state.agent_pos[1]],
              id: logIdRef.current++, 
              timestamp: Date.now() 
            },
            ...prev,
          ].slice(0, 80));
          
          setVisitedCells(prev => {
            const next = new Set(prev);
            next.add(`${data.state.agent_pos[0]},${data.state.agent_pos[1]}`);
            return next;
          });
          break;
        }
        case "stats":
          setStats(msg.data);
          break;
        case "explain":
          setAiNarration(msg.data);
          break;
        case "summary":
          setEpisodeSummary(msg.data);
          break;
        case "reset": {
          setGameState(msg.data.state);
          setVisitedCells(new Set(["0,0"]));
          break;
        }
        case "full_reset":
          setGameState(msg.data.state);
          setLog([]);
          setLastStep(null);
          setAiNarration("");
          setEpisodeSummary("");
          setVisitedCells(new Set(["0,0"]));
          break;
      }
    });
    return unsub;
  }, [addLog]);

  const start = useCallback(() => {
    setIsRunning(true);
    wsClient.sendCommand({ command: "start", speed });
  }, [speed]);

  const init = useCallback(async () => {
    try {
      const res = await fetch("http://localhost:8000/reset", { method: "POST" });
      const data = await res.json();
      setGameState(data.state);
      setVisitedCells(new Set(["0,0"]));
    } catch (err) {
      console.error("Initialization failed:", err);
    }
  }, []);

  const stop = useCallback(() => {
    setIsRunning(false);
    wsClient.sendCommand({ command: "stop" });
  }, []);

  const reset = useCallback(async () => {
    stop();
    try {
      await fetch("http://localhost:8000/full_reset", { method: "POST" });
      window.location.reload();
    } catch (err) {
      console.error("Reset failed:", err);
      // Fallback to reload anyway
      window.location.reload();
    }
  }, [stop]);

  const updateSpeed = useCallback((newSpeed: number) => {
    setSpeed(newSpeed);
    wsClient.sendCommand({ command: "set_speed", speed: newSpeed });
  }, []);

  const setAiEnabled = useCallback((enabled: boolean) => {
    wsClient.sendCommand({ command: "toggle_ai", enabled });
  }, []);

  const toggleVisibility = useCallback(() => {
    setVisibilityMode(prev => prev === "full" ? "agent" : "full");
  }, []);

  return { 
    gameState, stats, log, isRunning, speed, setSpeed: updateSpeed,
    lastStep, aiNarration, episodeSummary, start, stop, reset, setAiEnabled, init,
    visibilityMode, toggleVisibility, visitedCells
  };
}
