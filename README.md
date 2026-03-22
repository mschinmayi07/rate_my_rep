# RateMyRep

**Do your reps walk the talk?** A transparency tool that compares what Arizona legislators *say* they'll do versus what they *actually* legislate.

Built at ASU Claude Builder Club Hackathon 2026.

## How It Works

1. **Enter your zip code** → see your Arizona representatives
2. **View their Say vs. Do score** → how well their bills match their stated priorities
3. **Read their plain-English summary** → AI-generated overview of what your rep actually focuses on
4. **Explore their bills** → 300+ bills per rep, grouped by topic
5. **Contact them** → AI-generated email draft based on issues you care about

## Say vs. Do Score

The score compares a rep's **public statements** (campaign promises, voter guide submissions) against their **actual legislative record** (bills they sponsor).

**Formula:**
```
Score = (sum of topic weights) / (number of stated topics) × 100
```

**Weight per topic:**
| Match Type | Weight | Meaning |
|---|---|---|
| Primary bill on topic | 1.0 | They authored legislation —> full follow-through |
| Co-sponsor only | 0.3 | They signed onto someone else's bill —> partial credit |
| No bills | 0.0 | They promised but didn't act |

**Example:** A rep states 4 priorities. They have primary bills on 2, co-sponsor only on 1, and nothing on 1.
```
(1.0 + 1.0 + 0.3 + 0.0) / 4 × 100 = 57%
```

## Data Sources

| Source | What | How |
|---|---|---|
| [OpenStates API](https://openstates.org/) | Bills, sponsors, actions | `scripts/fetch_reps.py`, `scripts/fetch_bills.py` |
| [Ballotpedia](https://ballotpedia.org/) | Campaign statements | `scripts/scrape_statements.py` |
| [AZ Clean Elections Voter Guide](https://www.azcleanelections.gov/voter-education-guide) | Official candidate statements | ` Parsed via Claude PDF extraction and merged using Claude ` |
| [Google Gemini 2.5 Flash](https://ai.google.dev/) | Topic tagging, summaries | `scripts/tag_smart.py`, `scripts/generate_summaries.py` |

## Tech Stack

- **Frontend:** Next.js 15, React, Tailwind CSS, Framer Motion, Recharts
- **Data Pipeline:** Python, OpenStates API, Google Gemini API, TinyFish API (web scraping)
- **PDF Processing:** Claude (extraction + merging of AZ Clean Elections voter guides)
- **Scoring:** Deterministic formula (not AI opinion)
- **Deployment:** Vercel

## Project Structure

```
ratemyrep/
├── archive/         Old/intermediate files (preserved, not used)
├── data/            Final production data
│   ├── az_reps_final.json          29 reps, 300+ bills each, topic-tagged
│   ├── az_reps_with_statements_*.json   Merged statements from all sources
│   └── zip_to_reps.json            Zip code → rep name mapping
├── scripts/         Python data pipeline
│   ├── fetch_reps.py               Fetch AZ legislators from OpenStates
│   ├── fetch_bills.py              Fetch bills per rep
│   ├── tag_smart.py                Tag bills with topics via Gemini
│   ├── scrape_statements.py        Scrape public statements for each AZ representative from Ballotpedia using the TinyFish web agent API
│   ├── fix_statements.py           Clean raw TinyFish API output into properly formatted statement arrays
│   ├── compute_say_vs_do.py        Compute Say vs Do scores
│   └── generate_summaries.py       Generate plain English summaries
└── frontend/        Next.js web app
    ├── src/
    │   ├── app/                    Pages (landing, rep dashboard)
    │   ├── components/             UI components
    │   └── lib/data.ts             Data layer and types
    └── public/data/                Production JSON served to browser
```

## Running Locally

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Team

Built at HackASU 2026 — Arizona State University

- **Person 1:** Data pipeline (bills, topics, zip codes)
- **Person 2:** Statement scraping, cleaning and merging
- **Person 3:** Frontend, scoring, AI summaries

## Ethics & Transparency

- This tool is **nonpartisan** and does not endorse any candidate or party
- Bill data is sourced from **OpenStates** (open-source legislative API)
- Statements are sourced from **Ballotpedia** (scraped via TinyFish API) and **AZ Clean Elections voter guides** (extracted via Claude PDF parsing), and merged using Claude AI
- Topic tagging uses **Google Gemini AI**; the score itself uses a **deterministic formula**
- Always verify information through official legislative records
