"use client";

import { motion } from "framer-motion";

interface BreakdownItem {
  value: number;
  weight: number;
}

interface ScoreBreakdownProps {
  breakdown: {
    bill_progress: BreakdownItem;
    substantive_ratio: BreakdownItem;
    topic_diversity: BreakdownItem;
    bill_volume: BreakdownItem;
  };
  totalScore: number;
}

const LABELS: Record<string, { name: string; description: string; color: string }> = {
  bill_progress: {
    name: "Bill Progress",
    description: "% of bills that advanced past committee",
    color: "#3b82f6",
  },
  substantive_ratio: {
    name: "Substantive Bills",
    description: "Real bills vs. resolutions/memorials",
    color: "#22c55e",
  },
  topic_diversity: {
    name: "Topic Diversity",
    description: "Range of issues addressed (max 8)",
    color: "#f59e0b",
  },
  bill_volume: {
    name: "Bill Volume",
    description: "Number of bills sponsored (max 20)",
    color: "#8b5cf6",
  },
};

export default function ScoreBreakdown({ breakdown, totalScore }: ScoreBreakdownProps) {
  const items = Object.entries(breakdown).map(([key, item]) => ({
    key,
    ...LABELS[key],
    value: item.value,
    weight: item.weight,
    contribution: Math.round((item.value * item.weight) / 100),
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="space-y-3"
    >
      <div className="text-xs text-slate-500 font-mono mb-2">
        Score = Σ (component × weight)
      </div>

      {items.map((item, i) => (
        <motion.div
          key={item.key}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 * i }}
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-slate-300 font-medium">{item.name}</span>
              <span className="text-slate-600">({item.weight}%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">{item.value}%</span>
              <span className="text-slate-600">×</span>
              <span className="text-slate-500">{item.weight / 100}</span>
              <span className="text-slate-600">=</span>
              <span className="text-white font-medium">{((item.value * item.weight) / 100).toFixed(1)}</span>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: item.color }}
              initial={{ width: 0 }}
              animate={{ width: `${item.value}%` }}
              transition={{ duration: 0.8, delay: 0.2 + i * 0.1 }}
            />
          </div>
          <p className="text-xs text-slate-600 mt-0.5">{item.description}</p>
        </motion.div>
      ))}

      {/* Total */}
      <div className="border-t border-slate-700 pt-2 mt-3 flex items-center justify-between">
        <span className="text-xs text-slate-400 font-medium">Total Say vs. Do Score</span>
        <span className="text-lg font-bold text-white">{totalScore}</span>
      </div>
    </motion.div>
  );
}
