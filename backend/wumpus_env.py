import random
from typing import Tuple, Dict, Any


class WumpusEnv:
    """4×4 Wumpus World environment."""

    ACTION_NAMES = ["MOVE_UP", "MOVE_DOWN", "MOVE_LEFT", "MOVE_RIGHT", "SHOOT", "GRAB"]
    ACTION_UP    = 0
    ACTION_DOWN  = 1
    ACTION_LEFT  = 2
    ACTION_RIGHT = 3
    ACTION_SHOOT = 4
    ACTION_GRAB  = 5

    def __init__(self, size: int = 4):
        self.size = size
        self.action_size = 6
        self.state_size = size * size * 2 * 2 * 2 * 2 * 2 # pos, arrow, alive, breeze, stench, glitter
        self.pits = []
        self.wumpus_pos = []
        self.gold_pos = []
        self.agent_pos = []
        self.has_arrow = True
        self.has_gold = False
        self.wumpus_alive = True
        self.done = False
        self.done_reason = None # "win", "pit", "wumpus", "exhausted"
        self._generate_world()

    def _generate_world(self):
        self.pits = []
        all_cells = [(r, c) for r in range(self.size) for c in range(self.size) if (r, c) != (0, 0)]
        random.shuffle(all_cells)
        for cell in all_cells[:3]:
            self.pits.append(list(cell))
        remaining = [c for c in all_cells[3:] if list(c) not in self.pits]
        self.wumpus_pos = list(remaining[0])
        gold_candidates = [c for c in all_cells if list(c) != self.wumpus_pos and list(c) not in self.pits]
        self.gold_pos = list(random.choice(gold_candidates))
        self.agent_pos = [0, 0]
        self.has_arrow = True
        self.has_gold = False
        self.wumpus_alive = True
        self.done = False
        self.done_reason = None

    def reset(self):
        self._generate_world()
        return self.get_state_key()

    def _neighbors(self, pos):
        r, c = pos
        candidates = [(r-1,c),(r+1,c),(r,c-1),(r,c+1)]
        return [(nr,nc) for nr,nc in candidates if 0 <= nr < self.size and 0 <= nc < self.size]

    def _perceive(self):
        pos = tuple(self.agent_pos)
        neighbors = self._neighbors(pos)
        breeze  = any(list(n) in self.pits for n in neighbors)
        stench  = self.wumpus_alive and any(list(n) == self.wumpus_pos for n in neighbors)
        glitter = (self.agent_pos == self.gold_pos and not self.has_gold)
        return {"breeze": breeze, "stench": stench, "glitter": glitter, "bump": False, "scream": False}

    def step(self, action: int) -> Tuple[str, float, bool]:
        if self.done:
            return self.get_state_key(), 0.0, True

        reward = -1.0

        if action in (self.ACTION_UP, self.ACTION_DOWN, self.ACTION_LEFT, self.ACTION_RIGHT):
            dr, dc = {
                self.ACTION_UP:    (-1,  0),
                self.ACTION_DOWN:  ( 1,  0),
                self.ACTION_LEFT:  ( 0, -1),
                self.ACTION_RIGHT: ( 0,  1),
            }[action]
            nr = self.agent_pos[0] + dr
            nc = self.agent_pos[1] + dc
            if 0 <= nr < self.size and 0 <= nc < self.size:
                self.agent_pos = [nr, nc]
                if self.agent_pos in self.pits:
                    reward = -100.0
                    self.done = True
                    self.done_reason = "pit"
                elif self.agent_pos == self.wumpus_pos and self.wumpus_alive:
                    reward = -100.0
                    self.done = True
                    self.done_reason = "wumpus"

        elif action == self.ACTION_SHOOT:
            if self.has_arrow:
                self.has_arrow = False
                reward = -10.0
                for n in self._neighbors(self.agent_pos):
                    if list(n) == self.wumpus_pos and self.wumpus_alive:
                        self.wumpus_alive = False
                        reward = 10.0
                        break

        elif action == self.ACTION_GRAB:
            if self.agent_pos == self.gold_pos and not self.has_gold:
                self.has_gold = True
                reward = 100.0
                self.done = True
                self.done_reason = "win"

        return self.get_state_key(), reward, self.done

    def get_state_key(self) -> str:
        perceptions = self._perceive()
        return (
            f"{self.agent_pos[0]}_{self.agent_pos[1]}_"
            f"{'1' if self.has_arrow else '0'}_"
            f"{'1' if self.wumpus_alive else '0'}_"
            f"{'1' if perceptions['breeze'] else '0'}_"
            f"{'1' if perceptions['stench'] else '0'}_"
            f"{'1' if perceptions['glitter'] else '0'}"
        )

    def get_state_dict(self) -> Dict[str, Any]:
        perceptions = self._perceive()
        return {
            "agent_pos": self.agent_pos,
            "pits": self.pits,
            "wumpus_pos": self.wumpus_pos,
            "wumpus_alive": self.wumpus_alive,
            "gold_pos": self.gold_pos,
            "has_gold": self.has_gold,
            "has_arrow": self.has_arrow,
            "done": self.done,
            "done_reason": self.done_reason,
            "size": self.size,
            "perceptions": perceptions,
        }