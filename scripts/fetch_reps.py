import requests
import json
import os
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("OPENSTATES_API_KEY")
BASE_URL = "https://v3.openstates.org"

headers = {"X-API-KEY": API_KEY}

def get_az_legislators():
    reps = []
    page = 1
    
    while True:
        response = requests.get(
            f"{BASE_URL}/people",
            headers=headers,
            params={
                "jurisdiction": "ocd-jurisdiction/country:us/state:az/government",
                "current_role": True,
                "per_page": 20,
                "page": page
            }
        )
        
        data = response.json()
        results = data.get("results", [])
        
        if not results:
            break
            
        reps.extend(results)
        print(f"Fetched page {page}, total reps so far: {len(reps)}")
        page += 1
    
    return reps

reps = get_az_legislators()

# Save immediately — never lose this data
with open("az_reps_raw.json", "w") as f:
    json.dump(reps, f, indent=2)

print(f"Total AZ legislators fetched: {len(reps)}")

# Quick look at what we got
for rep in reps[:3]:
    print(f"\n--- {rep['name']} ---")
    print(f"Party: {rep['party']}")
    print(f"District: {rep.get('current_role', {}).get('district')}")
    print(f"Chamber: {rep.get('current_role', {}).get('org_classification')}")