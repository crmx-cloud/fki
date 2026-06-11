import { Link, useLocation, useNavigate } from "react-router-dom";
import { useConvexAuth, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, X, User, LogOut, LayoutDashboard, Heart, Settings, ChevronDown, Scale, FileSearch } from "lucide-react";
import { useState } from "react";

function PerfectFitLabel() {
  return (
    <span className="inline-flex items-center gap-1">
      PerfectFit
      <span className="inline-flex items-center justify-center text-[9px] font-bold leading-none bg-[#3B82F6] text-white rounded-full px-1.5 py-0.5 tracking-wide">
        AI
      </span>
    </span>
  );
}

const NAV_LINKS = [
  { label: "PerfectFit", href: "/quiz", component: PerfectFitLabel },
  { label: "Explore", href: "/explore" },
  // "For Franchisors" intentionally removed from top nav — franchisor content
  // moves to a separate subdomain; footer link remains.
];

export function PublicNav() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(api.auth.currentUser, isAuthenticated ? {} : "skip");
  const myProfile = useQuery(api.users.getMyProfile, isAuthenticated ? {} : "skip");

  return (
    <nav className="border-b border-white/10 bg-slate-950/80 backdrop-blur-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center">
          <img src="/logo-dark-bg.png" alt="Franchise KI" className="h-10" />
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={`text-sm transition-colors ${
                location.pathname === link.href
                  ? "text-white font-medium"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {link.component ? <link.component /> : link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {isLoading ? (
            /* Loading skeleton */
            <div className="hidden sm:block w-16 h-8" />
          ) : isAuthenticated ? (
            /* ── Logged-in user menu ── */
            <UserMenu user={user} profile={myProfile?.profile} />
          ) : (
            /* ── Not logged in ── */
            <Link to="/login" className="hidden sm:block">
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-white hover:bg-white/10"
              >
                Log In
              </Button>
            </Link>
          )}
          {!isAuthenticated && (
            <Link to="/get-started">
              <Button
                size="sm"
                className="bg-cyan-600 hover:bg-cyan-500 text-white"
              >
                Get Started
              </Button>
            </Link>
          )}
          {/* Mobile menu toggle */}
          <button
            className="md:hidden p-2 text-slate-400 hover:text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 bg-slate-950/95 backdrop-blur-lg px-6 py-4 space-y-3">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              onClick={() => setMobileOpen(false)}
              className={`block py-2 text-sm ${
                location.pathname === link.href
                  ? "text-white font-medium"
                  : "text-slate-400"
              }`}
            >
              {link.component ? <link.component /> : link.label}
            </Link>
          ))}
          {isAuthenticated ? (
            <MobileUserSection
              user={user}
              profile={myProfile?.profile}
              onClose={() => setMobileOpen(false)}
            />
          ) : (
            <Link
              to="/login"
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-sm text-slate-400"
            >
              Log In
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}

/* ── User avatar + dropdown for desktop ── */
function UserMenu({ user, profile }: { user: any; profile: any | null }) {
  const isProspect = !profile?.role || profile?.role === "prospect";
  const { signOut } = useAuthActions();
  const navigate = useNavigate();

  const displayName = getDisplayName(user, profile);
  const initials = getInitials(user, profile);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full pl-1 pr-2.5 py-1 hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/40">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-indigo-500 flex items-center justify-center text-white text-xs font-semibold">
            {initials}
          </div>
          <span className="text-sm text-white font-medium hidden sm:inline max-w-[120px] truncate">
            {displayName}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {/* User info header */}
        <div className="px-3 py-2.5 border-b border-border">
          <p className="text-sm font-medium truncate">{displayName}</p>
          {user?.email && (
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          )}
        </div>
        <DropdownMenuItem onClick={() => navigate("/dashboard")}>
          <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
        </DropdownMenuItem>
        {isProspect && (
          <>
            <DropdownMenuItem onClick={() => navigate("/saved")}>
              <Heart className="w-4 h-4 mr-2" /> Saved Brands
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/saved?compare=1")}>
              <Scale className="w-4 h-4 mr-2" /> Compare Brands
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/dossier")}>
              <FileSearch className="w-4 h-4 mr-2" /> Due Diligence Report
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuItem onClick={() => navigate("/settings")}>
          <Settings className="w-4 h-4 mr-2" /> Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => void signOut().then(() => navigate("/"))}
          className="text-red-400 focus:text-red-400"
        >
          <LogOut className="w-4 h-4 mr-2" /> Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ── Mobile logged-in section ── */
function MobileUserSection({
  user,
  profile,
  onClose,
}: {
  user: any;
  profile: any | null;
  onClose: () => void;
}) {
  const { signOut } = useAuthActions();
  const navigate = useNavigate();
  const isProspect = !profile?.role || profile?.role === "prospect";
  const displayName = getDisplayName(user, profile);
  const initials = getInitials(user, profile);

  return (
    <div className="border-t border-white/10 pt-3 mt-1 space-y-2">
      {/* User info */}
      <div className="flex items-center gap-2.5 py-1">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-indigo-500 flex items-center justify-center text-white text-xs font-semibold">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-white truncate">{displayName}</p>
          {user?.email && (
            <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
          )}
        </div>
      </div>
      <Link
        to="/dashboard"
        onClick={onClose}
        className="flex items-center gap-2 py-2 text-sm text-slate-400 hover:text-white"
      >
        <LayoutDashboard className="w-4 h-4" /> Dashboard
      </Link>
      {isProspect && (
        <>
          <Link
            to="/saved"
            onClick={onClose}
            className="flex items-center gap-2 py-2 text-sm text-slate-400 hover:text-white"
          >
            <Heart className="w-4 h-4" /> Saved Brands
          </Link>
          <Link
            to="/saved?compare=1"
            onClick={onClose}
            className="flex items-center gap-2 py-2 text-sm text-slate-400 hover:text-white"
          >
            <Scale className="w-4 h-4" /> Compare Brands
          </Link>
          <Link
            to="/dossier"
            onClick={onClose}
            className="flex items-center gap-2 py-2 text-sm text-slate-400 hover:text-white"
          >
            <FileSearch className="w-4 h-4" /> Due Diligence Report
          </Link>
        </>
      )}
      <Link
        to="/settings"
        onClick={onClose}
        className="flex items-center gap-2 py-2 text-sm text-slate-400 hover:text-white"
      >
        <Settings className="w-4 h-4" /> Settings
      </Link>
      <button
        onClick={() => {
          onClose();
          void signOut().then(() => navigate("/"));
        }}
        className="flex items-center gap-2 py-2 text-sm text-red-400 hover:text-red-300 w-full text-left"
      >
        <LogOut className="w-4 h-4" /> Sign Out
      </button>
    </div>
  );
}

/* ── Helpers ── */
function getDisplayName(user: any, profile: any): string {
  if (profile?.firstName) {
    const lastInit = profile.lastName ? ` ${profile.lastName.charAt(0)}.` : "";
    return `${profile.firstName}${lastInit}`;
  }
  if (user?.name) {
    const parts = user.name.trim().split(/\s+/);
    if (parts.length > 1) {
      return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
    }
    return parts[0];
  }
  if (user?.email) {
    return user.email.split("@")[0];
  }
  return "Account";
}

function getInitials(user: any, profile: any): string {
  if (profile?.firstName) {
    const f = profile.firstName.charAt(0).toUpperCase();
    const l = profile.lastName ? profile.lastName.charAt(0).toUpperCase() : "";
    return f + l;
  }
  if (user?.name) {
    const parts = user.name.trim().split(/\s+/);
    const f = parts[0]?.charAt(0)?.toUpperCase() || "";
    const l = parts.length > 1 ? parts[parts.length - 1].charAt(0).toUpperCase() : "";
    return f + l;
  }
  if (user?.email) {
    return user.email.charAt(0).toUpperCase();
  }
  return "U";
}
