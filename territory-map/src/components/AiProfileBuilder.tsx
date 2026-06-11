import { useState } from "react";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Wand2,
  Building2,
  DollarSign,
  MapPin,
  Users,
} from "lucide-react";

interface AiProfileData {
  // Step 1: Basics
  brandName: string;
  websiteUrl: string;
  category: string;
  yearFounded: string;
  yearFranchising: string;
  headquartersCity: string;
  headquartersState: string;
  // Step 2: Investment
  franchiseFee: string;
  totalInvestmentMin: string;
  totalInvestmentMax: string;
  royaltyPercent: string;
  liquidCapitalMin: string;
  // Step 3: Scale
  totalUnits: string;
  isGrowing: boolean;
  geographicFocus: string;
  // Step 4: Model
  ownerOperator: boolean;
  semiAbsentee: boolean;
  absentee: boolean;
  canRunFromHome: boolean;
  multiUnit: boolean;
}

interface GeneratedProfile {
  // Brand basics
  description: string;
  brandStory: string;
  model: string;
  positioning: string;
  sellingPoints: string[];
  idealPartner: string[];
  faqs: { question: string; answer: string }[];
  // Flags
  fddAvailable: boolean;
  isGrowing: boolean;
  multiUnitAvailable: boolean;
  // Ownership
  ownerTypes: string[];
  // Numbers
  yearFounded?: number;
  yearFranchising?: number;
  totalUnits?: number;
  franchiseFee?: number;
  totalInvestmentMin?: number;
  totalInvestmentMax?: number;
  royaltyPercent?: number;
  liquidCapitalMin?: number;
  // Company
  corporateCity?: string;
  corporateState?: string;
  geographicFocus?: string;
  // Extra
  absenteeOwnership: boolean;
  canRunFromHome: boolean;
}

const CATEGORIES = [
  "Food & Beverage",
  "Health & Wellness",
  "Services",
  "Retail",
  "Education & Children",
  "Home Services",
  "Beauty & Self Care",
  "Fitness",
  "Pet Services",
  "Automotive",
  "Cleaning & Restoration",
  "Senior Care",
];

