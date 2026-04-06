import React, { memo } from "react";
import { 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight, 
  Target, 
  Hand
} from "lucide-react";
import { Skeleton } from "./Skeleton";
import type { LogEntry } from "../types";

interface Props { entries: LogEntry[] }

const rewardColor = (r: number) => {
  if (r >= 100) return "var(--gold)";
  if (r > 0)    return "var(--green)";
  if (r <= -100) return "var(--red)";
  if (r < -5)   return "var(--orange)";
  return "var(--text3)";
};

const ActionIcon = ({ action }: { action: string }) => {
  const size = 12;
  switch (action) {
    case "MOVE_UP":    return <ArrowUp size={size} />;
    case "MOVE_DOWN":  return <ArrowDown size={size} />;
    case "MOVE_LEFT":  return <ArrowLeft size={size} />;
    case "MOVE_RIGHT": return <ArrowRight size={size} />;
    case "SHOOT":      return <Target size={size} />;
    case "GRAB":       return <Hand size={size} />;
    default:           return null;
  }
};

const LogEntryRow = memo(({ e }: { e: LogEntry }) => (
  <div className="log-entry">
    <span className="log-ep">E{e.episode}</span>
    <span className="log-pos">({e.pos[0]},{e.pos[1]})</span>
    <span className="log-action" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <ActionIcon action={e.action} /> {e.action.replace("MOVE_", "")}
    </span>
    <span className="log-reward" style={{ color: rewardColor(e.reward) }}>
      {e.reward > 0 ? "+" : ""}{e.reward}
    </span>
  </div>
));

export const ActionLog: React.FC<Props> = memo(({ entries }) => (
  <div className="action-log">
    {entries.length === 0 && (
      <div style={{ padding: '4px' }}>
        <Skeleton variant="log" rows={12} />
      </div>
    )}
    {entries.map((e) => (
      <LogEntryRow key={e.id} e={e} />
    ))}
  </div>
));