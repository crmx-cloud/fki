import { query } from "./_generated/server";

/**
 * Anonymous social-proof feed for the public site ("Someone in Florida just
 * created their profile…"). Strictly PII-free: state + timestamp + progress
 * flags only — no names, emails, ids, or cities. Reactive, so a new signup
 * pops onto visitors' screens in real time; otherwise the UI rotates through
 * the latest 50.
 */
export const recent = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("prospectProfiles").order("desc").take(300);
    // Never show internal/test accounts as social proof — fake-looking
    // entries ("QA from Florida") damage credibility more than no entry.
    const isInternal = (p: any) => {
      const e = (p.email ?? "").toLowerCase();
      const f = (p.firstName ?? "").toLowerCase();
      return (
        e.endsWith("@test.local") ||
        e.endsWith("@franchiseki.com") ||
        /(^|[._-])(qa|test|demo)([._-]|@|$)/.test(e) ||
        ["qa", "test", "demo", "chatqa", "launch"].includes(f) ||
        f.includes("test")
      );
    };
    return rows
      .filter((p) => p.email && (p.primaryState || p.state) && !isInternal(p))
      .slice(0, 50)
      .map((p) => ({
        firstName: p.firstName || null, // first name ONLY — never last name or email
        state: (p.primaryState || p.state)!,
        ts: p._creationTime,
        complete: !!p.profileComplete,
        enhanced: !!p.enhancedProfileComplete,
      }));
  },
});