function generateProfile(data: AiProfileData): GeneratedProfile {
  const name = data.brandName || "This franchise";
  const cat = data.category || "Services";
  const city = data.headquartersCity;
  const state = data.headquartersState;
  const yearF = data.yearFounded ? parseInt(data.yearFounded) : undefined;
  const yearFr = data.yearFranchising ? parseInt(data.yearFranchising) : undefined;
  const units = data.totalUnits ? parseInt(data.totalUnits) : undefined;
  const fee = data.franchiseFee ? parseInt(data.franchiseFee.replace(/[^0-9]/g, "")) : undefined;
  const invMin = data.totalInvestmentMin ? parseInt(data.totalInvestmentMin.replace(/[^0-9]/g, "")) : undefined;
  const invMax = data.totalInvestmentMax ? parseInt(data.totalInvestmentMax.replace(/[^0-9]/g, "")) : undefined;
  const royalty = data.royaltyPercent ? parseFloat(data.royaltyPercent) : undefined;
  const liqCap = data.liquidCapitalMin ? parseInt(data.liquidCapitalMin.replace(/[^0-9]/g, "")) : undefined;

  const yearsOp = yearF ? new Date().getFullYear() - yearF : undefined;
  const yearsFr = yearFr ? new Date().getFullYear() - yearFr : undefined;

  // Generate description
  const descParts = [`${name} is a ${cat.toLowerCase()} franchise`];
  if (city && state) descParts[0] += ` headquartered in ${city}, ${state}`;
  if (yearF) descParts.push(`Founded in ${yearF}${yearFr ? ` and franchising since ${yearFr}` : ""}`);
  if (units) descParts.push(`the brand has grown to ${units}+ locations`);
  if (data.geographicFocus) descParts.push(`with a focus on ${data.geographicFocus}`);
  const description = descParts.join(". ") + ".";

  // Generate brand story
  let brandStory = `${name} was ${yearF ? `founded in ${yearF}` : "created"} with a vision to deliver exceptional ${cat.toLowerCase()} experiences.`;
  if (yearsFr && yearsFr > 5) {
    brandStory += ` With ${yearsFr}+ years of franchising experience, the brand has refined its systems, training, and support to help franchise partners succeed.`;
  } else if (yearFr) {
    brandStory += ` As a growing franchise system, ${name} offers the unique opportunity to join a brand on the rise with strong unit economics and a proven playbook.`;
  }
  if (units && units > 20) {
    brandStory += ` Today, ${units}+ locations serve customers across ${data.geographicFocus || "the country"}, and the brand continues to expand into new markets.`;
  }

  // Generate model description
  const ownerTypes: string[] = [];
  if (data.ownerOperator) ownerTypes.push("owner_operator");
  if (data.semiAbsentee) ownerTypes.push("semi_absentee");
  if (data.absentee) ownerTypes.push("absentee");
  if (ownerTypes.length === 0) ownerTypes.push("owner_operator");

  const modelParts = [`${name} offers a `];
  if (data.ownerOperator && data.semiAbsentee) modelParts[0] += "flexible ownership model supporting both owner-operators and semi-absentee investors";
  else if (data.absentee) modelParts[0] += "scalable executive ownership model ideal for investors and multi-unit operators";
  else if (data.semiAbsentee) modelParts[0] += "semi-absentee ownership model designed for investors who want a business that runs without daily involvement";
  else modelParts[0] += "hands-on owner-operator model with direct involvement in day-to-day operations";
  modelParts[0] += ".";
  if (invMin && invMax) {
    modelParts.push(`Total investment ranges from ${formatMoney(invMin)} to ${formatMoney(invMax)}${fee ? `, including a ${formatMoney(fee)} franchise fee` : ""}.`);
  }
  const model = modelParts.join(" ");

  // Generate positioning
  let positioning = `${name} differentiates itself in the ${cat.toLowerCase()} space through`;
  if (yearsOp && yearsOp > 10) positioning += ` decades of proven performance,`;
  positioning += ` strong brand recognition, comprehensive franchisee support, and a commitment to innovation.`;
  if (data.isGrowing) positioning += ` The brand is actively expanding and seeking qualified partners in key growth markets.`;

  // Generate selling points
  const sellingPoints: string[] = [];
  if (yearsOp && yearsOp > 5) sellingPoints.push(`${yearsOp}+ years of proven operating history`);
  if (units && units > 10) sellingPoints.push(`${units}+ locations across ${data.geographicFocus || "the country"}`);
  if (data.isGrowing) sellingPoints.push("Actively growing with prime territories available");
  if (data.multiUnit) sellingPoints.push("Multi-unit development opportunities available");
  if (data.semiAbsentee || data.absentee) sellingPoints.push("Flexible ownership model for investors");
  sellingPoints.push("Comprehensive training and ongoing support");
  sellingPoints.push("Proven systems and operational playbook");
  if (royalty && royalty <= 6) sellingPoints.push(`Competitive royalty structure (${royalty}%)`);

  // Generate ideal partner traits
  const idealPartner: string[] = [];
  if (data.ownerOperator) idealPartner.push("Passionate about the " + cat.toLowerCase() + " industry");
  if (liqCap) idealPartner.push(`Minimum ${formatMoney(liqCap)} in liquid capital`);
  idealPartner.push("Strong leadership and management skills");
  idealPartner.push("Committed to following a proven franchise system");
  if (data.multiUnit) idealPartner.push("Interest in building a multi-unit portfolio");
  idealPartner.push("Community-focused with a desire to make an impact");

  // Generate FAQs
  const faqs: { question: string; answer: string }[] = [
    {
      question: `What is the total investment to open a ${name} franchise?`,
      answer: invMin && invMax
        ? `The total investment ranges from ${formatMoney(invMin)} to ${formatMoney(invMax)}, depending on location and build-out requirements.${fee ? ` This includes a ${formatMoney(fee)} franchise fee.` : ""}`
        : `Please contact us for detailed investment information. We'll walk you through the full investment breakdown during our Discovery process.`,
    },
    {
      question: `Do I need industry experience to own a ${name} franchise?`,
      answer: `No prior ${cat.toLowerCase()} experience is required. Our comprehensive training program and ongoing support system are designed to help franchise partners from all backgrounds succeed.`,
    },
    {
      question: `What kind of training and support does ${name} provide?`,
      answer: `We provide extensive pre-opening training covering operations, marketing, and management, followed by hands-on support at your location. Ongoing support includes field visits, marketing assistance, technology platforms, and a network of fellow franchisees.`,
    },
    {
      question: "How long does it take to open a location?",
      answer: "The typical timeline from signing to opening is 3-6 months, depending on real estate and build-out requirements. Our team guides you through every step of the process.",
    },
    {
      question: "Are territories exclusive?",
      answer: "Yes, we offer protected territories to ensure our franchise partners have the market they need to build a successful business without competing with other locations of the same brand.",
    },
  ];

  return {
    description,
    brandStory,
    model,
    positioning,
    sellingPoints: sellingPoints.slice(0, 6),
    idealPartner: idealPartner.slice(0, 5),
    faqs,
    fddAvailable: true,
    isGrowing: data.isGrowing,
    multiUnitAvailable: data.multiUnit,
    ownerTypes,
    yearFounded: yearF,
    yearFranchising: yearFr,
    totalUnits: units,
    franchiseFee: fee,
    totalInvestmentMin: invMin,
    totalInvestmentMax: invMax,
    royaltyPercent: royalty,
    liquidCapitalMin: liqCap,
    corporateCity: city || undefined,
    corporateState: state || undefined,
    geographicFocus: data.geographicFocus || undefined,
    absenteeOwnership: data.absentee || data.semiAbsentee,
    canRunFromHome: data.canRunFromHome,
  };
}

