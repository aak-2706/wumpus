import type { StepResponse, StatsResponse, GameState } from "../types";

const BASE = "http://localhost:8000";
const WS_BASE = "ws://localhost:8000/ws";

export async function resetGame() {
  const res = await fetch(`${BASE}/reset`, { method: "POST" });
  if (!res.ok) throw new Error("Reset failed");
  return res.json() as Promise<{ state: GameState; episode: number }>;
}

export async function stepGame() {
  const res = await fetch(`${BASE}/step`, { method: "POST" });
  if (!res.ok) throw new Error("Step failed");
  return res.json() as Promise<StepResponse>;
}

export async function getStats() {
  const res = await fetch(`${BASE}/stats`);
  if (!res.ok) throw new Error("Stats failed");
  return res.json() as Promise<StatsResponse>;
}

export async function explainDecision(payload: {
  state: GameState; action_name: string; reward: number;
  q_values: number[]; episode: number; total_reward: number;
}) {
  const res = await fetch(`${BASE}/explain`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json() as Promise<{ explanation: string }>;
}

export async function summarizeEpisode(payload: {
  episode: number; total_reward: number;
  steps: number; won: boolean; epsilon: number;
}) {
  const res = await fetch(`${BASE}/summarize_episode`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json() as Promise<{ summary: string }>;
}

export async function fullReset() {
  const res = await fetch(`${BASE}/full_reset`, { method: "POST" });
  if (!res.ok) throw new Error("Full reset failed");
  return res.json() as Promise<{ state: GameState; episode: number }>;
}

// ── WebSocket Client ──────────────────────────────────────────────────────────

export class WSClient {
  private socket: WebSocket | null = null;
  private listeners: ((msg: any) => void)[] = [];

  connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) return;
    
    this.socket = new WebSocket(WS_BASE);
    this.socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      this.listeners.forEach(l => l(msg));
    };
    this.socket.onclose = () => {
      console.log("WS Disconnected. Reconnecting...");
      setTimeout(() => this.connect(), 2000);
    };
  }

  onMessage(callback: (msg: any) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  sendCommand(cmd: any) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(cmd));
    } else if (this.socket?.readyState !== WebSocket.CONNECTING) {
      this.connect();
      // Wait for open then send? For simplicity, we assume it's open or we try later.
      setTimeout(() => this.sendCommand(cmd), 500);
    }
  }
}

export const wsClient = new WSClient();
