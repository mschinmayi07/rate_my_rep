"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, Users, BarChart3 } from "lucide-react";
import { Rep, getAllReps, getRepsByZip, getPartyColor } from "@/lib/data";
import RepCard from "@/components/RepCard";

export default function Home() {
  const [zip, setZip] = useState("");
  const [results, setResults] = useState<Rep[]>([]);
  const [allReps, setAllReps] = useState<Rep[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getAllReps().then(setAllReps);
  }, []);

  const scrollToResults = () => {
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleSearch = async () => {
    if (zip.length !== 5) return;
    setLoading(true);
    setSearched(true);
    setShowAll(false);
    const reps = await getRepsByZip(zip);
    setResults(reps);
    setLoading(false);
    scrollToResults();
  };

  const handleBrowseAll = () => {
    setShowAll(true);
    setSearched(false);
    setResults([]);
    scrollToResults();
  };

  const stats = {
    reps: allReps.length,
    dems: allReps.filter((r) => r.party.includes("Democrat")).length,
    reps_r: allReps.filter((r) => r.party.includes("Republican")).length,
    bills: allReps.reduce((acc, r) => acc + r.bills.length, 0),
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950/50 via-slate-900 to-purple-950/30" />
        <div className="absolute inset-0">
          <div className="absolute top-20 left-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm mb-6"
            >
              <BarChart3 className="w-4 h-4" />
              Arizona Legislature Tracker
            </motion.div>

            <h1 className="text-4xl sm:text-6xl font-extrabold mb-6 leading-tight">
              Do your reps{" "}
              <span className="gradient-text">keep their promises</span>?
            </h1>

            <p className="text-lg text-slate-400 mb-10 max-w-2xl mx-auto">
              Enter your zip code to see how your Arizona legislators vote,
              what topics they focus on, and whether their actions match their
              words. Powered by open data, analyzed by AI.
            </p>

            {/* Search box */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-3 max-w-md mx-auto"
            >
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  value={zip}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 5);
                    setZip(val);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Enter AZ zip code"
                  className="w-full pl-10 pr-4 py-3.5 bg-slate-800/80 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={zip.length !== 5}
                className="px-6 py-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl font-medium transition-all flex items-center gap-2 hover:scale-105 active:scale-95"
              >
                <Search className="w-5 h-5" />
                <span className="hidden sm:inline">Search</span>
              </button>
            </motion.div>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              onClick={handleBrowseAll}
              className="mt-4 text-sm text-slate-500 hover:text-blue-400 transition-colors"
            >
              or browse all {stats.reps} representatives &rarr;
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* Stats bar */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="border-y border-slate-800 bg-slate-900/50"
      >
        <div className="max-w-7xl mx-auto px-4 py-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-white">{stats.reps}</p>
            <p className="text-xs text-slate-500">Legislators Tracked</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-400">{stats.dems}</p>
            <p className="text-xs text-slate-500">Democrats</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-400">{stats.reps_r}</p>
            <p className="text-xs text-slate-500">Republicans</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-purple-400">{stats.bills}</p>
            <p className="text-xs text-slate-500">Bills Analyzed</p>
          </div>
        </div>
      </motion.section>

      {/* Results */}
      <section ref={resultsRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-20"
            >
              <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-400">Finding your representatives...</p>
            </motion.div>
          )}

          {searched && !loading && results.length === 0 && (
            <motion.div
              key="no-results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center py-20"
            >
              <p className="text-xl text-slate-400 mb-2">
                No representatives found for zip code {zip}
              </p>
              <p className="text-sm text-slate-500">
                Make sure you entered a valid Arizona zip code, or try browsing
                all representatives.
              </p>
            </motion.div>
          )}

          {searched && !loading && results.length > 0 && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <h2 className="text-xl font-semibold mb-6">
                Your Representatives for{" "}
                <span className="text-blue-400">{zip}</span>
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {results.map((rep, i) => (
                  <RepCard key={rep.id} rep={rep} index={i} />
                ))}
              </div>
            </motion.div>
          )}

          {showAll && (
            <motion.div
              key="all"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <h2 className="text-xl font-semibold mb-6">
                All Arizona Representatives ({allReps.length})
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {allReps.map((rep, i) => (
                  <RepCard key={rep.id} rep={rep} index={i} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
}
