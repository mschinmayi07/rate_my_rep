"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bill, getTopicColor } from "@/lib/data";
import { ExternalLink, ChevronDown, ChevronUp, FileText } from "lucide-react";

interface BillListProps {
  bills: Bill[];
}

export default function BillList({ bills }: BillListProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [isOpen, setIsOpen] = useState(false);

  const topics = [...new Set(bills.map((b) => b.topic))].sort();
  const filtered = filter === "all" ? bills : bills.filter((b) => b.topic === filter);

  return (
    <div>
      {/* Dropdown toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-colors"
      >
        <div className="flex items-center gap-3">
          <FileText className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-slate-200">
            View All Bills ({bills.length})
          </span>
          {/* Topic summary chips */}
          <div className="hidden sm:flex items-center gap-1.5">
            {topics.slice(0, 4).map((t) => (
              <span
                key={t}
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: getTopicColor(t) }}
                title={t}
              />
            ))}
            {topics.length > 4 && (
              <span className="text-xs text-slate-500">+{topics.length - 4}</span>
            )}
          </div>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        )}
      </button>

      {/* Expandable bill list */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="pt-4">
              {/* Topic filter chips */}
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={() => setFilter("all")}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    filter === "all"
                      ? "bg-blue-500 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  All ({bills.length})
                </button>
                {topics.map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilter(t)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      filter === t
                        ? "text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                    style={filter === t ? { backgroundColor: getTopicColor(t) } : {}}
                  >
                    {t} ({bills.filter((b) => b.topic === t).length})
                  </button>
                ))}
              </div>

              {/* Bill cards */}
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {filtered.map((bill, i) => (
                  <motion.div
                    key={bill.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="glass-card rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => setExpanded(expanded === bill.id ? null : bill.id)}
                      className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-700/30 transition-colors"
                    >
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: getTopicColor(bill.topic) }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{bill.identifier}</p>
                        <p className="text-xs text-slate-400 truncate">{bill.title}</p>
                      </div>
                      <span className="text-xs text-slate-500 flex-shrink-0 hidden sm:inline">
                        {bill.latest_action_date}
                      </span>
                      {expanded === bill.id ? (
                        <ChevronUp className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      )}
                    </button>

                    <AnimatePresence>
                      {expanded === bill.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 pt-1 border-t border-slate-700/50">
                            <p className="text-sm text-slate-300 mb-2">
                              {bill.plain_english}
                            </p>
                            <div className="flex items-center justify-between text-xs text-slate-500">
                              <div className="flex items-center gap-3">
                                <span
                                  className="px-2 py-0.5 rounded-full"
                                  style={{
                                    backgroundColor: `${getTopicColor(bill.topic)}20`,
                                    color: getTopicColor(bill.topic),
                                  }}
                                >
                                  {bill.topic}
                                </span>
                                <span>Latest: {bill.latest_action}</span>
                              </div>
                              <a
                                href={bill.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
                                onClick={(e) => e.stopPropagation()}
                              >
                                OpenStates <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
