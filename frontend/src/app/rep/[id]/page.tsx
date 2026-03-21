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
} from "lucide-react";
import Link from "next/link";
import {
  Rep,
  getRepById,
  getAllReps,
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = decodeURIComponent(params.id as string);
    getRepById(id).then((r) => {
      setRep(r || null);
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
  const actualBills = rep.bills.filter(
    (b) => !b.classification.includes("resolution") && !b.classification.includes("memorial")
  );
  const activityScore = Math.min(
    100,
    Math.round(
      (actualBills.length / 20) * 40 +
        (progressRate / 100) * 35 +
        (Math.min(topicData.length, 6) / 6) * 25
    )
  );

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
              <div className="flex items-center gap-3 mb-2">
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
                  <a
                    href={`mailto:${rep.email}`}
                    className="text-blue-400 hover:underline"
                  >
                    {rep.email}
                  </a>
                </span>
              </div>

              {/* Quick stats */}
              <div className="flex flex-wrap gap-4 mt-4">
                <div className="glass-card rounded-lg px-4 py-2">
                  <p className="text-lg font-bold text-white">{rep.bills.length}</p>
                  <p className="text-xs text-slate-400">Total Bills</p>
                </div>
                <div className="glass-card rounded-lg px-4 py-2">
                  <p className="text-lg font-bold text-white">{progressRate}%</p>
                  <p className="text-xs text-slate-400">Advanced</p>
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
          {/* Left column - Score + Radar */}
          <div className="space-y-6">
            {/* Activity Score */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-xl p-6 text-center"
            >
              <h3 className="text-sm font-medium text-slate-400 mb-4 flex items-center justify-center gap-2">
                <Scale className="w-4 h-4" />
                Legislative Activity Score
              </h3>
              <ScoreGauge score={activityScore} label="Activity Score" />
              <p className="text-xs text-slate-500 mt-3">
                Based on bill count, progress rate, and topic diversity
              </p>
            </motion.div>

            {/* Radar Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card rounded-xl p-6"
            >
              <h3 className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                <BarChart3Icon />
                Topic Focus
              </h3>
              <TopicRadar data={topicData} partyColor={partyColor} />
            </motion.div>

            {/* Ethics */}
            <EthicsDisclaimer billCount={rep.bills.length} />
          </div>

          {/* Right column - Bills + Contact */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bills */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card rounded-xl p-6"
            >
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                Sponsored Bills ({rep.bills.length})
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
