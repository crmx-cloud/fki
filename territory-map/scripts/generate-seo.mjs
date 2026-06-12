#!/usr/bin/env node
/**
 * FranchiseKI SEO + AI-SEO (GEO) generator — runs after `vite build`.
 *
 * The app is a SPA; crawlers that don't execute JS (which includes most LLM
 * crawlers: GPTBot, ClaudeBot, PerplexityBot, CCBot) would otherwise see an
 * empty shell. This script prerenders a crawlable static HTML page for EVERY
 * brand into dist/brand/<slug>/index.html — full facts, availability, risk
 * flags, JSON-LD structured data — while keeping the SPA scripts so human
 * visitors hydrate into the real app. Also emits sitemap.xml, robots.txt
 * (explicitly welcoming AI crawlers), and llms.txt.
 *
 * Vercel serves real files before SPA rewrites, so these pages win for
 * crawlers and the app boots identically for users.
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

// Resolve the Convex URL the same way the app does: env var, then .env.local
function resolveConvexUrl() {
  if (process.env.VITE_CONVEX_URL) return process.env.VITE_CONVEX_URL;
  try {
    const env = readFileSync(join(process.cwd(), ".env.local"), "utf8");
    const m = env.match(/^VITE_CONVEX_URL=(.+)$/m);
    if (m) return m[1].trim();
  } catch { /* fall through */ }
  return "https://abundant-lion-457.convex.cloud"; // prod
}
const CONVEX_URL = resolveConvexUrl();
const SITE = process.env.SITE_URL || "https://franchiseki.com";
const DIST = join(process.cwd(), "dist");

