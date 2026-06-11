import { useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  MapPin,
  ArrowRight,
  CheckCircle2,
  Circle,
  Sparkles,
  BarChart3,
  Globe,
  Rocket,
  Users,
  Map,
  Code,
  ExternalLink,
} from "lucide-react";
import { useState } from "react";
import { EmbedCodeDialog } from "@/components/EmbedCodeDialog";

interface OnboardingStep {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  isComplete: boolean;
}

export function FranchiseDashboardPage() {
  const navigate = useNavigate();
  const myProfile = useQuery(api.users.getMyProfile);
  const myBrands = useQuery(api.franchiseProfile.myBrands);

  if (myProfile === undefined || myBrands === undefined) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex items-center justify-center h-screen">
            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  const firstName = myProfile?.profile?.firstName || "there";
  const hasBrands = myBrands && myBrands.length > 0;
  const primaryBrand = hasBrands ? myBrands[0] : null;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="min-h-screen bg-background">
          {/* Header */}
          <div className="border-b border-border/50 bg-gradient-to-r from-cyan-500/5 via-transparent to-blue-500/5">
            <div className="max-w-5xl mx-auto px-6 py-8">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    Welcome back, {firstName}
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    {hasBrands
                      ? "Manage your franchise listing and grow your brand on Franchise KI."
                      : "Let's get your franchise set up on Franchise KI."}
                  </p>
                </div>
                {primaryBrand && (
                  <Badge variant="outline" className="border-cyan-500/30 text-cyan-400">
                    <Building2 className="w-3 h-3 mr-1" />
                    {primaryBrand.name}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="max-w-5xl mx-auto px-6 py-8">
            {!hasBrands ? (
              <NoBrandState onStart={() => navigate("/claim")} />
            ) : (
              <BrandDashboard
                brand={primaryBrand!}
                onSetup={() =>
                  navigate(`/franchise-onboarding/${primaryBrand!._id}`)
                }
                onViewProfile={() =>
                  navigate(`/franchise-onboarding/${primaryBrand!._id}`)
                }
                onViewMap={() =>
                  navigate(`/map/${primaryBrand!.slug}`)
                }
              />
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function NoBrandState({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 rounded-2xl bg-cyan-500/10 flex items-center justify-center mb-6">
        <Rocket className="w-10 h-10 text-cyan-400" />
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-2">
        Get Your Franchise on the Map
      </h2>
      <p className="text-muted-foreground max-w-md mb-8">
        Claim your franchise listing to start visualizing territories,
        attracting prospects, and growing your brand — all for free.
      </p>
      <Button
        onClick={onStart}
        size="lg"
        className="bg-cyan-500 hover:bg-cyan-600 text-white"
      >
        Claim Your Franchise
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}

function BrandDashboard({
  brand,
  onSetup,
  onViewProfile,
  onViewMap,
}: {
  brand: any;
  onSetup: () => void;
  onViewProfile: () => void;
  onViewMap: () => void;
}) {
  const [embedOpen, setEmbedOpen] = useState(false);
  const territories = useQuery(api.territories.listByBrand, {
    brandId: brand._id as Id<"brands">,
  });
  const fpData = useQuery(api.franchiseProfile.getProfile, {
    brandId: brand._id as Id<"brands">,
  });

  const fp = fpData?.franchiseProfile;
  const territoryCount = territories?.length || 0;

  // Calculate onboarding completeness
  const hasInvestment =
    !!(fp?.totalInvestmentMin || fp?.totalInvestmentMax || fp?.franchiseFee);
  const hasPerformance = !!(fp?.totalUnits || fp?.avgUnitRevenue);
  const hasTerritories = territoryCount > 0;
  const hasContent = !!(fp?.brandStory || fp?.positioning);
  const hasFlags =
    fp?.item19Available !== undefined || fp?.isGrowing !== undefined;

  const steps: OnboardingStep[] = [
    {
      id: "brand",
      label: "Brand Basics",
      description: "Name, website & contact info",
      icon: <Building2 className="w-4 h-4" />,
      isComplete: !!(brand.name && brand.contactEmail),
    },
    {
      id: "investment",
      label: "Investment Details",
      description: "Fee range & liquid capital",
      icon: <BarChart3 className="w-4 h-4" />,
      isComplete: hasInvestment,
    },
    {
      id: "performance",
      label: "Unit Performance",
      description: "Open stores, revenue & metrics",
      icon: <Sparkles className="w-4 h-4" />,
      isComplete: hasPerformance,
    },
    {
      id: "territories",
      label: "Territory Map",
      description: "Add your available territories",
      icon: <MapPin className="w-4 h-4" />,
      isComplete: hasTerritories,
    },
    {
      id: "content",
      label: "Brand Story",
      description: "Tell prospects why your brand",
      icon: <Globe className="w-4 h-4" />,
      isComplete: hasContent,
    },
    {
      id: "highlights",
      label: "Highlights & Flags",
      description: "Item 19, SBA, growth plans",
      icon: <Users className="w-4 h-4" />,
      isComplete: hasFlags,
    },
  ];

  const completedCount = steps.filter((s) => s.isComplete).length;
  const progress = Math.round((completedCount / steps.length) * 100);
  const isOnboardingComplete = completedCount === steps.length;

  return (
    <div className="space-y-8">
      {/* Progress Overview */}
      <div className="rounded-xl border border-border/50 bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {isOnboardingComplete
                ? "Your listing is live!"
                : "Complete Your Listing"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isOnboardingComplete
                ? "Your franchise profile is fully set up. Keep it updated to attract more prospects."
                : `${completedCount} of ${steps.length} steps complete — the more you fill out, the better your listing performs.`}
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-cyan-400">
              {progress}%
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Steps grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {steps.map((step) => (
            <button
              key={step.id}
              onClick={onSetup}
              className="flex items-start gap-3 p-3 rounded-lg border border-border/50 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all text-left group"
            >
              <div
                className={`mt-0.5 ${step.isComplete ? "text-green-400" : "text-muted-foreground group-hover:text-cyan-400"}`}
              >
                {step.isComplete ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Circle className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium ${step.isComplete ? "text-green-400" : "text-foreground"}`}
                >
                  {step.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </button>
          ))}
        </div>

        {!isOnboardingComplete && (
          <div className="mt-6 flex justify-center">
            <Button
              onClick={onSetup}
              className="bg-cyan-500 hover:bg-cyan-600 text-white"
            >
              {completedCount === 0
                ? "Start Setup"
                : "Continue Setup"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border/50 bg-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-cyan-400" />
            </div>
            <span className="text-2xl font-bold text-foreground">
              {territoryCount}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">Territories Listed</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-2xl font-bold text-foreground">
              {brand.isActive ? "Active" : "Pending"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">Listing Status</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-2xl font-bold text-foreground">
              {brand.category || "Uncategorized"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">Category</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={onViewProfile}
          className="flex items-center gap-4 p-5 rounded-xl border border-border/50 bg-card hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all text-left group"
        >
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
            <Building2 className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <p className="font-medium text-foreground">Edit Full Profile</p>
            <p className="text-sm text-muted-foreground">
              Manage all brand details, photos & FAQs
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:text-cyan-400 transition-colors" />
        </button>
        <button
          onClick={() => window.open(`/map/${brand.slug}`, "_blank")}
          className="flex items-center gap-4 p-5 rounded-xl border border-border/50 bg-card hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all text-left group"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
            <Map className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="font-medium text-foreground flex items-center gap-1.5">View My Map <ExternalLink className="w-3 h-3 opacity-50" /></p>
            <p className="text-sm text-muted-foreground">
              See your public territory map in a new tab
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:text-blue-400 transition-colors" />
        </button>
        <button
          onClick={onViewMap}
          className="flex items-center gap-4 p-5 rounded-xl border border-border/50 bg-card hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all text-left group"
        >
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
            <MapPin className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="font-medium text-foreground">Manage Territories</p>
            <p className="text-sm text-muted-foreground">
              Add, edit, or remove your territories
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:text-emerald-400 transition-colors" />
        </button>
        <button
          onClick={() => setEmbedOpen(true)}
          className="flex items-center gap-4 p-5 rounded-xl border border-border/50 bg-card hover:border-purple-500/30 hover:bg-purple-500/5 transition-all text-left group"
        >
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
            <Code className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <p className="font-medium text-foreground">Get Embed Code</p>
            <p className="text-sm text-muted-foreground">
              Embed your territory map on your own website
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:text-purple-400 transition-colors" />
        </button>
      </div>

      {/* Embed Code Dialog */}
      <EmbedCodeDialog
        open={embedOpen}
        onOpenChange={setEmbedOpen}
        brandSlug={brand.slug}
        brandName={brand.name}
        brandColor={brand.color}
      />
    </div>
  );
}
