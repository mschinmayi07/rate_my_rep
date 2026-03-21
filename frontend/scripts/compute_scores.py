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

SCORE_PROMPT = """You are a nonpartisan legislative analyst. Analyze this Arizona state legislator's sponsored bills and provide a JSON assessment.

LEGISLATOR: {name}
PARTY: {party}
CHAMBER: {chamber}
DISTRICT: {district}

SPONSORED BILLS:
{bills_text}

Respond with ONLY valid JSON (no markdown, no code fences):
{{
  "activity_score": <number 0-100, based on bill count, diversity of topics, how far bills advanced>,
  "bill_progress_rate": <number 0-100, percentage of bills that advanced past initial committee>,
  "topic_focus": "<one sentence describing what this legislator primarily works on>",
  "notable_bills": [
    {{
      "identifier": "<bill number>",
      "title": "<bill title>",
      "why_notable": "<one sentence explaining significance>"
    }}
  ],
  "legislative_style": "<one of: 'Very Active', 'Active', 'Moderate', 'Low Activity'>",
  "summary": "<2-3 sentence nonpartisan summary of this legislator's legislative record this session>",
  "bipartisan_potential": <number 0-100, how likely bills cross party lines based on topic universality>,
  "key_issues": ["<top 3 issue keywords this rep cares about most>"],
  "impact_rating": "<one of: 'High Impact', 'Moderate Impact', 'Low Impact'> based on how consequential the bills are to everyday Arizonans",
  "constituent_relevance": "<one sentence on how this rep's work directly affects their district constituents>",
  "strengths": "<one sentence on what this legislator does well>",
  "gaps": "<one sentence on areas or topics this legislator hasn't addressed>"
}}

Scoring guidance:
- 80-100: Many bills, diverse topics, bills advancing through chambers
- 60-79: Good number of bills, some advancing, reasonable topic diversity
- 40-59: Average activity, some bills but limited advancement
- 20-39: Few substantive bills, mostly resolutions or stalled
- 0-19: Very little legislative activity
- Resolutions (death resolutions, memorials) should count less than substantive bills
- Bills that passed multiple readings or reached the other chamber score higher
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
