"use client";

import { motion } from "framer-motion";
import { Rep, getPartyColor, getChamberLabel, slugify, getBillProgressRate } from "@/lib/data";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

interface RepCardProps {
  rep: Rep;
  index: number;
}

export default function RepCard({ rep, index }: RepCardProps) {
  const partyColor = getPartyColor(rep.party);
  const partyShort = rep.party.toLowerCase().includes("democrat") ? "D" : "R";
  const progress = getBillProgressRate(rep.bills);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <Link href={`/rep/${encodeURIComponent(rep.id)}`}>
        <div className="glass-card rounded-xl p-5 hover:border-slate-600 transition-all duration-300 hover:scale-[1.02] cursor-pointer group">
          <div className="flex items-start gap-4">
            {/* Photo */}
            <div
              className="w-16 h-16 rounded-full overflow-hidden border-2 flex-shrink-0"
              style={{ borderColor: partyColor }}
            >
              {rep.image ? (
                <img
                  src={rep.image}
                  alt={rep.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                    (e.target as HTMLImageElement).parentElement!.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-slate-700 text-lg font-bold">${rep.name.charAt(0)}</div>`;
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-700 text-lg font-bold">
                  {rep.name.charAt(0)}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-lg truncate group-hover:text-white transition-colors">
                  {rep.name}
                </h3>
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: partyColor }}
                >
                  {partyShort}
                </span>
              </div>
              <p className="text-sm text-slate-400">
                {getChamberLabel(rep.chamber)} &middot; District {rep.district}
              </p>
              <div className="flex items-center gap-3 mt-2">
                <div className="text-xs text-slate-500">
                  <span className="text-slate-300 font-medium">{rep.bills.length}</span> bills
                </div>
                <div className="text-xs text-slate-500">
                  <span className="text-slate-300 font-medium">{progress}%</span> advanced
                </div>
              </div>
            </div>

            {/* Arrow */}
            <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-blue-400 transition-colors flex-shrink-0 mt-2" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
