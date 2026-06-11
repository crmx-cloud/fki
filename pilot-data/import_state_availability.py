#!/usr/bin/env python3
"""Seeds stateAvailability for existing brands from an availability-evidence batch.

Batch JSON: {"brands": [{"name": "...",
  "nationwide": {"source","url","year","note"}  OR
  "statesOpen": [{"state":"FL","status":"open","note","source","url","year"}]
}]}
Brands with neither key are skipped (honest gap). States must be 2-letter codes.
"""
import json, subprocess, sys, os

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.join(HERE, "..", "territory-map")

ALL_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS",
"KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND",
"OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"]

def run(batch_file, only_brand=None):
    data = json.load(open(batch_file))
    for b in data["brands"]:
        if only_brand and only_brand.lower() not in b["name"].lower():
            continue
        states, source = [], None
        if b.get("statesOpen"):
            for s in b["statesOpen"]:
                code = (s.get("state") or "").upper()
                if code not in ALL_STATES: continue
                entry = {"state": code, "status": s.get("status", "open")}
                note = " · ".join(x for x in [s.get("note"), s.get("source"), s.get("url")] if x)
                if note: entry["note"] = note[:500]
                states.append(entry)
            source = b["statesOpen"][0].get("source") if b["statesOpen"] else None
        elif b.get("nationwide"):
            nw = b["nationwide"]
            note = " · ".join(x for x in [nw.get("note"), nw.get("url")] if x)[:500]
            states = [{"state": c, "status": "open", **({"note": note} if note else {})} for c in ALL_STATES]
            source = nw.get("source")
        if not states:
            print(f"{b['name']}: no sourced availability — skipped (honest gap)")
            continue
        args = {"brandName": b["name"], "states": states, **({"source": source} if source else {})}
        r = subprocess.run(["npx", "convex", "run", "stateAvailability:seedStates", json.dumps(args)],
                           capture_output=True, text=True, cwd=APP)
        ok = r.returncode == 0
        print(f"{b['name']}: {len(states)} states -> {'ok' if ok else (r.stdout + r.stderr).strip()[-150:]}")

if __name__ == "__main__":
    run(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