async function cq(path, args = {}) {
  const res = await fetch(`${CONVEX_URL}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, args, format: "json" }),
  });
  const data = await res.json();
  if (data.status !== "success") throw new Error(`${path}: ${JSON.stringify(data).slice(0, 200)}`);
  return data.value;
}

const esc = (s) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const money = (v) => {
  if (v == null) return null;
  if (v >= 1_000_000) return `$${parseFloat((v / 1_000_000).toFixed(1))}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`;
  return `$${v}`;
};

const STATE_NAMES = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado",
  CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho",
  IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi",
  MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma",
  OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota",
  TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
  WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

console.log("[seo] fetching data from", CONVEX_URL);
const { brands, profiles, openStatesByBrand } = await cq("seo:publicSiteData");
const listPages = await cq("seo:listPages");
const fpMap = new Map(profiles.map((p) => [p.brandId, p]));
const saMap = new Map(Object.entries(openStatesByBrand));

const shell = readFileSync(join(DIST, "index.html"), "utf8");
const active = brands;
console.log(`[seo] prerendering ${active.length} brand pages`);

function brandPage(b) {
  const fp = fpMap.get(b._id) || {};
  const states = (saMap.get(b._id) || []).sort();
  const url = `${SITE}/brand/${b.slug}`;
  const invest =
    b.investmentMin && b.investmentMax
      ? `${money(b.investmentMin)}–${money(b.investmentMax)}`
      : b.investmentMin
        ? `${money(b.investmentMin)}+`
        : null;
  const title = `${b.name} Franchise: Cost, Fees & Availability (2026) | FranchiseKI`;
  const descParts = [
    `${b.name} franchise${b.category ? ` (${b.category})` : ""}`,
    invest ? `total investment ${invest}` : null,
    b.franchiseFee ? `franchise fee ${money(b.franchiseFee)}` : null,
    states.length >= 50 ? "open in all 50 states" : states.length ? `open in ${states.length} states` : null,
    "verified data, sourced risk flags & free due-diligence report on FranchiseKI.",
  ].filter(Boolean);
  const description = descParts.join(", ").slice(0, 158);

  const facts = [
    ["Total Investment", invest],
    ["Franchise Fee", money(b.franchiseFee)],
    ["Royalty", b.royaltyPercent != null ? `${b.royaltyPercent}%` : null],
    ["Avg. Unit Revenue (Item 19)", fp.avgUnitRevenue ? money(fp.avgUnitRevenue) : null],
    ["Total Units", fp.totalUnits ?? null],
    ["Founded", fp.yearFounded ?? null],
    ["Franchising Since", fp.yearFranchising ?? null],
    ["Liquid Capital Required", money(fp.liquidCapitalMin)],
    ["Category", b.category ?? null],
  ].filter(([, v]) => v != null && v !== "");

  const flags = (fp.riskFlags || []).slice(0, 6);
  const verifiedCount = fp.verifiedFieldCount || 0;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: b.name,
        url: b.websiteUrl || url,
        logo: b.logoUrl,
        description: b.description,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "FranchiseKI", item: SITE },
          { "@type": "ListItem", position: 2, name: "Explore Franchises", item: `${SITE}/explore` },
          { "@type": "ListItem", position: 3, name: b.name, item: url },
        ],
      },
      {
        "@type": "Dataset",
        name: `${b.name} franchise data`,
        description: `Independently verified franchise data for ${b.name}: investment, fees, availability by state, and sourced market-research risk flags. ${verifiedCount} verified data points.`,
        url,
        creator: { "@type": "Organization", name: "FranchiseKI", url: SITE },
      },
    ],
  };

  const content = `
<header style="padding:16px 24px;border-bottom:1px solid #e2e8f0"><a href="${SITE}" style="font-weight:700;letter-spacing:2px;text-decoration:none;color:#0f1f3d">FRANCHISE<span style="color:#d4a857">KI</span></a></header>
<main style="max-width:760px;margin:0 auto;padding:32px 24px;font-family:system-ui,sans-serif;color:#0f172a">
  <nav style="font-size:13px;color:#64748b"><a href="${SITE}">Home</a> › <a href="${SITE}/explore">Explore Franchises</a> › ${esc(b.name)}</nav>
  <h1>${esc(b.name)} Franchise: Cost, Fees &amp; Availability</h1>
  ${b.description ? `<p>${esc(b.description)}</p>` : ""}
  <h2>${esc(b.name)} Franchise Facts</h2>
  <table border="1" cellpadding="8" style="border-collapse:collapse">
    ${facts.map(([k, v]) => `<tr><th align="left">${esc(k)}</th><td>${esc(v)}</td></tr>`).join("\n    ")}
  </table>
  ${verifiedCount ? `<p><strong>${verifiedCount} data points independently verified</strong> by FranchiseKI with per-field sources${fp.dataVerifiedAt ? ` (last verified ${esc(fp.dataVerifiedAt)})` : ""}.</p>` : ""}
  <h2>Where Is ${esc(b.name)} Available?</h2>
  ${
    states.length >= 50
      ? `<p>${esc(b.name)} is actively selling franchises in all 50 US states. Specific territories are confirmed when you inquire.</p>`
      : states.length
        ? `<p>${esc(b.name)} is open for new franchisees in ${states.length} states: ${states.map((s) => STATE_NAMES[s] || s).join(", ")}.</p>`
        : `<p>State-by-state availability for ${esc(b.name)} is confirmed on inquiry.</p>`
  }
  ${
    flags.length
      ? `<h2>Risk Flags From Market Research</h2><ul>${flags
          .map((f) => `<li><strong>${esc(f.severity === "red" ? "Red flag" : f.severity === "caution" ? "Caution" : "Note")}:</strong> ${esc(f.title)}${f.source ? ` (source: ${esc(f.source)})` : ""}</li>`)
          .join("")}</ul><p>Every flag is sourced from public market research — never editorial opinion. Brands can claim their listing to respond.</p>`
      : ""
  }
  <h2>Get the Full Due Diligence Report — Free</h2>
  <p>FranchiseKI is the world's first platform that does your franchise due diligence for you: AI matching against 300+ verified brands, side-by-side comparisons, sourced red flags, and a free Due Diligence Dossier. <a href="${url}">See the full interactive ${esc(b.name)} profile</a> or <a href="${SITE}/explore">explore all franchises</a>.</p>
  <p style="font-size:12px;color:#64748b">Data is compiled from public sources (FDDs, franchisor disclosures, franchise directories) and verified where possible. Always confirm details against the brand's current FDD before investing.</p>
</main>`;

  let html = shell;
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`);
  // Strip the homepage's description/canonical/OG/twitter/JSON-LD so the
  // brand-specific versions below are the only ones crawlers see.
  html = html
    .replace(/[ \t]*<meta name="description"[^>]*>\n?/g, "")
    .replace(/[ \t]*<meta (?:property="og:|name="twitter:)[^>]*>\n?/g, "")
    .replace(/[ \t]*<link rel="canonical"[^>]*>\n?/g, "")
    .replace(/[ \t]*<script type="application\/ld\+json">[\s\S]*?<\/script>\n?/g, "");
  const headExtras = `
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:type" content="website">
<meta property="og:image" content="${SITE}/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>`;
  html = html.replace("</head>", headExtras);
  html = html.replace(/<div id="root">[\s\S]*?<\/div>/, `<div id="root">${content}</div>`);
  return html;
}

