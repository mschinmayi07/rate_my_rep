import json
import ast

INPUT_FILE = "az_reps_with_statements.json"
OUTPUT_FILE = "az_reps_with_statements.json"  # overwrite in place

with open(INPUT_FILE, "r", encoding="utf-8") as f:
    reps = json.load(f)

fixed_count = 0
already_clean = 0

for rep in reps:
    statements = rep.get("statements", [])
    new_statements = []

    for s in statements:
        if not isinstance(s, str):
            new_statements.append(s)
            continue

        # Check if it looks like a dict string e.g. "{'result': [...]}"
        s_stripped = s.strip()
        if s_stripped.startswith("{") or s_stripped.startswith("{'"):
            try:
                parsed = ast.literal_eval(s_stripped)
                if isinstance(parsed, dict):
                    # Try common keys
                    for key in ["result", "output", "data", "statements"]:
                        if key in parsed and isinstance(parsed[key], list):
                            new_statements.extend(parsed[key])
                            fixed_count += 1
                            break
                    else:
                        # Just grab first list value
                        for v in parsed.values():
                            if isinstance(v, list):
                                new_statements.extend(v)
                                fixed_count += 1
                                break
                        else:
                            new_statements.append(s)  # give up, keep as is
                else:
                    new_statements.append(s)
            except Exception:
                new_statements.append(s)  # keep as is if parse fails
        else:
            new_statements.append(s)
            already_clean += 1

    rep["statements"] = new_statements

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(reps, f, indent=2, ensure_ascii=False)

print(f"Done!")
print(f"  Reps fixed: {fixed_count}")
print(f"  Already clean statements: {already_clean}")
print(f"  Reps with statements now: {sum(1 for r in reps if r.get('statements'))}/30")
print(f"  Total statements across all reps: {sum(len(r.get('statements', [])) for r in reps)}")
