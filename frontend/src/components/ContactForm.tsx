"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, Mail, FileText } from "lucide-react";
import { Bill } from "@/lib/data";

interface ContactFormProps {
  repName: string;
  repEmail: string;
  district: string;
  bills: Bill[];
  sayVsDoScore?: number | null;
}

export default function ContactForm({ repName, repEmail, district, bills, sayVsDoScore }: ContactFormProps) {
  const [issue, setIssue] = useState("");
  const [copied, setCopied] = useState(false);

  const lastName = repName.split(" ").pop();

  // Find bills matching the user's issue
  const matchingBills = issue.trim()
    ? bills.filter((b) => {
        const search = issue.toLowerCase();
        return (
          b.topic.toLowerCase().includes(search) ||
          b.title.toLowerCase().includes(search) ||
          b.plain_english.toLowerCase().includes(search)
        );
      })
    : [];

  const billReference =
    matchingBills.length > 0
      ? `\n\nI noticed you have sponsored legislation related to this topic, including ${matchingBills
          .slice(0, 3)
          .map((b) => `${b.identifier} ("${b.title}")`)
          .join(", ")}. I would like to understand your goals for ${matchingBills.length === 1 ? "this bill" : "these bills"} and how ${matchingBills.length === 1 ? "it" : "they"} will impact our community.`
      : `\n\nI was unable to find specific legislation you have sponsored on this topic, and I would appreciate knowing your position and whether you plan to introduce or support related legislation.`;

  const emailDraft = issue.trim()
    ? `Dear Representative ${lastName},

I am a constituent in District ${district}, and I am writing to share my concerns about ${issue}.

As someone directly affected by legislation in this area, I believe it is important for my elected representative to understand the impact of these policies on our community.${billReference}

I would appreciate the opportunity to learn more about your position on this matter and any upcoming legislation you may be sponsoring or supporting.

Thank you for your time and service to District ${district}.

Sincerely,
[Your Name]
[Your Address in District ${district}]`
    : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(emailDraft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="space-y-4"
    >
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          What issue do you care about?
        </label>
        <input
          type="text"
          value={issue}
          onChange={(e) => setIssue(e.target.value)}
          placeholder="e.g., education, water, housing, taxes, public safety..."
          className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
        />
      </div>

      {/* Matching bills hint */}
      {issue.trim() && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 text-xs"
        >
          <FileText className="w-3.5 h-3.5 text-slate-500" />
          {matchingBills.length > 0 ? (
            <span className="text-green-400">
              Found {matchingBills.length} related bill{matchingBills.length !== 1 ? "s" : ""} — referenced in your email
            </span>
          ) : (
            <span className="text-amber-400">
              No matching bills found — email will ask about their position
            </span>
          )}
        </motion.div>
      )}

      {emailDraft && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="space-y-3"
        >
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">Generated Email Draft</span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" /> Copy
                  </>
                )}
              </button>
            </div>
            <pre className="text-sm text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
              {emailDraft}
            </pre>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href={`mailto:${repEmail}?subject=Constituent Concern: ${encodeURIComponent(issue)}&body=${encodeURIComponent(emailDraft)}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Mail className="w-4 h-4" />
              Open in Email Client
            </a>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Copy className="w-4 h-4" />
              {copied ? "Copied!" : "Copy to Clipboard"}
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
