"use client";

import { Info } from "lucide-react";

interface EthicsDisclaimerProps {
  billCount: number;
  statementCount?: number;
  compact?: boolean;
}

export default function EthicsDisclaimer({ billCount, statementCount = 0, compact = false }: EthicsDisclaimerProps) {
  if (compact) {
    return (
      <div className="flex items-start gap-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 text-xs text-slate-400">
        <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-blue-400" />
        <span>
          Based on {billCount} bills and {statementCount} statements. Scores are computed
          using topic matching, not AI opinion. Always verify with official sources.
        </span>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-5 border border-amber-500/20">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
          <Info className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <h4 className="font-medium text-amber-200 mb-1">Transparency Notice</h4>
          <ul className="text-sm text-slate-400 space-y-1">
            <li>
              &bull; Analysis based on <strong className="text-slate-300">{billCount} bills</strong>
              {statementCount > 0 && (
                <> and <strong className="text-slate-300">{statementCount} public statements</strong></>
              )}
            </li>
            <li>&bull; Bill data sourced from OpenStates (open-source legislative API)</li>
            <li>&bull; Statements sourced from Ballotpedia and AZ Clean Elections voter guides</li>
            <li>&bull; Topics extracted by Google Gemini AI, score uses deterministic formula</li>
            <li>&bull; Score formula: Topic Match Rate (primary = 1.0, co-sponsor only = 0.3, no bills = 0.0)</li>
            <li>&bull; This tool is nonpartisan and does not endorse any candidate or party</li>
            <li>&bull; Always verify information through official legislative records</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
