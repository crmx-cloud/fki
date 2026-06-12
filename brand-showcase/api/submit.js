// Vercel serverless relay: Brand Showcase form → FranchiseKI platform Convex
// (primary) with direct-CRMX fallback. Keeps credentials out of the browser.
//
// Primary path (preferred — inquiry lands in the platform DB and Convex pushes
// it to CRMX itself via pushLeadToCRMX):
//   CONVEX_INQUIRY_URL    — the platform's HTTP endpoint, e.g.
//                           https://abundant-lion-457.convex.site/api/brand-showcase-inquiry
//   CONVEX_INQUIRY_SECRET — shared secret, must match the Convex deployment's
//                           BRAND_SHOWCASE_SECRET env var
//
// Fallback paths (used only if the Convex path is unconfigured or fails —
// contact still reaches CRMX, but the platform DB misses the inquiry):
//   CRMX_WEBHOOK_URL — inbound-webhook trigger URL from the CRMX workflow
//                      "Franchise KI Brand Showcase Inquiry", OR
//   CRMX_API_KEY     — the GHL Private Integration Token (1Password
//                      FKI-Production vault, item "GHL Private API Token");
//                      we then upsert the contact directly.
// Location ID defaults to FKI's CRMX location (not a secret — see ghl-skill).

const LOCATION_ID = process.env.CRMX_LOCATION_ID || "14RD8KklxR9G4e0Rf7v2";

const INTEREST_TAGS = {
  "Claim or update our listing": "fki claim listing",
  "Ask about featured placement": "fki featured placement",
  "Ask about broker-led lead support": "fki broker-led lead support",
  "All of the above": "fki all growth options",
};
const PRIMARY_TAG = "franchiseki brand showcase requested";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const d = req.body || {};
  const required = ["firstName", "lastName", "email", "phone", "brandName", "role", "category", "territories", "primaryInterest"];
  const missing = required.filter((k) => !d[k]);
  if (missing.length) {
    return res.status(400).json({ error: "Missing fields", missing });
  }

  const tags = [PRIMARY_TAG];
  if (INTEREST_TAGS[d.primaryInterest]) tags.push(INTEREST_TAGS[d.primaryInterest]);

  const payload = {
    source: "brand-showcase",
    firstName: d.firstName,
    lastName: d.lastName,
    email: d.email,
    phone: d.phone,
    brandName: d.brandName,
    role: d.role,
    category: d.category,
    territories: d.territories,
    primaryInterest: d.primaryInterest,
    tags,
    submittedAt: new Date().toISOString(),
  };

  // Primary: forward to the FranchiseKI platform Convex endpoint. Convex
  // stores the inquiry AND pushes the contact to CRMX, so on success we're
  // done — running a fallback path too would double-tag/double-note in CRMX.
  if (process.env.CONVEX_INQUIRY_URL && process.env.CONVEX_INQUIRY_SECRET) {
    try {
      const r = await fetch(process.env.CONVEX_INQUIRY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Showcase-Secret": process.env.CONVEX_INQUIRY_SECRET,
        },
        body: JSON.stringify(payload),
      });
      if (r.ok) return res.status(200).json({ ok: true });
      const body = await r.text().catch(() => "");
      console.error(`Convex inquiry endpoint responded ${r.status}: ${body} — falling back to direct CRMX`);
    } catch (err) {
      console.error("Convex inquiry delivery failed — falling back to direct CRMX:", err);
    }
  }

  try {
    if (process.env.CRMX_WEBHOOK_URL) {
      const r = await fetch(process.env.CRMX_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(`CRMX webhook responded ${r.status}`);
      return res.status(200).json({ ok: true });
    }

    if (process.env.CRMX_API_KEY) {
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.CRMX_API_KEY}`,
        Version: "2021-07-28",
      };
      // Upsert the contact. Brand details go in companyName + a note rather
      // than custom fields — unknown custom-field keys make GHL 422.
      const r = await fetch("https://services.leadconnectorhq.com/contacts/upsert", {
        method: "POST",
        headers,
        body: JSON.stringify({
          locationId: LOCATION_ID,
          firstName: d.firstName,
          lastName: d.lastName,
          email: d.email,
          phone: d.phone,
          companyName: d.brandName,
          tags,
          source: "FranchiseKI Brand Showcase",
        }),
      });
      const rData = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(`CRMX API responded ${r.status}: ${JSON.stringify(rData)}`);
      const contactId = rData?.contact?.id;
      if (contactId) {
        await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}/notes`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            body: [
              "FranchiseKI Brand Showcase inquiry",
              `Brand: ${d.brandName}`,
              `Role/title: ${d.role}`,
              `Category: ${d.category}`,
              `Open/target territories: ${d.territories}`,
              `Primary interest: ${d.primaryInterest}`,
              `Submitted: ${payload.submittedAt}`,
            ].join("\n"),
          }),
        }).catch((e) => console.error("CRMX note creation failed:", e));
      }
      return res.status(200).json({ ok: true });
    }

    // Not configured yet — accept the submission so the visitor isn't punished,
    // but log loudly so it shows in Vercel function logs.
    console.error("CRMX not configured — DROPPED inquiry:", JSON.stringify(payload));
    return res.status(200).json({ ok: true, warning: "crmx-not-configured" });
  } catch (err) {
    console.error("CRMX delivery failed:", err, JSON.stringify(payload));
    // Still 200 — don't show the prospect an error for a backend wiring problem.
    return res.status(200).json({ ok: true, warning: "delivery-failed" });
  }
}
