import json
import os
import time
from google import genai
from dotenv import load_dotenv
from collections import Counter

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
MODEL = "gemini-2.5-flash"

# 12 AZ-specific topics grounded in actual AZ Legislature committee structure
TOPICS = [
    "healthcare",
    "education",
    "economy",
    "budget_and_finance",
    "public_safety",
    "infrastructure",
    "environment_and_water",
    "immigration_and_borders",
    "civil_rights_and_elections",
    "government_operations",
    "social_services",
    "local_government"
]

# ── PROMPT ────────────────────────────────────────────────────────────────────
# Grounded in AZ Legislature's own 2026 standing committee structure
SYSTEM_PROMPT = """You are an Arizona legislative bill classifier for the 57th Legislature (2026).

Classify bills into exactly one of these 12 topics:

healthcare - health, hospitals, medicaid, AHCCCS, mental health, pharmacy, insurance
education - schools, teachers, students, universities, charter schools, ESA vouchers  
economy - business, commerce, employment, wages, labor, banking, corporations
budget_and_finance - appropriations, taxes, tax credits, revenue, bonds, fiscal
public_safety - crime, courts, police, prisons, traffic, weapons, sentencing, DUI
infrastructure - roads, highways, housing, broadband, airports, utilities, drones
environment_and_water - water, groundwater, air quality, mining, solar, agriculture, land
immigration_and_borders - immigration, border security, ICE, E-Verify, undocumented
civil_rights_and_elections - voting, elections, civil rights, discrimination, abortion, LGBTQ
government_operations - ONLY death/memorial resolutions and purely technical corrections
social_services - veterans, homelessness, foster care, disability, elder care, welfare
local_government - cities, counties, zoning, HOAs, annexation, municipalities

Critical rules:
- government_operations = ONLY memorials/death resolutions/technical corrections
- immigration bills → immigration_and_borders (not civil_rights_and_elections)
- water/energy/land → environment_and_water (not infrastructure)  
- taxes/appropriations → budget_and_finance (not economy)
- voting/elections → civil_rights_and_elections (not government_operations)"""

def tag_batch(bills_batch):
    bills_text = "\n".join([
        f"{i+1}. {b['title']}"
        for i, b in enumerate(bills_batch)
    ])

    user_prompt = f"""Classify each of these {len(bills_batch)} Arizona legislative bills.

{bills_text}

Return ONLY a valid JSON array of exactly {len(bills_batch)} topic strings.
Each string must be one of: {", ".join(TOPICS)}

Example format: ["healthcare", "education", "public_safety"]
No explanation. No markdown. Just the JSON array."""

    try:
        response = client.models.generate_content(
            model=MODEL,
            contents=f"{SYSTEM_PROMPT}\n\n{user_prompt}"
        )
        text = response.text.strip()
        # Clean any markdown
        text = text.replace("```json", "").replace("```", "").strip()
        # Sometimes Gemini adds explanation after — extract just the array
        if "[" in text:
            text = text[text.index("["):text.rindex("]")+1]

        topics = json.loads(text)

        if len(topics) != len(bills_batch):
            print(f" ⚠️  Wrong count: got {len(topics)}, expected {len(bills_batch)}")
            return None

        invalid = [t for t in topics if t not in TOPICS]
        if invalid:
            print(f" ⚠️  Invalid topics: {invalid}")
            return None

        return topics

    except Exception as e:
        print(f" ⚠️  Gemini error: {str(e)[:80]}")
        return None

