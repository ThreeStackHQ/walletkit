"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const mockData = [
  { day: "Mon", granted: 420, spent: 310 },
  { day: "Tue", granted: 380, spent: 290 },
  { day: "Wed", granted: 510, spent: 420 },
  { day: "Thu", granted: 460, spent: 380 },
  { day: "Fri", granted: 590, spent: 490 },
  { day: "Sat", granted: 280, spent: 210 },
  { day: "Sun", granted: 310, spent: 240 },
];

export default function OverviewChart() {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={mockData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis
          dataKey="day"
          tick={{ fill: "#94a3b8", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#94a3b8", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1e293b",
            border: "1px solid #334155",
            borderRadius: "8px",
            color: "#f1f5f9",
          }}
          cursor={{ fill: "rgba(139,92,246,0.08)" }}
        />
        <Legend
          wrapperStyle={{ color: "#94a3b8", fontSize: "12px" }}
        />
        <Bar dataKey="granted" name="Credits Granted" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
        <Bar dataKey="spent" name="Credits Spent" fill="#475569" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
