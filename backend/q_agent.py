import random
from collections import defaultdict


class QLearningAgent:
    def __init__(self, state_size, action_size, learning_rate=0.1,
                 discount=0.95, epsilon=1.0, epsilon_min=0.05, epsilon_decay=0.995):
        self.state_size    = state_size
        self.action_size   = action_size
        self.lr            = learning_rate
        self.gamma         = discount
        self.epsilon       = epsilon
        self.epsilon_min   = epsilon_min
        self.epsilon_decay = epsilon_decay
        self.q_table       = defaultdict(lambda: [0.0] * action_size)
        self.episode       = 0
        self.step_count    = 0
        self.total_reward  = 0.0
        self.episode_rewards = []

    def choose_action(self, state_key: str) -> int:
        if random.random() < self.epsilon:
            return random.randrange(self.action_size)
        q = self.q_table[state_key]
        return int(q.index(max(q)))

    def update(self, state, action, reward, next_state, done):
        current_q = self.q_table[state][action]
        target = reward if done else reward + self.gamma * max(self.q_table[next_state])
        self.q_table[state][action] += self.lr * (target - current_q)

    def new_episode(self):
        if self.episode > 0:
            self.episode_rewards.append(round(self.total_reward, 2))
        self.episode     += 1
        self.total_reward = 0.0
        self.epsilon = max(self.epsilon_min, self.epsilon * self.epsilon_decay)

    def get_q_values(self, state_key: str):
        return list(self.q_table[state_key])