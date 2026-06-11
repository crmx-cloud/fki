#!/bin/zsh
# ── FranchiseKI → CRMX sync: one-shot credential setup ──────────────
# Run this yourself (Guy is blocked from reading credential stores):
#   zsh /Users/brentattaway/Guy/franchiseki-site/setup-crmx-sync.sh
#
# It looks for the fleet's stored GHL token in the documented locations
# and copies it into the Convex deployment's environment variables.
# Nothing is printed or stored anywhere else.

set -e
cd /Users/brentattaway/Guy/franchiseki-site/territory-map

FILES=(~/.claude/.env ~/.openclaw/secrets/ghl.env ~/.openclaw/.env)

TOKEN=""
LOC=""
for f in $FILES; do
  if [ -f "$f" ]; then
    [ -z "$TOKEN" ] && TOKEN=$(grep -h -m1 -E '^(GHL_PIT_TOKEN|GHL_API_KEY|GHL_TOKEN)=' "$f" 2>/dev/null | cut -d= -f2- | tr -d '"' || true)
    [ -z "$LOC" ]   && LOC=$(grep -h -m1 -E '^(GHL_LOCATION_ID|GHL_LOCATION)=' "$f" 2>/dev/null | cut -d= -f2- | tr -d '"' || true)
  fi
done

# Fall back to 1Password CLI if signed in
if [ -z "$TOKEN" ] && command -v op >/dev/null 2>&1; then
  TOKEN=$(op item get "GHL API Key" --fields label=credential --reveal 2>/dev/null || true)
fi

if [ -z "$TOKEN" ]; then
  echo "❌ No GHL token found in env files or 1Password."
  echo "   Get it from 1Password (search 'GHL') or rotate an integration in"
  echo "   CRMX → FKI sub-account → Settings → Private Integrations, then run:"
  echo "   npx convex env set GHL_PIT_TOKEN 'pit-XXXX...'"
  exit 1
fi

echo "✓ Token found (${TOKEN:0:8}…). Setting Convex env var..."
npx convex env set GHL_PIT_TOKEN "$TOKEN"

if [ -n "$LOC" ]; then
  echo "✓ Location ID found (${LOC:0:6}…). Setting Convex env var..."
  npx convex env set GHL_LOCATION_ID "$LOC"
else
  echo "⚠️  No GHL_LOCATION_ID found locally."
  echo "   Grab it from CRMX → FKI sub-account → Settings → Business Profile"
  echo "   (the 'Location ID' field), then run:"
  echo "   cd /Users/brentattaway/Guy/franchiseki-site/territory-map && npx convex env set GHL_LOCATION_ID 'XXXXX'"
fi

echo ""
echo "Done. Tell Guy 'credentials set' and he'll fire a test lead through to CRMX."
