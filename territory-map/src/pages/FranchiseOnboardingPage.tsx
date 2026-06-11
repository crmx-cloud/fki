import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { AppSidebar } from "@/components/AppSidebar";
import { normalizeVideoEmbedUrl } from "@/lib/video";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Building2,
  Palette,
  DollarSign,
  BarChart3,
  HelpCircle,
  Sparkles,
  X,
  Plus,
  Save,
  Check,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Camera,
  Shield,
  MapPin,
  Store,
  Upload,
  CheckCircle2,
  Circle,
  TrendingUp,
  Trash2,
  BookOpen,
  Settings,
  Globe,
  Users,
  Award,
  Play,
  Link as LinkIcon,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";
import { AiProfileBuilder } from "@/components/AiProfileBuilder";
import { Wand2 } from "lucide-react";
import { US_STATES, getCitiesForState, getStateCityCount } from "@/data/usMajorCities";

// ── Step Configuration ──────────────────────────────────────
type StepId = "brand" | "identity" | "investment" | "performance" | "territories" | "content" | "photos" | "faqs" | "flags" | "company" | "media" | "training" | "operations";

interface StepConfig {
  id: StepId;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const STEPS: StepConfig[] = [
  { id: "brand", label: "Brand Basics", icon: <Building2 className="w-4 h-4" />, description: "Name, category, description, website" },
  { id: "identity", label: "Brand Identity", icon: <Palette className="w-4 h-4" />, description: "Logo upload, primary & secondary colors" },
  { id: "investment", label: "Investment Details", icon: <DollarSign className="w-4 h-4" />, description: "Total investment, fees, capital, footprint" },
  { id: "performance", label: "Performance & Units", icon: <BarChart3 className="w-4 h-4" />, description: "Revenue, stores, closures, years, ROI" },
  { id: "territories", label: "Growth Territories", icon: <MapPin className="w-4 h-4" />, description: "Target markets & growth plans" },
  { id: "content", label: "Brand Story", icon: <Sparkles className="w-4 h-4" />, description: "Story, positioning, selling points" },
  { id: "photos", label: "Photos", icon: <Camera className="w-4 h-4" />, description: "Upload up to 10 location photos" },
  { id: "faqs", label: "FAQs", icon: <HelpCircle className="w-4 h-4" />, description: "Up to 10 common questions & answers" },
  { id: "flags", label: "Highlights", icon: <Shield className="w-4 h-4" />, description: "SBA, FDD, veteran, Item 19, training" },
  { id: "company", label: "Company Details", icon: <Building2 className="w-4 h-4" />, description: "Parent company, leadership, headquarters, social links" },
  { id: "media", label: "Media & Videos", icon: <Camera className="w-4 h-4" />, description: "Overview video, testimonial video, section images" },
  { id: "training", label: "Training & Support", icon: <BookOpen className="w-4 h-4" />, description: "Training hours, ongoing support, marketing support" },
  { id: "operations", label: "Operations", icon: <Settings className="w-4 h-4" />, description: "Ownership model, employees, agreement terms" },
];

const CATEGORIES = [
  "Food & Beverage",
  "Health & Wellness",
  "Services",
  "Retail",
  "Education & Children",
  "Home Services",
  "Fitness",
  "Automotive",
];

// ── Main Component ──────────────────────────────────────────
export function FranchiseOnboardingPage() {
  const { brandId: brandIdParam } = useParams<{ brandId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const brandId = brandIdParam as Id<"brands"> | undefined;

  // If no brandId in URL, get first brand
  const myBrands = useQuery(api.franchiseProfile.myBrands);
  const effectiveBrandId = brandId || myBrands?.[0]?._id;

  const profileData = useQuery(
    api.franchiseProfile.getProfile,
    effectiveBrandId ? { brandId: effectiveBrandId } : "skip"
  );
  const onboardingStatus = useQuery(
    api.franchiseProfile.getOnboardingStatus,
    effectiveBrandId ? { brandId: effectiveBrandId } : "skip"
  );

  const updateBrand = useMutation(api.franchiseProfile.updateBrand);
  const updateProfile = useMutation(api.franchiseProfile.updateProfile);
  const generateUploadUrl = useMutation(api.franchiseProfile.generateUploadUrl);
  const createTerritory = useMutation(api.territories.create);
  const createBatchTerritories = useMutation(api.territories.createBatch);
  const removeTerritory = useMutation(api.territories.remove);
  const removeBatchTerritories = useMutation(api.territories.removeBatch);

  // Query existing territories for this brand
  const existingTerritories = useQuery(
    api.territories.listByBrand,
    effectiveBrandId ? { brandId: effectiveBrandId } : "skip"
  );

  // ── Active step state ──
  const initialStep = (searchParams.get("step") as StepId) || "brand";
  const [activeStep, setActiveStep] = useState<StepId>(initialStep);
  const [saving, setSaving] = useState(false);
  const [showAiBuilder, setShowAiBuilder] = useState(false);

  // ── Brand fields ──
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  // ── Identity fields ──
  const [primaryColor, setPrimaryColor] = useState("#0891b2");
  const [secondaryColor, setSecondaryColor] = useState("#1e293b");
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoStorageId, setLogoStorageId] = useState("");
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // ── Investment fields ──
  const [investmentMin, setInvestmentMin] = useState("");
  const [investmentMax, setInvestmentMax] = useState("");
  const [liquidCapitalMin, setLiquidCapitalMin] = useState("");
  const [franchiseFee, setFranchiseFee] = useState("");
  const [royaltyPercent, setRoyaltyPercent] = useState("");
  const [brandFundPercent, setBrandFundPercent] = useState("");
  const [marketingFees, setMarketingFees] = useState("");
  const [minFootprint, setMinFootprint] = useState("");

  // ── Performance fields ──
  const [yearFounded, setYearFounded] = useState("");
  const [yearFranchising, setYearFranchising] = useState("");
  const [totalUnits, setTotalUnits] = useState("");
  const [closureCount, setClosureCount] = useState("");
  const [avgRevenueMin, setAvgRevenueMin] = useState("");
  const [avgRevenueMax, setAvgRevenueMax] = useState("");
  const [investmentReturnRatio, setInvestmentReturnRatio] = useState("");
  const [retentionRate, setRetentionRate] = useState("");
  const [guestRating, setGuestRating] = useState("");

  // ── Territory fields ──
  const [isGrowing, setIsGrowing] = useState<boolean | undefined>(undefined);
  const [addingTerritories, setAddingTerritories] = useState(false);
  const [expandedStates, setExpandedStates] = useState<Set<string>>(new Set());

  // Derived: which states have territories
  const territoryCountByState = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of existingTerritories || []) {
      const st = (t.state || "").toUpperCase();
      counts[st] = (counts[st] || 0) + 1;
    }
    return counts;
  }, [existingTerritories]);

  const totalTerritoryStates = Object.keys(territoryCountByState).length;

  // ── Content fields ──
  const [brandStory, setBrandStory] = useState("");
  const [positioning, setPositioning] = useState("");
  const [model, setModel] = useState("");
  const [sellingPoints, setSellingPoints] = useState<string[]>([""]);
  const [idealPartner, setIdealPartner] = useState<string[]>([""]);

  // ── Photos ──
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // ── FAQs ──
  const [faqs, setFaqs] = useState<Array<{ question: string; answer: string }>>([{ question: "", answer: "" }]);

  // ── Flags ──
  const [item19Available, setItem19Available] = useState(false);
  const [fddAvailable, setFddAvailable] = useState(false);
  const [sbaApproved, setSbaApproved] = useState(false);
  const [veteranDiscount, setVeteranDiscount] = useState(false);
  const [multiUnitAvailable, setMultiUnitAvailable] = useState(false);
  const [territoryExclusivity, setTerritoryExclusivity] = useState(false);
  const [trainingWeeks, setTrainingWeeks] = useState("");

  // ── Company Details ──
  const [parentCompany, setParentCompany] = useState("");
  const [leadershipName, setLeadershipName] = useState("");
  const [leadershipTitle, setLeadershipTitle] = useState("");
  const [corporateAddress, setCorporateAddress] = useState("");
  const [corporateCity, setCorporateCity] = useState("");
  const [corporateState, setCorporateState] = useState("");
  const [corporateZip, setCorporateZip] = useState("");
  const [employeesAtHQ, setEmployeesAtHQ] = useState("");
  const [geographicFocus, setGeographicFocus] = useState("");
  const [socialFacebook, setSocialFacebook] = useState("");
  const [socialInstagram, setSocialInstagram] = useState("");
  const [socialLinkedin, setSocialLinkedin] = useState("");
  const [socialTwitter, setSocialTwitter] = useState("");
  const [socialYoutube, setSocialYoutube] = useState("");
  const [socialTiktok, setSocialTiktok] = useState("");

  // ── Media & Videos ──
  const [overviewVideoUrl, setOverviewVideoUrl] = useState("");
  const [testimonialVideoUrl, setTestimonialVideoUrl] = useState("");

  // ── Training & Support ──
  const [classroomTrainingHours, setClassroomTrainingHours] = useState("");
  const [onTheJobTrainingHours, setOnTheJobTrainingHours] = useState("");
  const [ongoingSupport, setOngoingSupport] = useState<string[]>([""]);
  const [marketingSupport, setMarketingSupport] = useState<string[]>([""]);

  // ── Operations ──
  const [ownerTypes, setOwnerTypes] = useState<string[]>([]);
  const [absenteeOwnership, setAbsenteeOwnership] = useState<boolean | undefined>(undefined);
  const [canRunFromHome, setCanRunFromHome] = useState<boolean | undefined>(undefined);
  const [canRunPartTime, setCanRunPartTime] = useState<boolean | undefined>(undefined);
  const [exclusiveTerritories, setExclusiveTerritories] = useState<boolean | undefined>(undefined);
  const [employeesRequired, setEmployeesRequired] = useState("");
  const [termOfAgreement, setTermOfAgreement] = useState("");
  const [termRenewable, setTermRenewable] = useState(false);
  const [veteranIncentiveDetails, setVeteranIncentiveDetails] = useState("");
  const [franchiseRanking, setFranchiseRanking] = useState("");
  const [rankingYear, setRankingYear] = useState("");
  const [rankingSource, setRankingSource] = useState("");

  // ── Hydrate from server data ──
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (profileData && !hydrated) {
      const b = profileData.brand;
      const fp = profileData.franchiseProfile;
      if (b) {
        setName(b.name || "");
        setDescription(b.description || "");
        setCategory(b.category || "");
        setWebsiteUrl(b.websiteUrl || "");
        setContactEmail(b.contactEmail || "");
      }
      if (fp) {
        setPrimaryColor(fp.primaryColor || "#0891b2");
        setSecondaryColor(fp.secondaryColor || "#1e293b");
        setLogoStorageId(fp.logoStorageId || "");
        setInvestmentMin(fp.totalInvestmentMin?.toString() || "");
        setInvestmentMax(fp.totalInvestmentMax?.toString() || "");
        setLiquidCapitalMin(fp.liquidCapitalMin?.toString() || "");
        setFranchiseFee(fp.franchiseFee?.toString() || "");
        setRoyaltyPercent(fp.royaltyPercent?.toString() || "");
        setBrandFundPercent(fp.brandFundPercent?.toString() || "");
        setMarketingFees(fp.marketingFees || "");
        setMinFootprint(fp.minFootprint || "");
        setYearFounded(fp.yearFounded?.toString() || "");
        setYearFranchising(fp.yearFranchising?.toString() || "");
        setTotalUnits(fp.totalUnits?.toString() || "");
        setClosureCount(fp.closureCount?.toString() || "");
        setAvgRevenueMin(fp.avgRevenueMin?.toString() || "");
        setAvgRevenueMax(fp.avgRevenueMax?.toString() || "");
        setInvestmentReturnRatio(fp.investmentReturnRatio?.toString() || "");
        setRetentionRate(fp.retentionRate || "");
        setGuestRating(fp.guestRating || "");
        setIsGrowing(fp.isGrowing);
        setBrandStory(fp.brandStory || "");
        setPositioning(fp.positioning || "");
        setModel(fp.model || "");
        setSellingPoints(fp.sellingPoints?.length ? fp.sellingPoints : [""]);
        setIdealPartner(fp.idealPartner?.length ? fp.idealPartner : [""]);
        setPhotos(fp.photos || []);
        setFaqs(fp.faqs?.length ? fp.faqs : [{ question: "", answer: "" }]);
        setItem19Available(fp.item19Available || false);
        setFddAvailable(fp.fddAvailable || false);
        setSbaApproved(fp.sbaApproved || false);
        setVeteranDiscount(fp.veteranDiscount || false);
        setMultiUnitAvailable(fp.multiUnitAvailable || false);
        setTerritoryExclusivity(fp.territoryExclusivity || false);
        setTrainingWeeks(fp.trainingWeeks?.toString() || "");
        // Company Details
        setParentCompany(fp.parentCompany || "");
        setLeadershipName(fp.leadershipName || "");
        setLeadershipTitle(fp.leadershipTitle || "");
        setCorporateAddress(fp.corporateAddress || "");
        setCorporateCity(fp.corporateCity || "");
        setCorporateState(fp.corporateState || "");
        setCorporateZip(fp.corporateZip || "");
        setEmployeesAtHQ(fp.employeesAtHQ?.toString() || "");
        setGeographicFocus(fp.geographicFocus || "");
        setSocialFacebook(fp.socialLinks?.facebook || "");
        setSocialInstagram(fp.socialLinks?.instagram || "");
        setSocialLinkedin(fp.socialLinks?.linkedin || "");
        setSocialTwitter(fp.socialLinks?.twitter || "");
        setSocialYoutube(fp.socialLinks?.youtube || "");
        setSocialTiktok(fp.socialLinks?.tiktok || "");
        // Media
        setOverviewVideoUrl(fp.overviewVideoUrl || "");
        setTestimonialVideoUrl(fp.testimonialVideoUrl || "");
        // Training
        setClassroomTrainingHours(fp.classroomTrainingHours?.toString() || "");
        setOnTheJobTrainingHours(fp.onTheJobTrainingHours?.toString() || "");
        setOngoingSupport(fp.ongoingSupport?.length ? fp.ongoingSupport : [""]);
        setMarketingSupport(fp.marketingSupport?.length ? fp.marketingSupport : [""]);
        // Operations
        setOwnerTypes(fp.ownerTypes || []);
        setAbsenteeOwnership(fp.absenteeOwnership);
        setCanRunFromHome(fp.canRunFromHome);
        setCanRunPartTime(fp.canRunPartTime);
        setExclusiveTerritories(fp.exclusiveTerritories);
        setEmployeesRequired(fp.employeesRequired || "");
        setTermOfAgreement(fp.termOfAgreement || "");
        setTermRenewable(fp.termRenewable || false);
        setVeteranIncentiveDetails(fp.veteranIncentiveDetails || "");
        setFranchiseRanking(fp.franchiseRanking?.toString() || "");
        setRankingYear(fp.rankingYear?.toString() || "");
        setRankingSource(fp.rankingSource || "");
      }
      setHydrated(true);
    }
  }, [profileData, hydrated]);

  // ── Step completion ──
  const stepCompletion = useMemo(() => ({
    brand: !!(name && contactEmail),
    identity: !!(primaryColor !== "#0891b2" || logoStorageId),
    investment: !!(investmentMin || franchiseFee),
    performance: !!(yearFounded || totalUnits || avgRevenueMin),
    territories: (existingTerritories?.length ?? 0) > 0,
    content: !!(brandStory.trim() || sellingPoints.some(s => s.trim())),
    photos: photos.length > 0,
    faqs: faqs.some(f => f.question.trim() && f.answer.trim()),
    flags: item19Available || fddAvailable || sbaApproved || veteranDiscount,
    company: !!(parentCompany || leadershipName || corporateCity),
    media: !!(overviewVideoUrl || testimonialVideoUrl),
    training: !!(classroomTrainingHours || onTheJobTrainingHours || ongoingSupport.some(s => s.trim())),
    operations: !!(ownerTypes.length > 0 || employeesRequired || termOfAgreement),
  }), [name, contactEmail, primaryColor, logoStorageId, investmentMin, franchiseFee, yearFounded, totalUnits, avgRevenueMin, existingTerritories, brandStory, sellingPoints, photos, faqs, item19Available, fddAvailable, sbaApproved, veteranDiscount, parentCompany, leadershipName, corporateCity, overviewVideoUrl, testimonialVideoUrl, classroomTrainingHours, onTheJobTrainingHours, ongoingSupport, ownerTypes, employeesRequired, termOfAgreement]);

  const completedCount = Object.values(stepCompletion).filter(Boolean).length;
  const progressPercent = Math.round((completedCount / STEPS.length) * 100);

  // ── Num helper ──
  const numOrUndef = (v: string) => (v ? Number(v) : undefined);

  // ── Logo upload ──
  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !effectiveBrandId) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Logo must be under 5 MB");
      return;
    }
    // Show immediate local preview
    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    setLogoPreviewUrl(URL.createObjectURL(file));
    setLogoUploading(true);
    try {
      const uploadUrl = await generateUploadUrl({ brandId: effectiveBrandId });
      const result = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      const { storageId } = await result.json();
      if (!storageId) throw new Error("No storage ID returned");
      setLogoStorageId(storageId);
      toast.success("Logo uploaded!");
    } catch (err: any) {
      toast.error("Upload failed: " + (err.message || "Unknown error"));
      setLogoPreviewUrl(null);
    } finally {
      setLogoUploading(false);
    }
  }

  // ── Photo upload ──
  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !effectiveBrandId) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Photo must be under 10 MB");
      return;
    }
    if (photos.length >= 10) {
      toast.error("Maximum 10 photos");
      return;
    }
    // Show immediate local preview
    const localUrl = URL.createObjectURL(file);
    setPhotoPreviewUrls(prev => [...prev, localUrl]);
    setPhotoUploading(true);
    try {
      const uploadUrl = await generateUploadUrl({ brandId: effectiveBrandId });
      const result = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      const { storageId } = await result.json();
      if (!storageId) throw new Error("No storage ID returned");
      setPhotos(prev => [...prev, storageId]);
      toast.success("Photo added!");
    } catch (err: any) {
      toast.error("Upload failed");
      // Remove preview on failure
      URL.revokeObjectURL(localUrl);
      setPhotoPreviewUrls(prev => prev.filter(u => u !== localUrl));
    } finally {
      setPhotoUploading(false);
    }
  }

  // ── Territory management ──
  async function handleAddStateCities(stateAbbr: string) {
    if (!effectiveBrandId || addingTerritories) return;
    setAddingTerritories(true);
    try {
      const cities = getCitiesForState(stateAbbr);
      const existingCityKeys = new Set(
        (existingTerritories || [])
          .filter(t => (t.state || "").toUpperCase() === stateAbbr)
          .map(t => `${(t.city || "").toLowerCase()}|${(t.state || "").toUpperCase()}`)
      );
      const newCities = cities.filter(c => !existingCityKeys.has(`${c.city.toLowerCase()}|${c.state}`));
      if (newCities.length === 0) {
        toast.info(`All major cities in ${stateAbbr} are already added`);
        setAddingTerritories(false);
        return;
      }
      await createBatchTerritories({
        brandId: effectiveBrandId,
        territories: newCities.map(c => ({
          city: c.city, state: c.state, status: "available" as const,
          latitude: c.lat, longitude: c.lng,
        })),
      });
      toast.success(`Added ${newCities.length} cities in ${stateAbbr}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to add territories");
    } finally {
      setAddingTerritories(false);
    }
  }

  async function handleAddSingleTerritory(loc: { city: string; stateAbbr: string; latitude: number; longitude: number }) {
    if (!effectiveBrandId) return;
    const exists = (existingTerritories || []).some(
      t => t.city?.toLowerCase() === loc.city.toLowerCase() && (t.state || "").toUpperCase() === loc.stateAbbr
    );
    if (exists) { toast.info(`${loc.city}, ${loc.stateAbbr} is already added`); return; }
    try {
      await createTerritory({
        brandId: effectiveBrandId, city: loc.city, state: loc.stateAbbr,
        status: "available", latitude: loc.latitude, longitude: loc.longitude,
      });
      toast.success(`Added ${loc.city}, ${loc.stateAbbr}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to add territory");
    }
  }

  async function handleRemoveTerritory(id: any) {
    try { await removeTerritory({ id }); } catch (err: any) { toast.error(err.message || "Failed to remove"); }
  }

  async function handleRemoveStateTerritories(stateAbbr: string) {
    if (!existingTerritories) return;
    const ids = existingTerritories.filter(t => (t.state || "").toUpperCase() === stateAbbr).map(t => t._id);
    if (ids.length === 0) return;
    try {
      await removeBatchTerritories({ ids });
      toast.success(`Removed ${ids.length} territories in ${stateAbbr}`);
    } catch (err: any) { toast.error(err.message || "Failed to remove territories"); }
  }

  // ── Save ──
  const handleSave = useCallback(async () => {
    if (!effectiveBrandId) return;
    setSaving(true);
    try {
      // Save brand fields
      await updateBrand({
        brandId: effectiveBrandId,
        name: name || undefined,
        description: description || undefined,
        category: category || undefined,
        websiteUrl: websiteUrl || undefined,
        contactEmail: contactEmail || undefined,
      });

      // Save profile fields
      await updateProfile({
        brandId: effectiveBrandId,
        primaryColor: primaryColor || undefined,
        secondaryColor: secondaryColor || undefined,
        logoStorageId: logoStorageId || undefined,
        totalInvestmentMin: numOrUndef(investmentMin),
        totalInvestmentMax: numOrUndef(investmentMax),
        liquidCapitalMin: numOrUndef(liquidCapitalMin),
        franchiseFee: numOrUndef(franchiseFee),
        royaltyPercent: numOrUndef(royaltyPercent),
        brandFundPercent: numOrUndef(brandFundPercent),
        marketingFees: marketingFees || undefined,
        minFootprint: minFootprint || undefined,
        yearFounded: numOrUndef(yearFounded),
        yearFranchising: numOrUndef(yearFranchising),
        totalUnits: numOrUndef(totalUnits),
        closureCount: numOrUndef(closureCount),
        avgRevenueMin: numOrUndef(avgRevenueMin),
        avgRevenueMax: numOrUndef(avgRevenueMax),
        investmentReturnRatio: numOrUndef(investmentReturnRatio),
        retentionRate: retentionRate || undefined,
        guestRating: guestRating || undefined,
        isGrowing: isGrowing ?? undefined,
        brandStory: brandStory || undefined,
        model: model || undefined,
        positioning: positioning || undefined,
        sellingPoints: sellingPoints.filter(s => s.trim()),
        idealPartner: idealPartner.filter(s => s.trim()),
        photos: photos.length > 0 ? photos : undefined,
        faqs: faqs.filter(f => f.question.trim() && f.answer.trim()),
        item19Available,
        fddAvailable,
        sbaApproved,
        veteranDiscount,
        multiUnitAvailable,
        territoryExclusivity,
        trainingWeeks: numOrUndef(trainingWeeks),
        // Company Details
        parentCompany: parentCompany || undefined,
        leadershipName: leadershipName || undefined,
        leadershipTitle: leadershipTitle || undefined,
        corporateAddress: corporateAddress || undefined,
        corporateCity: corporateCity || undefined,
        corporateState: corporateState || undefined,
        corporateZip: corporateZip || undefined,
        employeesAtHQ: numOrUndef(employeesAtHQ),
        geographicFocus: geographicFocus || undefined,
        socialLinks: {
          facebook: socialFacebook || undefined,
          instagram: socialInstagram || undefined,
          linkedin: socialLinkedin || undefined,
          twitter: socialTwitter || undefined,
          youtube: socialYoutube || undefined,
          tiktok: socialTiktok || undefined,
        },
        // Media
        overviewVideoUrl: normalizeVideoEmbedUrl(overviewVideoUrl) || undefined,
        testimonialVideoUrl: normalizeVideoEmbedUrl(testimonialVideoUrl) || undefined,
        // Training
        classroomTrainingHours: numOrUndef(classroomTrainingHours),
        onTheJobTrainingHours: numOrUndef(onTheJobTrainingHours),
        ongoingSupport: ongoingSupport.filter(s => s.trim()),
        marketingSupport: marketingSupport.filter(s => s.trim()),
        // Operations
        ownerTypes: ownerTypes.length > 0 ? ownerTypes : undefined,
        absenteeOwnership: absenteeOwnership ?? undefined,
        canRunFromHome: canRunFromHome ?? undefined,
        canRunPartTime: canRunPartTime ?? undefined,
        exclusiveTerritories: exclusiveTerritories ?? undefined,
        employeesRequired: employeesRequired || undefined,
        termOfAgreement: termOfAgreement || undefined,
        termRenewable: termRenewable || undefined,
        veteranIncentiveDetails: veteranIncentiveDetails || undefined,
        franchiseRanking: numOrUndef(franchiseRanking),
        rankingYear: numOrUndef(rankingYear),
        rankingSource: rankingSource || undefined,
      });

      toast.success("Changes saved!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [effectiveBrandId, name, description, category, websiteUrl, contactEmail, primaryColor, secondaryColor, logoStorageId, investmentMin, investmentMax, liquidCapitalMin, franchiseFee, royaltyPercent, brandFundPercent, marketingFees, minFootprint, yearFounded, yearFranchising, totalUnits, closureCount, avgRevenueMin, avgRevenueMax, investmentReturnRatio, retentionRate, guestRating, isGrowing, brandStory, model, positioning, sellingPoints, idealPartner, photos, faqs, item19Available, fddAvailable, sbaApproved, veteranDiscount, multiUnitAvailable, territoryExclusivity, trainingWeeks, parentCompany, leadershipName, leadershipTitle, corporateAddress, corporateCity, corporateState, corporateZip, employeesAtHQ, geographicFocus, socialFacebook, socialInstagram, socialLinkedin, socialTwitter, socialYoutube, socialTiktok, overviewVideoUrl, testimonialVideoUrl, classroomTrainingHours, onTheJobTrainingHours, ongoingSupport, marketingSupport, ownerTypes, absenteeOwnership, canRunFromHome, canRunPartTime, exclusiveTerritories, employeesRequired, termOfAgreement, termRenewable, veteranIncentiveDetails, franchiseRanking, rankingYear, rankingSource, updateBrand, updateProfile]);

  // ── AI Profile Builder apply handler ──
  const handleAiApply = useCallback((profile: any) => {
    if (profile.description) setDescription(profile.description);
    if (profile.brandStory) setBrandStory(profile.brandStory);
    if (profile.model) setModel(profile.model);
    if (profile.positioning) setPositioning(profile.positioning);
    if (profile.sellingPoints?.length) setSellingPoints(profile.sellingPoints);
    if (profile.idealPartner?.length) setIdealPartner(profile.idealPartner);
    if (profile.faqs?.length) setFaqs(profile.faqs);
    if (profile.yearFounded) setYearFounded(String(profile.yearFounded));
    if (profile.yearFranchising) setYearFranchising(String(profile.yearFranchising));
    if (profile.totalUnits) setTotalUnits(String(profile.totalUnits));
    if (profile.franchiseFee) setFranchiseFee(String(profile.franchiseFee));
    if (profile.totalInvestmentMin) setInvestmentMin(String(profile.totalInvestmentMin));
    if (profile.totalInvestmentMax) setInvestmentMax(String(profile.totalInvestmentMax));
    if (profile.royaltyPercent) setRoyaltyPercent(String(profile.royaltyPercent));
    if (profile.liquidCapitalMin) setLiquidCapitalMin(String(profile.liquidCapitalMin));
    if (profile.corporateCity) setCorporateCity(profile.corporateCity);
    if (profile.corporateState) setCorporateState(profile.corporateState);
    if (profile.geographicFocus) setGeographicFocus(profile.geographicFocus);
    if (profile.ownerTypes?.length) setOwnerTypes(profile.ownerTypes);
    if (typeof profile.fddAvailable === "boolean") setFddAvailable(profile.fddAvailable);
    if (typeof profile.isGrowing === "boolean") setIsGrowing(profile.isGrowing);
    if (typeof profile.multiUnitAvailable === "boolean") setMultiUnitAvailable(profile.multiUnitAvailable);
    if (typeof profile.absenteeOwnership === "boolean") setAbsenteeOwnership(profile.absenteeOwnership);
    if (typeof profile.canRunFromHome === "boolean") setCanRunFromHome(profile.canRunFromHome);
    toast.success("AI profile applied! Review each section and save.");
  }, []);

  // ── Navigate steps ──
  const currentIdx = STEPS.findIndex(s => s.id === activeStep);
  const goNext = () => {
    handleSave();
    if (currentIdx < STEPS.length - 1) setActiveStep(STEPS[currentIdx + 1].id);
  };
  const goPrev = () => {
    if (currentIdx > 0) setActiveStep(STEPS[currentIdx - 1].id);
  };

  // ── Loading ──
  // If myBrands loaded but is empty, show "no brand" state instead of infinite spinner
  if (myBrands !== undefined && myBrands.length === 0 && !brandId) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex items-center justify-center h-screen">
            <div className="text-center max-w-md">
              <Store className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">No Brand Found</h2>
              <p className="text-sm text-muted-foreground mb-6">
                You don't have a brand linked to your account yet. Claim your franchise to get started.
              </p>
              <Button onClick={() => navigate("/claim")} className="bg-cyan-600 hover:bg-cyan-500 text-white">
                Claim Your Franchise <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (profileData === undefined) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Loading your profile...</p>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-col lg:flex-row min-h-screen">
          {/* ── LEFT: Step Navigation Sidebar ── */}
          <div className="w-full lg:w-72 xl:w-80 border-b lg:border-b-0 lg:border-r border-border bg-card/30 flex flex-col">
            <div className="p-5 border-b border-border/50">
              <button
                onClick={() => navigate("/dashboard")}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 mb-3"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
              </button>
              <h2 className="text-lg font-semibold">{name || "Your Brand"}</h2>
              <div className="flex items-center gap-2 mt-2">
                <Progress value={progressPercent} className="h-1.5 flex-1" />
                <span className="text-xs font-medium text-cyan-400">{progressPercent}%</span>
              </div>
              {/* PerfectFit Visibility Score */}
              {(() => {
                // Count matching-critical fields
                const matchingFields = [
                  !!investmentMin, !!franchiseFee, !!liquidCapitalMin,
                  !!avgRevenueMin || !!totalUnits,
                  ownerTypes.length > 0,
                  item19Available || fddAvailable,
                  sbaApproved !== undefined,
                  !!classroomTrainingHours || !!onTheJobTrainingHours,
                  ongoingSupport.some((s: string) => s.trim()),
                  !!employeesRequired,
                  !!termOfAgreement,
                  veteranDiscount !== undefined,
                ];
                const matchFieldsFilled = matchingFields.filter(Boolean).length;
                const matchPercent = Math.round((matchFieldsFilled / matchingFields.length) * 100);
                const color = matchPercent >= 80 ? "emerald" : matchPercent >= 50 ? "cyan" : "amber";
                return (
                  <div className={`mt-3 px-2.5 py-2 rounded-lg border border-${color}-500/20 bg-${color}-500/5`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">PerfectFit Visibility</span>
                      <span className={`text-xs font-bold text-${color}-400`}>{matchPercent}%</span>
                    </div>
                    <div className="h-1 bg-muted/30 rounded-full mt-1 overflow-hidden">
                      <div className={`h-full bg-${color}-400 rounded-full transition-all`} style={{ width: `${matchPercent}%` }} />
                    </div>
                    {matchPercent < 80 && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Complete {!investmentMin ? "Investment, " : ""}{ownerTypes.length === 0 ? "Ownership, " : ""}{!avgRevenueMin && !totalUnits ? "Performance, " : ""}to improve how prospects find you.
                      </p>
                    )}
                  </div>
                );
              })()}
              {progressPercent < 50 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAiBuilder(true)}
                  className="mt-3 w-full border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 text-xs"
                >
                  <Wand2 className="w-3.5 h-3.5 mr-1.5" />
                  Build My Profile With AI
                </Button>
              )}
            </div>

            {/* Steps nav */}
            <nav className="flex-1 overflow-y-auto p-3">
              <div className="space-y-0.5">
                {STEPS.map((step) => {
                  const done = stepCompletion[step.id];
                  const active = activeStep === step.id;
                  return (
                    <button
                      key={step.id}
                      onClick={() => setActiveStep(step.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all text-sm ${
                        active
                          ? "bg-cyan-500/10 text-foreground font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                        done ? "bg-emerald-500/20" : active ? "bg-cyan-500/20" : "bg-muted/50"
                      }`}>
                        {done ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-cyan-400" : "bg-muted-foreground/40"}`} />
                        )}
                      </div>
                      {step.label}
                    </button>
                  );
                })}
              </div>
            </nav>
          </div>

          {/* ── RIGHT: Step Content ── */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-4 sm:px-8 py-8">
              {/* Step header */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                    {STEPS.find(s => s.id === activeStep)?.icon}
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold">{STEPS.find(s => s.id === activeStep)?.label}</h1>
                    <p className="text-sm text-muted-foreground">{STEPS.find(s => s.id === activeStep)?.description}</p>
                  </div>
                </div>
              </div>

              {/* ───── BRAND BASICS ───── */}
              {activeStep === "brand" && (
                <div className="space-y-5">
                  <div>
                    <Label className="text-sm mb-1.5 block">Franchise Name *</Label>
                    <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Salad House" />
                  </div>
                  <div>
                    <Label className="text-sm mb-1.5 block">Category</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {CATEGORIES.map(c => (
                        <button
                          key={c}
                          onClick={() => setCategory(c)}
                          className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                            category === c
                              ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
                              : "border-border text-muted-foreground hover:border-cyan-500/40"
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm mb-1.5 block">Description</Label>
                    <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Briefly describe your franchise concept..." rows={3} className="resize-none" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm mb-1.5 block">Website</Label>
                      <Input value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="https://..." />
                    </div>
                    <div>
                      <Label className="text-sm mb-1.5 block">Contact Email *</Label>
                      <Input value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="franchise@brand.com" />
                    </div>
                  </div>
                </div>
              )}

              {/* ───── IDENTITY ───── */}
              {activeStep === "identity" && (
                <div className="space-y-6">
                  {/* Logo Upload */}
                  <div>
                    <Label className="text-sm mb-2 block">Franchise Logo</Label>
                    <p className="text-xs text-muted-foreground mb-3">
                      Upload a square image (recommended 500x500px, max 5 MB). This will appear across your Franchise KI listing.
                    </p>
                    <div className="flex items-start gap-4">
                      <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-border bg-muted/30 flex items-center justify-center overflow-hidden">
                        {logoPreviewUrl || profileData?.logoUrl ? (
                          <img src={logoPreviewUrl || profileData?.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                        ) : (
                          <Building2 className="w-8 h-8 text-muted-foreground/40" />
                        )}
                      </div>
                      <div>
                        <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => logoInputRef.current?.click()}
                          disabled={logoUploading}
                        >
                          {logoUploading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Upload className="w-4 h-4 mr-1.5" />}
                          {logoStorageId ? "Replace Logo" : "Upload Logo"}
                        </Button>
                        <p className="text-xs text-muted-foreground mt-1">PNG, JPG, or SVG. Square format.</p>
                      </div>
                    </div>
                  </div>

                  {/* Colors */}
                  <div>
                    <Label className="text-sm mb-3 block">Brand Colors</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Primary Color</Label>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={primaryColor}
                            onChange={e => setPrimaryColor(e.target.value)}
                            className="w-10 h-10 rounded-lg cursor-pointer border border-border"
                          />
                          <Input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="font-mono text-sm" />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Secondary Color</Label>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={secondaryColor}
                            onChange={e => setSecondaryColor(e.target.value)}
                            className="w-10 h-10 rounded-lg cursor-pointer border border-border"
                          />
                          <Input value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} className="font-mono text-sm" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Color preview */}
                  <div className="rounded-xl overflow-hidden border border-border">
                    <div className="h-16 flex items-center px-4" style={{ backgroundColor: primaryColor }}>
                      <span className="text-white text-sm font-medium drop-shadow">{name || "Your Brand"}</span>
                    </div>
                    <div className="h-10 flex items-center px-4" style={{ backgroundColor: secondaryColor }}>
                      <span className="text-white text-xs drop-shadow-sm opacity-80">Color preview</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ───── INVESTMENT ───── */}
              {activeStep === "investment" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm mb-1.5 block">Total Investment Min ($)</Label>
                      <Input type="number" placeholder="150,000" value={investmentMin} onChange={e => setInvestmentMin(e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-sm mb-1.5 block">Total Investment Max ($)</Label>
                      <Input type="number" placeholder="500,000" value={investmentMax} onChange={e => setInvestmentMax(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm mb-1.5 block">Franchise Fee ($)</Label>
                    <Input type="number" placeholder="50,000" value={franchiseFee} onChange={e => setFranchiseFee(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm mb-1.5 block">Royalty (%)</Label>
                      <Input type="number" placeholder="6" value={royaltyPercent} onChange={e => setRoyaltyPercent(e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-sm mb-1.5 block">Brand Fund (%)</Label>
                      <Input type="number" placeholder="0" value={brandFundPercent} onChange={e => setBrandFundPercent(e.target.value)} />
                      <p className="text-xs text-muted-foreground mt-1">0 is valid</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm mb-1.5 block">Marketing Fees</Label>
                    <Input placeholder="e.g. $500/month local marketing + 2% national" value={marketingFees} onChange={e => setMarketingFees(e.target.value)} />
                    <p className="text-xs text-muted-foreground mt-1">Free text — describe your marketing fee structure</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm mb-1.5 block">Liquid Capital Required ($)</Label>
                      <Input type="number" placeholder="100,000" value={liquidCapitalMin} onChange={e => setLiquidCapitalMin(e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-sm mb-1.5 block">Minimum Footprint</Label>
                      <Input placeholder="e.g. 1,200–1,800 sq ft" value={minFootprint} onChange={e => setMinFootprint(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              {/* ───── PERFORMANCE & UNITS ───── */}
              {activeStep === "performance" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm mb-1.5 block">Year Established</Label>
                      <Input type="number" placeholder="2015" value={yearFounded} onChange={e => setYearFounded(e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-sm mb-1.5 block">Year Began Franchising</Label>
                      <Input type="number" placeholder="2018" value={yearFranchising} onChange={e => setYearFranchising(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm mb-1.5 block">Total Open Franchise Stores</Label>
                      <Input type="number" placeholder="25" value={totalUnits} onChange={e => setTotalUnits(e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-sm mb-1.5 block">Closures</Label>
                      <Input type="number" placeholder="0" value={closureCount} onChange={e => setClosureCount(e.target.value)} />
                      <p className="text-xs text-muted-foreground mt-1">How many stores have closed</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm mb-1.5 block">Avg. Unit Revenue Min ($)</Label>
                      <Input type="number" placeholder="800,000" value={avgRevenueMin} onChange={e => setAvgRevenueMin(e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-sm mb-1.5 block">Avg. Unit Revenue Max ($)</Label>
                      <Input type="number" placeholder="1,200,000" value={avgRevenueMax} onChange={e => setAvgRevenueMax(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm mb-1.5 block">Investment-to-Return Ratio</Label>
                    <div className="flex items-center gap-2">
                      <Input type="number" placeholder="3" value={investmentReturnRatio} onChange={e => setInvestmentReturnRatio(e.target.value)} className="w-28" />
                      <span className="text-muted-foreground font-medium">: 1</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">e.g. Salad House averages 3:1 return ratio</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm mb-1.5 block">Franchisee Retention Rate</Label>
                      <Input placeholder="95%" value={retentionRate} onChange={e => setRetentionRate(e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-sm mb-1.5 block">Guest / Customer Rating</Label>
                      <Input placeholder="4.8 / 5" value={guestRating} onChange={e => setGuestRating(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              {/* ───── GROWTH TERRITORIES ───── */}
              {activeStep === "territories" && (
                <div className="space-y-6">
                  <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/20">
                    <p className="text-sm text-cyan-300 font-medium mb-1">Where do you want to grow?</p>
                    <p className="text-xs text-muted-foreground">
                      These are areas you <span className="text-foreground font-medium">want to expand into</span> — not your current locations.
                      Start with your priority markets. You can always add more later.
                    </p>
                  </div>

                  {/* State selector grid */}
                  <div>
                    <Label className="text-sm mb-2 block">Click states to add major cities</Label>
                    <p className="text-xs text-muted-foreground mb-3">
                      We'll add the top cities automatically. You can fine-tune individual cities afterward.
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {US_STATES.map(s => {
                        const count = territoryCountByState[s.abbr] || 0;
                        const maxForState = getStateCityCount(s.abbr);
                        const isFull = count >= maxForState;
                        return (
                          <button
                            key={s.abbr}
                            onClick={() => handleAddStateCities(s.abbr)}
                            disabled={addingTerritories}
                            title={`${s.name} — ${count > 0 ? `${count} cities added` : `click to add ${maxForState} cities`}`}
                            className={`px-2 py-1 rounded text-xs font-medium border transition-all ${
                              isFull
                                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                : count > 0
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                : "bg-muted/30 text-muted-foreground border-border hover:border-cyan-500/40 hover:text-cyan-400"
                            }`}
                          >
                            {s.abbr}{count > 0 && <span className="ml-0.5 opacity-70">({count})</span>}
                          </button>
                        );
                      })}
                    </div>
                    {addingTerritories && (
                      <div className="flex items-center gap-2 mt-2 text-xs text-cyan-400">
                        <Loader2 className="w-3 h-3 animate-spin" /> Adding cities...
                      </div>
                    )}
                    {totalTerritoryStates > 30 && (
                      <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <p className="text-xs text-amber-300">
                          💡 <span className="font-medium">Tip:</span> Focused growth markets attract more qualified leads than listing everywhere. Consider narrowing to your strongest regions.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Individual city search */}
                  <div>
                    <Label className="text-sm mb-1.5 block">Or add specific cities</Label>
                    <LocationAutocomplete
                      onSelect={(loc) => handleAddSingleTerritory({
                        city: loc.city, stateAbbr: loc.stateAbbr,
                        latitude: loc.latitude, longitude: loc.longitude,
                      })}
                      placeholder="Search city, state, or ZIP..."
                    />
                  </div>

                  {/* Territory summary */}
                  {(existingTerritories?.length ?? 0) > 0 && (
                    <div className="pt-4 border-t border-border">
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-sm">
                          {existingTerritories!.length} territories across {totalTerritoryStates} state{totalTerritoryStates !== 1 ? "s" : ""}
                        </Label>
                      </div>
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {Object.entries(territoryCountByState).sort(([a], [b]) => a.localeCompare(b)).map(([st, count]) => {
                          const isExpanded = expandedStates.has(st);
                          const stateTerritories = (existingTerritories || []).filter(t => (t.state || "").toUpperCase() === st);
                          return (
                            <div key={st} className="rounded-lg border border-border/60 overflow-hidden">
                              <button
                                onClick={() => setExpandedStates(prev => {
                                  const next = new Set(prev);
                                  if (next.has(st)) next.delete(st); else next.add(st);
                                  return next;
                                })}
                                className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted/30 transition-colors"
                              >
                                <span className="font-medium">{st} <span className="text-muted-foreground font-normal">({count} cities)</span></span>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleRemoveStateTerritories(st); }}
                                    className="text-xs text-muted-foreground hover:text-destructive"
                                    title={`Remove all ${st} territories`}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                  <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                                </div>
                              </button>
                              {isExpanded && (
                                <div className="border-t border-border/40 px-3 py-1.5 space-y-0.5 bg-muted/10">
                                  {stateTerritories.map(t => (
                                    <div key={t._id} className="flex items-center justify-between py-1 text-xs">
                                      <span className="text-muted-foreground">
                                        <MapPin className="w-3 h-3 inline mr-1 text-cyan-400/60" />
                                        {t.city}{t.latitude ? "" : " ⚠️"}
                                      </span>
                                      <button onClick={() => handleRemoveTerritory(t._id)} className="text-muted-foreground hover:text-destructive">
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Actively growing toggle */}
                  <div className="pt-4 border-t border-border">
                    <Label className="text-sm mb-3 block">Are you actively seeking new franchisees?</Label>
                    <div className="flex gap-3">
                      <Button variant={isGrowing === true ? "default" : "outline"} size="sm"
                        onClick={() => setIsGrowing(true)}
                        className={isGrowing === true ? "bg-emerald-500 hover:bg-emerald-600" : ""}>
                        <TrendingUp className="w-4 h-4 mr-1" /> Yes, Actively Growing
                      </Button>
                      <Button variant={isGrowing === false ? "default" : "outline"} size="sm" onClick={() => setIsGrowing(false)}>
                        Not Right Now
                      </Button>
                    </div>
                  </div>

                  {/* Territory map link */}
                  {effectiveBrandId && profileData?.brand?.slug && (
                    <div className="p-4 rounded-xl bg-muted/30 border border-border/60">
                      <p className="text-sm text-muted-foreground mb-2">
                        Manage detailed territories (with status tracking) on the Territory Map.
                      </p>
                      <Button variant="outline" size="sm" onClick={() => navigate(`/map/${profileData.brand!.slug}`)}>
                        <MapPin className="w-4 h-4 mr-1.5" /> Open Territory Map
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* ───── CONTENT ───── */}
              {activeStep === "content" && (
                <div className="space-y-5">
                  <div>
                    <Label className="text-sm mb-1.5 block">Brand Story</Label>
                    <Textarea value={brandStory} onChange={e => setBrandStory(e.target.value)} placeholder="Tell prospects what makes your franchise special..." rows={5} className="resize-none" />
                    <p className="text-xs text-muted-foreground mt-1">{brandStory.length} / 1000 characters</p>
                  </div>
                  <div>
                    <Label className="text-sm mb-1.5 block">Business Model</Label>
                    <Textarea value={model} onChange={e => setModel(e.target.value)} placeholder="Describe your franchise business model..." rows={3} className="resize-none" />
                  </div>
                  <div>
                    <Label className="text-sm mb-1.5 block">Market Positioning</Label>
                    <Textarea value={positioning} onChange={e => setPositioning(e.target.value)} placeholder="How does your brand stand out?" rows={3} className="resize-none" />
                  </div>
                  <div>
                    <Label className="text-sm mb-2 block">Key Selling Points</Label>
                    <div className="space-y-2">
                      {sellingPoints.map((sp, i) => (
                        <div key={i} className="flex gap-2">
                          <Input value={sp} onChange={e => { const n = [...sellingPoints]; n[i] = e.target.value; setSellingPoints(n); }} placeholder={`Selling point ${i + 1}`} />
                          {sellingPoints.length > 1 && (
                            <Button variant="ghost" size="icon" onClick={() => setSellingPoints(sellingPoints.filter((_, j) => j !== i))}>
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                    {sellingPoints.length < 10 && (
                      <Button variant="outline" size="sm" className="mt-2" onClick={() => setSellingPoints([...sellingPoints, ""])}>
                        <Plus className="w-4 h-4 mr-1" /> Add Selling Point
                      </Button>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm mb-2 block">Ideal Franchise Partner</Label>
                    <div className="space-y-2">
                      {idealPartner.map((ip, i) => (
                        <div key={i} className="flex gap-2">
                          <Input value={ip} onChange={e => { const n = [...idealPartner]; n[i] = e.target.value; setIdealPartner(n); }} placeholder={`Trait ${i + 1}`} />
                          {idealPartner.length > 1 && (
                            <Button variant="ghost" size="icon" onClick={() => setIdealPartner(idealPartner.filter((_, j) => j !== i))}>
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                    {idealPartner.length < 10 && (
                      <Button variant="outline" size="sm" className="mt-2" onClick={() => setIdealPartner([...idealPartner, ""])}>
                        <Plus className="w-4 h-4 mr-1" /> Add Trait
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* ───── PHOTOS ───── */}
              {activeStep === "photos" && (
                <div className="space-y-5">
                  <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/20">
                    <p className="text-sm text-cyan-300 font-medium mb-1">📸 Showcase your brand</p>
                    <p className="text-xs text-muted-foreground">
                      These photos appear in a carousel on your public brand profile, helping prospects visualize your franchise locations and brand. Upload up to 10 photos of locations, products, or your team.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {(() => {
                      const serverUrls = profileData?.photoUrls || [];
                      const newPhotoPreviews = photoPreviewUrls.slice(0, Math.max(0, photos.length - serverUrls.length));
                      const displayUrls = [...serverUrls.slice(0, photos.length), ...newPhotoPreviews];
                      return displayUrls.map((url, i) => (
                        <div key={i} className="relative aspect-[4/3] rounded-xl overflow-hidden border border-border bg-muted group">
                          <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                          <button
                            onClick={() => {
                              const svLen = Math.min(serverUrls.length, photos.length);
                              if (i >= svLen) {
                                const previewIdx = i - svLen;
                                URL.revokeObjectURL(photoPreviewUrls[previewIdx]);
                                setPhotoPreviewUrls(prev => prev.filter((_, j) => j !== previewIdx));
                              }
                              setPhotos(photos.filter((_, j) => j !== i));
                            }}
                            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3.5 h-3.5 text-white" />
                          </button>
                        </div>
                      ));
                    })()}

                    {photos.length < 10 && (
                      <button
                        onClick={() => photoInputRef.current?.click()}
                        disabled={photoUploading}
                        className="aspect-[4/3] rounded-xl border-2 border-dashed border-border hover:border-cyan-500/40 flex flex-col items-center justify-center gap-2 transition-colors"
                      >
                        {photoUploading ? (
                          <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                        ) : (
                          <>
                            <Camera className="w-6 h-6 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Add Photo</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  <div className="flex items-center gap-2">
                    {photos.length > 0 && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                    <p className={`text-xs ${photos.length > 0 ? "text-emerald-400" : "text-muted-foreground"}`}>
                      {photos.length} / 10 photos uploaded{photos.length > 0 ? " ✓" : ""}. Max 10 MB each.
                    </p>
                  </div>
                </div>
              )}

              {/* ───── FAQs ───── */}
              {activeStep === "faqs" && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    Answer common questions prospects might have. Up to 10 FAQs.
                  </p>
                  {faqs.map((faq, i) => (
                    <div key={i} className="rounded-xl border border-border p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <Badge variant="outline" className="text-xs shrink-0">Q{i + 1}</Badge>
                        {faqs.length > 1 && (
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => setFaqs(faqs.filter((_, j) => j !== i))}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Question</Label>
                        <Input
                          value={faq.question}
                          onChange={e => { const n = [...faqs]; n[i] = { ...n[i], question: e.target.value }; setFaqs(n); }}
                          placeholder="e.g. What training do you provide?"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Answer</Label>
                        <Textarea
                          value={faq.answer}
                          onChange={e => { const n = [...faqs]; n[i] = { ...n[i], answer: e.target.value }; setFaqs(n); }}
                          placeholder="Your detailed answer..."
                          rows={3}
                          className="resize-none"
                        />
                      </div>
                    </div>
                  ))}
                  {faqs.length < 10 && (
                    <Button variant="outline" onClick={() => setFaqs([...faqs, { question: "", answer: "" }])}>
                      <Plus className="w-4 h-4 mr-1" /> Add FAQ
                    </Button>
                  )}
                </div>
              )}

              {/* ───── FLAGS ───── */}
              {activeStep === "flags" && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground mb-4">
                    Toggle on any highlights that apply to your franchise. These help prospects quickly evaluate your opportunity.
                  </p>
                  {[
                    { label: "Item 19 Available", desc: "Financial performance representations in your FDD", val: item19Available, set: setItem19Available },
                    { label: "FDD Available", desc: "Franchise Disclosure Document ready for review", val: fddAvailable, set: setFddAvailable },
                    { label: "SBA Approved", desc: "Listed on the SBA Franchise Directory", val: sbaApproved, set: setSbaApproved },
                    { label: "Veteran Discount", desc: "Franchise fee discount for veterans", val: veteranDiscount, set: setVeteranDiscount },
                    { label: "Multi-Unit Available", desc: "Prospects can purchase multiple territories", val: multiUnitAvailable, set: setMultiUnitAvailable },
                  ].map((flag) => (
                    <div key={flag.label} className="flex items-center justify-between py-3 px-4 rounded-xl bg-muted/30 border border-border hover:border-cyan-500/20 transition-colors">
                      <div>
                        <p className="text-sm font-medium">{flag.label}</p>
                        <p className="text-xs text-muted-foreground">{flag.desc}</p>
                      </div>
                      <Switch checked={flag.val} onCheckedChange={flag.set} />
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground pt-2">
                    Territory exclusivity and training details are in the <button onClick={() => setActiveStep("operations")} className="text-cyan-400 hover:underline">Operations</button> and <button onClick={() => setActiveStep("training")} className="text-cyan-400 hover:underline">Training</button> sections.
                  </p>
                </div>
              )}

              {/* ── COMPANY DETAILS ── */}
              {activeStep === "company" && (
                <div className="space-y-6">
                  <p className="text-sm text-muted-foreground mb-4">
                    Corporate information displayed on the "Learn More" tab. Helps prospects research your franchise.
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm mb-1.5 block">Parent Company</Label>
                      <Input placeholder="e.g. ABC Holdings LLC" value={parentCompany} onChange={e => setParentCompany(e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-sm mb-1.5 block">Geographic Focus</Label>
                      <Input placeholder="e.g. Southeast US, National" value={geographicFocus} onChange={e => setGeographicFocus(e.target.value)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm mb-1.5 block">Leadership Name</Label>
                      <Input placeholder="e.g. John Smith" value={leadershipName} onChange={e => setLeadershipName(e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-sm mb-1.5 block">Leadership Title</Label>
                      <Input placeholder="e.g. CEO, Founder" value={leadershipTitle} onChange={e => setLeadershipTitle(e.target.value)} />
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm mb-1.5 block">Corporate Address</Label>
                    <Input placeholder="123 Main St" value={corporateAddress} onChange={e => setCorporateAddress(e.target.value)} className="mb-2" />
                    <div className="grid grid-cols-3 gap-3">
                      <Input placeholder="City" value={corporateCity} onChange={e => setCorporateCity(e.target.value)} />
                      <Input placeholder="State" value={corporateState} onChange={e => setCorporateState(e.target.value)} />
                      <Input placeholder="ZIP" value={corporateZip} onChange={e => setCorporateZip(e.target.value)} />
                    </div>
                  </div>

                  <div className="w-40">
                    <Label className="text-sm mb-1.5 block">Employees at HQ</Label>
                    <Input type="number" placeholder="25" value={employeesAtHQ} onChange={e => setEmployeesAtHQ(e.target.value)} />
                  </div>

                  <div className="border-t border-border pt-6">
                    <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Globe className="w-4 h-4 text-cyan-400" /> Social Links</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Facebook</Label>
                        <Input placeholder="https://facebook.com/..." value={socialFacebook} onChange={e => setSocialFacebook(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Instagram</Label>
                        <Input placeholder="https://instagram.com/..." value={socialInstagram} onChange={e => setSocialInstagram(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">LinkedIn</Label>
                        <Input placeholder="https://linkedin.com/company/..." value={socialLinkedin} onChange={e => setSocialLinkedin(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Twitter / X</Label>
                        <Input placeholder="https://x.com/..." value={socialTwitter} onChange={e => setSocialTwitter(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">YouTube</Label>
                        <Input placeholder="https://youtube.com/@..." value={socialYoutube} onChange={e => setSocialYoutube(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">TikTok</Label>
                        <Input placeholder="https://tiktok.com/@..." value={socialTiktok} onChange={e => setSocialTiktok(e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── MEDIA & VIDEOS ── */}
              {activeStep === "media" && (
                <div className="space-y-6">
                  <p className="text-sm text-muted-foreground mb-4">
                    Add video URLs (YouTube or Vimeo embed links) that will display on the "Learn More" tab.
                  </p>

                  <div>
                    <Label className="text-sm mb-1.5 flex items-center gap-2"><Play className="w-4 h-4 text-cyan-400" /> Overview Video URL</Label>
                    <Input placeholder="https://www.youtube.com/embed/..." value={overviewVideoUrl} onChange={e => setOverviewVideoUrl(normalizeVideoEmbedUrl(e.target.value) || e.target.value)} />
                    <p className="text-xs text-muted-foreground mt-1">Use the embed URL, not the watch URL (e.g. youtube.com/embed/VIDEO_ID)</p>
                  </div>

                  <div>
                    <Label className="text-sm mb-1.5 flex items-center gap-2"><Users className="w-4 h-4 text-cyan-400" /> Franchisee Testimonial Video URL</Label>
                    <Input placeholder="https://www.youtube.com/embed/..." value={testimonialVideoUrl} onChange={e => setTestimonialVideoUrl(normalizeVideoEmbedUrl(e.target.value) || e.target.value)} />
                  </div>

                  {overviewVideoUrl && (
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">Preview</Label>
                      <div className="aspect-video max-w-md rounded-xl overflow-hidden bg-muted border border-border">
                        <iframe src={normalizeVideoEmbedUrl(overviewVideoUrl) || undefined} className="w-full h-full" allowFullScreen />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── TRAINING & SUPPORT ── */}
              {activeStep === "training" && (
                <div className="space-y-6">
                  <p className="text-sm text-muted-foreground mb-4">
                    Detail your training program and support systems. This helps prospects understand the onboarding experience.
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm mb-1.5 block">Classroom Training Hours</Label>
                      <Input type="number" placeholder="40" value={classroomTrainingHours} onChange={e => setClassroomTrainingHours(e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-sm mb-1.5 block">On-the-Job Training Hours</Label>
                      <Input type="number" placeholder="80" value={onTheJobTrainingHours} onChange={e => setOnTheJobTrainingHours(e.target.value)} />
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm mb-2 flex items-center gap-2">Ongoing Support <Badge variant="outline" className="text-[10px]">{ongoingSupport.filter(s => s.trim()).length} items</Badge></Label>
                    <p className="text-xs text-muted-foreground mb-3">e.g. Field support, Technology platform, Operations manual, Peer network</p>
                    {ongoingSupport.map((item, i) => (
                      <div key={i} className="flex gap-2 mb-2">
                        <Input
                          value={item}
                          onChange={e => { const n = [...ongoingSupport]; n[i] = e.target.value; setOngoingSupport(n); }}
                          placeholder={`Support item ${i + 1}`}
                          className="flex-1"
                        />
                        {ongoingSupport.length > 1 && (
                          <Button variant="ghost" size="icon" onClick={() => setOngoingSupport(ongoingSupport.filter((_, j) => j !== i))}>
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => setOngoingSupport([...ongoingSupport, ""])} className="mt-1">
                      <Plus className="w-3 h-3 mr-1" /> Add Support Item
                    </Button>
                  </div>

                  <div>
                    <Label className="text-sm mb-2 flex items-center gap-2">Marketing Support <Badge variant="outline" className="text-[10px]">{marketingSupport.filter(s => s.trim()).length} items</Badge></Label>
                    <p className="text-xs text-muted-foreground mb-3">e.g. Co-op advertising, Social media, Local marketing, PR</p>
                    {marketingSupport.map((item, i) => (
                      <div key={i} className="flex gap-2 mb-2">
                        <Input
                          value={item}
                          onChange={e => { const n = [...marketingSupport]; n[i] = e.target.value; setMarketingSupport(n); }}
                          placeholder={`Marketing item ${i + 1}`}
                          className="flex-1"
                        />
                        {marketingSupport.length > 1 && (
                          <Button variant="ghost" size="icon" onClick={() => setMarketingSupport(marketingSupport.filter((_, j) => j !== i))}>
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => setMarketingSupport([...marketingSupport, ""])} className="mt-1">
                      <Plus className="w-3 h-3 mr-1" /> Add Marketing Item
                    </Button>
                  </div>
                </div>
              )}

              {/* ── OPERATIONS ── */}
              {activeStep === "operations" && (
                <div className="space-y-6">
                  <p className="text-sm text-muted-foreground mb-4">
                    Define the operational requirements and ownership models for your franchise.
                  </p>

                  <div>
                    <Label className="text-sm mb-2 block">Ownership Models</Label>
                    <div className="flex flex-wrap gap-2">
                      {["owner_operator", "semi_absentee", "absentee", "investor"].map(type => (
                        <button
                          key={type}
                          onClick={() => setOwnerTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type])}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                            ownerTypes.includes(type)
                              ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/40"
                              : "bg-muted/30 text-muted-foreground border-border hover:border-cyan-500/20"
                          }`}
                        >
                          {type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {[
                      { label: "Absentee Ownership", desc: "Can be run without daily owner involvement", val: absenteeOwnership, set: setAbsenteeOwnership },
                      { label: "Run From Home", desc: "Business can operate from a home office", val: canRunFromHome, set: setCanRunFromHome },
                      { label: "Part-Time Eligible", desc: "Can be started as a part-time venture", val: canRunPartTime, set: setCanRunPartTime },
                      { label: "Exclusive Territories", desc: "Each franchisee gets a protected territory", val: exclusiveTerritories, set: setExclusiveTerritories },
                    ].map((flag) => (
                      <div key={flag.label} className="flex items-center justify-between py-3 px-4 rounded-xl bg-muted/30 border border-border hover:border-cyan-500/20 transition-colors">
                        <div>
                          <p className="text-sm font-medium">{flag.label}</p>
                          <p className="text-xs text-muted-foreground">{flag.desc}</p>
                        </div>
                        <Switch checked={flag.val === true} onCheckedChange={(v) => flag.set(v)} />
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm mb-1.5 block">Employees Required</Label>
                      <Input placeholder="e.g. 3-5 to start" value={employeesRequired} onChange={e => setEmployeesRequired(e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-sm mb-1.5 block">Term of Agreement</Label>
                      <Input placeholder="e.g. 10 years" value={termOfAgreement} onChange={e => setTermOfAgreement(e.target.value)} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-muted/30 border border-border">
                    <div>
                      <p className="text-sm font-medium">Agreement Renewable</p>
                      <p className="text-xs text-muted-foreground">Can the franchise agreement be renewed?</p>
                    </div>
                    <Switch checked={termRenewable} onCheckedChange={setTermRenewable} />
                  </div>

                  <div>
                    <Label className="text-sm mb-1.5 block">Veteran Incentive Details</Label>
                    <Input placeholder="e.g. 10% off franchise fee for veterans" value={veteranIncentiveDetails} onChange={e => setVeteranIncentiveDetails(e.target.value)} />
                  </div>

                  <div className="border-t border-border pt-6">
                    <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Award className="w-4 h-4 text-cyan-400" /> Rankings</h3>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Ranking #</Label>
                        <Input type="number" placeholder="150" value={franchiseRanking} onChange={e => setFranchiseRanking(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Year</Label>
                        <Input type="number" placeholder="2025" value={rankingYear} onChange={e => setRankingYear(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Source</Label>
                        <Input placeholder="Entrepreneur F500" value={rankingSource} onChange={e => setRankingSource(e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Navigation + Save ── */}
              <div className="flex items-center justify-between mt-10 pt-6 border-t border-border/50">
                <Button variant="ghost" onClick={goPrev} disabled={currentIdx === 0}>
                  <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
                    Save
                  </Button>
                  {currentIdx < STEPS.length - 1 ? (
                    <Button onClick={goNext} className="bg-cyan-500 hover:bg-cyan-600 text-white">
                      Continue <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  ) : (
                    <Button
                      onClick={() => { handleSave().then(() => { toast.success("Profile setup complete!"); navigate("/dashboard"); }); }}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1.5" /> Complete
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>

      {/* AI Profile Builder Dialog */}
      <AiProfileBuilder
        open={showAiBuilder}
        onOpenChange={setShowAiBuilder}
        brandName={name}
        onApply={handleAiApply}
      />
    </SidebarProvider>
  );
}
