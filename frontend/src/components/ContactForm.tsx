"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, Mail } from "lucide-react";

interface ContactFormProps {
  repName: string;
  repEmail: string;
  district: string;
}

export default function ContactForm({ repName, repEmail, district }: ContactFormProps) {
  const [issue, setIssue] = useState("");
  const [copied, setCopied] = useState(false);

  const emailDraft = issue.trim()
    ? `Dear Representative ${repName.split(" ").pop()},

I am a constituent in District ${district}, and I am writing to express my concerns about ${issue}.

As someone directly affected by legislation in this area, I believe it is important for my elected representative to understand the impact of these policies on our community.

I would appreciate the opportunity to learn more about your position on this matter and any upcoming legislation you may be sponsoring or supporting.

Thank you for your time and service.

Sincerely,
[Your Name]
[Your Address]`
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
          placeholder="e.g., education funding, water rights, housing costs..."
          className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
        />
      </div>

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

          <a
            href={`mailto:${repEmail}?subject=Constituent Concern: ${encodeURIComponent(issue)}&body=${encodeURIComponent(emailDraft)}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Mail className="w-4 h-4" />
            Open in Email Client
          </a>
        </motion.div>
      )}
    </motion.div>
  );
}
