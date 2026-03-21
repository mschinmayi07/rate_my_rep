"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Mail,
  Building2,
  Scale,
  FileText,
  MessageSquare,
  Sparkles,
  Target,
  Handshake,
  Zap,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import {
  Rep,
  RepScores,
  getRepById,
  getScoreForRep,
  getPartyColor,
  getChamberLabel,
  getTopicBreakdown,
  getBillProgressRate,
} from "@/lib/data";
import ScoreGauge from "@/components/ScoreGauge";
import TopicRadar from "@/components/TopicRadar";
import BillList from "@/components/BillList";
import ContactForm from "@/components/ContactForm";
import EthicsDisclaimer from "@/components/EthicsDisclaimer";

export default function RepPage() {
  const params = useParams();
  const [rep, setRep] = useState<Rep | null>(null);
  const [scores, setScores] = useState<RepScores | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = decodeURIComponent(params.id as string);
    Promise.all([getRepById(id), getScoreForRep(id)]).then(([r, s]) => {
      setRep(r || null);
      setScores(s);
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
  const progressRate = getBillProgressRate(rep.bills);

  // Use Gemini score if available, else compute locally
  const activityScore = scores?.activity_score ?? (() => {
    const actualBills = rep.bills.filter(
      (b) => !b.classification.includes("resolution") && !b.classification.includes("memorial")
    );
    return Math.min(100, Math.round(
      (actualBills.length / 20) * 40 + (progressRate / 100) * 35 + (Math.min(topicData.length, 6) / 6) * 25
    ));
  })();

  const impactColor = scores?.impact_rating === "High Impact" ? "#22c55e" : scores?.impact_rating === "Moderate Impact" ? "#f59e0b" : "#94a3b8";

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
                {scores?.legislative_style && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-700 text-slate-300">
                    {scores.legislative_style}
                  </span>
                )}
                {scores?.impact_rating && (
                  <span
                    className="px-3 py-1 rounded-full text-xs font-medium"
                    style={{ backgroundColor: `${impactColor}20`, color: impactColor }}
                  >
                    {scores.impact_rating}
                  </span>
                )}
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

              {/* AI Summary */}
              {scores?.summary && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50"
                >
                  <div className="flex items-center gap-1.5 text-xs text-purple-400 mb-1">
                    <Sparkles className="w-3 h-3" />
                    AI Analysis
                  </div>
                  <p className="text-sm text-slate-300">{scores.summary}</p>
                </motion.div>
              )}

              {/* Quick stats */}
              <div className="flex flex-wrap gap-4 mt-4">
                <div className="glass-card rounded-lg px-4 py-2">
                  <p className="text-lg font-bold text-white">{rep.bills.length}</p>
                  <p className="text-xs text-slate-400">Total Bills</p>
                </div>
                <div className="glass-card rounded-lg px-4 py-2">
                  <p className="text-lg font-bold text-white">{scores?.bill_progress_rate ?? progressRate}%</p>
                  <p className="text-xs text-slate-400">Advanced</p>
                </div>
                <div className="glass-card rounded-lg px-4 py-2">
                  <p className="text-lg font-bold text-white">{topicData.length}</p>
                  <p className="text-xs text-slate-400">Topics</p>
                </div>
                {scores?.bipartisan_potential != null && (
                  <div className="glass-card rounded-lg px-4 py-2 group relative">
                    <p className="text-lg font-bold text-white">{scores.bipartisan_potential}%</p>
                    <p className="text-xs text-slate-400">Cross-Party Appeal</p>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-700 rounded-lg text-xs text-slate-300 w-48 text-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      How likely this rep&apos;s bills would get support from the other party
                    </div>
                  </div>
                )}
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
              className="glass-card rounded-xl p-6 text-center"
            >
              <h3 className="text-sm font-medium text-slate-400 mb-4 flex items-center justify-center gap-2">
                <Scale className="w-4 h-4" />
                Say vs. Do Score
              </h3>
              <ScoreGauge score={activityScore} label="Say vs. Do" />
              {scores?.topic_focus && (
                <p className="text-xs text-slate-400 mt-3 italic">
                  {scores.topic_focus}
                </p>
              )}
              <p className="text-xs text-slate-500 mt-2 px-2">
                Measures how well this rep&apos;s legislative actions align with their stated priorities. Higher = more follow-through.
              </p>
            </motion.div>

            {/* Key Issues */}
            {scores?.key_issues && scores.key_issues.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="glass-card rounded-xl p-6"
              >
                <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Key Issues
                </h3>
                <div className="flex flex-wrap gap-2">
                  {scores.key_issues.map((issue, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-full text-sm font-medium bg-blue-500/15 text-blue-300 border border-blue-500/20"
                    >
                      {issue}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Strengths & Gaps */}
            {(scores?.strengths || scores?.gaps) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass-card rounded-xl p-6 space-y-4"
              >
                {scores?.strengths && (
                  <div>
                    <h4 className="text-xs font-medium text-green-400 mb-1 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Strengths
                    </h4>
                    <p className="text-sm text-slate-300">{scores.strengths}</p>
                  </div>
                )}
                {scores?.gaps && (
                  <div>
                    <h4 className="text-xs font-medium text-amber-400 mb-1 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Gaps
                    </h4>
                    <p className="text-sm text-slate-300">{scores.gaps}</p>
                  </div>
                )}
                {scores?.constituent_relevance && (
                  <div>
                    <h4 className="text-xs font-medium text-cyan-400 mb-1 flex items-center gap-1.5">
                      <Handshake className="w-3.5 h-3.5" />
                      District Relevance
                    </h4>
                    <p className="text-sm text-slate-300">{scores.constituent_relevance}</p>
                  </div>
                )}
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
                What They Actually Work On
              </h3>
              <p className="text-xs text-slate-500 mb-2">
                Breakdown of bill topics — shows where this rep spends their legislative energy. Each axis = % of bills in that category.
              </p>
              <TopicRadar data={topicData} partyColor={partyColor} />
            </motion.div>

            {/* Ethics */}
            <EthicsDisclaimer billCount={rep.bills.length} />
          </div>

          {/* Right column - Notable Bills + All Bills + Contact */}
          <div className="lg:col-span-2 space-y-6">
            {/* Notable Bills (from Gemini) */}
            {scores?.notable_bills && scores.notable_bills.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-xl p-6"
              >
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  Notable Bills
                  <span className="text-xs font-normal text-purple-400 flex items-center gap-1 ml-2">
                    <Sparkles className="w-3 h-3" /> AI-identified
                  </span>
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {scores.notable_bills.map((nb, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * i }}
                      className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-amber-500/30 transition-colors"
                    >
                      <p className="text-sm font-bold text-amber-300 mb-1">{nb.identifier}</p>
                      <p className="text-xs text-slate-400 mb-2">{nb.title}</p>
                      <p className="text-xs text-slate-300">{nb.why_notable}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* All Bills */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card rounded-xl p-6"
            >
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                All Sponsored Bills ({rep.bills.length})
              </h3>
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
