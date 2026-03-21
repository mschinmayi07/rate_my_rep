import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RateMyRep — Do Your Reps Keep Their Promises?",
  description:
    "Track how Arizona legislators vote vs. what they say. Transparent, nonpartisan accountability.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen">
        <nav className="fixed top-0 w-full z-50 glass-card border-b border-slate-700/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                R
              </div>
              <span className="text-lg font-bold">
                Rate<span className="gradient-text">My</span>Rep
              </span>
            </a>
            <div className="flex items-center gap-4 text-sm text-slate-400">
              <span className="hidden sm:inline">Arizona Legislature Tracker</span>
              <a
                href="https://openstates.org"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                Data: OpenStates
              </a>
            </div>
          </div>
        </nav>

        <main className="pt-16">{children}</main>

        <footer className="border-t border-slate-800 mt-20">
          <div className="max-w-7xl mx-auto px-4 py-8 text-center text-sm text-slate-500">
            <p className="mb-2">
              RateMyRep is a nonpartisan transparency tool built at HackASU 2026.
            </p>
            <p>
              Data sourced from{" "}
              <a href="https://openstates.org" className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
                OpenStates
              </a>{" "}
              and{" "}
              <a href="https://legiscan.com" className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
                LegiScan
              </a>
              . Scores are AI-generated and should not be taken as definitive assessments.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
