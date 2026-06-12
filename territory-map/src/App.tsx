import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { captureAttribution } from "./lib/attribution";
import { AppLayout } from "./components/AppLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PublicLayout } from "./components/PublicLayout";
import { PublicOnlyRoute } from "./components/PublicOnlyRoute";
import { RoleDashboard, AdminRoute, SuperAdminRoute, BrandRoute, AdminOrBrokerRoute } from "./components/RoleGate";
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
  ClaimsAdminPage,
  VerifyPage,
  AdminKpiPage,
  PrivacyPage,
  TermsPage,
  MessagesPage,
  ListsIndexPage,
  ListDetailPage,
} from "./pages";

const DossierPage = lazy(() => import("./pages/DossierPage"));

function ExternalRedirect({ to }: { to: string }) {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);
  return null;
}

function App() {
  // First-touch UTM/referrer capture (feeds Source Performance KPIs)
  useEffect(() => captureAttribution(), []);
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable={false}>
        <Toaster />
        <Routes>
          {/* Public consumer pages */}
          <Route path="/" element={<HomePage />} />
          <Route path="/quiz" element={<QuizPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/lists" element={<ListsIndexPage />} />
          <Route path="/lists/:slug" element={<ListDetailPage />} />
          <Route path="/brand/:slug" element={<BrandListingPage />} />
          {/* Retired in favor of the Brand Showcase subdomain */}
          <Route path="/for-franchisors" element={<ExternalRedirect to="https://brandshowcase.franchiseki.com/" />} />
          <Route path="/claim" element={<ClaimPage />} />
          <Route path="/get-started" element={<GetStartedPage />} />

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
              <Route path="/tags" element={<AdminOrBrokerRoute><TagsPage /></AdminOrBrokerRoute>} />
              <Route path="/notifications-admin" element={<AdminRoute><NotificationsAdminPage /></AdminRoute>} />
              <Route path="/prospect-profiles" element={<AdminRoute><ProspectProfilesAdminPage /></AdminRoute>} />
              <Route path="/contacts" element={<AdminRoute><ContactsAdminPage /></AdminRoute>} />
              <Route path="/claims-admin" element={<AdminRoute><ClaimsAdminPage /></AdminRoute>} />
              <Route path="/kpis" element={<AdminRoute><AdminKpiPage /></AdminRoute>} />

              {/* Settings — everyone can access */}
              <Route
                path="/dossier"
                element={
                  <Suspense fallback={<div className="p-8 text-muted-foreground">Loading your dossier…</div>}>
                    <DossierPage />
                  </Suspense>
                }
              />
              <Route path="/messages" element={<MessagesPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/verify" element={<VerifyPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
