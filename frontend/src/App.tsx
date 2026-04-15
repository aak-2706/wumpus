import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Target,
  Database,
  Brain,
  Zap,
  Cpu,
  Play,
  Pause,
  RotateCcw,
  MapPin,
  Info
} from "lucide-react";
import { WumpusGrid } from "./components/WumpusGrid";
import { RewardChart } from "./components/RewardChart";
import { QValueBar } from "./components/QValueBar";
import { ActionLog } from "./components/ActionLog";
import { Skeleton } from "./components/Skeleton";
import { HelpModal } from "./components/HelpModal";
import { useGameLoop } from "./hooks/useGameLoop";
import "./App.css";

const SPEEDS = [
  { label: "0.5×", ms: 1500 }, { label: "1×", ms: 800 },
  { label: "2×", ms: 400 }, { label: "Max", ms: 50 },
];

const EMPTY_ARRAY: number[] = [];

export default function App() {
  const { gameState, stats, log, isRunning, speed, setSpeed,
    lastStep, aiNarration, episodeSummary, start, stop, reset, setAiEnabled, init,
    visibilityMode, toggleVisibility, visitedCells } = useGameLoop();

  const [isExplainEnabled, setIsExplainEnabled] = React.useState(false);
  const [isHelpOpen, setIsHelpOpen] = React.useState(false);

  const epsilon = lastStep?.epsilon ?? stats?.epsilon ?? 1;
  const episode = lastStep?.episode ?? stats?.episode ?? 0;
  const totalSteps = lastStep?.total_steps ?? stats?.total_steps ?? 0;
  const qTableSize = stats?.q_table_size ?? 0;

  const hasApiKey = stats?.has_api_key ?? true;

  return (
    <div className="app crt-container">
      <div className="crt-overlay"></div>
      <div className="vignette"></div>

      <main className="app-main">

        {/* ── Col 1: Grid ── */}
        <section className="col-grid">
          <div className="panel panel-grid">
            <div className="panel-title">
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={14} /> Wumpus World
              </span>
              <div className="controls" style={{ margin: 0 }}>
                {isRunning ? (
                  <button
                    className="btn btn-stop"
                    onClick={stop}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Pause size={16} fill="currentColor" /> Pause
                  </button>
                ) : (
                  (totalSteps > 0 || gameState) && (
                    <button
                      className="btn btn-reset"
                      onClick={reset}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <RotateCcw size={16} /> Reset
                    </button>
                  )
                )}

                {gameState && (
                  <div className="visibility-toggle" style={{ marginLeft: '8px' }}>
                    <button
                      className={`btn ${visibilityMode === "agent" ? "btn-active" : "btn-reset"}`}
                      onClick={toggleVisibility}
                      title={visibilityMode === "full" ? "Switch to Agent View" : "Switch to Full View"}
                      style={{ fontSize: '9px', padding: '5px 10px' }}
                    >
                      {visibilityMode === "full" ? "FULL VIS" : "AGENT VIS"}
                    </button>
                  </div>
                )}

                {gameState && (
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
                )}
              </div>
            </div>
            {gameState
              ? <WumpusGrid
                state={gameState}
                lastAction={lastStep?.action_name}
                showStartOverlay={!isRunning && !gameState.done}
                totalSteps={totalSteps}
                onStart={start}
                onOpenHelp={() => setIsHelpOpen(true)}
                currentSpeed={speed}
                visibilityMode={visibilityMode}
                visitedCells={visitedCells}
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
                      onClick={init}
                    >
                      <Play size={20} fill="currentColor" />
                      <span>Initialize Mission</span>
                    </motion.button>
                    
                    <button 
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
                      onClick={() => setIsHelpOpen(true)}
                    >
                      <Info size={16} />
                      Mission Briefing
                    </button>
                  </div>
                </div>}
          </div>
        </section>

        {/* ── Col 2: Stats ── */}
        <section className="col-stats">
          <div className="panel panel-progress" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="panel-title">
              <span><Activity size={14} style={{ marginRight: '6px' }} /> Performance</span>
              <TitleStat label="Episode" value={episode} icon={<Activity size={12} />} />
            </div>
            <div style={{ flex: 1, minHeight: '150px' }}>
              <RewardChart rewards={stats?.episode_rewards ?? EMPTY_ARRAY} />
            </div>
          </div>

          <div className="panel" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="panel-title">
              <span><Brain size={14} style={{ marginRight: '6px' }} /> Decision Matrix</span>
              <TitleStat label="Memory" value={qTableSize} icon={<Database size={12} />} />
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
              <span><Zap size={14} style={{ marginRight: '6px' }} /> Heuristic ε</span>
              <TitleStat label="Curiosity" value={epsilon.toFixed(3)} accent icon={<Info size={12} />} />
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
              <span>Expertise (0)</span>
              <span className="epsilon-val">{(epsilon * 100).toFixed(1)}%</span>
              <span>Curiosity (1)</span>
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
            <div className="panel-title">
              <span><Cpu size={14} style={{ marginRight: '6px' }} /> Neural Link</span>
              <button
                className={`btn ${!hasApiKey ? "btn-disabled" : isExplainEnabled ? "btn-active" : "btn-reset"}`}
                style={{ fontSize: '9px', padding: '3px 10px', minHeight: 'auto' }}
                disabled={!hasApiKey}
                onClick={() => {
                  const val = !isExplainEnabled;
                  setIsExplainEnabled(val);
                  setAiEnabled(val);
                }}
                title={!hasApiKey ? "Set GOOGLE_API_KEY in .env to enable" : ""}
              >
                {!hasApiKey ? "AI UNAVAILABLE" : isExplainEnabled ? "LINK ACTIVE" : "LINK OFFLINE"}
              </button>
            </div>
            <div className="ai-content">
              {isExplainEnabled ? (
                <>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={aiNarration || 'waiting'}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.3 }}
                    >
                      {aiNarration ? (
                        (() => {
                          // Check for potential API errors
                          const isError = aiNarration.includes('"error"') || aiNarration.includes("QuotaExceeded");
                          if (isError) {
                            return (
                              <div className="ai-error-state">
                                <div className="error-header">
                                  <span className="error-pulse" />
                                  SIGNAL INTERRUPTED
                                </div>
                                <p className="ai-text error-msg">
                                  Neural link saturated. Transmission throttled by uplink protocol. 
                                  Please standby for resynchronization.
                                </p>
                              </div>
                            );
                          }
                          return <p className="ai-text">{aiNarration}</p>;
                        })()
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <Skeleton variant="text" rows={3} width="100%" />
                        </div>
                      )}
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
                </>
              ) : (
                <div className="panel-empty" style={{ opacity: 0.5, textAlign: 'center', padding: '24px 0', border: 'none' }}>
                  AI Analysis Disabled
                </div>
              )}
            </div>
          </div>

          <div className="panel panel-log">
            <div className="panel-title">
              <span><Target size={14} style={{ marginRight: '6px' }} /> Mission Feed</span>
              <TitleStat label="Steps" value={totalSteps} icon={<Target size={12} />} />
            </div>
            <ActionLog entries={log} />
          </div>
        </section>

      </main>
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
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
