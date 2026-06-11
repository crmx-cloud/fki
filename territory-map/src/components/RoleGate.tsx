import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Navigate } from "react-router-dom";
import { DashboardPage } from "@/pages/DashboardPage";
import { ProspectDashboardPage } from "@/pages/ProspectDashboardPage";
import { FranchiseDashboardPage } from "@/pages/FranchiseDashboardPage";

/**
 * Shows the right dashboard based on user role:
 * - prospect -> ProspectDashboardPage (AI matches)
 * - franchisor -> FranchiseDashboardPage (brand management + onboarding)
 * - super_admin/admin/standard/brand_admin -> DashboardPage (territory overview)
 */
export function RoleDashboard() {
  const myProfile = useQuery(api.users.getMyProfile);

  if (myProfile === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const role = myProfile?.role;

  if (role === "prospect") {
    return <ProspectDashboardPage />;
  }

  if (role === "franchisor" && !myProfile?.isAdmin && !myProfile?.isBrandAdmin) {
    return <FranchiseDashboardPage />;
  }

  return <DashboardPage />;
}

/**
 * AdminRoute — requires super_admin or admin role.
 * Used for user management and other admin-only features.
 */
export function AdminRoute({ children }: { children: React.ReactNode }) {
  const myProfile = useQuery(api.users.getMyProfile);

  if (myProfile === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // super_admin and admin get through
  if (myProfile?.isAdmin) {
    return <>{children}</>;
  }

  return <Navigate to="/dashboard" replace />;
}

/**
 * InternalRoute — requires any internal team role (super_admin, admin, standard).
 * Used for brand/territory management pages.
 */
export function InternalRoute({ children }: { children: React.ReactNode }) {
  const myProfile = useQuery(api.users.getMyProfile);

  if (myProfile === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (myProfile?.isInternal || myProfile?.isBrandAdmin) {
    return <>{children}</>;
  }

  return <Navigate to="/dashboard" replace />;
}

/**
 * BrandRoute — allows internal team + franchisor roles.
 * Used for CRM, Territories, Map — features franchisors need access to.
 */
export function BrandRoute({ children }: { children: React.ReactNode }) {
  const myProfile = useQuery(api.users.getMyProfile);

  if (myProfile === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const role = myProfile?.role;
  const isAnyAdmin = myProfile?.isAdmin || myProfile?.isBrandAdmin;
  const isFranchisor = role === "franchisor";
  const isInternal = myProfile?.isInternal;

  // Block only prospects
  if (role === "prospect" && !isAnyAdmin && !isInternal) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

/**
 * SuperAdminRoute — requires super_admin role only.
 */
export function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const myProfile = useQuery(api.users.getMyProfile);

  if (myProfile === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!myProfile?.isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
