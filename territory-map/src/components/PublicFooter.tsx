import { Link } from "react-router-dom";

export function PublicFooter() {
  return (
    <footer className="border-t border-white/10 py-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Left: branding */}
          <div className="flex items-center gap-3">
            <img src="/logo-dark-bg.png" alt="Franchise KI" className="h-6" />
            <span className="text-sm text-slate-400">
              © {new Date().getFullYear()} Franchise KI. All rights reserved.
            </span>
          </div>

          {/* Right: links */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
            <Link to="/quiz" className="hover:text-white transition-colors">PerfectFit</Link>
            <Link to="/explore" className="hover:text-white transition-colors">Explore</Link>
            <Link to="/for-franchisors" className="hover:text-white transition-colors">For Franchisors</Link>
            <span className="hidden md:inline text-white/10">|</span>
            <Link to="/login" className="hover:text-cyan-400 transition-colors">Franchisor Login</Link>
            <Link to="/login" className="hover:text-cyan-400 transition-colors">Admin Login</Link>
          </div>
        </div>

        {/* Site-wide due-diligence / liability disclaimer */}
        <p className="mt-8 pt-6 border-t border-white/5 text-[11px] leading-relaxed text-slate-600 max-w-5xl">
          Franchise KI's research, data points, scores, and summaries are generated with the
          assistance of artificial intelligence from publicly available sources (including
          Franchise Disclosure Documents, franchisor websites, and industry directories) and may
          contain errors, omissions, or outdated figures. Nothing on this site is financial,
          legal, accounting, or investment advice, and nothing here is a recommendation to buy
          any franchise. You are 100% responsible for completing your own independent due
          diligence before investing any money — including reviewing the brand's current FDD in
          full, validating with existing franchisees, and consulting a qualified franchise
          attorney and accountant. Franchise KI and its affiliates assume no liability for
          investment decisions made based on information presented here.
        </p>
      </div>
    </footer>
  );
}