def keyword_fallback(title):
    """Only used when Gemini fails — keyword-based safety net"""
    t = title.lower()

    # Death/memorial resolutions → government_operations ONLY
    if any(w in t for w in ["death resolution", "memorial", " deceased", "in memory of", "yvonne", "passing of"]):
        return "government_operations"
    if "technical correction" in t:
        return "government_operations"

    # Immigration — check before civil rights
    if any(w in t for w in ["immigr", "border", "sanctuary", "undocumented", "customs officer", "ice ", "e-verify", "refugee"]):
        return "immigration_and_borders"

    # Elections/civil rights
    if any(w in t for w in ["voting", "election", "civil rights", "discriminat", "abortion", "reproductive", "lgbtq", "constitutional convention", "term limit", "campaign finance"]):
        return "civil_rights_and_elections"

    # Healthcare
    if any(w in t for w in ["health", "medical", "hospital", "medicaid", "ahcccs", "mental illness", "behavioral", "pharmacy", "drug", "nurse", "patient", "dental"]):
        return "healthcare"

    # Education
    if any(w in t for w in ["school", "education", "teacher", "student", "university", "college", "curriculum", "esa", "charter"]):
        return "education"

    # Budget/taxes
    if any(w in t for w in ["tax", "revenue", "appropriat", "budget", "fiscal", "exemption", "tpt", "bond", "fund"]):
        return "budget_and_finance"

    # Environment/water
    if any(w in t for w in ["water", "groundwater", "environment", "climate", "solar", "energy", "pollution", "wildlife", "forest", "mining", "agriculture", "greenhouse"]):
        return "environment_and_water"

    # Public safety
    if any(w in t for w in ["police", "crime", "criminal", "prison", "jail", "traffic", "court", "weapon", "gun", "felony", "sentenc", "probation", "dui"]):
        return "public_safety"

    # Infrastructure
    if any(w in t for w in ["road", "highway", "bridge", "transit", "broadband", "airport", "utility", "building", "unmanned aircraft", "drone"]):
        return "infrastructure"

    # Social services
    if any(w in t for w in ["veteran", "homeless", "poverty", "foster care", "disability", "elder", "welfare", "heat illness", "worker"]):
        return "social_services"

    # Economy
    if any(w in t for w in ["business", "employ", "wage", "labor", "manufactur", "commerce", "licens", "permit", "pet store", "liquor"]):
        return "economy"

    # Local government
    if any(w in t for w in ["municipal", "county", "zoning", "planned communit", "hoa", "annexat", "historic struct"]):
        return "local_government"

    return "government_operations"

def make_plain_english(title, action=""):
    """Convert bill title to plain English"""
    t = title.lower()
    parts = [p.strip() for p in title.split(";")]

    # Special cases
    if "death resolution" in t or "memorial" in t:
        return "A memorial resolution honoring a community member"
    if "technical correction" in t:
        subject = parts[1].strip().lower() if len(parts) > 1 else "state law"
        return f"A technical fix to existing {subject}"

    # General case — clean up the semicolon format
    if len(parts) >= 3:
        return f"A bill about {parts[0].strip().lower()} — {parts[1].strip().lower()} and {parts[2].strip().lower()}"
    elif len(parts) == 2:
        return f"A bill about {parts[0].strip().lower()} — {parts[1].strip().lower()}"
    return f"A bill about {title[:80].lower()}"

# ── MAIN ──────────────────────────────────────────────────────────────────────

with open("az_reps_with_bills_v2.json") as f:
    data = json.load(f)

# Step 1 — Build unique bill index
print("="*60)
print("STEP 1: Building unique bill index")
print("="*60)
unique_bills = {}
for rep in data:
    for bill in rep["bills"]:
        bid = bill["id"]
        if bid not in unique_bills:
            unique_bills[bid] = bill

total_entries = sum(len(r["bills"]) for r in data)
total_unique = len(unique_bills)
print(f"Total bill entries : {total_entries}")
print(f"Unique bills       : {total_unique}")
print(f"Duplicates saved   : {total_entries - total_unique} Gemini calls")

# Load existing progress if any
if os.path.exists("topic_map.json"):
    with open("topic_map.json") as f:
        topic_map = json.load(f)
    print(f"Resuming — {len(topic_map)} bills already tagged")
else:
    topic_map = {}

# Step 2 — Tag unique bills
bills_to_tag = [b for b in unique_bills.values() if b["id"] not in topic_map]
print(f"\nBills still to tag : {len(bills_to_tag)}")

print()
print("="*60)
print("STEP 2: Tagging with Gemini 2.5 Flash")
print("="*60)

BATCH_SIZE = 25
total = len(bills_to_tag)
total_batches = (total + BATCH_SIZE - 1) // BATCH_SIZE

gemini_success = 0
gemini_fail = 0
fallback_used = 0

