import json
import time
import google.generativeai as genai

API_KEY = "AIzaSyAus-yinNhxgSdXneN6k3ZsuX0OKosims4"
genai.configure(api_key=API_KEY)
model = genai.GenerativeModel("gemini-2.5-flash")

with open("frontend/public/data/az_reps_scored.json", "r", encoding="utf-8") as f:
    scored = json.load(f)

with open("frontend/public/data/az_reps_final.json", "r", encoding="utf-8") as f:
    reps = json.load(f)

# Build bill lookup by rep id
bill_lookup = {}
for r in reps:
    bill_lookup[r["id"]] = r.get("bills", [])

for i, rep in enumerate(scored):
    print(f"\n[{i+1}/{len(scored)}] {rep['name']}...")

    bills = bill_lookup.get(rep["id"], [])
    bills_by_topic = rep.get("bills_by_topic", {})
    say_topics = rep.get("say_topics", [])
    score = rep.get("score")
    primary_bills = rep.get("primary_bills", 0)
    cosponsor_bills = rep.get("cosponsor_bills", 0)
    topic_matches = rep.get("topic_matches", [])

    # Build context for Gemini
    top_topics = sorted(bills_by_topic.items(), key=lambda x: x[1].get("primary", 0), reverse=True)[:5]
    topic_summary = ", ".join(f"{t.replace('_',' ')} ({v['primary']} primary, {v['cosponsor']} co-sponsored)" for t, v in top_topics)

    # Sample primary bill titles (up to 10)
    primary_bill_titles = [b["title"] for b in bills if b.get("sponsor_type") == "primary"][:10]
    bill_titles_str = "\n".join(f"- {t}" for t in primary_bill_titles)

    matched = [m for m in topic_matches if m["weight"] == 1.0]
    partial = [m for m in topic_matches if m["weight"] == 0.3]
    missed = [m for m in topic_matches if m["weight"] == 0.0]

    chamber = "Senator" if rep.get("chamber") == "upper" else "Representative"
    party_label = "Democrat" if "Democrat" in rep.get("party", "") else "Republican"

    prompt = f"""Write a 2-sentence plain English summary of Arizona {chamber} {rep['name']} ({party_label}, District {rep['district']}).

DATA:
- Total bills: {rep['total_bills']} ({primary_bills} primary, {cosponsor_bills} co-sponsored)
- Top legislative areas: {topic_summary}
- Sample primary bills: {bill_titles_str}
- Say vs Do score: {score}% (they stated {len(say_topics)} priorities, matched {len(matched)} with primary bills, {len(partial)} with co-sponsor only, missed {len(missed)})
- Stated priorities: {', '.join(t.replace('_',' ') for t in say_topics)}

RULES:
- Write exactly 2 sentences in plain, accessible language
- First sentence: describe what they actually focus on legislatively (based on their PRIMARY bills)
- Second sentence: note their Say vs Do alignment — do they follow through on promises?
- Use specific numbers where helpful (e.g. "sponsors X bills on education")
- Do NOT use political jargon
- Be factual and neutral, not promotional
- Example style: "Representative X focuses primarily on education and public safety, sponsoring 15 bills on school funding and 8 on criminal justice reform. Their Say vs. Do score of 77% shows they follow through on most promises, though they haven't introduced primary legislation on healthcare despite stating it as a priority."
"""

    try:
        response = model.generate_content(prompt)
        summary = response.text.strip()
        # Remove any markdown formatting
        summary = summary.replace("**", "").replace("*", "")
        rep["plain_english_summary"] = summary
        print(f"  Summary: {summary[:100]}...")
    except Exception as e:
        print(f"  ERROR: {e}")
        rep["plain_english_summary"] = ""

    time.sleep(1)

# Save updated scored data
with open("frontend/public/data/az_reps_scored.json", "w", encoding="utf-8") as f:
    json.dump(scored, f, indent=2, ensure_ascii=False)

print(f"\n\nDONE! Generated summaries for {sum(1 for r in scored if r.get('plain_english_summary'))} reps")
