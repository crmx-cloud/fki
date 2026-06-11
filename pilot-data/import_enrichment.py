#!/usr/bin/env python3
"""Transforms researched brand JSON into enrichment:applyEnrichment calls.
Only imports fields with non-null values AND a real source (accuracy rule)."""
import json, subprocess, sys

PROFILE_FIELDS = ["liquidCapitalMin","totalInvestmentMin","totalInvestmentMax","franchiseFee",
"royaltyPercent","avgUnitRevenue","item19Available","fddAvailable","sbaApproved","veteranDiscount",
"multiUnitAvailable","exclusiveTerritories","ownerTypes","canRunFromHome","canRunPartTime",
"absenteeOwnership","trainingWeeks","ongoingSupport","marketingSupport","employeesRequired",
"minFootprint","totalUnits","yearFounded","yearFranchising","closureCount","isGrowing","geographicFocus"]
RENAME = {"adFundPercent": "brandFundPercent"}

def run(batch_file, only_brand=None):
    data = json.load(open(batch_file))
    for b in data["brands"]:
        if only_brand and only_brand.lower() not in b["name"].lower(): continue
        profile, sources = {}, {}
        for k, fv in b["fields"].items():
            key = RENAME.get(k, k)
            if key not in PROFILE_FIELDS and key not in RENAME.values(): continue
            val = fv.get("value")
            src = fv.get("source")
            if val is None or not src or src == "unverified": continue  # accuracy rule
            # numeric schema fields sometimes arrive as range strings ("40000-90000") — use lower bound
            # string schema fields sometimes arrive as numbers — coerce to string
            if key in ("employeesRequired", "minFootprint", "geographicFocus", "retentionRate") and not isinstance(val, str):
                val = str(val)
            # array-of-string schema fields (support offerings, owner types): a bare
            # boolean carries no offering info — drop it; wrap a single string
            if key in ("marketingSupport", "ongoingSupport", "ownerTypes"):
                if isinstance(val, bool): continue
                if isinstance(val, str): val = [val]
            if key in ("franchiseFee", "trainingWeeks", "liquidCapitalMin", "totalUnits", "closureCount") and isinstance(val, str):
                import re as _re
                m = _re.search(r"[\d,]+", val)
                if not m: continue
                val = int(m.group().replace(",", ""))
            profile[key] = val
            sources[key] = {"source": src}
            if fv.get("url"): sources[key]["url"] = fv["url"]
            elif src.startswith("http"): sources[key]["url"] = src
            if fv.get("year"): sources[key]["year"] = fv["year"]
            if fv.get("confidence"): sources[key]["confidence"] = fv["confidence"]
        brand_fields = {}
        if "totalInvestmentMin" in profile: brand_fields["investmentMin"] = profile["totalInvestmentMin"]
        if "totalInvestmentMax" in profile: brand_fields["investmentMax"] = profile["totalInvestmentMax"]
        if "franchiseFee" in profile: brand_fields["franchiseFee"] = profile["franchiseFee"]
        if "royaltyPercent" in profile: brand_fields["royaltyPercent"] = profile["royaltyPercent"]
        args = {"brandName": b["name"], "profileFields": profile, "fieldSources": sources,
                "brandFields": brand_fields, "dataNotes": b.get("notes","")}
        r = subprocess.run(["npx","convex","run","enrichment:applyEnrichment", json.dumps(args)],
                           capture_output=True, text=True, cwd="territory-map")
        out = (r.stdout + r.stderr).strip()
        print(f"{b['name']}: {len(profile)} verified fields -> {out.splitlines()[-1] if out else 'no output'}")
        # Standard pipeline step: seed sourced market-research risk flags when the batch provides them
        if b.get("riskFlags"):
            fr = subprocess.run(["npx","convex","run","enrichment:setRiskFlags",
                                 json.dumps({"brandName": b["name"], "flags": b["riskFlags"]})],
                                capture_output=True, text=True, cwd="territory-map")
            fout = (fr.stdout + fr.stderr).strip()
            ok = 'ok' if '"ok": true' in fout else (fout.splitlines()[-1] if fout.strip() else 'no output')
            print(f"  riskFlags: {len(b['riskFlags'])} seeded -> {ok}")

if __name__ == "__main__":
    run(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)