interface AiProfileBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandName?: string;
  onApply: (profile: GeneratedProfile) => void;
}

export function AiProfileBuilder({ open, onOpenChange, brandName, onApply }: AiProfileBuilderProps) {
  const [step, setStep] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedProfile | null>(null);
  const [data, setData] = useState<AiProfileData>({
    brandName: brandName || "",
    websiteUrl: "",
    category: "",
    yearFounded: "",
    yearFranchising: "",
    headquartersCity: "",
    headquartersState: "",
    franchiseFee: "",
    totalInvestmentMin: "",
    totalInvestmentMax: "",
    royaltyPercent: "",
    liquidCapitalMin: "",
    totalUnits: "",
    isGrowing: true,
    geographicFocus: "",
    ownerOperator: true,
    semiAbsentee: false,
    absentee: false,
    canRunFromHome: false,
    multiUnit: false,
  });

  const update = (patch: Partial<AiProfileData>) => setData((d) => ({ ...d, ...patch }));

  const handleGenerate = () => {
    setGenerating(true);
    // Simulate brief processing delay for UX
    setTimeout(() => {
      const result = generateProfile(data);
      setGenerated(result);
      setGenerating(false);
      setStep(4);
    }, 1200);
  };

  const handleApply = () => {
    if (generated) {
      onApply(generated);
      onOpenChange(false);
      setStep(0);
      setGenerated(null);
    }
  };

  const WIZARD_STEPS = [
    { label: "Brand Basics", icon: Building2 },
    { label: "Investment", icon: DollarSign },
    { label: "Scale", icon: MapPin },
    { label: "Ownership", icon: Users },
    { label: "Review", icon: CheckCircle2 },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Wand2 className="w-5 h-5 text-cyan-400" />
            Build My Profile With AI
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Answer a few questions and we'll generate your full franchise profile — brand story, FAQs, selling points, and more.
          </p>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center gap-1 my-2">
          {WIZARD_STEPS.map((ws, i) => (
            <div key={i} className="flex items-center flex-1">
              <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full transition-colors ${
                i === step ? "bg-cyan-500/20 text-cyan-400" :
                i < step ? "bg-emerald-500/20 text-emerald-400" :
                "bg-muted text-muted-foreground"
              }`}>
                <ws.icon className="w-3 h-3" />
                <span className="hidden sm:inline">{ws.label}</span>
              </div>
              {i < WIZARD_STEPS.length - 1 && (
                <div className={`h-px flex-1 mx-1 ${i < step ? "bg-emerald-500/40" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 0: Brand Basics */}
        {step === 0 && (
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium">Brand Name *</label>
              <Input
                value={data.brandName}
                onChange={(e) => update({ brandName: e.target.value })}
                placeholder="e.g. Salad House"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Website URL</label>
              <Input
                value={data.websiteUrl}
                onChange={(e) => update({ websiteUrl: e.target.value })}
                placeholder="https://saladhouse.com"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Category *</label>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => update({ category: cat })}
                    className={`text-xs px-2.5 py-1.5 rounded-full border transition-colors ${
                      data.category === cat
                        ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-400"
                        : "bg-muted border-border text-muted-foreground hover:border-cyan-500/30"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Year Founded</label>
                <Input
                  value={data.yearFounded}
                  onChange={(e) => update({ yearFounded: e.target.value })}
                  placeholder="2005"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Year Franchising</label>
                <Input
                  value={data.yearFranchising}
                  onChange={(e) => update({ yearFranchising: e.target.value })}
                  placeholder="2010"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">HQ City</label>
                <Input
                  value={data.headquartersCity}
                  onChange={(e) => update({ headquartersCity: e.target.value })}
                  placeholder="New York"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">HQ State</label>
                <Input
                  value={data.headquartersState}
                  onChange={(e) => update({ headquartersState: e.target.value })}
                  placeholder="NY"
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Investment */}
        {step === 1 && (
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium">Franchise Fee ($)</label>
              <Input
                value={data.franchiseFee}
                onChange={(e) => update({ franchiseFee: e.target.value })}
                placeholder="35000"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Total Investment Min ($)</label>
                <Input
                  value={data.totalInvestmentMin}
                  onChange={(e) => update({ totalInvestmentMin: e.target.value })}
                  placeholder="150000"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Total Investment Max ($)</label>
                <Input
                  value={data.totalInvestmentMax}
                  onChange={(e) => update({ totalInvestmentMax: e.target.value })}
                  placeholder="350000"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Royalty (%)</label>
              <Input
                value={data.royaltyPercent}
                onChange={(e) => update({ royaltyPercent: e.target.value })}
                placeholder="6"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Minimum Liquid Capital Required ($)</label>
              <Input
                value={data.liquidCapitalMin}
                onChange={(e) => update({ liquidCapitalMin: e.target.value })}
                placeholder="100000"
                className="mt-1"
              />
            </div>
          </div>
        )}

        {/* Step 2: Scale */}
        {step === 2 && (
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium">Total Units / Locations</label>
              <Input
                value={data.totalUnits}
                onChange={(e) => update({ totalUnits: e.target.value })}
                placeholder="45"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Geographic Focus</label>
              <Input
                value={data.geographicFocus}
                onChange={(e) => update({ geographicFocus: e.target.value })}
                placeholder="Nationwide, Southeast US, etc."
                className="mt-1"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium">Actively Growing?</label>
              <button
                onClick={() => update({ isGrowing: !data.isGrowing })}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  data.isGrowing
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                    : "bg-muted border-border text-muted-foreground"
                }`}
              >
                {data.isGrowing ? "✓ Yes, actively expanding" : "Not currently growing"}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Ownership Model */}
        {step === 3 && (
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">What ownership models does your franchise support?</p>
            <div className="space-y-2">
              {[
                { key: "ownerOperator" as const, label: "Owner/Operator", desc: "Hands-on daily involvement" },
                { key: "semiAbsentee" as const, label: "Semi-Absentee", desc: "Part-time involvement with a manager" },
                { key: "absentee" as const, label: "Absentee/Executive", desc: "Investor model, GM runs day-to-day" },
              ].map(({ key, label, desc }) => (
                <button
                  key={key}
                  onClick={() => update({ [key]: !data[key] })}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                    data[key]
                      ? "bg-cyan-500/10 border-cyan-500/30 text-foreground"
                      : "bg-muted/50 border-border text-muted-foreground hover:border-cyan-500/20"
                  }`}
                >
                  <span className="font-medium text-sm">{label}</span>
                  <span className="text-xs block mt-0.5 opacity-70">{desc}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => update({ canRunFromHome: !data.canRunFromHome })}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  data.canRunFromHome
                    ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-400"
                    : "bg-muted border-border text-muted-foreground"
                }`}
              >
                {data.canRunFromHome ? "✓ Can run from home" : "Home-based?"}
              </button>
              <button
                onClick={() => update({ multiUnit: !data.multiUnit })}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  data.multiUnit
                    ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-400"
                    : "bg-muted border-border text-muted-foreground"
                }`}
              >
                {data.multiUnit ? "✓ Multi-unit available" : "Multi-unit?"}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && generated && (
          <div className="space-y-3 mt-2 max-h-[400px] overflow-y-auto pr-1">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
              <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Generated Successfully
              </h4>
              <p className="text-xs text-emerald-300/70">Review the generated content below, then click "Apply to Profile" to fill in your onboarding form.</p>
            </div>

            <Section title="Description">
              <p className="text-xs text-slate-300">{generated.description}</p>
            </Section>

            <Section title="Brand Story">
              <p className="text-xs text-slate-300">{generated.brandStory}</p>
            </Section>

            <Section title="Business Model">
              <p className="text-xs text-slate-300">{generated.model}</p>
            </Section>

            <Section title="Market Positioning">
              <p className="text-xs text-slate-300">{generated.positioning}</p>
            </Section>

            <Section title={`Selling Points (${generated.sellingPoints.length})`}>
              <ul className="space-y-1">
                {generated.sellingPoints.map((sp, i) => (
                  <li key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                    {sp}
                  </li>
                ))}
              </ul>
            </Section>

            <Section title={`Ideal Partner Traits (${generated.idealPartner.length})`}>
              <ul className="space-y-1">
                {generated.idealPartner.map((ip, i) => (
                  <li key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                    {ip}
                  </li>
                ))}
              </ul>
            </Section>

            <Section title={`FAQs (${generated.faqs.length})`}>
              {generated.faqs.map((faq, i) => (
                <div key={i} className="mb-2 last:mb-0">
                  <p className="text-xs font-medium text-slate-200">Q: {faq.question}</p>
                  <p className="text-xs text-slate-400 mt-0.5">A: {faq.answer}</p>
                </div>
              ))}
            </Section>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => step > 0 && setStep(step - 1)}
            disabled={step === 0}
            className="text-muted-foreground"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Back
          </Button>

          {step < 3 && (
            <Button
              size="sm"
              onClick={() => setStep(step + 1)}
              className="bg-cyan-600 hover:bg-cyan-500"
            >
              Next
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          )}

          {step === 3 && (
            <Button
              size="sm"
              onClick={handleGenerate}
              disabled={generating || !data.brandName}
              className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400"
            >
              {generating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Generate Profile
                </>
              )}
            </Button>
          )}

          {step === 4 && generated && (
            <Button
              size="sm"
              onClick={handleApply}
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              Apply to Profile
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card/50 border rounded-lg p-3">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{title}</h4>
      {children}
    </div>
  );
}