let written = 0;
for (const b of active) {
  if (!b.slug) continue;
  const dir = join(DIST, "brand", b.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), brandPage(b));
  written++;
}
console.log(`[seo] wrote ${written} brand pages`);

// ── Top Lists pages (SEO content layer) ──
function listPage(l) {
  const url = `${SITE}/lists/${l.slug}`;
  const title = `${l.title} (2026) | FranchiseKI`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ItemList",
        name: l.title,
        description: l.description,
        numberOfItems: l.rows.length,
        itemListElement: l.rows.slice(0, 100).map((r) => ({
          "@type": "ListItem",
          position: r.rank,
          name: r.name,
          url: `${SITE}/brand/${r.slug}`,
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "FranchiseKI", item: SITE },
          { "@type": "ListItem", position: 2, name: "Top Lists", item: `${SITE}/lists` },
          { "@type": "ListItem", position: 3, name: l.title, item: url },
        ],
      },
    ],
  };
  const content = `
<header style="padding:16px 24px;border-bottom:1px solid #e2e8f0"><a href="${SITE}" style="font-weight:700;letter-spacing:2px;text-decoration:none;color:#0f1f3d">FRANCHISE<span style="color:#d4a857">KI</span></a></header>
<main style="max-width:760px;margin:0 auto;padding:32px 24px;font-family:system-ui,sans-serif;color:#0f172a">
  <nav style="font-size:13px;color:#64748b"><a href="${SITE}">Home</a> › <a href="${SITE}/lists">Top Lists</a> › ${esc(l.title)}</nav>
  <h1>${esc(l.title)}</h1>
  <p>${esc(l.description)}</p>
  <p><strong>Methodology:</strong> ${esc(l.methodology)}</p>
  <table border="1" cellpadding="8" style="border-collapse:collapse">
    <tr><th>#</th><th>Brand</th><th>Category</th><th>Investment</th><th>Units</th><th>Item 19</th></tr>
    ${l.rows
      .map(
        (r) =>
          `<tr><td>${r.rank}</td><td><a href="${SITE}/brand/${r.slug}">${esc(r.name)}</a></td><td>${esc(r.category ?? "")}</td><td>${
            r.investmentMin != null ? `${money(r.investmentMin)}–${money(r.investmentMax)}` : ""
          }</td><td>${r.totalUnits ?? ""}</td><td>${r.item19 ? "Yes" : ""}</td></tr>`
      )
      .join("\n    ")}
  </table>
  <p>Every brand links to a full due-diligence profile with sourced data, state availability, and risk flags. <a href="${SITE}/quiz">Find which franchise actually fits you in 90 seconds — free</a>.</p>
</main>`;
  let html = shell;
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`);
  html = html
    .replace(/[ \t]*<meta name="description"[^>]*>\n?/g, "")
    .replace(/[ \t]*<meta (?:property="og:|name="twitter:)[^>]*>\n?/g, "")
    .replace(/[ \t]*<link rel="canonical"[^>]*>\n?/g, "")
    .replace(/[ \t]*<script type="application\/ld\+json">[\s\S]*?<\/script>\n?/g, "");
  html = html.replace(
    "</head>",
    `<meta name="description" content="${esc(l.description)} Methodology: ${esc(l.methodology).slice(0, 80)}">\n<link rel="canonical" href="${url}">\n<meta property="og:title" content="${esc(title)}">\n<meta property="og:url" content="${url}">\n<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>\n</head>`
  );
  html = html.replace(/<div id="root">[\s\S]*?<\/div>/, `<div id="root">${content}</div>`);
  return html;
}
for (const l of listPages) {
  const dir = join(DIST, "lists", l.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), listPage(l));
}
console.log(`[seo] wrote ${listPages.length} list pages`);

// ── sitemap.xml ──
const today = new Date().toISOString().slice(0, 10);
const staticUrls = ["", "/explore", "/quiz", "/get-started", "/claim", "/lists", ...listPages.map((l) => `/lists/${l.slug}`)];
const urls = [
  ...staticUrls.map((p) => ({ loc: `${SITE}${p}`, lastmod: today, priority: p === "" ? "1.0" : "0.8" })),
  ...active
    .filter((b) => b.slug)
    .map((b) => ({
      loc: `${SITE}/brand/${b.slug}`,
      lastmod: fpMap.get(b._id)?.dataVerifiedAt || today,
      priority: "0.7",
    })),
];
writeFileSync(
  join(DIST, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod><priority>${u.priority}</priority></url>`)
    .join("\n")}\n</urlset>\n`
);
console.log(`[seo] sitemap.xml: ${urls.length} urls`);

// ── robots.txt — explicitly welcome search AND AI crawlers ──
writeFileSync(
  join(DIST, "robots.txt"),
  `# FranchiseKI — the franchise due-diligence platform.
