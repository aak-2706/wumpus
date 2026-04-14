import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Target, 
  Wind, 
  Biohazard, 
  Sparkles, 
  Ghost, 
  Disc, 
  Trophy,
  Activity,
  Brain,
  Zap,
  MousePointer2
} from "lucide-react";

interface Slide {
  title: string;
  content: React.ReactNode;
  icon?: React.ReactNode;
}

const slides: Slide[] = [
  {
    title: "Mission Objective",
    icon: <Target className="text-accent" size={32} />,
    content: (
      <div className="help-slide-content">
        <p>Welcome to <strong>Wumpus World</strong>, a classic reinforcement learning environment.</p>
        <p>Your objective is to guide the agent to find the <strong>Gold</strong> and retrieve it, while avoiding deadly hazards.</p>
        <div className="help-grid-preview">
           <div className="preview-item"><Trophy color="var(--gold)" /> <span>Gold</span></div>
        </div>
      </div>
    )
  },
  {
    title: "Hazards",
    icon: <Biohazard className="text-red" size={32} />,
    content: (
      <div className="help-slide-content">
        <p>The cave is dangerous. Watch out for:</p>
        <div className="hazard-list">
          <div className="hazard-item">
            <Disc color="var(--red)" />
            <div>
              <strong>Pits:</strong> Bottomless chasms. Falling into one is fatal.
            </div>
          </div>
          <div className="hazard-item">
            <Ghost color="var(--orange)" />
            <div>
              <strong>Wumpus:</strong> A beast that eats anyone entering its cell.
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    title: "Perceptions",
    icon: <Wind className="text-accent" size={32} />,
    content: (
      <div className="help-slide-content">
        <p>The agent "feels" the environment when standing in a cell:</p>
        <div className="perception-list">
          <div className="perception-item">
            <Wind size={18} color="var(--accent)" />
            <span><strong>Breeze:</strong> A Pit is in an adjacent cell.</span>
          </div>
          <div className="perception-item">
            <Biohazard size={18} color="var(--orange)" />
            <span><strong>Stench:</strong> The Wumpus is in an adjacent cell.</span>
          </div>
          <div className="perception-item">
            <Sparkles size={18} color="var(--gold)" />
            <span><strong>Glitter:</strong> Gold is in the current cell!</span>
          </div>
        </div>
      </div>
    )
  },
  {
    title: "Actions",
    icon: <MousePointer2 className="text-accent" size={32} />,
    content: (
      <div className="help-slide-content">
        <p>The agent can perform 6 distinct actions:</p>
        <ul className="action-list">
          <li><strong>Move (Up, Down, Left, Right):</strong> Traverse the cave.</li>
          <li><strong>Shoot:</strong> Use your single arrow to kill the Wumpus from afar.</li>
          <li><strong>Grab:</strong> Pick up the Gold when you find it.</li>
        </ul>
        <p className="help-note">Note: Every action costs energy (-1 reward). Falling or being eaten is a major failure (-100).</p>
      </div>
    )
  },
  {
    title: "How it Learns",
    icon: <Activity className="text-accent" size={32} />,
    content: (
      <div className="help-slide-content">
        <p>The <strong>Reward Chart</strong> shows how the agent's performance improves over time.</p>
        <ul className="action-list">
          <li><strong>Episodes:</strong> Each full attempt from start to finish.</li>
          <li><strong>Trend:</strong> As the line goes up, it means the agent is successfully finding the gold and avoiding deaths.</li>
        </ul>
        <p className="help-note">Initially, the agent knows nothing and will fail often. This is a normal part of its learning journey.</p>
      </div>
    )
  },
  {
    title: "Inside the Brain",
    icon: <Brain className="text-accent" size={32} />,
    content: (
      <div className="help-slide-content">
        <p><strong>Q-Values</strong> represent the agent's "confidence" in each action.</p>
        <p>For every square, the agent calculates which move will lead to the highest reward based on its past experiences.</p>
        <p>The highlighted bar in the "Thinking" panel is the choice the agent believes is best right now.</p>
      </div>
    )
  },
  {
    title: "Curiosity Factor",
    icon: <Zap className="text-gold" size={32} />,
    content: (
      <div className="help-slide-content">
        <p>The <strong>Epsilon (ε)</strong> bar measures the agent's "Curiosity".</p>
        <div className="hazard-list">
          <div className="hazard-item">
            <div>
              <strong>Explore:</strong> The agent tries random moves to discover new strategies.
            </div>
          </div>
          <div className="hazard-item">
            <div>
              <strong>Exploit:</strong> The agent relies on its "expertise" to win efficiently.
            </div>
          </div>
        </div>
        <p className="help-note">Over time, the agent becomes less curious and more focused on using its learned skills.</p>
      </div>
    )
  }
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const next = () => setCurrentSlide((s) => (s + 1) % slides.length);
  const prev = () => setCurrentSlide((s) => (s - 1 + slides.length) % slides.length);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="help-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="help-modal-card"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
          >
            <button className="help-close-btn" onClick={onClose}>
              <X size={20} />
            </button>

            <div className="help-modal-header">
              {slides[currentSlide].icon}
              <h2>{slides[currentSlide].title}</h2>
            </div>

            <div className="help-modal-body">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {slides[currentSlide].content}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="help-modal-footer">
              <div className="slide-indicators">
                {slides.map((_, i) => (
                  <div 
                    key={i} 
                    className={`indicator ${i === currentSlide ? "active" : ""}`} 
                  />
                ))}
              </div>
              <div className="help-nav-btns">
                <button className="btn btn-reset" onClick={prev}>
                  <ChevronLeft size={18} />
                </button>
                <button className="btn btn-reset" onClick={next}>
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
