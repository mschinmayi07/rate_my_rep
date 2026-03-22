import json
import os
import time
from google import genai
from dotenv import load_dotenv
from collections import Counter

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
MODEL = "gemini-2.5-flash"

TOPICS = [
    "healthcare", "education", "economy",
    "environment", "public safety", "infrastructure",
    "taxes", "social policy", "government operations"
]

def tag_batch(bills_batch):
    """Tag 10 bills at once in a single API call"""
    
    bills_text = "\n".join([
        f"{i+1}. {b['title']}"
        for i, b in enumerate(bills_batch)
    ])
    
    prompt = f"""You are tagging Arizona state legislature bills by topic.

Tag each bill with EXACTLY ONE topic from this list:
healthcare, education, economy, environment, public safety, 
infrastructure, taxes, social policy, government operations

Rules:
- "government operations" = ONLY for death resolutions, memorials, 
  technical corrections, or purely administrative bills
- "social policy" = immigration, voting rights, civil rights, 
  discrimination, family, abortion, LGBTQ
- "public safety" = crime, police, courts, traffic, weapons, 
  juvenile justice, worker safety
- "economy" = business, jobs, wages, labor, manufacturing, commerce
- "environment" = water, energy, climate, pollution, land, wildlife
- "taxes" = tax, revenue, budget, appropriations, fiscal
- "education" = schools, teachers, students, universities
- "healthcare" = medical, health, hospitals, insurance, mental health
- "infrastructure" = roads, housing, broadband, transit, utilities

Bills to tag:
{bills_text}

Return ONLY a JSON array of {len(bills_batch)} topic strings in order.
Example: ["education", "public safety", "taxes", ...]
No explanation, just the JSON array."""

    try:
        response = client.models.generate_content(
            model=MODEL,
            contents=prompt
        )
        
        text = response.text.strip()
        # Clean markdown if present
        text = text.replace("```json", "").replace("```", "").strip()
        
        topics = json.loads(text)
        
        # Validate — must be right length and valid topics
        if len(topics) != len(bills_batch):
            print(f"  Wrong count: got {len(topics)}, expected {len(bills_batch)}")
            return None
            
        for t in topics:
            if t not in TOPICS:
                print(f"  Invalid topic: {t}")
                return None
                
        return topics
        
    except Exception as e:
        print(f"  Gemini error: {e}")
        return None

def tag_all_bills(data):
    # Collect all bills that need tagging
    all_bills = []
    for rep in data:
        for bill in rep["bills"]:
            all_bills.append(bill)
    
    total = len(all_bills)
    print(f"Tagging {total} bills in batches of 10...")
    
    BATCH_SIZE = 10
    tagged = 0
    failed = 0
    
    for i in range(0, total, BATCH_SIZE):
        batch = all_bills[i:i+BATCH_SIZE]
        batch_num = (i // BATCH_SIZE) + 1
        total_batches = (total + BATCH_SIZE - 1) // BATCH_SIZE
        
        print(f"Batch {batch_num}/{total_batches} ({i+1}-{min(i+BATCH_SIZE, total)})...", end=" ")
        
        topics = tag_batch(batch)
        
        if topics:
            for bill, topic in zip(batch, topics):
                bill["topic"] = topic
            tagged += len(batch)
            print(f"✅ Tagged {len(batch)} bills")
        else:
            # Fallback to keyword matching for failed batches
            print(f"❌ Failed — using keyword fallback")
            for bill in batch:
                bill["topic"] = keyword_fallback(bill["title"])
            failed += len(batch)
        
        # Save progress after every batch
        with open("az_reps_final.json", "w") as f:
            json.dump(data, f, indent=2)
        
        time.sleep(2)  # Respect rate limits
    
    print(f"\nDone! Tagged: {tagged}, Fallback: {failed}")
    return data

def keyword_fallback(title):
    """Simple fallback if Gemini fails for a batch"""
    title_lower = title.lower()
    
    if any(w in title_lower for w in ["death resolution", "memorial", "deceased"]):
        return "government operations"
    if any(w in title_lower for w in ["school", "education", "teacher", "student"]):
        return "education"
    if any(w in title_lower for w in ["health", "medical", "hospital", "drug"]):
        return "healthcare"
    if any(w in title_lower for w in ["tax", "revenue", "budget", "appropriat"]):
        return "taxes"
    if any(w in title_lower for w in ["water", "environment", "climate", "solar"]):
        return "environment"
    if any(w in title_lower for w in ["police", "crime", "criminal", "traffic"]):
        return "public safety"
    if any(w in title_lower for w in ["road", "highway", "housing", "broadband"]):
        return "infrastructure"
    if any(w in title_lower for w in ["business", "employ", "wage", "labor"]):
        return "economy"
    if any(w in title_lower for w in ["immigr", "voting", "civil rights", "discrimin"]):
        return "social policy"
    return "government operations"

def recompute_breakdowns(data):
    for rep in data:
        topics = [b["topic"] for b in rep["bills"]]
        total = len(topics)
        if total == 0:
            rep["topic_breakdown"] = {}
            continue
        counts = Counter(topics)
        rep["topic_breakdown"] = {
            topic: round((count / total) * 100, 1)
            for topic, count in counts.most_common()
        }
    return data

# Load data
with open("az_reps_final.json") as f:
    data = json.load(f)

# Tag everything
data = tag_all_bills(data)

# Recompute breakdowns
data = recompute_breakdowns(data)

# Final save
with open("az_reps_final.json", "w") as f:
    json.dump(data, f, indent=2)

# Show results
print("\n=== FINAL TOPIC DISTRIBUTION ===")
all_topics = [b["topic"] for r in data for b in r["bills"]]
for topic, count in Counter(all_topics).most_common():
    bar = "█" * (count // 5)
    pct = count / len(all_topics) * 100
    print(f"  {topic:<25} {count:>3} ({pct:.0f}%)  {bar}")

print("\n=== SAMPLE REP BREAKDOWNS ===")
for rep in data[:4]:
    if rep["topic_breakdown"]:
        print(f"\n{rep['name']} ({rep['party']}):")
        for topic, pct in list(rep["topic_breakdown"].items())[:5]:
            print(f"  {topic:<25} {pct}%")