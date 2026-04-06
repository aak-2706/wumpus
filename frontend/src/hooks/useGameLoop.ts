import { useState, useRef, useCallback } from "react";
import type { StepResponse, StatsResponse, LogEntry, GameState } from "../types";
import { resetGame, stepGame, getStats, explainDecision, summarizeEpisode, fullReset } from "../api/client";
const MAX_STEPS_PER_EPISODE = 60;
const EXPLAIN_EVERY_N = 5;

export function useGameLoop() {
  const [gameState, setGameState]       = useState<GameState | null>(null);
  const [stats, setStats]               = useState<StatsResponse | null>(null);
  const [log, setLog]                   = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning]       = useState(false);
  const [speed, setSpeed]               = useState(500); // 1x Speed Default
  const [lastStep, setLastStep]         = useState<StepResponse | null>(null);
  const [aiNarration, setAiNarration]   = useState("");
  const [episodeSummary, setEpisodeSummary] = useState("");

  const runningRef      = useRef(false);
  const stepCountRef    = useRef(0);
  const logIdRef        = useRef(0);
  const episodeStepsRef = useRef(0);

  const addLog = useCallback((entry: Omit<LogEntry, "id" | "timestamp">) => {
    setLog((prev) => [
      { ...entry, id: logIdRef.current++, timestamp: Date.now() },
      ...prev,
    ].slice(0, 80));
  }, []);

  const doReset = useCallback(async () => {
    const data = await resetGame();
    setGameState(data.state);
    episodeStepsRef.current = 0;
  }, []);

  const doStep = useCallback(async () => {
    const data = await stepGame();
    setLastStep(data);
    setGameState(data.state);
    episodeStepsRef.current += 1;
    stepCountRef.current    += 1;

    addLog({ episode: data.episode, action: data.action_name,
             reward: data.reward, pos: [data.state.agent_pos[0], data.state.agent_pos[1]] });

    if (stepCountRef.current % EXPLAIN_EVERY_N === 0) {
      explainDecision({
        state: data.state, action_name: data.action_name,
        reward: data.reward, q_values: data.q_values,
        episode: data.episode, total_reward: data.total_reward,
      }).then((r) => setAiNarration(r.explanation));
    }

    if (data.done || episodeStepsRef.current >= MAX_STEPS_PER_EPISODE) {
      summarizeEpisode({
        episode: data.episode, total_reward: data.total_reward,
        steps: episodeStepsRef.current, won: data.state.has_gold, epsilon: data.epsilon,
      }).then((r) => setEpisodeSummary(r.summary));
      getStats().then(setStats);
      await new Promise((r) => setTimeout(r, 800));
      await doReset();
    }
  }, [addLog, doReset]);

  const runLoop = useCallback(async () => {
    await doReset();
    while (runningRef.current) {
      await doStep();
      await new Promise((r) => setTimeout(r, speed));
      if (stepCountRef.current % 10 === 0) getStats().then(setStats);
    }
  }, [doReset, doStep, speed]);

  const start = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setIsRunning(true);
    runLoop();
  }, [runLoop]);

  const stop = useCallback(() => {
    runningRef.current = false;
    setIsRunning(false);
  }, []);

  const reset = useCallback(async () => {
    stop();
    const data = await fullReset();   // ← was doReset()
    setGameState(data.state);
    setLog([]);
    setLastStep(null);
    setAiNarration("");
    setEpisodeSummary("");
    stepCountRef.current    = 0;
    episodeStepsRef.current = 0;
  }, [stop]);

  return { gameState, stats, log, isRunning, speed, setSpeed,
           lastStep, aiNarration, episodeSummary, start, stop, reset };
}