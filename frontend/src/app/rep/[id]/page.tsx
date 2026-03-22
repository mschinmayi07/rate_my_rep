"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Mail,
  Building2,
  Scale,
  MessageSquare,
  Quote,
} from "lucide-react";
import Link from "next/link";
import {
  Rep,
  ScoredRep,
  getRepById,
  getScoreForRep,
  getPartyColor,
  getChamberLabel,
  getTopicBreakdown,
  getScoreColor,
  getScoreLabel,
  formatTopic,
  getTopicColor,
} from "@/lib/data";
import ScoreGauge from "@/components/ScoreGauge";
import TopicRadar from "@/components/TopicRadar";
import BillList from "@/components/BillList";
import ContactForm from "@/components/ContactForm";
import ScoreBreakdown from "@/components/ScoreBreakdown";
import EthicsDisclaimer from "@/components/EthicsDisclaimer";

export default function RepPage() {
  const params = useParams();
  const [rep, setRep] = useState<Rep | null>(null);
  const [scored, setScored] = useState<ScoredRep | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = decodeURIComponent(params.id as string);
    Promise.all([getRepById(id), getScoreForRep(id)]).then(([r, s]) => {
      setRep(r || null);
      setScored(s);
      setLoading(false);
    });
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!rep) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-xl text-slate-400">Representative not found</p>
        <Link href="/" className="text-blue-400 hover:underline">
          &larr; Back to search
        </Link>
      </div>
    );
  }

  const partyColor = getPartyColor(rep.party);
  const partyShort = rep.party.includes("Democrat") ? "D" : "R";
  const topicData = getTopicBreakdown(rep.bills);
  const score = scored?.score;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section
        className="relative overflow-hidden border-b border-slate-800"
        style={{
          background: `linear-gradient(135deg, ${partyColor}15 0%, transparent 50%)`,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Back to search
          </Link>

          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Photo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-2 flex-shrink-0"
              style={{ borderColor: partyColor }}
            >
              {rep.image ? (
                <img
                  src={rep.image}
                  alt={rep.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                    (e.target as HTMLImageElement).parentElement!.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-slate-700 text-4xl font-bold">${rep.name.charAt(0)}</div>`;
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-700 text-4xl font-bold">
                  {rep.name.charAt(0)}
                </div>
              )}
            </motion.div>

            {/* Info */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="flex-1"
            >
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-3xl sm:text-4xl font-bold">{rep.name}</h1>
                <span
                  className="px-3 py-1 rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: partyColor }}
                >
                  {partyShort}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" />
                  {getChamberLabel(rep.chamber)} &middot; District {rep.district}
                </span>
                <span className="flex items-center gap-1.5">
                  <Mail className="w-4 h-4" />
                  <a href={`mailto:${rep.email}`} className="text-blue-400 hover:underline">
                    {rep.email}
                  </a>
                </span>
              </div>

              {/* Quick stats */}
              <div className="flex flex-wrap gap-4 mt-4">
                <div className="glass-card rounded-lg px-4 py-2">
                  <p className="text-lg font-bold text-white">{scored?.total_bills ?? rep.bills.length}</p>
                  <p className="text-xs text-slate-400">Total Bills</p>
                </div>
                <div className="glass-card rounded-lg px-4 py-2">
                  <p className="text-lg font-bold text-white">{scored?.primary_bills ?? 0}</p>
                  <p className="text-xs text-slate-400">Primary</p>
                </div>
                <div className="glass-card rounded-lg px-4 py-2">
                  <p className="text-lg font-bold text-white">{scored?.cosponsor_bills ?? 0}</p>
                  <p className="text-xs text-slate-400">Co-Sponsored</p>
                </div>
                <div className="glass-card rounded-lg px-4 py-2">
                  <p className="text-lg font-bold text-white">{topicData.length}</p>
                  <p className="text-xs text-slate-400">Topics</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Dashboard Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left column */}
          <div className="space-y-6">
            {/* Say vs Do Score */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-xl p-6"
            >
              <h3 className="text-sm font-medium text-slate-400 mb-4 flex items-center justify-center gap-2">
                <Scale className="w-4 h-4" />
                Say vs. Do Score
              </h3>

              {score != null ? (
                <>
                  <div className="text-center">
                    <ScoreGauge score={score} label="Say vs. Do" />
                  </div>

                  {/* Topic matching breakdown */}
                  <div className="mt-5 pt-5 border-t border-slate-700/50">
                    <p className="text-xs text-slate-500 font-medium mb-3">How this score was calculated:</p>
                    <ScoreBreakdown
                      sayTopics={scored?.say_topics || []}
                      topicMatches={scored?.topic_matches || []}
                      score={score}
                    />
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-slate-500">No public statements available</p>
                  <p className="text-xs text-slate-600 mt-1">Score cannot be computed without statements data</p>
                </div>
              )}
            </motion.div>

            {/* What They Say - Statements */}
            {scored?.statements && scored.statements.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="glass-card rounded-xl p-6"
              >
                <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                  <Quote className="w-4 h-4" />
                  What They Say ({scored.statements.length} statements)
                </h3>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {scored.statements.map((stmt, i) => (
                    <div
                      key={i}
                      className="p-3 bg-slate-800/50 rounded-lg border-l-2 border-slate-600"
                    >
                      <p className="text-xs text-slate-300 leading-relaxed">
                        &ldquo;{stmt.length > 200 ? stmt.slice(0, 200) + "..." : stmt}&rdquo;
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Stated Topics vs Actual Topics */}
            {scored?.say_topics && scored.say_topics.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass-card rounded-xl p-6"
              >
                <h3 className="text-sm font-medium text-slate-400 mb-3">Stated Priorities</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {scored.say_topics.map((topic) => (
                    <span
                      key={topic}
                      className="px-3 py-1.5 rounded-full text-xs font-medium border"
                      style={{
                        backgroundColor: `${getTopicColor(topic)}15`,
                        borderColor: `${getTopicColor(topic)}40`,
                        color: getTopicColor(topic),
                      }}
                    >
                      {formatTopic(topic)}
                    </span>
                  ))}
                </div>

                <h3 className="text-sm font-medium text-slate-400 mb-3 mt-4">Actually Legislated (Primary)</h3>
                <div className="flex flex-wrap gap-2">
                  {scored.do_topics_primary.map((topic) => {
                    const isSaid = scored.say_topics.includes(topic);
                    return (
                      <span
                        key={topic}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                          isSaid ? "ring-2 ring-green-500/50" : ""
                        }`}
                        style={{
                          backgroundColor: `${getTopicColor(topic)}15`,
                          color: getTopicColor(topic),
                        }}
                      >
                        {formatTopic(topic)}
                      </span>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Radar Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="glass-card rounded-xl p-6"
            >
              <h3 className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                <BarChart3Icon />
                Topic Distribution
              </h3>
              <p className="text-xs text-slate-500 mb-2">
                Breakdown of bill topics — shows where this rep spends their legislative energy.
              </p>
              <TopicRadar data={topicData} partyColor={partyColor} />
            </motion.div>

            {/* Ethics */}
            <EthicsDisclaimer
              billCount={scored?.total_bills ?? rep.bills.length}
              statementCount={scored?.statements?.length ?? 0}
            />
          </div>

          {/* Right column - Bills + Contact */}
          <div className="lg:col-span-2 space-y-6">
            {/* All Bills - grouped by topic */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card rounded-xl p-6"
            >
              <BillList bills={rep.bills} />
            </motion.div>

            {/* Contact */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-card rounded-xl p-6"
            >
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-green-400" />
                Contact Your Rep
              </h3>
              <ContactForm
                repName={rep.name}
                repEmail={rep.email}
                district={rep.district}
                bills={rep.bills}
              />
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}

function BarChart3Icon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 3v18h18" />
      <path d="M18 17V9" />
      <path d="M13 17V5" />
      <path d="M8 17v-3" />
    </svg>
  );
}
