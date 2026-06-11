import { AlertTriangle } from "lucide-react";

/**
 * Required disclaimer for all AI-assisted due-diligence content.
 * `variant="inline"` — slim one-liner under data sections.
 * `variant="full"` — complete language for report footers, dossier, compare view.
 */
export function DueDiligenceDisclaimer({ variant = "inline" }: { variant?: "inline" | "full" }) {
  if (variant === "inline") {
    return (
      <p className="text-xs text-slate-400 leading-relaxed mt-3">
        <AlertTriangle className="inline w-3 h-3 mr-1 -mt-0.5" aria-hidden />
        AI-assisted research from public sources — may contain errors or outdated figures. Not
        financial, legal, or investment advice. Verify everything independently before investing.
      </p>
    );
  }
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 mt-6 text-xs text-slate-500 leading-relaxed space-y-2">
      <p className="font-semibold text-slate-600 flex items-center gap-1.5">
        <AlertTriangle className="w-3.5 h-3.5" aria-hidden />
        Important — Please Read
      </p>
      <p>
        The research, data points, scores, and summaries on Franchise KI are generated with the
        assistance of artificial intelligence from publicly available sources (including Franchise
        Disclosure Documents, franchisor websites, and industry directories). Despite our
        verification efforts, this information may contain errors, omissions, or outdated figures,
        and may not reflect a brand's current offering.
      </p>
      <p>
        Nothing on this site is financial, legal, accounting, or investment advice, and no result
        here is a recommendation to buy any franchise. You are <strong>100% responsible</strong>{" "}
        for completing your own independent due diligence before investing any money — including
        reviewing the brand's current FDD in full, validating with existing franchisees, and
        consulting a qualified franchise attorney and accountant.
      </p>
      <p>
        Franchise KI and its affiliates assume no liability for investment decisions made based on
        information presented here. By using this site you acknowledge and accept these terms.
      </p>
    </div>
  );
}