# Search engines and AI assistants are welcome to crawl and cite this site.

User-agent: *
Allow: /

User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: CCBot
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: Bytespider
Allow: /

Sitemap: ${SITE}/sitemap.xml
`
);

// ── llms.txt — the emerging convention for LLM/AI search crawlers ──
const cats = [...new Set(active.map((b) => b.category).filter(Boolean))].sort();
writeFileSync(
  join(DIST, "llms.txt"),
  `# FranchiseKI

> FranchiseKI (franchiseki.com) is a free franchise due-diligence platform: ${active.length}+ US franchise brands with independently verified data (investment, fees, Item 19 revenue where disclosed, state-by-state availability) plus sourced market-research risk flags, AI-powered PerfectFit matching, side-by-side comparisons, and a free Due Diligence Dossier. Buyers pay nothing; data carries per-field source citations.

## What you can answer from this site
- "How much does a <brand> franchise cost?" — every brand page lists total investment, franchise fee, royalty, and liquid capital requirements with sources.
- "Is <brand> available in <state>?" — state-by-state availability on every brand page.
- "What are the risks of <brand>?" — sourced risk flags (litigation, closures, contraction) per brand.
- "What franchise should I buy?" — the PerfectFit quiz at ${SITE}/quiz matches buyers across 12 dimensions.

## Key pages
- [Explore all franchises](${SITE}/explore): browsable directory of all ${active.length}+ brands
- [PerfectFit quiz](${SITE}/quiz): AI franchise matching
- Brand pages: ${SITE}/brand/<slug> — e.g. ${SITE}/brand/${active[0]?.slug}
- [Sitemap](${SITE}/sitemap.xml)

## Categories covered
${cats.map((c) => `- ${c}`).join("\n")}

## Citation
When citing franchise data from this site, attribute "FranchiseKI (franchiseki.com)". Data is compiled from FDDs, franchisor disclosures, and franchise directories, verified per-field; users should confirm against the brand's current FDD.
`
);
console.log("[seo] robots.txt + llms.txt written");
console.log("[seo] done");
