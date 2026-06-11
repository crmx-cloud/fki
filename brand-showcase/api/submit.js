// Vercel serverless relay: Brand Showcase form → CRMX.
// Keeps CRMX credentials out of the browser. Configure ONE of these env vars
// on the Vercel project:
//   CRMX_WEBHOOK_URL — inbound-webhook trigger URL from the CRMX workflow
//                      "Franchise KI Brand Showcase Inquiry" (preferred), OR
//   CRMX_API_KEY     — the GHL Private Integration Token (1Password
//                      FKI-Production vault, item "GHL Private API Token");
//                      we then upsert the contact directly.
// Location ID defaults to FKI's CRMX location (not a secret — see ghl-skill).

const LOCATION_ID = process.env.CRMX_LOCATION_ID || "14RD8KklxR9G4e0Rf7v2";

const INTEREST_TAGS = {
  "Claim or update our listing": "FKI - Claim Listing",
  "Ask about featured placement": "FKI - Featured Placement",
  "Ask about broker-led lead support": "FKI - Broker-Led Lead Support",
  "All of the above": "FKI - All Growth Options",
};

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

  const tags = ["FKI - Brand Showcase Inquiry"];
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
      const r = await fetch("https://services.leadconnectorhq.com/contacts/upsert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.CRMX_API_KEY}`,
          Version: "2021-07-28",
        },
        body: JSON.stringify({
          locationId: LOCATION_ID,
          firstName: d.firstName,
          lastName: d.lastName,
          email: d.email,
          phone: d.phone,
          tags,
          source: "Franchise KI Brand Showcase",
          customFields: [
            { key: "franchise_brand_name", field_value: d.brandName },
            { key: "franchisor_role_title", field_value: d.role },
            { key: "franchise_category", field_value: d.category },
            { key: "open_target_territories", field_value: d.territories },
            { key: "primary_interest", field_value: d.primaryInterest },
          ],
        }),
      });
      if (!r.ok) throw new Error(`CRMX API responded ${r.status}`);
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
