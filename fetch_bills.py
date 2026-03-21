import requests
import json
import os
import time
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("OPENSTATES_API_KEY")
BASE_URL = "https://v3.openstates.org"
headers = {"X-API-KEY": API_KEY}

with open("az_reps_raw.json") as f:
    reps = json.load(f)

def get_bills_for_rep(rep_id, rep_name):
    bills = []
    page = 1

    while True:
        response = requests.get(
            f"{BASE_URL}/bills",
            headers=headers,
            params={
                "jurisdiction": "az",
                "sponsor": rep_id,
                "per_page": 20,
                "page": page
            }
        )

        if response.status_code == 429:
            print(f"  Rate limited — waiting 60 seconds...")
            time.sleep(60)  # Wait a full minute then retry
            continue        # Retry same page

        if response.status_code != 200:
            print(f"  Error {response.status_code}")
            break

        data = response.json()
        results = data.get("results", [])

        if not results:
            break

        bills.extend(results)

        if len(bills) >= 20:
            break

        page += 1
        time.sleep(2)  # Increased from 0.3 to 2 seconds

    return bills

all_rep_data = []

for rep in reps[:30]:
    rep_name = rep["name"]
    print(f"Fetching bills for {rep_name}...")

    bills = get_bills_for_rep(rep["id"], rep_name)

    # Clean bills to just what we need
    clean_bills = []
    for b in bills:
        clean_bills.append({
            "id": b.get("id", ""),
            "identifier": b.get("identifier", ""),
            "title": b.get("title", ""),
            "session": b.get("session", ""),
            "classification": b.get("classification", []),
            "latest_action": b.get("latest_action_description", ""),
            "latest_action_date": b.get("latest_action_date", ""),
            "first_action_date": b.get("first_action_date", ""),
            "url": b.get("openstates_url", ""),
            "topic": None,        # Claude/Gemini will fill this
            "plain_english": None # Claude/Gemini will fill this
        })

    rep_data = {
        "id": rep["id"],
        "name": rep_name,
        "party": rep.get("party", "Unknown"),
        "district": rep.get("current_role", {}).get("district", "Unknown"),
        "chamber": rep.get("current_role", {}).get("org_classification", "Unknown"),
        "image": rep.get("image", ""),
        "email": rep.get("email", ""),
        "bills": clean_bills,
        "statements": [],       # TinyFish will fill this
        "say_vs_do_score": None,
        "topic_breakdown": {}
    }

    all_rep_data.append(rep_data)
    print(f"  Got {len(clean_bills)} bills")

# Save
with open("az_reps_with_bills.json", "w") as f:
    json.dump(all_rep_data, f, indent=2)

print(f"\nDone. Saved {len(all_rep_data)} reps.")

# Quick summary
total_bills = sum(len(r["bills"]) for r in all_rep_data)
reps_with_bills = sum(1 for r in all_rep_data if len(r["bills"]) > 0)
print(f"Reps with bills: {reps_with_bills}/30")
print(f"Total bills: {total_bills}")