for i in range(0, total, BATCH_SIZE):
    batch = bills_to_tag[i:i+BATCH_SIZE]
    batch_num = (i // BATCH_SIZE) + 1

    print(f"Batch {batch_num:>4}/{total_batches} | bills {i+1:>5}-{min(i+BATCH_SIZE, total):<5}", end=" | ")

    topics = tag_batch(batch)

    if topics:
        for bill, topic in zip(batch, topics):
            topic_map[bill["id"]] = ("gemini", topic)
        gemini_success += len(batch)
        print(f"✅ GEMINI  | {', '.join(topics[:4])}{'...' if len(topics) > 4 else ''}")
    else:
        for bill in batch:
            fallback_topic = keyword_fallback(bill["title"])
            topic_map[bill["id"]] = ("fallback", fallback_topic)
        fallback_used += len(batch)
        print(f"⚠️  FALLBACK| {', '.join([keyword_fallback(b['title']) for b in batch[:4]])}")

    # Save progress every 20 batches
    if batch_num % 20 == 0:
        with open("topic_map.json", "w") as f:
            json.dump(topic_map, f)
        print(f"  💾 Progress saved ({len(topic_map)} bills tagged)")

    time.sleep(1.5)

# Final save of topic map
with open("topic_map.json", "w") as f:
    json.dump(topic_map, f)

print()
print("="*60)
print("STEP 2 SUMMARY")
print("="*60)
print(f"✅ Gemini tagged  : {gemini_success} bills")
print(f"⚠️  Fallback used  : {fallback_used} bills")
print(f"📊 Gemini success : {gemini_success/(gemini_success+fallback_used)*100:.1f}%")

# Step 3 — Apply topics to ALL entries
print()
print("="*60)
print("STEP 3: Applying topics to all bill entries")
print("="*60)

applied_gemini = 0
applied_fallback = 0

for rep in data:
    for bill in rep["bills"]:
        result = topic_map.get(bill["id"])
        if result:
            source, topic = result
            bill["topic"] = topic
            bill["topic_source"] = source  # track gemini vs fallback
            bill["plain_english"] = make_plain_english(bill["title"])
            if source == "gemini":
                applied_gemini += 1
            else:
                applied_fallback += 1

print(f"Applied (Gemini)   : {applied_gemini}")
print(f"Applied (Fallback) : {applied_fallback}")

# Step 4 — Compute breakdowns
print()
print("="*60)
print("STEP 4: Computing topic breakdowns per rep")
print("="*60)

PRIMARY_WEIGHT = 1.0
COSIGNED_WEIGHT = 0.3

for rep in data:
    # Weighted breakdown (primary + cosigned)
    topic_scores = {}
    for bill in rep["bills"]:
        topic = bill.get("topic", "government_operations")
        weight = PRIMARY_WEIGHT if bill["sponsor_type"] == "primary" else COSIGNED_WEIGHT
        topic_scores[topic] = topic_scores.get(topic, 0) + weight

    total_score = sum(topic_scores.values())
    if total_score > 0:
        rep["topic_breakdown"] = {
            t: round((s / total_score) * 100, 1)
            for t, s in sorted(topic_scores.items(), key=lambda x: -x[1])
        }

    # Primary only breakdown
    primary_topics = [
        b["topic"] for b in rep["bills"]
        if b["sponsor_type"] == "primary" and b.get("topic")
    ]
    if primary_topics:
        counts = Counter(primary_topics)
        total_p = len(primary_topics)
        rep["topic_breakdown_primary"] = {
            t: round((c / total_p) * 100, 1)
            for t, c in counts.most_common()
        }

# Save final
with open("az_reps_final.json", "w") as f:
    json.dump(data, f, indent=2)

print()
print("="*60)
print("DONE — Saved az_reps_final.json")
print("="*60)

# Final distribution
print()
print("=== FINAL TOPIC DISTRIBUTION (weighted, all bills) ===")
all_topics = Counter()
for rep in data:
    for bill in rep["bills"]:
        if bill.get("topic"):
            all_topics[bill["topic"]] += 1

total_tagged = sum(all_topics.values())
for topic, count in all_topics.most_common():
    pct = count / total_tagged * 100
    bar = "█" * int(pct // 2)
    print(f"  {topic:<30} {count:>5} ({pct:>5.1f}%)  {bar}")

print()
print("=== GEMINI vs FALLBACK BREAKDOWN ===")
gemini_count = sum(1 for rep in data for b in rep["bills"] if b.get("topic_source") == "gemini")
fallback_count = sum(1 for rep in data for b in rep["bills"] if b.get("topic_source") == "fallback")
print(f"  Gemini  : {gemini_count} ({gemini_count/total_tagged*100:.1f}%)")
print(f"  Fallback: {fallback_count} ({fallback_count/total_tagged*100:.1f}%)")