import React from "react";
import type { LogEntry } from "../types";

interface Props { entries: LogEntry[] }

const rewardColor = (r: number) => {
  if (r >= 100) return "#ffd700";
  if (r > 0)    return "#4ade80";
  if (r <= -100) return "#f87171";
  if (r < -5)   return "#fb923c";
  return "#94a3b8";
};

const ACTION_EMOJI: Record<string, string> = {
  MOVE_UP:"↑", MOVE_DOWN:"↓", MOVE_LEFT:"←", MOVE_RIGHT:"→", SHOOT:"🏹", GRAB:"🤲",
};

export const ActionLog: React.FC<Props> = ({ entries }) => (
  <div className="action-log">
    {entries.length === 0 && <div className="log-empty">Agent actions will appear here...</div>}
    {entries.map((e) => (
      <div key={e.id} className="log-entry">
        <span className="log-ep">E{e.episode}</span>
        <span className="log-pos">({e.pos[0]},{e.pos[1]})</span>
        <span className="log-action">{ACTION_EMOJI[e.action]} {e.action}</span>
        <span className="log-reward" style={{ color: rewardColor(e.reward) }}>
          {e.reward > 0 ? "+" : ""}{e.reward}
        </span>
      </div>
    ))}
  </div>
);