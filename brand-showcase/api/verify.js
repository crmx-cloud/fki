// Vercel serverless relay: Brand Showcase onboarding verification.
// Proxies the /welcome page's code send/confirm calls to the platform's
// Convex endpoints, attaching the shared secret server-side.
//
// POST /api/verify  { action: "send"|"confirm", inquiryId, kind: "email"|"phone", code? }

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const base = process.env.CONVEX_INQUIRY_URL;
  const secret = process.env.CONVEX_INQUIRY_SECRET;
  if (!base || !secret) {
    return res.status(503).json({ ok: false, error: "not_configured" });
  }

  const d = req.body || {};
  if (
    (d.action !== "send" && d.action !== "confirm") ||
    typeof d.inquiryId !== "string" ||
    (d.kind !== "email" && d.kind !== "phone")
  ) {
    return res.status(400).json({ ok: false, error: "bad_request" });
  }

  const url = base.replace("/api/brand-showcase-inquiry", `/api/brand-showcase-verify/${d.action}`);
  const body = { inquiryId: d.inquiryId, kind: d.kind };
  if (d.action === "confirm") body.code = d.code;

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Showcase-Secret": secret },
      body: JSON.stringify(body),
    });
    const data = await r.json().catch(() => ({ ok: false, error: "bad_upstream_response" }));
    return res.status(r.ok ? 200 : r.status).json(data);
  } catch (err) {
    console.error("verify relay failed:", err);
    return res.status(502).json({ ok: false, error: "upstream_unreachable" });
  }
}
