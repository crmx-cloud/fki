/**
 * First-touch source attribution. captureAttribution() runs once on app
 * load: if UTM params / a referrer are present and no first touch is
 * stored yet, it persists them to localStorage. getAttribution() is sent
 * with prospect.saveProfile so the profile carries its acquisition source
 * (the server only writes first-touch fields once; lastTouchAt always
 * updates). Feeds the Source Performance section of the KPI dashboard.
 */
const KEY = "fki-attribution";

export type Attribution = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  referrer?: string;
  landingPage?: string;
  firstTouchAt?: number;
};

export function captureAttribution(): void {
  try {
    if (localStorage.getItem(KEY)) return; // first touch already recorded
    const qs = new URLSearchParams(window.location.search);
    const ref = document.referrer || "";
    const sameSite = ref && new URL(ref).host === window.location.host;
    const a: Attribution = {
      utmSource: qs.get("utm_source") ?? undefined,
      utmMedium: qs.get("utm_medium") ?? undefined,
      utmCampaign: qs.get("utm_campaign") ?? undefined,
      utmContent: qs.get("utm_content") ?? undefined,
      utmTerm: qs.get("utm_term") ?? undefined,
      referrer: sameSite ? undefined : ref || undefined,
      landingPage: window.location.pathname,
      firstTouchAt: Date.now(),
    };
    localStorage.setItem(KEY, JSON.stringify(a));
  } catch {
    // storage unavailable — attribution is best-effort
  }
}

export function getAttribution(): Attribution | undefined {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Attribution) : undefined;
  } catch {
    return undefined;
  }
}
