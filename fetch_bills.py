import requests
import json
import os
import time
from dotenv import load_dotenv

load_dotenv()

# Add all your API keys here
API_KEYS = [
    os.getenv("OPENSTATES_API_KEY_1"),
    os.getenv("OPENSTATES_API_KEY_2"),
    os.getenv("OPENSTATES_API_KEY_3"),
]
# Remove any None values (keys not set in .env)
API_KEYS = [k for k in API_KEYS if k]

print(f"Loaded {len(API_KEYS)} API keys")

current_key_index = 0

def get_headers():
    return {"X-API-KEY": API_KEYS[current_key_index]}

def rotate_key():
    global current_key_index
    old_index = current_key_index
    current_key_index = (current_key_index + 1) % len(API_KEYS)
    print(f"  Rotated from key {old_index + 1} to key {current_key_index + 1}")

BASE_URL = "https://v3.openstates.org"

with open("az_reps_raw.json") as f:
    reps = json.load(f)

def get_bills(rep_id, classification):
    """Get ALL bills with automatic key rotation on 429"""
    bills = []
    page = 1
    consecutive_failures = 0

    while True:
        response = requests.get(
            f"{BASE_URL}/bills",
            headers=get_headers(),
            params={
                "jurisdiction": "az",
                "sponsor": rep_id,
                "sponsor_classification": classification,
                "per_page": 20,
                "page": page
            }
        )

        if response.status_code == 429:
            consecutive_failures += 1
            print(f"  429 on key {current_key_index + 1}", end=" ")

            if consecutive_failures >= len(API_KEYS):
                # All keys exhausted — wait and reset
                print(f"  All {len(API_KEYS)} keys rate limited — waiting 60s...")
                time.sleep(60)
                consecutive_failures = 0
            else:
                # Try next key immediately
                rotate_key()
                time.sleep(1)
            continue

        if response.status_code != 200:
            print(f"  Error {response.status_code}: {response.text[:100]}")
            break

        # Successful request — reset failure counter
        consecutive_failures = 0

        data = response.json()
        results = data.get("results", [])

        if not results:
            break

        bills.extend(results)
        page += 1
        time.sleep(0.5)  # Reduced sleep since we can rotate keys

    return bills

def clean_bill(b, sponsor_type):
    return {
        "id": b.get("id", ""),
        "identifier": b.get("identifier", ""),
        "title": b.get("title", ""),
        "session": b.get("session", ""),
        "classification": b.get("classification", []),
        "latest_action": b.get("latest_action_description", ""),
        "latest_action_date": b.get("latest_action_date", ""),
        "first_action_date": b.get("first_action_date", ""),
        "url": b.get("openstates_url", ""),
        "sponsor_type": sponsor_type,
        "topic": None,
        "plain_english": None
    }

# Load existing progress if any
if os.path.exists("az_reps_with_bills_v2.json"):
    with open("az_reps_with_bills_v2.json") as f:
        all_rep_data = json.load(f)
    already_done = {r["id"] for r in all_rep_data}
    print(f"Resuming — {len(already_done)} reps already done")
else:
    all_rep_data = []
    already_done = set()

for rep in reps[:30]:
    name = rep["name"]

    if rep["id"] in already_done:
        print(f"Skipping {name} (already done)")
        continue

    print(f"\nFetching {name}...")

    primary = get_bills(rep["id"], "primary")
    print(f"  Primary: {len(primary)}")
    time.sleep(1)

    cosigned = get_bills(rep["id"], "cosponsor")
    print(f"  Cosigned: {len(cosigned)}")
    time.sleep(1)

    all_bills = (
        [clean_bill(b, "primary") for b in primary] +
        [clean_bill(b, "cosponsor") for b in cosigned]
    )

    rep_data = {
        "id": rep["id"],
        "name": name,
        "party": rep.get("party", "Unknown"),
        "district": rep.get("current_role", {}).get("district", "Unknown"),
        "chamber": rep.get("current_role", {}).get("org_classification", "Unknown"),
        "image": rep.get("image", ""),
        "email": rep.get("email", ""),
        "bills": all_bills,
        "statements": [],
        "say_vs_do_score": None,
        "topic_breakdown": {},
        "topic_breakdown_primary": {},
    }

    all_rep_data.append(rep_data)
    print(f"  Total: {len(all_bills)} bills")

    # Save after every rep
    with open("az_reps_with_bills_v2.json", "w") as f:
        json.dump(all_rep_data, f, indent=2)

# Final summary
print("\n\nDone!")
total = sum(len(r["bills"]) for r in all_rep_data)
primary_total = sum(
    sum(1 for b in r["bills"] if b["sponsor_type"] == "primary")
    for r in all_rep_data
)
print(f"Total bills: {total}")
print(f"  Primary: {primary_total}")
print(f"  Cosigned: {total - primary_total}")