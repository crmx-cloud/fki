import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PublicLayout } from "./components/PublicLayout";
import { PublicOnlyRoute } from "./components/PublicOnlyRoute";
import { RoleDashboard, AdminRoute, SuperAdminRoute, BrandRoute } from "./components/RoleGate";
import { Toaster } from "./components/ui/sonner";
import { ThemeProvider } from "./contexts/ThemeContext";
import {
  HomePage,
  QuizPage,
  SettingsPage,
  LoginPage,
  BrandMapPage,
  EmbedMapPage,
  TerritoriesPage,
  BrandsAdminPage,
  UsersPage,
  ExplorePage,
  BrandListingPage,
  ForFranchisorsPage,
  ClaimPage,
  GetStartedPage,
  CRMPage,
  ProspectProfilePage,
  FranchiseOnboardingPage,
  SavedBrandsPage,
  TagsPage,
  NotificationsAdminPage,
  ProspectProfilesAdminPage,
  ContactsAdminPage,
} from "./pages";

const DossierPage = lazy(() => import("./pages/DossierPage"));

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable={false}>
        <Toaster />
        <Routes>
          {/* Public consumer pages */}
          <Route path="/" element={<HomePage />} />
          <Route path="/quiz" element={<QuizPage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/brand/:slug" element={<BrandListingPage />} />
          <Route path="/for-franchisors" element={<ForFranchisorsPage />} />
          <Route path="/claim" element={<ClaimPage />} />
          <Route path="/get-started" element={<GetStartedPage />} />
          <Route
            path="/dossier"
            element={
              <Suspense
                fallback={
                  <div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-400">
                    Loading…
                  </div>
                }
              >
                <DossierPage />
              </Suspense>
            }
          />

          {/* Public map views */}
          <Route path="/map/:brandSlug" element={<BrandMapPage />} />
          <Route path="/embed/:brandSlug" element={<EmbedMapPage />} />

          {/* Auth routes */}
          <Route element={<PublicLayout />}>
            <Route element={<PublicOnlyRoute />}>
              <Route path="/login" element={<LoginPage />} />
              {/* Every "create free account" CTA lands on the full Get Started
                  signup flow — /signup is a redirect so no link ever strands
                  users on a login-first screen. Existing users use Log In. */}
              <Route path="/signup" element={<Navigate to="/get-started" replace />} />
            </Route>
          </Route>

          {/* Authenticated routes — role-gated */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              {/* Dashboard: role-aware (prospect → matches, admin → territory overview) */}
              <Route path="/dashboard" element={<RoleDashboard />} />

              {/* Prospect-only pages */}
              <Route path="/my-profile" element={<ProspectProfilePage />} />
              <Route path="/saved" element={<SavedBrandsPage />} />

              {/* Franchisor pages */}
              <Route path="/franchise-onboarding" element={<FranchiseOnboardingPage />} />
              <Route path="/franchise-onboarding/:brandId" element={<FranchiseOnboardingPage />} />

              {/* Admin / Brand Admin pages — prospects redirected */}
              <Route path="/territories" element={<BrandRoute><TerritoriesPage /></BrandRoute>} />
              <Route path="/crm" element={<BrandRoute><CRMPage /></BrandRoute>} />

              {/* Full admin only — brands + users management */}
              <Route path="/brands" element={<SuperAdminRoute><BrandsAdminPage /></SuperAdminRoute>} />
              <Route path="/users" element={<SuperAdminRoute><UsersPage /></SuperAdminRoute>} />

              {/* Admin+ — Tags, Notifications, Prospect Management */}
              <Route path="/tags" element={<AdminRoute><TagsPage /></AdminRoute>} />
              <Route path="/notifications-admin" element={<AdminRoute><NotificationsAdminPage /></AdminRoute>} />
              <Route path="/prospect-profiles" element={<AdminRoute><ProspectProfilesAdminPage /></AdminRoute>} />
              <Route path="/contacts" element={<AdminRoute><ContactsAdminPage /></AdminRoute>} />

              {/* Settings — everyone can access */}
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
