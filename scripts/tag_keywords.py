import json
from collections import Counter

TOPIC_KEYWORDS = {
    "healthcare": ["health", "medical", "medicaid", "medicare", "hospital", 
                   "doctor", "pharmacy", "drug", "mental health", "behavioral",
                   "opioid", "vaccine", "dental", "nurse", "patient"],
    "education": ["school", "education", "teacher", "student", "college", 
                  "university", "curriculum", "tuition", "classroom", "literacy",
                  "charter", "superintendent", "asu", "university"],
    "economy": ["business", "employ", "job", "wage", "economic", "commerce",
                "workforce", "minimum wage", "labor", "trade", "industry",
                "small business", "entrepreneur", "startup"],
    "environment": ["water", "environment", "climate", "energy", "solar",
                    "pollution", "wildlife", "forest", "land", "conservation",
                    "air quality", "carbon", "emission", "drought"],
    "public safety": ["police", "crime", "safety", "fire", "emergency",
                      "law enforcement", "correctional", "prison", "jail",
                      "gun", "weapon", "domestic violence", "trafficking"],
    "infrastructure": ["road", "highway", "transport", "bridge", "utility",
                       "broadband", "internet", "housing", "construction",
                       "public transit", "airport", "rail"],
    "taxes": ["tax", "revenue", "budget", "fiscal", "appropriat", "fund",
              "finance", "bond", "debt", "exemption", "credit"],
    "social policy": ["family", "child", "welfare", "immigrant", "veteran",
                      "homeless", "poverty", "disability", "senior", "elder",
                      "abortion", "lgbtq", "marriage", "religion"],
    "government operations": ["election", "vote", "legislature", "government",
                               "committee", "resolution", "memorial", "death",
                               "proclamation", "agency", "commission", "officer"]
}

def tag_by_keywords(title):
    title_lower = title.lower()
    
    scores = {}
    for topic, keywords in TOPIC_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in title_lower)
        if score > 0:
            scores[topic] = score
    
    if scores:
        return max(scores, key=scores.get)
    return "government operations"  # default

def make_plain_english(title, latest_action):
    # Simple template-based plain English — no AI needed
    title_clean = title.replace(";", " —").strip()
    
    if "death resolution" in title.lower() or "memorial" in title.lower():
        return f"A resolution to honor someone who passed away"
    if latest_action and "passed" in latest_action.lower():
        return f"A bill about {title_clean[:60]} — passed"
    if latest_action and "signed" in latest_action.lower():
        return f"A bill about {title_clean[:60]} — signed into law"
    return f"A bill about {title_clean[:80]}"

# Load data
with open("az_reps_with_bills.json") as f:
    data = json.load(f)

total = sum(len(r["bills"]) for r in data)
print(f"Tagging {total} bills with keyword matching...")

for rep in data:
    for bill in rep["bills"]:
        bill["topic"] = tag_by_keywords(bill["title"])
        bill["plain_english"] = make_plain_english(
            bill["title"], 
            bill.get("latest_action", "")
        )

# Compute topic breakdown per rep
for rep in data:
    topics = [b["topic"] for b in rep["bills"]]
    total_bills = len(topics)
    if total_bills == 0:
        rep["topic_breakdown"] = {}
        continue
    counts = Counter(topics)
    rep["topic_breakdown"] = {
        topic: round((count / total_bills) * 100, 1)
        for topic, count in counts.most_common()
    }

# Save
with open("az_reps_final.json", "w") as f:
    json.dump(data, f, indent=2)

print("Done! All bills tagged.")

# Show distribution
all_topics = []
for rep in data:
    for bill in rep["bills"]:
        all_topics.append(bill["topic"])

print("\n=== TOPIC DISTRIBUTION ===")
for topic, count in Counter(all_topics).most_common():
    bar = "█" * (count // 5)
    print(f"  {topic:<25} {count:>3}  {bar}")

print("\n=== SAMPLE REP BREAKDOWN ===")
for rep in data[:3]:
    if rep["topic_breakdown"]:
        print(f"\n{rep['name']} ({rep['party']}):")
        for topic, pct in list(rep["topic_breakdown"].items())[:4]:
            print(f"  {topic}: {pct}%")