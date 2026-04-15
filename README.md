# 🕵️‍♂️ Wumpus World AI: The Neural Mission

A visually stunning, AI-powered reinforcement learning simulation. Watch an agent learn to navigate a dangerous cave, avoid the deadly Wumpus, and retrieve the gold using a "brain" that improves with every mistake.

---

## 🌟 What is this? (Simple Version)
Imagine a robot in a dark, square cave. It can't see everything. It only feels "breezes" near pits or "stenches" near monsters. This project shows how a computer "learns" to survive through trial and error.

- **Reinforcement Learning:** The robot gets points for finding gold and loses points for dying. It remembers what led to rewards and what led to failure.
- **Neural Link:** We use advanced AI (Gemini) to explain the robot's "thoughts" in plain English.

---

## 🚀 Key Features

- **🧠 Smart Learning:** Watch the "Decision Matrix" (Q-Table) grow as the agent explores.
- **🎙 AI Explanations:** Real-time narration of why the agent made a specific move.
- **🛡️ Mission Protection:** 
  - **Fail-Safe Links:** Uses multiple API keys to ensure the AI never stops talking.
  - **Single-Tab Lock:** Prevents system confusion by allowing only one active mission at a time.
  - **Desktop Optimized:** Blocks mobile/small screens to ensure a high-fidelity experience.
- **⚡ Performance:** Fast, smooth animations and instant data processing.

---

## 🛠 How it Works?

1.  **The Environment (The Cave):** A 4x4 grid generated randomly every time. Pits, a Wumpus, and one bar of Gold.
2.  **The Agent (The Robot):** It starts with no knowledge. It explores, dies, and restarts.
3.  **The Memory (Q-Learning):** It stores "scores" for every position. Over time, it learns that "Glitter" means "Gold" and "Breeze" means "Danger."
4.  **The Narrative:** When you enable the "Neural Link," our AI looks at the robot's data and tells you the story of its mission.

---

## 📥 Installation (Step-by-Step)

### 1. Prerequisites
- **Python** (The engine)
- **Node.js** (The interface)
- **API Key** (The brain - Google Gemini)

### 2. Setup the Brain (Backend)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Or .venv\Scripts\activate on Windows
pip install -r requirements.txt
```
*Create a `.env` file in `backend/` and add your key:*
`GOOGLE_API_KEYS=your_key_here,another_key_here`

### 3. Setup the Interface (Frontend)
```bash
# From the project root
cd frontend
npm install
```

---

## 🎮 How to Play

1.  **Start the Backend:** `cd backend && uvicorn main:app --reload`
2.  **Start the Frontend:** `cd frontend && npm run dev`
3.  **Open in Browser:** Go to `http://localhost:5173`
4.  **Initialize Mission:** Click the big blue button to start the agent's journey.
5.  **Enable AI:** Toggle the "Neural Link" to see real-time explanations.

---

## 📝 Mission Notes
- **Expertise:** As "Curiosity" drops, the agent relies more on what it has learned.
- **Reward:** Higher score means a more successful agent.
- **Logic:** You can "Download Knowledge" to see the robot's learned rules in math-like language.

Enjoy the simulation! 🚀
