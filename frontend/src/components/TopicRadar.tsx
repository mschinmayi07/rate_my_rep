"use client";

import { motion } from "framer-motion";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface TopicRadarProps {
  data: { topic: string; count: number; pct: number }[];
  partyColor: string;
}

export default function TopicRadar({ data, partyColor }: TopicRadarProps) {
  // Take top 8 topics for readability
  const chartData = data.slice(0, 8).map((d) => ({
    subject: d.topic.charAt(0).toUpperCase() + d.topic.slice(1),
    value: d.pct,
    fullMark: 100,
  }));

  if (chartData.length < 3) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        Not enough topic diversity for radar chart
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="w-full h-72"
    >
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="#334155" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: "#94a3b8", fontSize: 11 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: "#475569", fontSize: 10 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "8px",
              color: "#f8fafc",
            }}
            formatter={(value: number) => [`${value}%`, "Focus"]}
          />
          <Radar
            name="Topic Focus"
            dataKey="value"
            stroke={partyColor}
            fill={partyColor}
            fillOpacity={0.25}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
