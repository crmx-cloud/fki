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
    return rows
      .filter((p) => p.email && (p.primaryState || p.state))
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
