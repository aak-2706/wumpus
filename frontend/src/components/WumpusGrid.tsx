import React, { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Ghost,
  Trophy,
  Disc,
  Wind,
  Biohazard,
  Sparkles,
  User,
  Home,
  Play
} from "lucide-react";
import type { GameState } from "../types";

interface CellProps {
  row: number;
  col: number;
  cellSize: number;
  isAgent: boolean;
  isPit: boolean;
  isWumpus: boolean;
  isGold: boolean;
  isStart: boolean;
  perceptions: { breeze: boolean; stench: boolean; glitter: boolean };
}

const GridCell = React.memo(({
  row, col, cellSize, isAgent, isPit, isWumpus, isGold, isStart, perceptions
}: CellProps) => {
  let cellClass = "cell";
  if (isPit) cellClass += " cell-pit";
  else if (isWumpus) cellClass += " cell-wumpus";
  else if (isStart) cellClass += " cell-start";
  else cellClass += " cell-empty";

  const iconLg = Math.round(cellSize * 0.40);
  const iconMd = Math.round(cellSize * 0.36);
  const iconSm = Math.round(cellSize * 0.27);
  const iconPerc = Math.max(10, Math.round(cellSize * 0.16));

  return (
    <div className={cellClass} style={{ width: cellSize, height: cellSize }}>
      <span className="cell-coord">{row},{col}</span>

      {isPit && (
        <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200, damping: 15 }} data-tooltip="Pit (Deadly Trap)">
          <Disc size={iconMd} color="var(--red)" strokeWidth={3} fill="rgba(255,85,85,0.2)" className="icon-pit" />
        </motion.div>
      )}

      {isWumpus && (
        <motion.div
          initial={{ scale: 0, rotate: -45, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 180, damping: 12 }}
          data-tooltip="Wumpus (Dangerous!)"
        >
          <Ghost size={iconLg} color="var(--orange)" strokeWidth={2.5} className="icon-wumpus" />
        </motion.div>
      )}

      {isGold && (
        <motion.div
          className="icon-gold"
          initial={{ scale: 0 }}
          animate={{ scale: 1, y: [0, -4, 0] }}
          transition={{ scale: { type: "spring" }, y: { repeat: Infinity, duration: 2 } }}
          data-tooltip="Gold (Victory!)"
        >
          <Trophy size={iconLg} color="var(--gold)" strokeWidth={2.5} />
        </motion.div>
      )}

      {isStart && !isAgent && !isPit && !isWumpus && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} data-tooltip="Starting Position">
          <Home size={iconSm} className="icon-dim" color="var(--text3)" />
        </motion.div>
      )}

      {isAgent && (
        <motion.div
          layoutId="agent"
          className="agent-bubble"
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          data-tooltip="Agent (Current Location)"
        >
          <motion.div
            animate={{ y: [0, -3, 0] }}
            transition={{ y: { repeat: Infinity, duration: 1.5, ease: "easeInOut" } }}
          >
            <User size={iconLg} color="var(--accent)" strokeWidth={2.5} fill="currentColor" fillOpacity={0.1} className="agent-icon" />
          </motion.div>

          <div className="perception-icons">
            {perceptions.breeze && (
              <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", delay: 0.1 }} className="perception-tag breeze" data-tooltip="Breeze (Pit nearby)">
                <Wind size={iconPerc} color="var(--accent)" />
              </motion.div>
            )}
            {perceptions.stench && (
              <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", delay: 0.2 }} className="perception-tag stench" data-tooltip="Stench (Wumpus nearby)">
                <Biohazard size={iconPerc} color="var(--orange)" />
              </motion.div>
            )}
            {perceptions.glitter && (
              <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", delay: 0.15 }} className="perception-tag glitter" data-tooltip="Glitter (Gold nearby)">
                <Sparkles size={iconPerc} color="var(--gold)" />
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}, (prev, next) => {
  return prev.cellSize === next.cellSize &&
         prev.isAgent === next.isAgent &&
         prev.isPit === next.isPit &&
         prev.isWumpus === next.isWumpus &&
         prev.isGold === next.isGold &&
         prev.isStart === next.isStart &&
         prev.perceptions.breeze === next.perceptions.breeze &&
         prev.perceptions.stench === next.perceptions.stench &&
         prev.perceptions.glitter === next.perceptions.glitter;
});

interface Props {
  state: GameState;
  showStartOverlay?: boolean;
  onStart?: () => void;
  totalSteps?: number;
}

function arrEq(a: number[], b: number[]) { return a[0] === b[0] && a[1] === b[1]; }

const EMPTY_PERCEPTIONS = { breeze: false, stench: false, glitter: false };

export const WumpusGrid: React.FC<Props> = ({ state, showStartOverlay, onStart, totalSteps = 0 }) => {
  const { size, agent_pos, pits, wumpus_pos, wumpus_alive, gold_pos, has_gold, perceptions, done } = state;
  const containerRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(88);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const gapSize = 8;
      const totalGap = gapSize * (size - 1);
      const cs = Math.floor(Math.min(width - totalGap, height - totalGap) / size);
      setCellSize(Math.max(cs, 36)); // never smaller than 36px
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [size]);

  return (
    <div className="grid-wrapper" ref={containerRef}>
      <div className="wumpus-grid" style={{
        position: 'relative',
        gridTemplateColumns: `repeat(${size}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${size}, ${cellSize}px)`
      }}>

        {/* Overlays */}
        <AnimatePresence>
          {showStartOverlay && !done && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="grid-overlay overlay-ready"
            >
              <div className="overlay-title">
                {totalSteps > 0 ? <>Simulation<br/>Paused</> : <>System<br/>Ready</>}
              </div>
              <div className="overlay-subtitle">
                {totalSteps > 0
                  ? <>{totalSteps} steps completed.<br/>Neural link active.</>
                  : <>Agent online.<br/>Awaiting command.</>}
              </div>

              <motion.button
                whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(0, 229, 255, 0.4)" }}
                whileTap={{ scale: 0.95 }}
                className="btn btn-hero-start"
                onClick={onStart}
              >
                <Play size={20} fill="currentColor" />
                <span>{totalSteps > 0 ? "Resume Mission" : "Initialize Mission"}</span>
              </motion.button>
            </motion.div>
          )}

          {done && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`grid-overlay ${has_gold ? "overlay-win" : "overlay-loss"}`}
            >
              <div className="overlay-title">
                {has_gold ? <>Mission<br/>Accomplished</> : <>System<br/>Failure</>}
              </div>
              <div className="overlay-subtitle">
                {has_gold ? <>Target retrieved.<br/>Extraction successful.</> : <>Agent terminated.<br/>Connection lost.</>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {Array.from({ length: size }).map((_, row) =>
          Array.from({ length: size }).map((_, col) => {
            const isAgent = arrEq(agent_pos, [row, col]);
            const isPit = pits.some((p) => arrEq(p, [row, col]));
            const isWumpus = wumpus_alive && arrEq(wumpus_pos, [row, col]);
            const isGold = !has_gold && arrEq(gold_pos, [row, col]);
            const isStart = row === 0 && col === 0;

            return (
              <GridCell
                key={`${row}-${col}`}
                row={row}
                col={col}
                cellSize={cellSize}
                isAgent={isAgent}
                isPit={isPit}
                isWumpus={isWumpus}
                isGold={isGold}
                isStart={isStart}
                perceptions={isAgent ? perceptions : EMPTY_PERCEPTIONS}
              />
            );
          })
        )}
      </div>
    </div>
  );
};
