import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

/**
 * The ONE rule for premium due-diligence access: a free account with
 * VERIFIED email + phone (codes sent via CRMX). Gate call sites use this
 * hook instead of bare isAuthenticated so the rule can never drift.
 */
export function useUnlocked() {
  const { isAuthenticated } = useConvexAuth();
  const status = useQuery(api.verification.myStatus, isAuthenticated ? {} : "skip");
  return {
    isAuthenticated,
    loading: isAuthenticated && status === undefined,
    unlocked: isAuthenticated && !!status?.fullyVerified,
    emailVerified: !!status?.emailVerified,
    phoneVerified: !!status?.phoneVerified,
  };
}
