import React from "react";
import type { GameState } from "../types";

interface Props { state: GameState }

function arrEq(a: number[], b: number[]) { return a[0] === b[0] && a[1] === b[1]; }

const CELL = 88;

export const WumpusGrid: React.FC<Props> = ({ state }) => {
  const { size, agent_pos, pits, wumpus_pos, wumpus_alive, gold_pos, has_gold, perceptions } = state;

  return (
    <div className="grid-wrapper">
      <div className="wumpus-grid" style={{ gridTemplateColumns: `repeat(${size}, ${CELL}px)` }}>
        {Array.from({ length: size }).map((_, row) =>
          Array.from({ length: size }).map((_, col) => {
            const isAgent  = arrEq(agent_pos, [row, col]);
            const isPit    = pits.some((p) => arrEq(p, [row, col]));
            const isWumpus = wumpus_alive && arrEq(wumpus_pos, [row, col]);
            const isGold   = !has_gold && arrEq(gold_pos, [row, col]);
            const isStart  = row === 0 && col === 0;

            let cellClass = "cell";
            if (isPit)         cellClass += " cell-pit";
            else if (isWumpus) cellClass += " cell-wumpus";
            else if (isStart)  cellClass += " cell-start";
            else               cellClass += " cell-empty";

            return (
              <div key={`${row}-${col}`} className={cellClass} style={{ width: CELL, height: CELL }}>
                <span className="cell-coord">{row},{col}</span>
                {isPit    && <span className="cell-icon">🕳️</span>}
                {isWumpus && <span className="cell-icon">👹</span>}
                {isGold   && <span className="cell-icon icon-gold">💰</span>}
                {isStart && !isAgent && !isPit && !isWumpus && (
                  <span className="cell-icon icon-dim">🏠</span>
                )}
                {isAgent && (
                  <div className="agent-bubble">
                    <span className="agent-icon">🤖</span>
                    {perceptions.breeze  && <span className="perception-tag breeze">💨</span>}
                    {perceptions.stench  && <span className="perception-tag stench">🌫️</span>}
                    {perceptions.glitter && <span className="perception-tag glitter">✨</span>}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};