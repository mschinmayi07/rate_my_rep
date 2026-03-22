"use client";

import { motion } from "framer-motion";
import { TopicMatch, formatTopic, getTopicColor } from "@/lib/data";
import { Check, Minus, X } from "lucide-react";

interface ScoreBreakdownProps {
  sayTopics: string[];
  topicMatches: TopicMatch[];
  score: number;
}

export default function ScoreBreakdown({ sayTopics, topicMatches, score }: ScoreBreakdownProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="space-y-3"
    >
      <div className="text-xs text-slate-500 font-mono mb-2">
        Score = matched topics / stated topics × 100
      </div>
      <div className="text-xs text-slate-500 mb-3">
        Primary bill = 1.0 &middot; Co-sponsor only = 0.3 &middot; No bills = 0.0
      </div>

      {topicMatches.map((match, i) => (
        <motion.div
          key={match.topic}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 * i }}
          className="flex items-center gap-3"
        >
          {/* Status icon */}
          {match.type === "primary" ? (
            <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <Check className="w-3.5 h-3.5 text-green-400" />
            </div>
          ) : match.type === "cosponsor_only" ? (
            <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <Minus className="w-3.5 h-3.5 text-amber-400" />
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <X className="w-3.5 h-3.5 text-red-400" />
            </div>
          )}

          {/* Topic name */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: getTopicColor(match.topic) }}
            />
            <span className="text-sm text-slate-300 truncate">
              {formatTopic(match.topic)}
            </span>
          </div>

          {/* Weight */}
          <div className="flex items-center gap-2 text-xs flex-shrink-0">
            {match.type === "primary" && (
              <span className="text-green-400 font-medium">Primary bills</span>
            )}
            {match.type === "cosponsor_only" && (
              <span className="text-amber-400 font-medium">Co-sponsor only</span>
            )}
            {match.type === "no_bills" && (
              <span className="text-red-400 font-medium">No bills</span>
            )}
            <span className="text-slate-500 w-8 text-right">{match.weight}</span>
          </div>
        </motion.div>
      ))}

      {/* Total */}
      <div className="border-t border-slate-700 pt-3 mt-3 flex items-center justify-between">
        <span className="text-xs text-slate-400 font-medium">
          {topicMatches.filter((m) => m.weight > 0).length}/{topicMatches.length} topics matched
        </span>
        <span className="text-lg font-bold text-white">{score}%</span>
      </div>
    </motion.div>
  );
}
