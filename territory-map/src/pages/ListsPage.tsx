import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { PublicNav } from "@/components/PublicNav";
import { PublicFooter } from "@/components/PublicFooter";
import { SocialProofToasts } from "@/components/SocialProofToasts";
import { formatMoney } from "@/lib/format";
import { Trophy, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Top Lists — SEO content layer. Rankings use OUR transparent methodology
 * (unit counts, investment levels, verification depth from sourced data);
 * each page states it plainly. Prerendered for crawlers by
 * scripts/generate-seo.mjs; this component serves humans + SPA routing.
 */

export function ListsIndexPage() {
  const lists = useQuery(api.seo.listPages);
  useEffect(() => {
    document.title = "Top Franchise Lists (2026) | FranchiseKI";
  }, []);
  return (
    <div className="min-h-screen bg-slate-950 text-white motion-page">
      <PublicNav />
      <div className="max-w-4xl mx-auto px-6 py-14">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-3">Top Franchise Lists</h1>
        <p className="text-slate-400 mb-10 max-w-2xl">
          Rankings built from sourced, verified franchise data — unit counts, real investment levels, and
          disclosure transparency. Every list states its methodology. No pay-to-play placements.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {(lists ?? []).map((l: any) => (
            <Link
              key={l.slug}
              to={`/lists/${l.slug}`}
              className="rounded-2xl bg-white/[0.03] border border-white/10 p-6 hover:border-cyan-400/40 transition-colors group"
            >
              <Trophy className="w-6 h-6 text-amber-400 mb-3" />
              <h2 className="font-bold mb-1 group-hover:text-cyan-300 transition-colors">{l.title}</h2>
              <p className="text-sm text-slate-400">{l.description}</p>
              <p className="text-xs text-cyan-400 mt-3">{l.rows.length} brands →</p>
            </Link>
          ))}
        </div>
      </div>
      <PublicFooter />
      <SocialProofToasts />
    </div>
  );
}

export function ListDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const lists = useQuery(api.seo.listPages);
  const list = lists?.find((l: any) => l.slug === slug);
  useEffect(() => {
    if (list) document.title = `${list.title} (2026) | FranchiseKI`;
    return () => {
      document.title = "FranchiseKI — Hundreds of Hours of Franchise Due Diligence, Done in 90 Seconds";
    };
  }, [list]);

  if (lists && !list) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <PublicNav />
        <div className="max-w-3xl mx-auto px-6 py-24 text-center">
          <h1 className="text-2xl font-bold mb-4">List not found</h1>
          <Link to="/lists" className="text-cyan-400 underline">See all lists</Link>
        </div>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white motion-page">
      <PublicNav />
      <div className="max-w-4xl mx-auto px-6 py-14">
        <nav className="text-xs text-slate-500 mb-4">
          <Link to="/" className="hover:text-slate-300">Home</Link> ›{" "}
          <Link to="/lists" className="hover:text-slate-300">Top Lists</Link> › {list?.title ?? "…"}
        </nav>
        <h1 className="text-3xl md:text-4xl font-extrabold mb-3">{list?.title ?? "Loading…"}</h1>
        {list && (
          <>
            <p className="text-slate-400 mb-2 max-w-2xl">{list.description}</p>
            <p className="text-xs text-slate-500 mb-8 max-w-2xl">
              <strong className="text-slate-400">Methodology:</strong> {list.methodology}
            </p>
            <div className="rounded-2xl border border-white/10 overflow-hidden mb-10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white/[0.04] text-left text-[11px] uppercase tracking-wider text-slate-400">
                    <th className="px-3 py-2.5 w-12">#</th>
                    <th className="px-3 py-2.5">Brand</th>
                    <th className="px-3 py-2.5">Category</th>
                    <th className="px-3 py-2.5">Investment</th>
                    <th className="px-3 py-2.5">Units</th>
                    <th className="px-3 py-2.5">Item 19</th>
                  </tr>
                </thead>
                <tbody>
                  {list.rows.map((r: any) => (
                    <tr key={r.slug} className="border-t border-white/5 hover:bg-white/[0.03]">
                      <td className="px-3 py-2.5 font-bold text-slate-500">{r.rank}</td>
                      <td className="px-3 py-2.5">
                        <Link to={`/brand/${r.slug}`} className="font-semibold text-cyan-300 hover:underline">
                          {r.name}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-slate-400">{r.category ?? "—"}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {r.investmentMin != null
                          ? `${formatMoney(r.investmentMin)}–${formatMoney(r.investmentMax)}`
                          : "—"}
                      </td>
                      <td className="px-3 py-2.5">{r.totalUnits?.toLocaleString() ?? "—"}</td>
                      <td className="px-3 py-2.5">{r.item19 ? "✓" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="rounded-2xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-400/30 p-6 text-center">
              <h2 className="font-bold text-lg mb-1.5">Which of these actually fits you?</h2>
              <p className="text-sm text-slate-400 mb-4">
                Lists show size — PerfectFit shows fit. Get matched against all 300+ brands in 90 seconds, free.
              </p>
              <Link to="/quiz">
                <Button className="bg-cyan-600 hover:bg-cyan-500 text-white">
                  Find My PerfectFit <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </Link>
            </div>
          </>
        )}
      </div>
      <PublicFooter />
      <SocialProofToasts />
    </div>
  );
}
