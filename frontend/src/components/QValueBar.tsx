import React from "react";

const ACTION_LABELS = ["↑ UP", "↓ DN", "← LT", "→ RT", "🏹 SH", "🤲 GB"];
const ACTION_COLORS = ["#00d4ff","#00d4ff","#00d4ff","#00d4ff","#ff6b35","#ffd700"];

interface Props { qValues: number[]; activeAction: number }

export const QValueBar: React.FC<Props> = ({ qValues, activeAction }) => {
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
              style={{ width: `${((q - min) / range) * 100}%`, background: ACTION_COLORS[i] }} />
          </div>
          <span className="qbar-value">{q.toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
};