"""
Pre-compute Legislative Activity Scores for AZ reps using Gemini 2.5 Flash.
Phase A: Bills-only scoring (no statements needed).
"""

import json
import time
import os
import google.generativeai as genai

API_KEY = "AIzaSyAus-yinNhxgSdXneN6k3ZsuX0OKosims4"
genai.configure(api_key=API_KEY)

MODEL = "gemini-2.5-flash"

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "data")
INPUT_FILE = os.path.join(DATA_DIR, "az_reps_final.json")
OUTPUT_FILE = os.path.join(DATA_DIR, "az_reps_scored.json")

SCORE_PROMPT = """You are a nonpartisan legislative analyst performing a "Say vs. Do" analysis.

Your job: Figure out what this legislator SAYS they care about (based on bill titles, party platform positions, and their stated topics), then compare that against what they actually DO (which bills advanced, which stalled, whether they follow through).

LEGISLATOR: {name}
PARTY: {party} (Use known {party} party platform priorities for Arizona as the "Say" baseline)
CHAMBER: {chamber}
DISTRICT: {district}

SPONSORED BILLS:
{bills_text}

Respond with ONLY valid JSON (no markdown, no code fences):
{{
  "activity_score": <number 0-100, the SAY VS DO score — how well their actions match their stated/party priorities. 100 = perfect follow-through, 0 = all talk no action>,
  "bill_progress_rate": <number 0-100, percentage of bills that advanced past initial committee>,
  "topic_focus": "<one sentence: what they SAY they care about vs what they actually legislate on>",
  "notable_bills": [
    {{
      "identifier": "<bill number>",
      "title": "<bill title>",
      "why_notable": "<one sentence: does this bill match or contradict their stated priorities?>"
    }}
  ],
  "legislative_style": "<one of: 'Strong Follow-Through', 'Mostly Aligned', 'Mixed Record', 'Weak Alignment'>",
  "summary": "<2-3 sentence nonpartisan Say vs Do summary — what do they promise vs what do they deliver?>",
  "bipartisan_potential": <number 0-100, how likely their bills would get support from the opposing party based on topic universality>,
  "key_issues": ["<top 3 issue keywords this rep focuses on>"],
  "impact_rating": "<one of: 'High Impact', 'Moderate Impact', 'Low Impact'> based on how consequential the bills are to everyday Arizonans",
  "constituent_relevance": "<one sentence on how this rep's work directly affects their district constituents>",
  "strengths": "<one sentence on where this rep follows through on promises>",
  "gaps": "<one sentence on where this rep talks the talk but doesn't walk the walk>"
}}

Say vs Do scoring guidance:
- 80-100: Strong follow-through. Many substantive bills matching stated priorities, bills advancing through chambers
- 60-79: Mostly aligned. Good effort but some priorities not backed by legislation or bills stalling
- 40-59: Mixed record. Says one thing but bills don't fully match, or bills aren't progressing
- 20-39: Weak alignment. Big gap between stated priorities and actual legislative work
- 0-19: All talk. Almost no substantive bills matching their claimed positions
- Resolutions (death resolutions, memorials) should count less than substantive bills
- Bills that passed multiple readings or reached the other chamber score higher
- Look for contradictions: does a rep claim to care about X but sponsor zero bills on X?
"""


def format_bills(bills):
    lines = []
    for b in bills:
        classification = b.get("classification", ["bill"])[0]
        lines.append(
            f"- {b['identifier']} ({classification}): \"{b['title']}\" | "
            f"Topic: {b.get('topic', 'unknown')} | "
            f"Latest action: {b['latest_action']} ({b['latest_action_date']}) | "
            f"Plain English: {b.get('plain_english', 'N/A')}"
        )
    return "\n".join(lines) if lines else "No bills found."


def score_rep(model, rep):
    bills_text = format_bills(rep["bills"])
    prompt = SCORE_PROMPT.format(
        name=rep["name"],
        party=rep["party"],
        chamber=rep["chamber"],
        district=rep["district"],
        bills_text=bills_text,
    )

    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        # Clean up potential markdown code fences
        if text.startswith("```"):
            text = text.split("\n", 1)[1]
        if text.endswith("```"):
            text = text.rsplit("```", 1)[0]
        text = text.strip()

        result = json.loads(text)
        return result
    except json.JSONDecodeError as e:
        print(f"  JSON parse error for {rep['name']}: {e}")
        print(f"  Raw response: {text[:200]}")
        return None
    except Exception as e:
        print(f"  API error for {rep['name']}: {e}")
        return None


def main():
    print("Loading reps data...")
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        reps = json.load(f)

    print(f"Found {len(reps)} representatives to score.")

    model = genai.GenerativeModel(MODEL)
    scored = []
    errors = []

    for i, rep in enumerate(reps):
        print(f"[{i+1}/{len(reps)}] Scoring {rep['name']} ({rep['party']}, District {rep['district']})...")

        result = score_rep(model, rep)

        if result:
            scored.append({
                "id": rep["id"],
                "name": rep["name"],
                "scores": result,
            })
            print(f"  -> Activity Score: {result.get('activity_score', '?')}, Style: {result.get('legislative_style', '?')}")
        else:
            errors.append(rep["name"])
            # Add a fallback entry
            scored.append({
                "id": rep["id"],
                "name": rep["name"],
                "scores": {
                    "activity_score": None,
                    "bill_progress_rate": None,
                    "topic_focus": "Score unavailable",
                    "notable_bills": [],
                    "legislative_style": "Unknown",
                    "summary": "Scoring data unavailable for this legislator.",
                },
            })

        # Rate limit: ~15 requests/min for free tier
        if i < len(reps) - 1:
            time.sleep(4)

    # Save results
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(scored, f, indent=2, ensure_ascii=False)

    print(f"\nDone! Scored {len(scored) - len(errors)}/{len(scored)} reps successfully.")
    if errors:
        print(f"Errors: {', '.join(errors)}")
    print(f"Output saved to: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
