#!/usr/bin/env python3
"""Full pipeline importer for NEW brands (not yet in the DB).

Per brand in the batch JSON:
  1. enrichment:createBrandIfMissing  — brand record (slug, category, website, logo)
  2. delegate to import_enrichment.py — verified fields + fieldSources + riskFlags
  3. stateAvailability:seedStates     — sourced open/registered states (or
     all-states-open when the batch carries explicit nationwide evidence)

MAPPING RULE (do not regress): there is exactly ONE map engine in the app —
src/components/BrandStateMap.tsx — fed by exactly two tables: stateAvailability
(state shading) + territories (city pins). The brand profile, /map/<slug>, and
/embed/<slug> all render that same component. Seeding stateAvailability here is
ALL a new brand needs to appear correctly on every map surface. Never add a
second map component or a per-page data path.

Batch JSON = Round 7 format plus per-brand: slug, category, website, and either
  "statesOpen": [{"state": "NJ", "status": "open", "note": "...", "source": "...", "url": "...", "year": 2026}]
or
  "nationwide": {"source": "...", "url": "...", "year": 2026, "note": "..."}
States must be 2-letter codes. Unsourced availability is skipped (accuracy rule).
"""
import json, subprocess, sys, os

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.join(HERE, "..", "territory-map")

ALL_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS",
"KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND",
"OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"]

def convex(fn, args):
    cmd = ["npx", "convex", "run", fn, json.dumps(args)]
    if os.environ.get("FKI_PROD") == "1":
        cmd.append("--prod")  # live database — set FKI_PROD=1 deliberately
    r = subprocess.run(cmd, capture_output=True, text=True, cwd=APP)
    ok = r.returncode == 0
    return ok, (r.stdout + r.stderr).strip()

def run(batch_file, only_brand=None):
    data = json.load(open(batch_file))
    for b in data["brands"]:
        if only_brand and only_brand.lower() not in b["name"].lower():
            continue
        name = b["name"]
        website = (b.get("website") or "").replace("https://", "").replace("http://", "").strip("/")
        logo = f"https://www.google.com/s2/favicons?domain={website}&sz=128" if website else None

        # 1 — brand record
        create_args = {"name": name, "slug": b["slug"], "category": b.get("category")}
        if website: create_args["websiteUrl"] = f"https://{website}"
        if logo: create_args["logoUrl"] = logo
        ok, out = convex("enrichment:createBrandIfMissing", create_args)
        existed = '"existed": true' in out or "existed: true" in out
        print(f"{name}: brand {'exists' if existed else 'created'}" if ok else f"{name}: CREATE FAILED {out[-200:]}")
        if not ok: continue

        # 2 — enrichment fields + risk flags (existing importer, accuracy rules included)
        r = subprocess.run([sys.executable, os.path.join(HERE, "import_enrichment.py"), batch_file, name],
                           capture_output=True, text=True)
        print("  " + (r.stdout + r.stderr).strip().replace("\n", "\n  "))

        # 3 — state availability (sourced only)
        states, source = [], None
        if b.get("statesOpen"):
            for s in b["statesOpen"]:
                code = (s.get("state") or "").upper()
                if code not in ALL_STATES: continue
                entry = {"state": code, "status": s.get("status", "open")}
                note_bits = [s.get("note"), s.get("source"), s.get("url")]
                note = " · ".join(x for x in note_bits if x)
                if note: entry["note"] = note[:500]
                states.append(entry)
            source = b["statesOpen"][0].get("source") if b["statesOpen"] else None
        elif b.get("nationwide"):
            nw = b["nationwide"]
            note = " · ".join(x for x in [nw.get("note"), nw.get("url")] if x)[:500]
            states = [{"state": c, "status": "open", **({"note": note} if note else {})} for c in ALL_STATES]
            source = nw.get("source")
        if states:
            ok, out = convex("stateAvailability:seedStates",
                             {"brandName": name, "states": states, **({"source": source} if source else {})})
            print(f"  states: {len(states)} seeded -> {'ok' if ok else out[-150:]}")
        else:
            print("  states: none sourced — skipped (honest gap)")

if __name__ == "__main__":
    run(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
