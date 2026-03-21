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


ADVANCED_ACTIONS = {
    "senate second reading", "senate third reading",
    "house second reading", "house third reading",
    "transmitted to governor", "signed", "passed",
    "transmit to secretary of state", "transmit to governor",
    "dpa",  # do pass amended (committee passed it)
}

def compute_math_score(bills):
    """
    Compute the Say vs Do score using a transparent weighted formula.

    Components (out of 100):
    ┌─────────────────────────────────────────────────────┐
    │  Bill Progress Rate      × 0.40  (40%)             │
    │  Substantive Bill Ratio  × 0.25  (25%)             │
    │  Topic Diversity         × 0.20  (20%)             │
    │  Bill Volume             × 0.15  (15%)             │
    └─────────────────────────────────────────────────────┘
    """
    if not bills:
        return {
            "say_vs_do_score": 0,
            "bill_progress_pct": 0,
            "substantive_ratio": 0,
            "topic_diversity_pct": 0,
            "bill_volume_pct": 0,
            "formula_breakdown": "No bills to score",
        }

    # 1. Bill Progress Rate (40%) — what % of bills advanced past committee?
    advanced = 0
    for b in bills:
        action = b.get("latest_action", "").lower()
        if any(keyword in action for keyword in ADVANCED_ACTIONS):
            advanced += 1
    progress_pct = (advanced / len(bills)) * 100

    # 2. Substantive Bill Ratio (25%) — real bills vs resolutions/memorials
    substantive = [b for b in bills if
                   "resolution" not in b.get("classification", ["bill"])[0].lower() and
                   "memorial" not in b.get("title", "").lower() and
                   "death resolution" not in b.get("title", "").lower()]
    substantive_pct = (len(substantive) / len(bills)) * 100

    # 3. Topic Diversity (20%) — how many different topics? (normalized to max 8)
    topics = set(b.get("topic", "unknown") for b in bills)
    diversity_pct = min(len(topics) / 8, 1.0) * 100

    # 4. Bill Volume — raw count (no normalization)
    volume_pct = len(bills)  # raw number, not normalized

    # Weighted score
    score = (
        progress_pct * 0.40 +
        substantive_pct * 0.25 +
        diversity_pct * 0.20 +
        volume_pct * 0.15
    )
    score = round(min(score, 100))

    breakdown = (
        f"Progress: {progress_pct:.0f}% × 0.40 = {progress_pct * 0.40:.1f} | "
        f"Substantive: {substantive_pct:.0f}% × 0.25 = {substantive_pct * 0.25:.1f} | "
        f"Diversity: {diversity_pct:.0f}% × 0.20 = {diversity_pct * 0.20:.1f} | "
        f"Volume: {volume_pct:.0f}% × 0.15 = {volume_pct * 0.15:.1f} | "
        f"Total: {score}"
    )

    return {
        "say_vs_do_score": score,
        "bill_progress_pct": round(progress_pct),
        "substantive_ratio": round(substantive_pct),
        "topic_diversity_pct": round(diversity_pct),
        "bill_volume_pct": round(volume_pct),
        "formula_breakdown": breakdown,
    }


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

        # Step 1: Compute math score from bills
        math = compute_math_score(rep["bills"])
        print(f"  Math score: {math['say_vs_do_score']} ({math['formula_breakdown']})")

        # Step 2: Get Gemini qualitative analysis
        result = score_rep(model, rep)

        if result:
            # Override Gemini's subjective score with our math score
            result["activity_score"] = math["say_vs_do_score"]
            result["bill_progress_rate"] = math["bill_progress_pct"]
            # Add math breakdown for transparency
            result["score_breakdown"] = {
                "bill_progress": {"value": math["bill_progress_pct"], "weight": 40},
                "substantive_ratio": {"value": math["substantive_ratio"], "weight": 25},
                "topic_diversity": {"value": math["topic_diversity_pct"], "weight": 20},
                "bill_volume": {"value": math["bill_volume_pct"], "weight": 15},
            }
            result["formula_breakdown"] = math["formula_breakdown"]

            # Set style label based on math score
            s = math["say_vs_do_score"]
            if s >= 80:
                result["legislative_style"] = "Strong Follow-Through"
            elif s >= 60:
                result["legislative_style"] = "Mostly Aligned"
            elif s >= 40:
                result["legislative_style"] = "Mixed Record"
            elif s >= 20:
                result["legislative_style"] = "Weak Alignment"
            else:
                result["legislative_style"] = "All Talk"

            scored.append({
                "id": rep["id"],
                "name": rep["name"],
                "scores": result,
            })
            print(f"  -> Say vs Do: {math['say_vs_do_score']}, Style: {result['legislative_style']}")
        else:
            errors.append(rep["name"])
            scored.append({
                "id": rep["id"],
                "name": rep["name"],
                "scores": {
                    "activity_score": math["say_vs_do_score"],
                    "bill_progress_rate": math["bill_progress_pct"],
                    "score_breakdown": {
                        "bill_progress": {"value": math["bill_progress_pct"], "weight": 40},
                        "substantive_ratio": {"value": math["substantive_ratio"], "weight": 25},
                        "topic_diversity": {"value": math["topic_diversity_pct"], "weight": 20},
                        "bill_volume": {"value": math["bill_volume_pct"], "weight": 15},
                    },
                    "formula_breakdown": math["formula_breakdown"],
                    "topic_focus": "Qualitative analysis unavailable",
                    "notable_bills": [],
                    "legislative_style": "Strong Follow-Through" if s >= 80 else "Mixed Record",
                    "summary": "Score computed mathematically. AI analysis unavailable.",
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
