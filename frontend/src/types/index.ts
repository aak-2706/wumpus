export type ActionName =
  | "MOVE_UP" | "MOVE_DOWN" | "MOVE_LEFT" | "MOVE_RIGHT" | "SHOOT" | "GRAB";

export interface Perceptions {
  breeze: boolean; stench: boolean;
  glitter: boolean; bump: boolean; scream: boolean;
}

export interface GameState {
  agent_pos: [number, number];
  pits: [number, number][];
  wumpus_pos: [number, number];
  wumpus_alive: boolean;
  gold_pos: [number, number];
  has_gold: boolean;
  has_arrow: boolean;
  done: boolean;
  done_reason: "win" | "pit" | "wumpus" | "exhausted" | null;
  size: number;
  perceptions: Perceptions;
}

export interface StepResponse {
  state: GameState;
  action: number;
  action_name: ActionName;
  reward: number;
  done: boolean;
  episode: number;
  total_steps: number;
  epsilon: number;
  total_reward: number;
  q_values: number[];
}

export interface StatsResponse {
  episode: number;
  epsilon: number;
  total_steps: number;
  episode_rewards: number[];
  q_table_size: number;
  learning_rate: number;
  discount: number;
}

export interface LogEntry {
  id: number;
  episode: number;
  action: ActionName;
  reward: number;
  pos: [number, number];
  timestamp: number;
}