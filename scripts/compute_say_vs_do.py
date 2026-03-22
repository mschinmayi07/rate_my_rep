import json
import time
import google.generativeai as genai

API_KEY = "AIzaSyAus-yinNhxgSdXneN6k3ZsuX0OKosims4"
genai.configure(api_key=API_KEY)
model = genai.GenerativeModel("gemini-2.5-flash")

VALID_TOPICS = [
    "budget_and_finance", "civil_rights_and_elections", "economy", "education",
    "environment_and_water", "government_operations", "healthcare",
    "immigration_and_borders", "infrastructure", "local_government",
    "public_safety", "social_services"
]

# Load data
with open("az_reps_with_statements_bollotpedia_merged_with_votereduguidepdf.json", "r", encoding="utf-8") as f:
    statements_data = json.load(f)

with open("az_reps_final.json", "r", encoding="utf-8") as f:
    bills_data = json.load(f)

# Build lookup: name -> statements
stmt_lookup = {}
for r in statements_data:
    stmt_lookup[r["name"]] = r.get("statements", [])

results = []

for rep in bills_data:
    name = rep["name"]
    bills = rep.get("bills", [])
    statements = stmt_lookup.get(name, [])

    print(f"\nProcessing {name}...")
    print(f"  Bills: {len(bills)}, Statements: {len(statements)}")

    # Skip reps with no data
    if not statements or not bills:
        print(f"  SKIPPED - no statements or no bills")
        results.append({
            "id": rep["id"],
            "name": name,
            "party": rep.get("party", ""),
            "district": rep.get("district", ""),
            "chamber": rep.get("chamber", ""),
            "image": rep.get("image", ""),
            "email": rep.get("email", ""),
            "say_topics": [],
            "do_topics_primary": [],
            "do_topics_cosponsor_only": [],
            "topic_matches": [],
            "score": None,
            "score_breakdown": {},
            "total_bills": len(bills),
            "primary_bills": 0,
            "cosponsor_bills": 0,
            "bills_by_topic": {},
            "statements": statements,
            "has_data": False
        })
        continue

    # Step 1: Extract "Say" topics using Gemini
    stmt_text = "\n".join(f"- {s}" for s in statements)
    prompt = f"""Analyze these public statements from Arizona legislator {name}.

STATEMENTS:
{stmt_text}

What policy topics does this person promise or commit to work on?

Return ONLY topics from this exact list (comma-separated, no explanation):
{', '.join(VALID_TOPICS)}

Rules:
- Only include topics they explicitly promise to work on or mention as priorities
- Do NOT include topics just because they mention them in passing
- Return the comma-separated list only, nothing else"""

    try:
        response = model.generate_content(prompt)
        raw = response.text.strip()
        say_topics = [t.strip() for t in raw.split(",") if t.strip() in VALID_TOPICS]
        print(f"  Say topics: {say_topics}")
    except Exception as e:
        print(f"  ERROR extracting say topics: {e}")
        say_topics = []

    time.sleep(1)  # Rate limiting

    # Step 2: Analyze "Do" - bills by topic and sponsor type
    topic_primary = set()
    topic_cosponsor = set()
    bills_by_topic = {}

    for b in bills:
        topic = b.get("topic")
        sponsor = b.get("sponsor_type", "cosponsor")
        if not topic:
            continue

        if topic not in bills_by_topic:
            bills_by_topic[topic] = {"primary": 0, "cosponsor": 0}

        if sponsor == "primary":
            bills_by_topic[topic]["primary"] += 1
            topic_primary.add(topic)
        else:
            bills_by_topic[topic]["cosponsor"] += 1
            topic_cosponsor.add(topic)

    do_primary = sorted(topic_primary)
    do_cosponsor_only = sorted(topic_cosponsor - topic_primary)
    print(f"  Do primary topics: {do_primary}")
    print(f"  Do cosponsor-only topics: {do_cosponsor_only}")

    # Step 3: Compute Topic Match Rate
    topic_matches = []
    if say_topics:
        for topic in say_topics:
            if topic in topic_primary:
                topic_matches.append({"topic": topic, "weight": 1.0, "type": "primary"})
            elif topic in topic_cosponsor:
                topic_matches.append({"topic": topic, "weight": 0.3, "type": "cosponsor_only"})
            else:
                topic_matches.append({"topic": topic, "weight": 0.0, "type": "no_bills"})

        total_weight = sum(m["weight"] for m in topic_matches)
        score = round((total_weight / len(say_topics)) * 100)
    else:
        score = None

    print(f"  Matches: {topic_matches}")
    print(f"  SCORE: {score}")

    primary_count = sum(1 for b in bills if b.get("sponsor_type") == "primary")
    cosponsor_count = len(bills) - primary_count

    results.append({
        "id": rep["id"],
        "name": name,
        "party": rep.get("party", ""),
        "district": rep.get("district", ""),
        "chamber": rep.get("chamber", ""),
        "image": rep.get("image", ""),
        "email": rep.get("email", ""),
        "say_topics": say_topics,
        "do_topics_primary": do_primary,
        "do_topics_cosponsor_only": do_cosponsor_only,
        "topic_matches": topic_matches,
        "score": score,
        "total_bills": len(bills),
        "primary_bills": primary_count,
        "cosponsor_bills": cosponsor_count,
        "bills_by_topic": bills_by_topic,
        "statements": statements,
        "has_data": True
    })

# Save results
with open("frontend/public/data/az_reps_scored.json", "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2, ensure_ascii=False)

print(f"\n\nDONE! Scored {sum(1 for r in results if r['score'] is not None)}/{len(results)} reps")
print(f"Saved to frontend/public/data/az_reps_scored.json")

# Print summary
print("\n=== SCORE SUMMARY ===")
for r in sorted(results, key=lambda x: x["score"] if x["score"] is not None else -1):
    s = r["score"] if r["score"] is not None else "N/A"
    print(f"  {r['name']:30s} | Score: {str(s):>4s} | Say: {len(r['say_topics'])} topics | Primary: {len(r['do_topics_primary'])} | Cosponsor-only: {len(r['do_topics_cosponsor_only'])}")
