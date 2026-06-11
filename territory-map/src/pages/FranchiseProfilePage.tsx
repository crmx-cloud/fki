import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Palette,
  DollarSign,
  BarChart3,
  ImagePlus,
  HelpCircle,
  Users,
  Sparkles,
  Upload,
  X,
  Plus,
  Trash2,
  Save,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  ArrowLeft,
  Camera,
  Star,
  Shield,
  GraduationCap,
  Target,
  Map,
  Code,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { EmbedCodeDialog } from "@/components/EmbedCodeDialog";

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

type SectionId = "brand" | "identity" | "performance" | "investment" | "content" | "photos" | "faqs" | "flags";

interface SectionConfig {
  id: SectionId;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const SECTIONS: SectionConfig[] = [
  { id: "brand", label: "Brand Info", icon: <Building2 className="w-4 h-4" />, description: "Name, category, description, website" },
  { id: "identity", label: "Brand Identity", icon: <Palette className="w-4 h-4" />, description: "Logo, colors" },
  { id: "performance", label: "Performance", icon: <BarChart3 className="w-4 h-4" />, description: "Revenue, units, ratings" },
  { id: "investment", label: "Investment", icon: <DollarSign className="w-4 h-4" />, description: "Costs, fees, footprint" },
  { id: "content", label: "Brand Story", icon: <Sparkles className="w-4 h-4" />, description: "Story, positioning, selling points" },
  { id: "photos", label: "Photos", icon: <Camera className="w-4 h-4" />, description: "Upload up to 10 photos" },
  { id: "faqs", label: "FAQs", icon: <HelpCircle className="w-4 h-4" />, description: "Common questions & answers" },
  { id: "flags", label: "Highlights", icon: <Shield className="w-4 h-4" />, description: "SBA, FDD, veteran, training" },
];

export function FranchiseProfilePage() {
  const { brandId } = useParams<{ brandId: string }>();
  const navigate = useNavigate();
  const myBrands = useQuery(api.franchiseProfile.myBrands);
  const profileData = useQuery(
    api.franchiseProfile.getProfile,
    brandId ? { brandId: brandId as Id<"brands"> } : "skip"
  );

  const updateBrand = useMutation(api.franchiseProfile.updateBrand);
  const updateProfile = useMutation(api.franchiseProfile.updateProfile);
  const generateUploadUrl = useMutation(api.franchiseProfile.generateUploadUrl);

  const [activeSection, setActiveSection] = useState<SectionId>("brand");
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [embedOpen, setEmbedOpen] = useState(false);

  // ── Brand fields ──
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  // ── Identity ──
  const [primaryColor, setPrimaryColor] = useState("#06b6d4");
  const [secondaryColor, setSecondaryColor] = useState("#0f172a");
  const [logoStorageId, setLogoStorageId] = useState("");
  const [logoPreviewUrl, setLogoPreviewUrl] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // ── Performance ──
  const [yearFounded, setYearFounded] = useState("");
  const [yearFranchising, setYearFranchising] = useState("");
  const [totalUnits, setTotalUnits] = useState("");
  const [closureCount, setClosureCount] = useState("");
  const [avgUnitRevenue, setAvgUnitRevenue] = useState("");
  const [avgRevenueMin, setAvgRevenueMin] = useState("");
  const [avgRevenueMax, setAvgRevenueMax] = useState("");
  const [retentionRate, setRetentionRate] = useState("");
  const [guestRating, setGuestRating] = useState("");

  // ── Investment ──
  const [totalInvestmentMin, setTotalInvestmentMin] = useState("");
  const [totalInvestmentMax, setTotalInvestmentMax] = useState("");
  const [franchiseFee, setFranchiseFee] = useState("");
  const [royaltyPercent, setRoyaltyPercent] = useState("");
  const [brandFundPercent, setBrandFundPercent] = useState("");
  const [marketingFees, setMarketingFees] = useState("");
  const [minFootprint, setMinFootprint] = useState("");

  // ── Content ──
  const [brandStory, setBrandStory] = useState("");
  const [model, setModel] = useState("");
  const [positioning, setPositioning] = useState("");
  const [sellingPoints, setSellingPoints] = useState<string[]>([]);
  const [idealPartner, setIdealPartner] = useState<string[]>([]);

  // ── Photos ──
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // ── FAQs ──
  const [faqs, setFaqs] = useState<{ question: string; answer: string }[]>([]);

  // ── Flags ──
  const [fddAvailable, setFddAvailable] = useState(false);
  const [item19Available, setItem19Available] = useState(false);
  const [isGrowing, setIsGrowing] = useState(false);
  const [sbaApproved, setSbaApproved] = useState(false);
  const [veteranDiscount, setVeteranDiscount] = useState(false);
  const [multiUnitAvailable, setMultiUnitAvailable] = useState(false);
  const [territoryExclusivity, setTerritoryExclusivity] = useState(false);
  const [trainingWeeks, setTrainingWeeks] = useState("");

  // Populate form from data
  useEffect(() => {
    if (!profileData) return;
    const { brand, franchiseProfile: fp } = profileData;

    setName(brand.name || "");
    setDescription(brand.description || "");
    setCategory(brand.category || "");
    setWebsiteUrl(brand.websiteUrl || "");
    setContactEmail(brand.contactEmail || "");

    if (fp) {
      setPrimaryColor(fp.primaryColor || brand.color || "#06b6d4");
      setSecondaryColor(fp.secondaryColor || "#0f172a");
      setLogoStorageId(fp.logoStorageId || "");
      setYearFounded(fp.yearFounded?.toString() || "");
      setYearFranchising(fp.yearFranchising?.toString() || "");
      setTotalUnits(fp.totalUnits?.toString() || "");
      setClosureCount(fp.closureCount?.toString() || "");
      setAvgUnitRevenue(fp.avgUnitRevenue?.toString() || "");
      setAvgRevenueMin(fp.avgRevenueMin?.toString() || "");
      setAvgRevenueMax(fp.avgRevenueMax?.toString() || "");
      setRetentionRate(fp.retentionRate || "");
      setGuestRating(fp.guestRating || "");
      setTotalInvestmentMin(fp.totalInvestmentMin?.toString() || "");
      setTotalInvestmentMax(fp.totalInvestmentMax?.toString() || "");
      setFranchiseFee(fp.franchiseFee?.toString() || "");
      setRoyaltyPercent(fp.royaltyPercent?.toString() || "");
      setBrandFundPercent(fp.brandFundPercent?.toString() || "");
      setMarketingFees(fp.marketingFees || "");
      setMinFootprint(fp.minFootprint || "");
      setBrandStory(fp.brandStory || "");
      setModel(fp.model || "");
      setPositioning(fp.positioning || "");
      setSellingPoints(fp.sellingPoints || []);
      setIdealPartner(fp.idealPartner || []);
      setPhotos(fp.photos || []);
      setFaqs(fp.faqs || []);
      setFddAvailable(fp.fddAvailable || false);
      setItem19Available(fp.item19Available || false);
      setIsGrowing(fp.isGrowing || false);
      setSbaApproved(fp.sbaApproved || false);
      setVeteranDiscount(fp.veteranDiscount || false);
      setMultiUnitAvailable(fp.multiUnitAvailable || false);
      setTerritoryExclusivity(fp.territoryExclusivity || false);
      setTrainingWeeks(fp.trainingWeeks?.toString() || "");
    } else {
      setPrimaryColor(brand.color || "#06b6d4");
    }

    if (profileData.logoUrl) setLogoPreviewUrl(profileData.logoUrl);
    if (profileData.photoUrls) setPhotoUrls(profileData.photoUrls);

    setHasChanges(false);
  }, [profileData]);

  // Mark changes
  const markChanged = useCallback(() => setHasChanges(true), []);

  // ── File upload helper ──
  async function uploadFile(file: File): Promise<string> {
    if (!brandId) throw new Error("No brand selected");
    const url = await generateUploadUrl({ brandId: brandId as Id<"brands"> });
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    const { storageId } = await res.json();
    return storageId;
  }

  // ── Logo upload ──
  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, or SVG)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Logo must be under 5MB");
      return;
    }

    setUploadingLogo(true);
    try {
      const storageId = await uploadFile(file);
      setLogoStorageId(storageId);
      setLogoPreviewUrl(URL.createObjectURL(file));
      markChanged();
      toast.success("Logo uploaded");
    } catch (err) {
      toast.error("Failed to upload logo");
    } finally {
      setUploadingLogo(false);
    }
  }

  // ── Photo upload ──
  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;

    if (photos.length + files.length > 10) {
      toast.error("Maximum 10 photos");
      return;
    }

    setUploadingPhoto(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 10MB)`);
          continue;
        }
        const storageId = await uploadFile(file);
        setPhotos((prev) => [...prev, storageId]);
        setPhotoUrls((prev) => [...prev, URL.createObjectURL(file)]);
      }
      markChanged();
      toast.success("Photos uploaded");
    } catch (err) {
      toast.error("Failed to upload photos");
    } finally {
      setUploadingPhoto(false);
    }
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoUrls((prev) => prev.filter((_, i) => i !== index));
    markChanged();
  }

  // ── Save all ──
  async function handleSave() {
    if (!brandId) return;
    setSaving(true);

    try {
      const bid = brandId as Id<"brands">;

      // Update brand table
      await updateBrand({
        brandId: bid,
        name: name || undefined,
        description: description || undefined,
        category: category || undefined,
        websiteUrl: websiteUrl || undefined,
        contactEmail: contactEmail || undefined,
        color: primaryColor || undefined,
      });

      // Update franchise profile
      await updateProfile({
        brandId: bid,
        yearFounded: yearFounded ? parseInt(yearFounded) : undefined,
        yearFranchising: yearFranchising ? parseInt(yearFranchising) : undefined,
        totalUnits: totalUnits ? parseInt(totalUnits) : undefined,
        closureCount: closureCount ? parseInt(closureCount) : undefined,
        avgUnitRevenue: avgUnitRevenue ? parseFloat(avgUnitRevenue) : undefined,
        avgRevenueMin: avgRevenueMin ? parseFloat(avgRevenueMin) : undefined,
        avgRevenueMax: avgRevenueMax ? parseFloat(avgRevenueMax) : undefined,
        retentionRate: retentionRate || undefined,
        guestRating: guestRating || undefined,
        totalInvestmentMin: totalInvestmentMin ? parseFloat(totalInvestmentMin) : undefined,
        totalInvestmentMax: totalInvestmentMax ? parseFloat(totalInvestmentMax) : undefined,
        franchiseFee: franchiseFee ? parseFloat(franchiseFee) : undefined,
        royaltyPercent: royaltyPercent ? parseFloat(royaltyPercent) : undefined,
        brandFundPercent: brandFundPercent !== "" ? parseFloat(brandFundPercent) : undefined,
        marketingFees: marketingFees || undefined,
        minFootprint: minFootprint || undefined,
        primaryColor: primaryColor || undefined,
        secondaryColor: secondaryColor || undefined,
        logoStorageId: logoStorageId || undefined,
        photos: photos.length > 0 ? photos : undefined,
        brandStory: brandStory || undefined,
        model: model || undefined,
        positioning: positioning || undefined,
        sellingPoints: sellingPoints.filter(Boolean).length > 0 ? sellingPoints.filter(Boolean) : undefined,
        idealPartner: idealPartner.filter(Boolean).length > 0 ? idealPartner.filter(Boolean) : undefined,
        faqs: faqs.filter((f) => f.question && f.answer).length > 0 ? faqs.filter((f) => f.question && f.answer) : undefined,
        fddAvailable,
        item19Available,
        isGrowing,
        sbaApproved,
        veteranDiscount,
        multiUnitAvailable,
        territoryExclusivity,
        trainingWeeks: trainingWeeks ? parseInt(trainingWeeks) : undefined,
      });

      setHasChanges(false);
      toast.success("Profile saved!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  // ── No brand selected → brand picker ──
  if (!brandId) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="p-6 max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold mb-2">Franchise Profile</h1>
            <p className="text-slate-400 mb-8">Select a brand to edit its profile</p>
            {myBrands === undefined && (
              <div className="flex items-center gap-2 text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
            )}
            {myBrands && myBrands.length === 0 && (
              <div className="text-center py-12">
                <Building2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No brands found.</p>
                <Button className="mt-4 bg-cyan-600 hover:bg-cyan-500 text-white" onClick={() => navigate("/claim")}>
                  Build My Map
                </Button>
              </div>
            )}
            <div className="grid gap-3">
              {myBrands?.map((b) => (
                <button
                  key={b._id}
                  onClick={() => navigate(`/franchise-profile/${b._id}`)}
                  className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold" style={{ backgroundColor: (b.color || "#06b6d4") + "20", color: b.color || "#06b6d4" }}>
                    {b.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{b.name}</p>
                    <p className="text-sm text-slate-500">{b.category || "Uncategorized"}</p>
                  </div>
                  {b.isActive ? (
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-0">Active</Badge>
                  ) : (
                    <Badge className="bg-amber-500/10 text-amber-400 border-0">Pending Review</Badge>
                  )}
                </button>
              ))}
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  // ── Loading ──
  if (profileData === undefined) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  // ── Section renderers ──
  function renderBrand() {
    return (
      <div className="space-y-5">
        <div>
          <Label className="text-xs text-slate-400 uppercase tracking-wider">Brand Name</Label>
          <Input value={name} onChange={(e) => { setName(e.target.value); markChanged(); }} className="mt-1.5 bg-white/5 border-white/10 h-11" placeholder="Your Franchise Name" />
        </div>
        <div>
          <Label className="text-xs text-slate-400 uppercase tracking-wider">Category</Label>
          <Select value={category} onValueChange={(v) => { setCategory(v); markChanged(); }}>
            <SelectTrigger className="mt-1.5 bg-white/5 border-white/10 h-11"><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-slate-400 uppercase tracking-wider">Description</Label>
          <Textarea value={description} onChange={(e) => { setDescription(e.target.value); markChanged(); }} className="mt-1.5 bg-white/5 border-white/10" rows={3} placeholder="Brief description of your franchise..." />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-slate-400 uppercase tracking-wider">Website</Label>
            <Input value={websiteUrl} onChange={(e) => { setWebsiteUrl(e.target.value); markChanged(); }} className="mt-1.5 bg-white/5 border-white/10 h-11" placeholder="https://yourfranchise.com" />
          </div>
          <div>
            <Label className="text-xs text-slate-400 uppercase tracking-wider">Contact Email</Label>
            <Input value={contactEmail} onChange={(e) => { setContactEmail(e.target.value); markChanged(); }} className="mt-1.5 bg-white/5 border-white/10 h-11" placeholder="info@franchise.com" type="email" />
          </div>
        </div>
      </div>
    );
  }

  function renderIdentity() {
    return (
      <div className="space-y-6">
        {/* Logo */}
        <div>
          <Label className="text-xs text-slate-400 uppercase tracking-wider mb-3 block">Brand Logo</Label>
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center overflow-hidden bg-white/5 flex-shrink-0">
              {logoPreviewUrl ? (
                <img src={logoPreviewUrl} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <ImagePlus className="w-8 h-8 text-slate-600" />
              )}
            </div>
            <div className="flex-1">
              <label className="cursor-pointer">
                <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={handleLogoUpload} className="hidden" />
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm">
                  {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploadingLogo ? "Uploading..." : "Upload Logo"}
                </div>
              </label>
              <p className="text-xs text-slate-500 mt-2">
                Square image recommended. PNG, JPG, SVG, or WebP. Max 5MB.
              </p>
            </div>
          </div>
        </div>

        {/* Colors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <Label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">Primary Color</Label>
            <div className="flex items-center gap-3">
              <input type="color" value={primaryColor} onChange={(e) => { setPrimaryColor(e.target.value); markChanged(); }} className="w-10 h-10 rounded-lg border border-white/10 cursor-pointer bg-transparent" />
              <Input value={primaryColor} onChange={(e) => { setPrimaryColor(e.target.value); markChanged(); }} className="bg-white/5 border-white/10 h-10 font-mono text-sm flex-1" placeholder="#06b6d4" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">Secondary Color</Label>
            <div className="flex items-center gap-3">
              <input type="color" value={secondaryColor} onChange={(e) => { setSecondaryColor(e.target.value); markChanged(); }} className="w-10 h-10 rounded-lg border border-white/10 cursor-pointer bg-transparent" />
              <Input value={secondaryColor} onChange={(e) => { setSecondaryColor(e.target.value); markChanged(); }} className="bg-white/5 border-white/10 h-10 font-mono text-sm flex-1" placeholder="#0f172a" />
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Preview</p>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: primaryColor }} />
            <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: secondaryColor }} />
            <span className="text-sm" style={{ color: primaryColor }}>{name || "Your Brand"}</span>
          </div>
        </div>
      </div>
    );
  }

  function renderPerformance() {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs text-slate-400 uppercase tracking-wider">Year Established</Label>
            <Input type="number" value={yearFounded} onChange={(e) => { setYearFounded(e.target.value); markChanged(); }} className="mt-1.5 bg-white/5 border-white/10 h-11" placeholder="2011" />
          </div>
          <div>
            <Label className="text-xs text-slate-400 uppercase tracking-wider">Franchising Since</Label>
            <Input type="number" value={yearFranchising} onChange={(e) => { setYearFranchising(e.target.value); markChanged(); }} className="mt-1.5 bg-white/5 border-white/10 h-11" placeholder="2017" />
          </div>
          <div>
            <Label className="text-xs text-slate-400 uppercase tracking-wider">Total Locations</Label>
            <Input type="number" value={totalUnits} onChange={(e) => { setTotalUnits(e.target.value); markChanged(); }} className="mt-1.5 bg-white/5 border-white/10 h-11" placeholder="22" />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs text-slate-400 uppercase tracking-wider">Closures</Label>
            <Input type="number" value={closureCount} onChange={(e) => { setClosureCount(e.target.value); markChanged(); }} className="mt-1.5 bg-white/5 border-white/10 h-11" placeholder="0" />
          </div>
          <div>
            <Label className="text-xs text-slate-400 uppercase tracking-wider">Retention Rate</Label>
            <Input value={retentionRate} onChange={(e) => { setRetentionRate(e.target.value); markChanged(); }} className="mt-1.5 bg-white/5 border-white/10 h-11" placeholder="94.7%" />
          </div>
          <div>
            <Label className="text-xs text-slate-400 uppercase tracking-wider">Guest Rating</Label>
            <Input value={guestRating} onChange={(e) => { setGuestRating(e.target.value); markChanged(); }} className="mt-1.5 bg-white/5 border-white/10 h-11" placeholder="4.7 stars" />
          </div>
        </div>

        <div className="border-t border-white/5 pt-5">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Average Store Revenue</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-slate-500">Average ($)</Label>
              <Input type="number" value={avgUnitRevenue} onChange={(e) => { setAvgUnitRevenue(e.target.value); markChanged(); }} className="mt-1 bg-white/5 border-white/10 h-10" placeholder="1600000" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Range Min ($)</Label>
              <Input type="number" value={avgRevenueMin} onChange={(e) => { setAvgRevenueMin(e.target.value); markChanged(); }} className="mt-1 bg-white/5 border-white/10 h-10" placeholder="1000000" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Range Max ($)</Label>
              <Input type="number" value={avgRevenueMax} onChange={(e) => { setAvgRevenueMax(e.target.value); markChanged(); }} className="mt-1 bg-white/5 border-white/10 h-10" placeholder="2500000" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderInvestment() {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-slate-400 uppercase tracking-wider">Total Investment Min ($)</Label>
            <Input type="number" value={totalInvestmentMin} onChange={(e) => { setTotalInvestmentMin(e.target.value); markChanged(); }} className="mt-1.5 bg-white/5 border-white/10 h-11" placeholder="303000" />
          </div>
          <div>
            <Label className="text-xs text-slate-400 uppercase tracking-wider">Total Investment Max ($)</Label>
            <Input type="number" value={totalInvestmentMax} onChange={(e) => { setTotalInvestmentMax(e.target.value); markChanged(); }} className="mt-1.5 bg-white/5 border-white/10 h-11" placeholder="750000" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-slate-400 uppercase tracking-wider">Franchise Fee ($)</Label>
            <Input type="number" value={franchiseFee} onChange={(e) => { setFranchiseFee(e.target.value); markChanged(); }} className="mt-1.5 bg-white/5 border-white/10 h-11" placeholder="40000" />
          </div>
          <div>
            <Label className="text-xs text-slate-400 uppercase tracking-wider">Royalty (%)</Label>
            <Input type="number" step="0.1" value={royaltyPercent} onChange={(e) => { setRoyaltyPercent(e.target.value); markChanged(); }} className="mt-1.5 bg-white/5 border-white/10 h-11" placeholder="6" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-slate-400 uppercase tracking-wider">Brand Fund (%)</Label>
            <Input type="number" step="0.1" value={brandFundPercent} onChange={(e) => { setBrandFundPercent(e.target.value); markChanged(); }} className="mt-1.5 bg-white/5 border-white/10 h-11" placeholder="0" />
            <p className="text-[11px] text-slate-600 mt-1">Enter 0 if none</p>
          </div>
          <div>
            <Label className="text-xs text-slate-400 uppercase tracking-wider">Minimum Footprint</Label>
            <Input value={minFootprint} onChange={(e) => { setMinFootprint(e.target.value); markChanged(); }} className="mt-1.5 bg-white/5 border-white/10 h-11" placeholder="1,600–2,200 sq ft with 20ft frontage" />
          </div>
        </div>

        <div>
          <Label className="text-xs text-slate-400 uppercase tracking-wider">Marketing Fees & Details</Label>
          <Textarea value={marketingFees} onChange={(e) => { setMarketingFees(e.target.value); markChanged(); }} className="mt-1.5 bg-white/5 border-white/10" rows={2} placeholder="1% local + 1% brand tech fee up to $1.5K/month" />
        </div>
      </div>
    );
  }

  function renderContent() {
    return (
      <div className="space-y-6">
        <div>
          <Label className="text-xs text-slate-400 uppercase tracking-wider">Brand Story</Label>
          <Textarea value={brandStory} onChange={(e) => { setBrandStory(e.target.value); markChanged(); }} className="mt-1.5 bg-white/5 border-white/10" rows={4} placeholder="Tell your franchise story — what makes your brand unique?" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-slate-400 uppercase tracking-wider">Business Model</Label>
            <Textarea value={model} onChange={(e) => { setModel(e.target.value); markChanged(); }} className="mt-1.5 bg-white/5 border-white/10" rows={2} placeholder="Fast-casual, balanced dine-in/take-out/delivery (~40% off-premise)" />
          </div>
          <div>
            <Label className="text-xs text-slate-400 uppercase tracking-wider">Positioning</Label>
            <Textarea value={positioning} onChange={(e) => { setPositioning(e.target.value); markChanged(); }} className="mt-1.5 bg-white/5 border-white/10" rows={2} placeholder="Affordable, fast, and healthy meals beyond just salads..." />
          </div>
        </div>

        {/* Selling Points */}
        <div>
          <Label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">Why Franchisees Choose You</Label>
          <p className="text-[11px] text-slate-600 mb-3">Add up to 8 key selling points</p>
          <div className="space-y-2">
            {sellingPoints.map((sp, i) => (
              <div key={i} className="flex gap-2">
                <div className="w-5 h-5 rounded bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-2.5">
                  <Check className="w-3 h-3 text-emerald-400" />
                </div>
                <Input value={sp} onChange={(e) => { const copy = [...sellingPoints]; copy[i] = e.target.value; setSellingPoints(copy); markChanged(); }} className="bg-white/5 border-white/10 h-10 flex-1" placeholder="Zero closures and strong ROI potential..." />
                <button onClick={() => { setSellingPoints(sellingPoints.filter((_, j) => j !== i)); markChanged(); }} className="text-slate-600 hover:text-red-400 p-2">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {sellingPoints.length < 8 && (
              <button onClick={() => { setSellingPoints([...sellingPoints, ""]); markChanged(); }} className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 py-1">
                <Plus className="w-3.5 h-3.5" /> Add selling point
              </button>
            )}
          </div>
        </div>

        {/* Ideal Partner */}
        <div>
          <Label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">Ideal Franchise Partner</Label>
          <p className="text-[11px] text-slate-600 mb-3">What are you looking for in a franchise partner?</p>
          <div className="space-y-2">
            {idealPartner.map((ip, i) => (
              <div key={i} className="flex gap-2">
                <div className="w-5 h-5 rounded bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-2.5">
                  <Target className="w-3 h-3 text-cyan-400" />
                </div>
                <Input value={ip} onChange={(e) => { const copy = [...idealPartner]; copy[i] = e.target.value; setIdealPartner(copy); markChanged(); }} className="bg-white/5 border-white/10 h-10 flex-1" placeholder="$150K+ liquid capital; SBA loan eligible" />
                <button onClick={() => { setIdealPartner(idealPartner.filter((_, j) => j !== i)); markChanged(); }} className="text-slate-600 hover:text-red-400 p-2">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {idealPartner.length < 8 && (
              <button onClick={() => { setIdealPartner([...idealPartner, ""]); markChanged(); }} className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 py-1">
                <Plus className="w-3.5 h-3.5" /> Add criteria
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderPhotos() {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-xs text-slate-400 uppercase tracking-wider">Brand Photos</Label>
            <p className="text-[11px] text-slate-600 mt-0.5">Upload up to 10 photos of your locations, team, food, etc.</p>
          </div>
          <span className="text-xs text-slate-500">{photos.length}/10</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {photoUrls.map((url, i) => (
            <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-white/10 group">
              <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
              <button
                onClick={() => removePhoto(i)}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          {photos.length < 10 && (
            <label className="aspect-square rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center cursor-pointer hover:border-white/20 hover:bg-white/[0.02] transition-colors">
              <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
              {uploadingPhoto ? (
                <Loader2 className="w-6 h-6 text-slate-600 animate-spin" />
              ) : (
                <>
                  <ImagePlus className="w-6 h-6 text-slate-600 mb-1" />
                  <span className="text-[11px] text-slate-600">Add Photos</span>
                </>
              )}
            </label>
          )}
        </div>

        <p className="text-xs text-slate-600">
          Accepted: JPG, PNG, WebP. Max 10MB per photo.
        </p>
      </div>
    );
  }

  function renderFaqs() {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-xs text-slate-400 uppercase tracking-wider">Frequently Asked Questions</Label>
            <p className="text-[11px] text-slate-600 mt-0.5">Add up to 10 FAQs about your franchise</p>
          </div>
          <span className="text-xs text-slate-500">{faqs.length}/10</span>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs text-cyan-400 font-medium flex-shrink-0 mt-1">Q{i + 1}</span>
                <Input
                  value={faq.question}
                  onChange={(e) => {
                    const copy = [...faqs];
                    copy[i] = { ...copy[i], question: e.target.value };
                    setFaqs(copy);
                    markChanged();
                  }}
                  className="bg-white/5 border-white/10 h-10 flex-1"
                  placeholder="What kind of revenue are these stores generating?"
                />
                <button onClick={() => { setFaqs(faqs.filter((_, j) => j !== i)); markChanged(); }} className="text-slate-600 hover:text-red-400 p-1 flex-shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <Textarea
                value={faq.answer}
                onChange={(e) => {
                  const copy = [...faqs];
                  copy[i] = { ...copy[i], answer: e.target.value };
                  setFaqs(copy);
                  markChanged();
                }}
                className="bg-white/5 border-white/10 text-sm"
                rows={2}
                placeholder="Answer this question..."
              />
            </div>
          ))}

          {faqs.length < 10 && (
            <button
              onClick={() => { setFaqs([...faqs, { question: "", answer: "" }]); markChanged(); }}
              className="w-full py-3 rounded-xl border-2 border-dashed border-white/10 text-sm text-slate-500 hover:text-white hover:border-white/20 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add FAQ
            </button>
          )}
        </div>
      </div>
    );
  }

  function renderFlags() {
    const flags = [
      { label: "FDD Available", desc: "Franchise Disclosure Document is available to prospects", value: fddAvailable, set: setFddAvailable },
      { label: "Item 19 Available", desc: "Financial performance representations disclosed", value: item19Available, set: setItem19Available },
      { label: "Actively Growing", desc: "Currently expanding and seeking new franchisees", value: isGrowing, set: setIsGrowing },
      { label: "SBA Approved", desc: "Approved for SBA financing", value: sbaApproved, set: setSbaApproved },
      { label: "Veteran Discount", desc: "Franchise fee discount for veterans", value: veteranDiscount, set: setVeteranDiscount },
      { label: "Multi-Unit Available", desc: "Multi-unit franchise opportunities", value: multiUnitAvailable, set: setMultiUnitAvailable },
      { label: "Territory Exclusivity", desc: "Exclusive territory rights for franchisees", value: territoryExclusivity, set: setTerritoryExclusivity },
    ];

    return (
      <div className="space-y-5">
        <div className="space-y-1">
          {flags.map((f, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
              <div>
                <p className="text-sm font-medium">{f.label}</p>
                <p className="text-xs text-slate-500">{f.desc}</p>
              </div>
              <Switch checked={f.value} onCheckedChange={(v) => { f.set(v); markChanged(); }} />
            </div>
          ))}
        </div>

        <div>
          <Label className="text-xs text-slate-400 uppercase tracking-wider">Training Duration (weeks)</Label>
          <Input type="number" value={trainingWeeks} onChange={(e) => { setTrainingWeeks(e.target.value); markChanged(); }} className="mt-1.5 bg-white/5 border-white/10 h-11 max-w-[200px]" placeholder="4" />
        </div>
      </div>
    );
  }

  const sectionRenderers: Record<SectionId, () => React.ReactNode> = {
    brand: renderBrand,
    identity: renderIdentity,
    performance: renderPerformance,
    investment: renderInvestment,
    content: renderContent,
    photos: renderPhotos,
    faqs: renderFaqs,
    flags: renderFlags,
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="p-4 sm:p-6 max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <button onClick={() => navigate("/franchise-profile")} className="text-xs text-slate-500 hover:text-white flex items-center gap-1 mb-2">
                <ArrowLeft className="w-3 h-3" /> All Brands
              </button>
              <h1 className="text-2xl font-bold">{name || "Franchise Profile"}</h1>
              <p className="text-sm text-slate-400 mt-0.5">
                {profileData?.brand?.isActive
                  ? "Your brand is live on Franchise KI"
                  : "Complete your profile — our team will activate your map"}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {profileData?.brand?.slug && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-700 text-slate-300 hover:text-white hover:border-slate-500"
                    onClick={() => window.open(`/map/${profileData.brand.slug}`, "_blank")}
                  >
                    <Map className="w-3.5 h-3.5 mr-1.5" /> Preview Map <ExternalLink className="w-3 h-3 ml-1 opacity-50" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-700 text-slate-300 hover:text-white hover:border-slate-500"
                    onClick={() => setEmbedOpen(true)}
                  >
                    <Code className="w-3.5 h-3.5 mr-1.5" /> Embed Code
                  </Button>
                </>
              )}
              <Button
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className={`h-10 px-6 ${hasChanges ? "bg-cyan-600 hover:bg-cyan-500 text-white" : "bg-white/5 text-slate-500"}`}
              >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
              {saving ? "Saving..." : hasChanges ? "Save Changes" : "Saved"}
            </Button>
            </div>
          </div>

          {/* Embed Code Dialog */}
          {profileData?.brand?.slug && (
            <EmbedCodeDialog
              open={embedOpen}
              onOpenChange={setEmbedOpen}
              brandSlug={profileData.brand.slug}
              brandName={profileData.brand.name}
              brandColor={profileData.brand.color}
            />
          )}

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Section nav (sidebar) */}
            <div className="lg:w-56 flex-shrink-0">
              <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
                {SECTIONS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setActiveSection(s.id)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                      activeSection === s.id
                        ? "bg-white/10 text-white"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {s.icon}
                    <span className="hidden sm:inline">{s.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 sm:p-7">
                <div className="mb-6">
                  <h2 className="text-lg font-semibold">{SECTIONS.find((s) => s.id === activeSection)?.label}</h2>
                  <p className="text-sm text-slate-500 mt-0.5">{SECTIONS.find((s) => s.id === activeSection)?.description}</p>
                </div>
                {sectionRenderers[activeSection]()}
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
