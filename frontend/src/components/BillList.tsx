"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bill, getTopicColor, formatTopic } from "@/lib/data";
import { ExternalLink, ChevronDown, ChevronUp, FileText, Search } from "lucide-react";

interface BillListProps {
  bills: Bill[];
}

interface TopicGroup {
  topic: string;
  bills: Bill[];
  primaryCount: number;
  cosponsorCount: number;
}

export default function BillList({ bills }: BillListProps) {
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [expandedBill, setExpandedBill] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCount, setShowCount] = useState<Record<string, number>>({});

  // Group bills by topic
  const groups: TopicGroup[] = (() => {
    const map: Record<string, Bill[]> = {};
    bills.forEach((b) => {
      const topic = b.topic || "other";
      if (!map[topic]) map[topic] = [];
      map[topic].push(b);
    });
    return Object.entries(map)
      .map(([topic, topicBills]) => ({
        topic,
        bills: topicBills.sort((a, b) => (b.latest_action_date || "").localeCompare(a.latest_action_date || "")),
        primaryCount: topicBills.filter((b) => b.sponsor_type === "primary").length,
        cosponsorCount: topicBills.filter((b) => b.sponsor_type !== "primary").length,
      }))
      .sort((a, b) => b.bills.length - a.bills.length);
  })();

  // Filter by search
  const filteredGroups = searchQuery.trim()
    ? groups
        .map((g) => ({
          ...g,
          bills: g.bills.filter(
            (b) =>
              b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              b.identifier.toLowerCase().includes(searchQuery.toLowerCase()) ||
              b.plain_english.toLowerCase().includes(searchQuery.toLowerCase())
          ),
        }))
        .filter((g) => g.bills.length > 0)
    : groups;

  const INITIAL_SHOW = 5;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-400" />
          All Bills ({bills.length})
        </h3>
        <div className="text-xs text-slate-500">
          {bills.filter((b) => b.sponsor_type === "primary").length} primary &middot;{" "}
          {bills.filter((b) => b.sponsor_type !== "primary").length} co-sponsored
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search bills by title or keyword..."
          className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      {/* Topic groups */}
      <div className="space-y-2">
        {filteredGroups.map((group) => {
          const isExpanded = expandedTopic === group.topic;
          const visibleCount = showCount[group.topic] || INITIAL_SHOW;
          const visibleBills = group.bills.slice(0, isExpanded ? visibleCount : 0);
          const hasMore = visibleCount < group.bills.length;

          return (
            <div key={group.topic} className="glass-card rounded-lg overflow-hidden">
              {/* Topic header */}
              <button
                onClick={() => setExpandedTopic(isExpanded ? null : group.topic)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700/30 transition-colors"
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: getTopicColor(group.topic) }}
                />
                <div className="flex-1 text-left">
                  <span className="text-sm font-medium text-slate-200">
                    {formatTopic(group.topic)}
                  </span>
                  <span className="text-xs text-slate-500 ml-2">
                    {group.bills.length} bills
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  {group.primaryCount > 0 && (
                    <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                      {group.primaryCount} primary
                    </span>
                  )}
                  {group.cosponsorCount > 0 && (
                    <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-400">
                      {group.cosponsorCount} co-sponsored
                    </span>
                  )}
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
              </button>

              {/* Bills within topic */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-slate-700/50">
                      {visibleBills.map((bill) => (
                        <div key={bill.id} className="border-b border-slate-800/50 last:border-b-0">
                          <button
                            onClick={() => setExpandedBill(expandedBill === bill.id ? null : bill.id)}
                            className="w-full px-4 py-2.5 flex items-center gap-3 text-left hover:bg-slate-700/20 transition-colors"
                          >
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded ${
                                bill.sponsor_type === "primary"
                                  ? "bg-blue-500/20 text-blue-300"
                                  : "bg-slate-700/50 text-slate-500"
                              }`}
                            >
                              {bill.sponsor_type === "primary" ? "P" : "C"}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{bill.identifier}</p>
                              <p className="text-xs text-slate-400 truncate">{bill.title}</p>
                            </div>
                            <span className="text-xs text-slate-500 flex-shrink-0 hidden sm:inline">
                              {bill.latest_action_date}
                            </span>
                            {expandedBill === bill.id ? (
                              <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                            )}
                          </button>

                          <AnimatePresence>
                            {expandedBill === bill.id && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="px-4 pb-3 pt-1 ml-8">
                                  <p className="text-sm text-slate-300 mb-2">
                                    {bill.plain_english}
                                  </p>
                                  <div className="flex items-center justify-between text-xs text-slate-500">
                                    <span>Latest: {bill.latest_action}</span>
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
                        </div>
                      ))}

                      {/* Show more button */}
                      {hasMore && (
                        <button
                          onClick={() =>
                            setShowCount((prev) => ({
                              ...prev,
                              [group.topic]: (prev[group.topic] || INITIAL_SHOW) + 10,
                            }))
                          }
                          className="w-full px-4 py-2 text-xs text-blue-400 hover:text-blue-300 hover:bg-slate-700/20 transition-colors"
                        >
                          Show more ({group.bills.length - visibleCount} remaining)
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
