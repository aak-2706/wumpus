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
  Play,
  Download,
  Info
} from "lucide-react";
import type { GameState } from "../types";
import { HelpModal } from "./HelpModal";

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
        <motion.div 
          style={{ position: 'absolute' }}
          initial={{ scale: 0, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          <Disc size={iconMd} color="var(--red)" strokeWidth={3} fill="rgba(255,85,85,0.2)" className="icon-pit" />
        </motion.div>
      )}

      {isWumpus && (
        <motion.div
          initial={{ scale: 0, rotate: -45, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 180, damping: 12 }}
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
        >
          <Trophy size={iconLg} color="var(--gold)" strokeWidth={2.5} />
        </motion.div>
      )}

      {isStart && !isAgent && !isPit && !isWumpus && (
        <motion.div 
          style={{ position: 'absolute' }}
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          transition={{ duration: 0.5 }}
        >
          <Home size={iconSm} className="icon-dim" color="var(--text3)" />
        </motion.div>
      )}

      {isAgent && (
        <motion.div
          layoutId="agent"
          className="agent-bubble"
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
        >
          <motion.div
            animate={{ y: [0, -3, 0] }}
            transition={{ y: { repeat: Infinity, duration: 1.5, ease: "easeInOut" } }}
          >
            <User size={iconLg} color="var(--accent)" strokeWidth={2.5} fill="currentColor" fillOpacity={0.1} className="agent-icon" />
          </motion.div>

          <div className="perception-icons">
            {perceptions.breeze && (
              <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", delay: 0.1 }} className="perception-tag breeze">
                <Wind size={iconPerc} color="var(--accent)" />
              </motion.div>
            )}
            {perceptions.stench && (
              <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", delay: 0.2 }} className="perception-tag stench">
                <Biohazard size={iconPerc} color="var(--orange)" />
              </motion.div>
            )}
            {perceptions.glitter && (
              <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", delay: 0.15 }} className="perception-tag glitter">
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
  onOpenHelp?: () => void;
  totalSteps?: number;
  currentSpeed?: number;
}

function arrEq(a: number[], b: number[]) { return a[0] === b[0] && a[1] === b[1]; }

const EMPTY_PERCEPTIONS = { breeze: false, stench: false, glitter: false };

export const WumpusGrid: React.FC<Props> = ({ state, showStartOverlay, onStart, onOpenHelp, totalSteps = 0, currentSpeed = 800 }) => {
  const { size, agent_pos, pits, wumpus_pos, wumpus_alive, gold_pos, has_gold, perceptions, done } = state;
  const containerRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(88);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showDoneOverlay, setShowDoneOverlay] = useState(false);

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = "http://localhost:8000/download_knowledge";
    link.setAttribute("download", `agent_policy_logic.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (done) {
      // Scale timings based on speed (baseline 800ms)
      const speedFactor = currentSpeed / 800;
      const revealDelay = Math.max(50, 400 * speedFactor);
      const countdownInterval = Math.max(100, 1000 * speedFactor);

      // 1. Wait before showing overlay
      const delayTimer = setTimeout(() => setShowDoneOverlay(true), revealDelay);

      // 2. Start the 3, 2, 1 countdown (skip if extremely fast)
      if (currentSpeed > 100) {
        setCountdown(3);
        const countTimer = setInterval(() => {
          setCountdown((prev) => (prev !== null && prev > 1 ? prev - 1 : 1));
        }, countdownInterval);
        return () => {
          clearTimeout(delayTimer);
          clearInterval(countTimer);
        };
      } else {
        // Fast mode: just show overlay briefly, no text countdown needed
        setCountdown(null);
        return () => clearTimeout(delayTimer);
      }
    } else {
      setShowDoneOverlay(false);
      setCountdown(null);
    }
  }, [done, currentSpeed]);
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
                {totalSteps > 0 ? <>Simulation<br />Paused</> : <>System<br />Ready</>}
              </div>
              <div className="overlay-subtitle">
                {totalSteps > 0
                  ? <>{totalSteps} steps completed.<br />Neural link active.</>
                  : <>Agent online.<br />Awaiting command.</>}
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

              {showStartOverlay && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  whileHover={{ scale: 1.05, background: "rgba(0, 229, 255, 0.1)" }}
                  whileTap={{ scale: 0.95 }}
                  className="btn"
                  style={{
                    marginTop: '12px',
                    background: 'transparent',
                    border: '1px solid var(--accent)',
                    color: 'var(--accent)',
                    padding: '10px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                  onClick={onOpenHelp}
                >
                  <Info size={18} />
                  <span>Mission Briefing</span>
                </motion.button>
              )}

              {totalSteps > 0 && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  whileHover={{ scale: 1.05, background: "rgba(0, 229, 255, 0.1)" }}
                  whileTap={{ scale: 0.95 }}
                  className="btn"
                  style={{
                    marginTop: '12px',
                    background: 'transparent',
                    border: '1px solid var(--accent)',
                    color: 'var(--accent)',
                    padding: '10px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                  onClick={handleDownload}
                >
                  <Download size={18} />
                  <span>Download Neural Link</span>
                </motion.button>
              )}
            </motion.div>
          )}

          {showDoneOverlay && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`grid-overlay ${state.done_reason === "win" ? "overlay-win" :
                state.done_reason === "exhausted" ? "overlay-warning" : "overlay-loss"
                }`}
            >
              <div className="overlay-title">
                {state.done_reason === "win" && <>Mission<br />Accomplished</>}
                {state.done_reason === "pit" && <>Abyssal<br />Descent</>}
                {state.done_reason === "wumpus" && <>Predator<br />Strike</>}
                {state.done_reason === "exhausted" && <>Battery<br />Depleted</>}
                {!state.done_reason && <>System<br />Failure</>}
              </div>
              <div className="overlay-subtitle">
                {state.done_reason === "win" && <>Target retrieved.<br />Extraction successful.</>}
                {state.done_reason === "pit" && <>Agent fell into a pit.<br />Signal lost in the depths.</>}
                {state.done_reason === "wumpus" && <>Agent was eaten by Wumpus.<br />Vital signs flatlined.</>}
                {state.done_reason === "exhausted" && <>Max steps reached.<br />Emergency shutdown initiated.</>}
                {!state.done_reason && <>An unknown error occurred.<br />Re-initializing link...</>}
              </div>

              {countdown !== null && (
                <div style={{
                  marginTop: '20px',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '12px',
                  color: 'rgba(255,255,255,0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{
                    width: '32px', height: '32px',
                    borderRadius: '50%',
                    border: '2px solid currentColor',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: state.done_reason === "win" ? 'var(--gold)' : (state.done_reason === "exhausted" ? 'var(--orange)' : 'var(--red)')
                  }}>
                    {countdown}
                  </div>
                  <span style={{ letterSpacing: '2px', textTransform: 'uppercase' }}>
                    {state.done_reason === "win" ? "Next Mission in..." : "Retrying in..."}
                  </span>
                </div>
              )}
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
