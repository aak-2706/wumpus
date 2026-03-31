import React, { useEffect } from "react";
import { WumpusGrid }   from "./components/WumpusGrid";
import { RewardChart }  from "./components/RewardChart";
import { QValueBar }    from "./components/QValueBar";
import { ActionLog }    from "./components/ActionLog";
import { useGameLoop }  from "./hooks/useGameLoop";
import "./App.css";

const SPEEDS = [
  { label: "0.5×", ms: 1000 }, { label: "1×", ms: 500 },
  { label: "2×",   ms: 250  }, { label: "4×", ms: 100 }, { label: "Max", ms: 20 },
];

export default function App() {
  const { gameState, stats, log, isRunning, speed, setSpeed,
          lastStep, aiNarration, episodeSummary, start, stop, reset } = useGameLoop();

  useEffect(() => { reset(); }, []);

  const epsilon    = lastStep?.epsilon     ?? stats?.epsilon     ?? 1;
  const episode    = lastStep?.episode     ?? stats?.episode     ?? 0;
  const totalSteps = lastStep?.total_steps ?? stats?.total_steps ?? 0;
  const qTableSize = stats?.q_table_size   ?? 0;

  return (
    <div className="app">

      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-left">
          <div className="logo-mark">W</div>
          <div>
            <h1 className="app-title">Wumpus World</h1>
            <p className="app-subtitle">Autonomous Q-Learning Agent</p>
          </div>
        </div>
        <div className="header-stats">
          <Stat label="Episode"     value={episode} />
          <Stat label="Steps"       value={totalSteps} />
          <Stat label="ε (explore)" value={epsilon.toFixed(3)} accent />
          <Stat label="Q-States"    value={qTableSize} />
        </div>
      </header>

      <main className="app-main">

        {/* ── Left — Grid ── */}
        <section className="col-left">
          <div className="panel panel-grid">
            <div className="panel-title">
              <span>🗺️ World</span>
              {gameState?.done && (
                <span className={`badge ${gameState.has_gold ? "badge-win" : "badge-loss"}`}>
                  {gameState.has_gold ? "🏆 WIN" : "💀 DEAD"}
                </span>
              )}
            </div>
            {gameState
              ? <WumpusGrid state={gameState} />
              : <div className="loading-grid">Connecting to backend…</div>}
          </div>

          <div className="controls">
            <button
              className={`btn ${isRunning ? "btn-stop" : "btn-start"}`}
              onClick={isRunning ? stop : start}
            >
              {isRunning ? "⏹ Stop" : "▶ Start"}
            </button>
            <button className="btn btn-reset" onClick={reset} disabled={isRunning}>
              ↺ Reset
            </button>
            <div className="speed-group">
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
          </div>

          <div className="legend">
            {[
              ["👹","Wumpus"],["🕳️","Pit"],["💰","Gold"],
              ["🤖","Agent"],["💨","Breeze"],["🌫️","Stench"],
            ].map(([icon, label]) => (
              <div key={label} className="legend-item">
                <span>{icon}</span>
                <span className="legend-label">{label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Middle — Q-Values + Action Log ── */}
        <section className="col-mid">
          <div className="panel">
            <div className="panel-title">🧠 Q-Values (current state)</div>
            {lastStep
              ? <QValueBar qValues={lastStep.q_values} activeAction={lastStep.action} />
              : <div className="panel-empty">Waiting for agent…</div>}
          </div>

          <div className="panel panel-log">
            <div className="panel-title">📋 Action Log</div>
            <ActionLog entries={log} />
          </div>
        </section>

        {/* ── Right — Charts + Epsilon + Params ── */}
        <section className="col-right">
          <div className="panel">
            <div className="panel-title">📈 Episode Rewards</div>
            <RewardChart rewards={stats?.episode_rewards ?? []} />
          </div>

          <div className="panel panel-epsilon">
            <div className="panel-title">🎲 Exploration Rate (ε)</div>
            <div className="epsilon-bar-track">
              <div className="epsilon-bar-fill" style={{ width: `${epsilon * 100}%` }} />
            </div>
            <div className="epsilon-labels">
              <span>Exploit (0)</span>
              <span className="epsilon-val">{(epsilon * 100).toFixed(1)}%</span>
              <span>Explore (1)</span>
            </div>
            <p className="epsilon-hint">
              {epsilon > 0.7
                ? "🔭 Mostly exploring — learning the world"
                : epsilon > 0.3
                ? "⚖️ Balancing exploration & exploitation"
                : "🎯 Mostly exploiting learned knowledge"}
            </p>
          </div>

          {stats && (
            <div className="panel panel-params">
              <div className="panel-title">⚙️ RL Parameters</div>
              <div className="params-grid">
                <ParamRow label="Learning Rate (α)" value={stats.learning_rate} />
                <ParamRow label="Discount (γ)"      value={stats.discount} />
                <ParamRow label="Episodes run"      value={stats.episode} />
                <ParamRow label="Q-table entries"   value={stats.q_table_size} />
              </div>
            </div>
          )}
        </section>

        {/* ── Claude Explains — Full Width Bottom Bar ── */}
        <div className="panel panel-ai claude-fullwidth">
          <div className="panel-title">🤖 Claude Explains</div>
          {aiNarration
            ? <p className="ai-text">{aiNarration}</p>
            : <p className="panel-empty">AI explanations appear every 5 steps…</p>}
          {episodeSummary && (
            <div className="episode-summary">
              <div className="summary-label">Episode Summary</div>
              <p className="ai-text">{episodeSummary}</p>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}

function Stat({
  label, value, accent,
}: {
  label: string; value: string | number; accent?: boolean;
}) {
  return (
    <div className="stat-box">
      <div className={`stat-value ${accent ? "stat-accent" : ""}`}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function ParamRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="param-row">
      <span className="param-label">{label}</span>
      <span className="param-value">{value}</span>
    </div>
  );
}