import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Target,
  Database,
  Play,
  Square,
  RotateCcw,
  MapPin,
  Info
} from "lucide-react";
import { WumpusGrid } from "./components/WumpusGrid";
import { RewardChart } from "./components/RewardChart";
import { QValueBar } from "./components/QValueBar";
import { ActionLog } from "./components/ActionLog";
import { Skeleton } from "./components/Skeleton";
import { useGameLoop } from "./hooks/useGameLoop";
import "./App.css";

const SPEEDS = [
  { label: "0.5×", ms: 1000 }, { label: "1×", ms: 500 },
  { label: "2×", ms: 250 }, { label: "4×", ms: 100 }, { label: "Max", ms: 20 },
];

const EMPTY_ARRAY: number[] = [];

export default function App() {
  const { gameState, stats, log, isRunning, speed, setSpeed,
    lastStep, aiNarration, episodeSummary, start, stop, reset } = useGameLoop();

  const epsilon = lastStep?.epsilon ?? stats?.epsilon ?? 1;
  const episode = lastStep?.episode ?? stats?.episode ?? 0;
  const totalSteps = lastStep?.total_steps ?? stats?.total_steps ?? 0;
  const qTableSize = stats?.q_table_size ?? 0;

  return (
    <div className="app">

      <main className="app-main">

        {/* ── Col 1: Grid ── */}
        <section className="col-grid">
          <div className="panel panel-grid">
            <div className="panel-title">
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={14} /> Wumpus<br/>World
              </span>
              <div className="controls" style={{ margin: 0 }}>
                {isRunning && (
                  <button
                    className="btn btn-stop"
                    onClick={stop}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Square size={16} fill="currentColor" /> Stop
                  </button>
                )}
                
                {/* Only show Reset/Speed if simulation has started or is running */}
                {(totalSteps > 0 || isRunning) && (
                  <>
                    <button
                      className="btn btn-reset"
                      onClick={reset}
                      disabled={isRunning}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <RotateCcw size={16} />
                      Reset
                    </button>
                    <div className="speed-group" style={{ marginLeft: '4px' }}>
                      {SPEEDS.map((s) => (
                        <button
                          key={s.ms}
                          className={`speed-btn ${speed === s.ms ? "speed-active" : ""}`}
                          onClick={() => setSpeed(s.ms)}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
            {gameState
              ? <WumpusGrid
                state={gameState}
                showStartOverlay={!isRunning && !gameState.done}
                totalSteps={totalSteps}
                onStart={start}
              />
              : <div className="loading-grid" style={{ position: 'relative' }}>
                  <Skeleton variant="grid" style={{ maxWidth: '400px', aspectRatio: '1/1', opacity: 0.4 }} />
                  <div className="grid-overlay overlay-ready" style={{ opacity: 1, scale: 1 }}>
                    <div className="overlay-title">Neural Link<br/>Offline</div>
                    <div className="overlay-subtitle">System in standby.<br/>Awaiting initialization.</div>
                    <motion.button
                      whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(0, 229, 255, 0.4)" }}
                      whileTap={{ scale: 0.95 }}
                      className="btn btn-hero-start"
                      onClick={start}
                    >
                      <Play size={20} fill="currentColor" />
                      <span>Initialize Mission</span>
                    </motion.button>
                  </div>
                </div>}
          </div>
        </section>

        {/* ── Col 2: Stats ── */}
        <section className="col-stats">
          <div className="panel panel-progress" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="panel-title">
              <span>📈 Training Progress</span>
              <TitleStat label="Episode" value={episode} icon={<Activity size={12} />} />
            </div>
            <div style={{ flex: 1, minHeight: '150px' }}>
              <RewardChart rewards={stats?.episode_rewards ?? EMPTY_ARRAY} />
            </div>
          </div>

          <div className="panel" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="panel-title">
              <span>🧠 Q-Values (Thinking)</span>
              <TitleStat label="Q-States" value={qTableSize} icon={<Database size={12} />} />
            </div>
            <div style={{ flex: 1, minHeight: '120px', overflowY: 'auto' }}>
              {lastStep
                ? <QValueBar qValues={lastStep.q_values} activeAction={lastStep.action} />
                : <div style={{ padding: '8px' }}>
                    <Skeleton variant="list" rows={6} height={20} />
                  </div>}
            </div>
          </div>

          <div className="panel panel-epsilon">
            <div className="panel-title">
              <span>🎲 Internal State (ε)</span>
              <TitleStat label="ε (explore)" value={epsilon.toFixed(3)} accent icon={<Info size={12} />} />
            </div>
            <div className="epsilon-bar-track">
              {stats ? (
                <motion.div
                  className="epsilon-bar-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${epsilon * 100}%` }}
                />
              ) : (
                <Skeleton variant="rect" width="100%" height="100%" className="skeleton-shimmer" />
              )}
            </div>
            <div className="epsilon-labels">
              <span>Exploit (0)</span>
              <span className="epsilon-val">{(epsilon * 100).toFixed(1)}%</span>
              <span>Explore (1)</span>
            </div>

            {stats ? (
              <div className="params-mini-grid">
                <div className="mini-param">α: {stats.learning_rate}</div>
                <div className="mini-param">γ: {stats.discount}</div>
              </div>
            ) : (
              <div className="params-mini-grid">
                <Skeleton variant="rect" height={22} className="mini-param" />
                <Skeleton variant="rect" height={22} className="mini-param" />
              </div>
            )}
          </div>
        </section>

        {/* ── Col 3: Logs & AI ── */}
        <section className="col-logs">
          <div className="panel panel-ai">
            <div className="panel-title"><span>🤖 Gemma Explains</span></div>
            <div className="ai-content">
              <AnimatePresence mode="wait">
                <motion.div
                  key={aiNarration || 'waiting'}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.3 }}
                >
                  {aiNarration
                    ? <p className="ai-text">{aiNarration}</p>
                    : <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <Skeleton variant="text" rows={3} width="100%" />
                      </div>}
                </motion.div>
              </AnimatePresence>

              {episodeSummary && (
                <motion.div
                  className="episode-summary"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="summary-label">Episode Summary</div>
                  <p className="ai-text">{episodeSummary}</p>
                </motion.div>
              )}
            </div>
          </div>

          <div className="panel panel-log">
            <div className="panel-title">
              <span>📋 Action Log</span>
              <TitleStat label="Steps" value={totalSteps} icon={<Target size={12} />} />
            </div>
            <ActionLog entries={log} />
          </div>
        </section>

      </main>
    </div>
  );
}

function TitleStat({
  label, value, accent, icon
}: {
  label: string; value: string | number; accent?: boolean; icon?: React.ReactNode;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '4px',
      textTransform: 'none', letterSpacing: 'normal',
      fontFamily: "'JetBrains Mono', monospace", fontSize: '10px',
      color: accent ? 'var(--accent)' : 'var(--text2)'
    }}>
      {icon}
      <span>{label}: <span style={{ color: 'var(--text)', fontWeight: 600 }}>{value}</span></span>
    </div>
  );
}
