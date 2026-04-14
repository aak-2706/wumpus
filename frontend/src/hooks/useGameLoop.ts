import { useState, useRef, useCallback, useEffect } from "react";
import type { StepResponse, StatsResponse, LogEntry, GameState } from "../types";
import { wsClient } from "../api/client";

export function useGameLoop() {
  const [gameState, setGameState]       = useState<GameState | null>(null);
  const [stats, setStats]               = useState<StatsResponse | null>(null);
  const [log, setLog]                   = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning]       = useState(false);
  const [speed, setSpeed]               = useState(500); // 1x Speed Default
  const [lastStep, setLastStep]         = useState<StepResponse | null>(null);
  const [aiNarration, setAiNarration]   = useState("");
  const [episodeSummary, setEpisodeSummary] = useState("");

  const logIdRef = useRef(0);

  const addLog = useCallback((entry: Omit<LogEntry, "id" | "timestamp">) => {
    setLog((prev) => [
      { ...entry, id: logIdRef.current++, timestamp: Date.now() },
      ...prev,
    ].slice(0, 80));
  }, []);

  useEffect(() => {
    wsClient.connect();
    const unsub = wsClient.onMessage((msg) => {
      switch (msg.type) {
        case "step": {
          const data = msg.data as StepResponse;
          setLastStep(data);
          setGameState(data.state);
          addLog({ 
            episode: data.episode, action: data.action_name,
            reward: data.reward, pos: [data.state.agent_pos[0], data.state.agent_pos[1]] 
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
          break;
        }
        case "full_reset":
          setGameState(msg.data.state);
          setLog([]);
          setLastStep(null);
          setAiNarration("");
          setEpisodeSummary("");
          break;
      }
    });
    return unsub;
  }, [addLog]);

  const start = useCallback(() => {
    setIsRunning(true);
    wsClient.sendCommand({ command: "start", speed });
  }, [speed]);

  const stop = useCallback(() => {
    setIsRunning(false);
    wsClient.sendCommand({ command: "stop" });
  }, []);

  const reset = useCallback(() => {
    stop();
    wsClient.sendCommand({ command: "reset" });
  }, [stop]);

  const updateSpeed = useCallback((newSpeed: number) => {
    setSpeed(newSpeed);
    wsClient.sendCommand({ command: "set_speed", speed: newSpeed });
  }, []);

  return { 
    gameState, stats, log, isRunning, speed, setSpeed: updateSpeed,
    lastStep, aiNarration, episodeSummary, start, stop, reset 
  };
}
