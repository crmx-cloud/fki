export const APP_NAME = "Franchise KI";
export const ADMIN_EMAIL_DOMAIN = "franchiseki.com";

export const SUPER_ADMIN_EMAILS = [
  "brent@franchiseki.com",
  "madison@franchiseki.com",
  "bennett@franchiseki.com",
];

/** Returns true if the role has full admin access (super_admin or admin) */
export function isAdminRole(role: string | undefined): boolean {
  return role === "super_admin" || role === "admin";
}

/** Returns true if the role has any internal team access (super_admin, admin, or standard) */
export function isInternalRole(role: string | undefined): boolean {
  return role === "super_admin" || role === "admin" || role === "standard";
}

/** Returns true if the email is a super admin */
export function isSuperAdminEmail(email: string): boolean {
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
}

/** Full US state name (lowercased) -> 2-letter code. Profiles store full names
 * ("Florida"); stateAvailability stores codes ("FL") — always normalize. */
const STATE_NAME_TO_CODE: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA",
  hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA", kansas: "KS",
  kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD", massachusetts: "MA",
  michigan: "MI", minnesota: "MN", mississippi: "MS", missouri: "MO", montana: "MT",
  nebraska: "NE", nevada: "NV", "new hampshire": "NH", "new jersey": "NJ",
  "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND",
  ohio: "OH", oklahoma: "OK", oregon: "OR", pennsylvania: "PA", "rhode island": "RI",
  "south carolina": "SC", "south dakota": "SD", tennessee: "TN", texas: "TX",
  utah: "UT", vermont: "VT", virginia: "VA", washington: "WA",
  "west virginia": "WV", wisconsin: "WI", wyoming: "WY",
};

/** Normalize a state (full name or code, any case) to its 2-letter code. */
export function toStateCode(state: string | undefined | null): string | undefined {
  if (!state) return undefined;
  const trimmed = state.trim();
  if (trimmed.length === 2) return trimmed.toUpperCase();
  return STATE_NAME_TO_CODE[trimmed.toLowerCase()];
}
