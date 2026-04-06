import React, { memo } from "react";

const ACTION_LABELS = ["UP", "DN", "LT", "RT", "SH", "GB"];
const ACTION_COLORS = ["var(--accent)","var(--accent)","var(--accent)","var(--accent)","var(--orange)","var(--gold)"];

interface Props { qValues: number[]; activeAction: number }

export const QValueBar: React.FC<Props> = memo(({ qValues, activeAction }) => {
  const min   = Math.min(...qValues, -1);
  const max   = Math.max(...qValues,  1);
  const range = max - min || 1;

  return (
    <div className="qbar-wrapper">
      {qValues.map((q, i) => (
        <div key={i} className={`qbar-row ${i === activeAction ? "qbar-active" : ""}`}>
          <span className="qbar-label">{ACTION_LABELS[i]}</span>
          <div className="qbar-track">
            <div className="qbar-fill"
              style={{ 
                width: `${((q - min) / range) * 100}%`, 
                background: ACTION_COLORS[i],
                boxShadow: i === activeAction ? `0 0 10px ${ACTION_COLORS[i]}` : 'none'
              }} 
            />
          </div>
          <span className="qbar-value" style={{ color: i === activeAction ? "var(--text)" : "var(--text2)" }}>
            {q.toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
});