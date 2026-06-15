# Skill: brand-enrichment

The repeatable pipeline for finding, verifying, and importing new US franchise
brands into the FranchiseKI database. This is the actual mechanism — there is
no separate Drive/Ollama skill (the old MapKI/Tiffany loop was map-pin only and
is retired). Run ~100 brands/day on Brent's approval (no autonomous cron — Bennett
Tier-0 rule: crons are Gemini-only).

## The 4 steps

### 1. Discover the gap
Export current brands, then launch ONE discovery subagent to find brands we
don't have, from the **full Entrepreneur franchise directory** + Franchise
Direct / Franchise Gator / Vetted Biz.
```
curl -s https://abundant-lion-457.convex.cloud/api/query -H 'Content-Type: application/json' \
  -d '{"path":"seo:publicSiteData","args":{},"format":"json"}' \
  | python3 -c "import json,sys; n=sorted(b['name'] for b in json.load(sys.stdin)['value']['brands']); open('/tmp/fki-have-brands.txt','w').write(chr(10).join(n)); print(len(n))"
```
Rules the discovery agent must follow: US-sold & currently-franchising only;
exclude anything already in the have-list (case/punctuation-insensitive, exclude
uncertain near-matches to avoid dupes); spread across categories.

### 2. Research + verify each brand (subagents, ~15 per batch)
Each research subagent reads `pilot-data/n41-w1.json` and `pilot-data/f500-b3.json`
for the exact output shape, then writes `pilot-data/<batch>.json`. NON-NEGOTIABLE:
- **Sourced-or-omit:** every numeric field traces to a real source (franchisor
  franchise-dev page → **entrepreneur.com franchise profile** → Franchise
  Direct/Vetted Biz/SHARPSHEETS → SEC/FTC/court records). Cross-reference
  entrepreneur.com to *verify* franchisor-stated figures — not just trust one source.
- **Standard new-franchisee figures only** (never transfer-only/top-tier).
- **2-4 sourced risk flags** per brand (severity/title/detail/source/url/year).
- State availability: object-list `statesOpen` OR `nationwide` object; omit w/ note.
- Populate the expanded fields when sourced (netWorthMin, financingOffered,
  renewal/transfer fees, bankruptcyDisclosed, franchisorFinancialsAvailable,
  support booleans, businessModelType, etc.).
- **Write the output file incrementally** (rewrite after every brand) — subagents
  die on socket errors; incremental saves prevent lost work.

### 3. Import to production
```
FKI_PROD=1 python3 pilot-data/import_new_brands.py pilot-data/<batch>.json
```
`import_new_brands.py` is idempotent: existing brand (by slug/name) → refreshes
its data instead of duplicating. Tolerates all `statesOpen` shapes (object list,
string list, descriptor dict with embedded codes).

### 4. Deploy + verify
```
VITE_CONVEX_URL=https://abundant-lion-457.convex.cloud npm run build   # regenerates all brand SEO pages
VITE_CONVEX_URL=https://abundant-lion-457.convex.cloud npx vercel build
npx vercel deploy --prebuilt --archive=tgz && npx vercel promote <url> --yes
```
Then ALWAYS verify the live bundle points at prod (`abundant-lion-457`, not the
dev `spotted-retriever-435`) — `npx convex dev` silently rewrites `.env.local`.

## Daily cadence
Brent says "next 100" → repeat steps 1-4 with ~7 batches of 15. Continue until
the discovery agent can no longer find new US-sold franchises (the natural cap —
goal is the most complete + accurate US franchise DB, not a fixed number).
Quality gate is absolute: verify before building the profile; never pad with
unsourced data.
