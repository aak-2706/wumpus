import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid,
         Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

interface Props { rewards: number[] }

function movingAvg(arr: number[], w = 10) {
  return arr.map((_, i) => {
    const s = arr.slice(Math.max(0, i - w + 1), i + 1);
    return parseFloat((s.reduce((a, b) => a + b, 0) / s.length).toFixed(1));
  });
}

export const RewardChart: React.FC<Props> = ({ rewards }) => {
  if (rewards.length === 0)
    return <div className="chart-empty">No episodes yet — start the agent</div>;

  const avg  = movingAvg(rewards);
  const data = rewards.map((r, i) => ({ episode: i + 1, reward: r, avg: avg[i] }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis dataKey="episode" tick={{ fill: "#7a8fa6", fontSize: 10 }} tickLine={false} />
        <YAxis tick={{ fill: "#7a8fa6", fontSize: 10 }} tickLine={false} />
        <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
        <Tooltip contentStyle={{ background: "#0d1b2a", border: "1px solid #1e3a5f",
                                  borderRadius: 6, fontSize: 11 }} />
        <Line type="monotone" dataKey="reward" stroke="#1e6fa8" dot={false}
              strokeWidth={1} opacity={0.5} name="Reward" />
        <Line type="monotone" dataKey="avg" stroke="#00d4ff" dot={false}
              strokeWidth={2} name="Avg(10)" />
      </LineChart>
    </ResponsiveContainer>
  );
};