import json
import time
import os
import requests
from dotenv import load_dotenv

load_dotenv()

TINYFISH_API_KEY = os.getenv("TINYFISH_API_KEY")
INPUT_FILE = "az_reps_final.json"
OUTPUT_FILE = "az_reps_with_statements.json"

def get_ballotpedia_url(name):
    """Convert rep name to Ballotpedia URL format."""
    formatted = name.strip().replace(" ", "_")
    return f"https://ballotpedia.org/{formatted}"

def scrape_statements(rep_name, ballotpedia_url):
    """Call TinyFish to scrape public statements from a rep's Ballotpedia page."""
    headers = {
        "X-API-Key": TINYFISH_API_KEY,
        "Content-Type": "application/json"
    }

    payload = {
        "url": ballotpedia_url,
        "goal": (
            f"Go to this Ballotpedia page and extract all public statements, quotes, or positions "
            f"that {rep_name} has made. Return ONLY a JSON array of strings. "
            f"Each item should be one statement or quote. "
            f"If the page doesn't exist or has no statements, return an empty array []."
        )
    }

    try:
        response = requests.post(
            "https://agent.tinyfish.ai/v1/automation/run-sse",
            headers=headers,
            json=payload,
            timeout=(10, 90),  # (connect timeout, read timeout)
            stream=True
        )
        response.raise_for_status()

        # SSE stream — collect all data lines, grab the last meaningful result
        raw_text = ""
        for line in response.iter_lines(chunk_size=1024):
            if line:
                decoded = line.decode("utf-8")
                if decoded.startswith("data:"):
                    content = decoded[5:].strip()
                    if content and content != "[DONE]":
                        raw_text = content  # keep updating, last one is the result

        if not raw_text:
            print(f"  ⚠️  Empty response for {rep_name}")
            return []

        raw_text = raw_text.strip()

        # Sometimes TinyFish wraps result in a JSON object
        try:
            parsed = json.loads(raw_text)
            if isinstance(parsed, list):
                return parsed
            elif isinstance(parsed, dict):
                for v in parsed.values():
                    if isinstance(v, list):
                        return v
                result_str = parsed.get("result") or parsed.get("output") or parsed.get("data") or ""
                if result_str:
                    raw_text = str(result_str)
        except json.JSONDecodeError:
            pass

        # Try to find a JSON array inside the text
        start = raw_text.find("[")
        end = raw_text.rfind("]")
        if start != -1 and end != -1:
            try:
                return json.loads(raw_text[start:end+1])
            except json.JSONDecodeError:
                pass

        print(f"  ⚠️  Could not parse JSON for {rep_name}, storing as single statement")
        return [raw_text] if raw_text else []

    except requests.exceptions.Timeout:
        print(f"  ❌ Timeout for {rep_name}")
        return []
    except requests.exceptions.RequestException as e:
        print(f"  ❌ Request failed for {rep_name}: {e}")
        return []

def main():
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        reps = json.load(f)

    if os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            existing = json.load(f)
        done = {r["name"] for r in existing if r.get("statements")}
        print(f"Resuming — {len(done)} reps already scraped.")
        reps_out = existing
    else:
        done = set()
        reps_out = [rep.copy() for rep in reps]

    print(f"\nScraping statements for {len(reps)} reps...\n")

    for i, rep in enumerate(reps_out):
        name = rep["name"]

        if name in done:
            print(f"[{i+1}/30] ⏭️  Skipping {name} (already done)")
            continue

        url = get_ballotpedia_url(name)
        print(f"[{i+1}/30] 🔍 Scraping {name} — {url}")

        statements = scrape_statements(name, url)
        rep["statements"] = statements

        print(f"         ✅ Got {len(statements)} statement(s)")

        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(reps_out, f, indent=2, ensure_ascii=False)

        time.sleep(3)

    print(f"\n✅ Done! Output saved to {OUTPUT_FILE}")
    print(f"   Reps with statements: {sum(1 for r in reps_out if r.get('statements'))}/30")
    print(f"   Reps with 0 statements: {sum(1 for r in reps_out if not r.get('statements'))}/30")

if __name__ == "__main__":
    main()
