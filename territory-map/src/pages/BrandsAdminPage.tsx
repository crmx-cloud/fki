import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useState, useMemo, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Building2,
  Plus,
  Trash2,
  Edit,
  MapPin,
  Globe,
  Archive,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Palette,
  Mail,
  Link as LinkIcon,
  DollarSign,
  Percent,
  LayoutGrid,
  List,
  Search,
  Filter,
  X,
  Check,
  Bookmark,
  BookmarkPlus,
  SlidersHorizontal,
  ArrowUpDown,
  Eye,
  EyeOff,
  Download,
  Star,
  FileText,
  Code2,
  Upload,
  Loader2,
  Database,
  Map,
} from "lucide-react";
import { toast } from "sonner";
import { EmbedCodeDialog } from "@/components/EmbedCodeDialog";
import { StateAvailabilityEditor } from "@/components/StateAvailabilityEditor";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

// ── Constants ──
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

const INVESTMENT_RANGES = [
  { label: "Under $50K", min: 0, max: 50000 },
  { label: "$50K–$100K", min: 50000, max: 100000 },
  { label: "$100K–$150K", min: 100000, max: 150000 },
  { label: "$150K–$250K", min: 150000, max: 250000 },
  { label: "$250K–$500K", min: 250000, max: 500000 },
  { label: "$500K–$1M", min: 500000, max: 1000000 },
  { label: "$1M+", min: 1000000, max: Infinity },
];

const ROYALTY_RANGES = [
  { label: "Under 4%", min: 0, max: 4 },
  { label: "4%–6%", min: 4, max: 6 },
  { label: "6%–8%", min: 6, max: 8 },
  { label: "8%–10%", min: 8, max: 10 },
  { label: "10%+", min: 10, max: Infinity },
];

// ── Saved View Type ──
interface SavedView {
  id: string;
  name: string;
  filters: FilterState;
}

interface FilterState {
  search: string;
  category: string;
  status: string;         // "all" | "active" | "inactive"
  claimed: string;        // "all" | "claimed" | "unclaimed"
  investmentRange: string;// "all" | index of INVESTMENT_RANGES
  royaltyRange: string;   // "all" | index of ROYALTY_RANGES
  minTerritories: string; // "" or number
  featured: string;       // "all" | "yes" | "no"
}

const DEFAULT_FILTERS: FilterState = {
  search: "",
  category: "all",
  status: "all",
  claimed: "all",
  investmentRange: "all",
  royaltyRange: "all",
  minTerritories: "",
  featured: "all",
};

type SortKey = "name" | "category" | "investmentMin" | "royaltyPercent" | "totalTerritories" | "availableTerritories" | "status";

// ── LocalStorage helpers ──
function loadSavedViews(): SavedView[] {
  try {
    return JSON.parse(localStorage.getItem("mapki_brand_views") || "[]");
  } catch { return []; }
}

function saveSavedViews(views: SavedView[]) {
  localStorage.setItem("mapki_brand_views", JSON.stringify(views));
}

function fmtK(v: number | undefined): string {
  if (!v) return "—";
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`;
  return `$${v.toLocaleString()}`;
}

// ═══════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════
export function BrandsAdminPage() {
  const brands = useQuery(api.brands.listWithStats);
  const createBrand = useMutation(api.brands.create);
  const updateBrand = useMutation(api.brands.update);
  const removeBrand = useMutation(api.brands.remove);

  // View state
  const [view, setView] = useState<"card" | "list">("list");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({ ...DEFAULT_FILTERS });
  const [savedViews, setSavedViews] = useState<SavedView[]>(loadSavedViews);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [newViewName, setNewViewName] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Sort state
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingBrand, setEditingBrand] = useState<any | null>(null);
  const [deletingBrand, setDeletingBrand] = useState<{ id: string; name: string } | null>(null);
  const [embedBrand, setEmbedBrand] = useState<{ slug: string; name: string; color?: string } | null>(null);
  const [availabilityBrand, setAvailabilityBrand] = useState<{ _id: string; name: string } | null>(null);
  const [importing, setImporting] = useState(false);

  // Bulk import
  const importStats = useQuery(api.bulkImport.getImportStats);
  const importFranchises = useMutation(api.bulkImport.importFranchises);

  const handleBulkImport = async () => {
    setImporting(true);
    try {
      const result = await importFranchises();
      toast.success(result.message);
    } catch (e: any) {
      toast.error(e.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  // New brand form
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newInvestMin, setNewInvestMin] = useState("");
  const [newInvestMax, setNewInvestMax] = useState("");
  const [newFee, setNewFee] = useState("");
  const [newRoyalty, setNewRoyalty] = useState("");

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editInvestMin, setEditInvestMin] = useState("");
  const [editInvestMax, setEditInvestMax] = useState("");
  const [editFee, setEditFee] = useState("");
  const [editRoyalty, setEditRoyalty] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [editEmail, setEditEmail] = useState("");

  // ── Filter logic ──
  const filteredBrands = useMemo(() => {
    if (!brands) return [];
    return brands.filter((b: any) => {
      // Search
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const hay = `${b.name} ${b.slug} ${b.description || ""} ${b.category || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      // Category
      if (filters.category !== "all" && b.category !== filters.category) return false;
      // Status
      if (filters.status === "active" && b.isActive === false) return false;
      if (filters.status === "inactive" && b.isActive !== false) return false;
      // Claimed
      if (filters.claimed === "claimed" && !b.isClaimed) return false;
      if (filters.claimed === "unclaimed" && b.isClaimed) return false;
      // Investment range
      if (filters.investmentRange !== "all") {
        const range = INVESTMENT_RANGES[Number(filters.investmentRange)];
        if (range) {
          const inv = b.investmentMin || 0;
          if (inv < range.min || inv >= range.max) return false;
        }
      }
      // Royalty range
      if (filters.royaltyRange !== "all") {
        const range = ROYALTY_RANGES[Number(filters.royaltyRange)];
        if (range) {
          const roy = b.royaltyPercent || 0;
          if (roy < range.min || roy >= range.max) return false;
        }
      }
      // Min territories
      if (filters.minTerritories) {
        if ((b.totalTerritories || 0) < Number(filters.minTerritories)) return false;
      }
      // Featured
      if (filters.featured === "yes" && !b.featured) return false;
      if (filters.featured === "no" && b.featured) return false;
      return true;
    });
  }, [brands, filters]);

  // ── Sort logic ──
  const sortedBrands = useMemo(() => {
    return [...filteredBrands].sort((a: any, b: any) => {
      let va: any, vb: any;
      switch (sortKey) {
        case "name": va = a.name?.toLowerCase() || ""; vb = b.name?.toLowerCase() || ""; break;
        case "category": va = a.category?.toLowerCase() || "zzz"; vb = b.category?.toLowerCase() || "zzz"; break;
        case "investmentMin": va = a.investmentMin || 0; vb = b.investmentMin || 0; break;
        case "royaltyPercent": va = a.royaltyPercent || 0; vb = b.royaltyPercent || 0; break;
        case "totalTerritories": va = a.totalTerritories || 0; vb = b.totalTerritories || 0; break;
        case "availableTerritories": va = a.availableTerritories || 0; vb = b.availableTerritories || 0; break;
        case "status": va = a.isActive === false ? 1 : 0; vb = b.isActive === false ? 1 : 0; break;
        default: va = a.name; vb = b.name;
      }
      if (typeof va === "string") return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === "asc" ? va - vb : vb - va;
    });
  }, [filteredBrands, sortKey, sortDir]);

  // ── Helpers ──
  const hasActiveFilters = filters.category !== "all" || filters.status !== "all" ||
    filters.claimed !== "all" || filters.investmentRange !== "all" ||
    filters.royaltyRange !== "all" || filters.minTerritories !== "" || filters.featured !== "all";

  const activeFilterCount = [
    filters.category !== "all",
    filters.status !== "all",
    filters.claimed !== "all",
    filters.investmentRange !== "all",
    filters.royaltyRange !== "all",
    filters.minTerritories !== "",
    filters.featured !== "all",
  ].filter(Boolean).length;

  function clearFilters() {
    setFilters({ ...DEFAULT_FILTERS });
    setActiveViewId(null);
  }

  function applyView(view: SavedView) {
    setFilters({ ...view.filters });
    setActiveViewId(view.id);
  }

  function handleSaveView() {
    if (!newViewName.trim()) { toast.error("Enter a name for this view"); return; }
    const newView: SavedView = {
      id: Date.now().toString(),
      name: newViewName.trim(),
      filters: { ...filters },
    };
    const updated = [...savedViews, newView];
    setSavedViews(updated);
    saveSavedViews(updated);
    setActiveViewId(newView.id);
    setNewViewName("");
    setShowSaveDialog(false);
    toast.success(`Saved view "${newView.name}"`);
  }

  function deleteView(id: string) {
    const updated = savedViews.filter((v) => v.id !== id);
    setSavedViews(updated);
    saveSavedViews(updated);
    if (activeViewId === id) setActiveViewId(null);
    toast.success("View deleted");
  }

  function autoSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  // ── Brand CRUD ──
  async function handleAdd() {
    if (!newName) { toast.error("Brand name is required"); return; }
    try {
      await createBrand({
        name: newName, slug: newSlug || autoSlug(newName),
        description: newDesc || undefined, category: newCategory || undefined,
        investmentMin: newInvestMin ? Number(newInvestMin) : undefined,
        investmentMax: newInvestMax ? Number(newInvestMax) : undefined,
        franchiseFee: newFee ? Number(newFee) : undefined,
        royaltyPercent: newRoyalty ? Number(newRoyalty) : undefined,
        isActive: true,
      });
      toast.success(`Created ${newName}`);
      setNewName(""); setNewSlug(""); setNewDesc(""); setNewCategory("");
      setNewInvestMin(""); setNewInvestMax(""); setNewFee(""); setNewRoyalty("");
      setShowAddDialog(false);
    } catch (e: any) { toast.error(e.message); }
  }

  function openEditDialog(brand: any) {
    setEditingBrand(brand);
    setEditName(brand.name || ""); setEditSlug(brand.slug || "");
    setEditDesc(brand.description || ""); setEditCategory(brand.category || "");
    setEditInvestMin(brand.investmentMin ? String(brand.investmentMin) : "");
    setEditInvestMax(brand.investmentMax ? String(brand.investmentMax) : "");
    setEditFee(brand.franchiseFee ? String(brand.franchiseFee) : "");
    setEditRoyalty(brand.royaltyPercent ? String(brand.royaltyPercent) : "");
    setEditColor(brand.color || ""); setEditWebsite(brand.websiteUrl || "");
    setEditEmail(brand.contactEmail || "");
  }

  async function handleSaveEdit() {
    if (!editingBrand) return;
    try {
      await updateBrand({
        id: editingBrand._id as Id<"brands">,
        name: editName || undefined, slug: editSlug || undefined,
        description: editDesc || undefined, category: editCategory || undefined,
        investmentMin: editInvestMin ? Number(editInvestMin) : undefined,
        investmentMax: editInvestMax ? Number(editInvestMax) : undefined,
        franchiseFee: editFee ? Number(editFee) : undefined,
        royaltyPercent: editRoyalty ? Number(editRoyalty) : undefined,
        color: editColor || undefined, websiteUrl: editWebsite || undefined,
        contactEmail: editEmail || undefined,
      });
      toast.success(`Updated ${editName || editingBrand.name}`);
      setEditingBrand(null);
    } catch (e: any) { toast.error(e.message); }
  }

  async function handleConfirmDeleteBrand() {
    if (!deletingBrand) return;
    try {
      await removeBrand({ id: deletingBrand.id as any });
      toast.success(`Deleted ${deletingBrand.name}`);
    } catch (e: any) { toast.error(e.message); }
    setDeletingBrand(null);
  }

  async function handleToggleActive(id: string, isActive: boolean) {
    try {
      await updateBrand({ id: id as any, isActive: !isActive });
      toast.success(isActive ? "Brand deactivated" : "Brand reactivated");
    } catch (e: any) { toast.error(e.message); }
  }

  // ── Stats bar ──
  const totalCount = brands?.length ?? 0;
  const activeCount = brands?.filter((b: any) => b.isActive !== false).length ?? 0;
  const inactiveCount = brands?.filter((b: any) => b.isActive === false).length ?? 0;
  const claimedCount = brands?.filter((b: any) => b.isClaimed).length ?? 0;

  return (
    <div className="space-y-4">
      {/* ═══ HEADER ═══ */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Brand Management</h1>
          <p className="text-muted-foreground text-sm">Add, edit, and manage franchise brands</p>
        </div>
        <div className="flex items-center gap-2">
          {importStats && importStats.readyToImport > 0 && (
            <Button
              variant="outline"
              onClick={handleBulkImport}
              disabled={importing}
              className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
            >
              {importing ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Database className="w-4 h-4 mr-1.5" />}
              Import F500 ({importStats.readyToImport})
            </Button>
          )}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-1" /> Add Brand</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add New Brand</DialogTitle></DialogHeader>
            <AddBrandForm
              newName={newName} setNewName={setNewName}
              newSlug={newSlug} setNewSlug={setNewSlug}
              newDesc={newDesc} setNewDesc={setNewDesc}
              newCategory={newCategory} setNewCategory={setNewCategory}
              newInvestMin={newInvestMin} setNewInvestMin={setNewInvestMin}
              newInvestMax={newInvestMax} setNewInvestMax={setNewInvestMax}
              newFee={newFee} setNewFee={setNewFee}
              newRoyalty={newRoyalty} setNewRoyalty={setNewRoyalty}
              autoSlug={autoSlug} onSubmit={handleAdd}
            />
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* ═══ STATS BAR ═══ */}
      {brands && (
        <div className="flex items-center gap-4 text-xs flex-wrap">
          <StatPill label="Total" value={totalCount} color="text-white" />
          <StatPill label="Active" value={activeCount} color="text-emerald-400" />
          {inactiveCount > 0 && <StatPill label="Inactive" value={inactiveCount} color="text-orange-400" />}
          <StatPill label="Claimed" value={claimedCount} color="text-purple-400" />
          <span className="text-slate-600">|</span>
          <span className="text-slate-500">Showing {sortedBrands.length} of {totalCount}</span>
        </div>
      )}

      {/* ═══ TOOLBAR: Search + Filters + View Toggle ═══ */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <Input
            placeholder="Search brands..."
            value={filters.search}
            onChange={(e) => { setFilters((f) => ({ ...f, search: e.target.value })); setActiveViewId(null); }}
            className="h-8 pl-8 text-sm bg-white/5 border-white/10"
          />
          {filters.search && (
            <button className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setFilters((f) => ({ ...f, search: "" }))}>
              <X className="w-3 h-3 text-slate-500 hover:text-white" />
            </button>
          )}
        </div>

        {/* Quick filters */}
        <Select value={filters.category} onValueChange={(v) => { setFilters((f) => ({ ...f, category: v })); setActiveViewId(null); }}>
          <SelectTrigger className="w-[150px] h-8 text-xs bg-white/5 border-white/10">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filters.status} onValueChange={(v) => { setFilters((f) => ({ ...f, status: v })); setActiveViewId(null); }}>
          <SelectTrigger className="w-[120px] h-8 text-xs bg-white/5 border-white/10">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        {/* Advanced filters toggle */}
        <Button
          variant="outline"
          size="sm"
          className={`h-8 text-xs border-white/10 ${showFilters ? "bg-white/10 text-white" : ""}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <SlidersHorizontal className="w-3 h-3 mr-1" />
          Filters
          {activeFilterCount > 0 && (
            <Badge className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-cyan-500 text-white border-0">
              {activeFilterCount}
            </Badge>
          )}
        </Button>

        {/* Clear */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="h-8 text-xs text-slate-400 hover:text-white" onClick={clearFilters}>
            <X className="w-3 h-3 mr-1" /> Clear
          </Button>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Saved Views dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs border-white/10">
              <Bookmark className="w-3 h-3 mr-1" />
              Views
              {savedViews.length > 0 && (
                <Badge className="ml-1 h-4 px-1 text-[10px] bg-white/10 text-slate-300 border-0">
                  {savedViews.length}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {savedViews.length > 0 ? (
              savedViews.map((sv) => (
                <DropdownMenuItem key={sv.id} className="flex items-center justify-between group" onClick={() => applyView(sv)}>
                  <span className={`text-sm ${activeViewId === sv.id ? "text-cyan-400 font-medium" : ""}`}>
                    {activeViewId === sv.id && <Check className="w-3 h-3 inline mr-1" />}
                    {sv.name}
                  </span>
                  <button
                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 p-0.5"
                    onClick={(e) => { e.stopPropagation(); deleteView(sv.id); }}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </DropdownMenuItem>
              ))
            ) : (
              <div className="px-3 py-2 text-xs text-slate-500">No saved views yet</div>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowSaveDialog(true)}>
              <BookmarkPlus className="w-3 h-3 mr-2" /> Save Current View
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* View toggle */}
        <div className="flex border border-white/10 rounded-md overflow-hidden">
          <button
            onClick={() => setView("card")}
            className={`p-1.5 ${view === "card" ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"}`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView("list")}
            className={`p-1.5 ${view === "list" ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ═══ ADVANCED FILTERS PANEL ═══ */}
      {showFilters && (
        <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Advanced Filters</span>
            {hasActiveFilters && (
              <button className="text-xs text-cyan-400 hover:text-cyan-300" onClick={clearFilters}>Reset All</button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">Investment Range</Label>
              <Select value={filters.investmentRange} onValueChange={(v) => { setFilters((f) => ({ ...f, investmentRange: v })); setActiveViewId(null); }}>
                <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Investment</SelectItem>
                  {INVESTMENT_RANGES.map((r, i) => <SelectItem key={i} value={String(i)}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">Royalty %</Label>
              <Select value={filters.royaltyRange} onValueChange={(v) => { setFilters((f) => ({ ...f, royaltyRange: v })); setActiveViewId(null); }}>
                <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Royalty</SelectItem>
                  {ROYALTY_RANGES.map((r, i) => <SelectItem key={i} value={String(i)}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">Claimed</Label>
              <Select value={filters.claimed} onValueChange={(v) => { setFilters((f) => ({ ...f, claimed: v })); setActiveViewId(null); }}>
                <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="claimed">Claimed</SelectItem>
                  <SelectItem value="unclaimed">Unclaimed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">Min Territories</Label>
              <Input
                type="number"
                placeholder="0"
                value={filters.minTerritories}
                onChange={(e) => { setFilters((f) => ({ ...f, minTerritories: e.target.value })); setActiveViewId(null); }}
                className="h-8 text-xs bg-white/5 border-white/10"
              />
            </div>
          </div>

          {/* Save current filter set */}
          {hasActiveFilters && (
            <div className="flex items-center justify-end pt-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-cyan-400 hover:text-cyan-300"
                onClick={() => setShowSaveDialog(true)}
              >
                <BookmarkPlus className="w-3 h-3 mr-1" /> Save This View
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ═══ SAVED VIEW INDICATOR ═══ */}
      {activeViewId && savedViews.find((v) => v.id === activeViewId) && (
        <div className="flex items-center gap-2 text-xs">
          <Bookmark className="w-3 h-3 text-cyan-400" />
          <span className="text-cyan-400 font-medium">
            {savedViews.find((v) => v.id === activeViewId)?.name}
          </span>
          <button className="text-slate-500 hover:text-white" onClick={() => { clearFilters(); }}>
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* ═══ CONTENT: LIST VIEW ═══ */}
      {view === "list" ? (
        <BrandTable
          brands={sortedBrands}
          sortKey={sortKey}
          sortDir={sortDir}
          toggleSort={toggleSort}
          onEdit={openEditDialog}
          onDelete={(b: any) => setDeletingBrand({ id: b._id, name: b.name })}
          onToggleActive={handleToggleActive}
          onEmbedCode={setEmbedBrand}
          onStateAvailability={(b: any) => setAvailabilityBrand({ _id: b._id, name: b.name })}
        />
      ) : (
        /* ═══ CONTENT: CARD VIEW ═══ */
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedBrands.length > 0 ? (
            sortedBrands.map((brand: any) => (
              <BrandCard
                key={brand._id}
                brand={brand}
                onEdit={() => openEditDialog(brand)}
                onDelete={() => setDeletingBrand({ id: brand._id, name: brand.name })}
                onToggleActive={() => handleToggleActive(brand._id, brand.isActive !== false)}
                onStateAvailability={() => setAvailabilityBrand({ _id: brand._id, name: brand.name })}
              />
            ))
          ) : brands ? (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Building2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium mb-2">
                  {hasActiveFilters ? "No brands match your filters" : "No brands yet"}
                </p>
                <p className="text-sm mb-4">
                  {hasActiveFilters ? "Try adjusting your filters or clear them." : "Create your first brand to start mapping territories."}
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" size="sm" onClick={clearFilters}>Clear Filters</Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="col-span-full text-center py-12 text-muted-foreground">Loading...</div>
          )}
        </div>
      )}

      {/* ═══ DIALOGS ═══ */}
      <EditBrandDialog
        brand={editingBrand}
        onClose={() => setEditingBrand(null)}
        editName={editName} setEditName={setEditName}
        editSlug={editSlug} setEditSlug={setEditSlug}
        editDesc={editDesc} setEditDesc={setEditDesc}
        editCategory={editCategory} setEditCategory={setEditCategory}
        editInvestMin={editInvestMin} setEditInvestMin={setEditInvestMin}
        editInvestMax={editInvestMax} setEditInvestMax={setEditInvestMax}
        editFee={editFee} setEditFee={setEditFee}
        editRoyalty={editRoyalty} setEditRoyalty={setEditRoyalty}
        editColor={editColor} setEditColor={setEditColor}
        editWebsite={editWebsite} setEditWebsite={setEditWebsite}
        editEmail={editEmail} setEditEmail={setEditEmail}
        onSave={handleSaveEdit}
      />

      <Dialog open={!!deletingBrand} onOpenChange={(open) => { if (!open) setDeletingBrand(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Delete Brand</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-400 mt-1">
            Are you sure you want to delete <strong className="text-white">{deletingBrand?.name}</strong> and all its territories? This cannot be undone.
          </p>
          <p className="text-xs text-orange-400 mt-2">💡 Tip: Consider deactivating instead — you can reactivate later.</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" className="border-white/10" onClick={() => setDeletingBrand(null)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-500 text-white" onClick={handleConfirmDeleteBrand}>Yes, Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Save View Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><BookmarkPlus className="w-5 h-5" /> Save View</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-xs text-slate-400">View Name</Label>
              <Input
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                placeholder='e.g. "Low Royalty Franchises"'
                className="mt-1 bg-white/5 border-white/10"
                onKeyDown={(e) => e.key === "Enter" && handleSaveView()}
              />
            </div>
            {hasActiveFilters && (
              <div className="text-xs text-slate-500">
                Saving {activeFilterCount} active filter{activeFilterCount !== 1 ? "s" : ""}
                {filters.search && ` + search "${filters.search}"`}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" className="border-white/10" onClick={() => setShowSaveDialog(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSaveView}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* State Availability Editor */}
      <StateAvailabilityEditor
        brand={availabilityBrand}
        onClose={() => setAvailabilityBrand(null)}
      />

      {/* Embed Code Dialog (page-level for list view) */}
      {embedBrand && (
        <EmbedCodeDialog
          open={!!embedBrand}
          onOpenChange={(open) => { if (!open) setEmbedBrand(null); }}
          brandSlug={embedBrand.slug}
          brandName={embedBrand.name}
          brandColor={embedBrand.color}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// LIST / TABLE VIEW
// ═══════════════════════════════════════════════════════
function BrandTable({
  brands, sortKey, sortDir, toggleSort, onEdit, onDelete, onToggleActive, onEmbedCode, onStateAvailability,
}: {
  brands: any[];
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  toggleSort: (k: SortKey) => void;
  onEdit: (b: any) => void;
  onDelete: (b: any) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  onEmbedCode: (brand: { slug: string; name: string; color?: string }) => void;
  onStateAvailability: (b: any) => void;
}) {
  const SortHeader = ({ label, field, className = "" }: { label: string; field: SortKey; className?: string }) => (
    <th
      className={`px-3 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-300 transition-colors select-none whitespace-nowrap ${className}`}
      onClick={() => toggleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortKey === field ? (
          sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-30" />
        )}
      </div>
    </th>
  );

  if (brands.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No brands match your filters</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-sm" style={{ minWidth: "900px" }}>
        <thead>
          <tr className="border-b border-white/5 text-left bg-white/[0.02]">
            <SortHeader label="Brand Name" field="name" className="pl-4" />
            <SortHeader label="Category" field="category" />
            <SortHeader label="Status" field="status" />
            <SortHeader label="Investment" field="investmentMin" />
            <SortHeader label="Fee" field="investmentMin" />
            <SortHeader label="Royalty" field="royaltyPercent" />
            <SortHeader label="Territories" field="totalTerritories" />
            <SortHeader label="Available" field="availableTerritories" />
            <th className="px-3 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">Claimed</th>
            <th className="px-3 py-3 w-24 sticky right-0 bg-slate-950/90 backdrop-blur text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody>
          {brands.map((brand: any) => (
            <tr
              key={brand._id}
              className={`border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors ${brand.isActive === false ? "opacity-50" : ""}`}
            >
              {/* Name */}
              <td className="px-3 py-3 pl-4">
                <div className="flex items-center gap-2">
                  {brand.color && (
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: brand.color }} />
                  )}
                  <span className="font-medium text-white text-sm">{brand.name}</span>
                </div>
              </td>

              {/* Category */}
              <td className="px-3 py-3">
                {brand.category ? (
                  <Badge variant="secondary" className="text-[11px]">{brand.category}</Badge>
                ) : (
                  <span className="text-xs text-slate-600">—</span>
                )}
              </td>

              {/* Status */}
              <td className="px-3 py-3">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={brand.isActive !== false}
                    onCheckedChange={() => onToggleActive(brand._id, brand.isActive !== false)}
                    className="scale-75"
                  />
                  <Badge
                    variant={brand.isActive !== false ? "default" : "outline"}
                    className={`text-[10px] ${brand.isActive === false ? "text-orange-400 border-orange-400/30" : "bg-emerald-500/15 text-emerald-400 border-0"}`}
                  >
                    {brand.isActive !== false ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </td>

              {/* Investment */}
              <td className="px-3 py-3">
                <span className="text-xs text-slate-300">
                  {brand.investmentMin ? `${fmtK(brand.investmentMin)}–${fmtK(brand.investmentMax || brand.investmentMin)}` : "—"}
                </span>
              </td>

              {/* Franchise Fee */}
              <td className="px-3 py-3">
                <span className="text-xs text-slate-300">
                  {brand.franchiseFee ? fmtK(brand.franchiseFee) : "—"}
                </span>
              </td>

              {/* Royalty */}
              <td className="px-3 py-3">
                <span className="text-xs text-slate-300">
                  {brand.royaltyPercent ? `${brand.royaltyPercent}%` : "—"}
                </span>
              </td>

              {/* Territories */}
              <td className="px-3 py-3">
                <span className="text-xs font-medium text-white">{brand.totalTerritories || 0}</span>
              </td>

              {/* Available */}
              <td className="px-3 py-3">
                <span className={`text-xs font-medium ${brand.availableTerritories > 0 ? "text-emerald-400" : "text-slate-500"}`}>
                  {brand.availableTerritories || 0}
                </span>
              </td>

              {/* Claimed */}
              <td className="px-3 py-3">
                {brand.isClaimed ? (
                  <Badge className="text-[10px] bg-purple-500/15 text-purple-400 border-0">Claimed</Badge>
                ) : (
                  <span className="text-xs text-slate-600">—</span>
                )}
              </td>

              {/* Actions */}
              <td className="px-3 py-3 sticky right-0 bg-slate-950/90 backdrop-blur">
                <div className="flex items-center gap-1">
                  <Link to={`/map/${brand.slug}`} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-white" title="View Map (new tab)">
                      <Globe className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                  <Link to={`/franchise-onboarding/${brand._id}`}>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-cyan-400" title="Edit Profile">
                      <FileText className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-emerald-400" onClick={() => onStateAvailability(brand)} title="State Availability">
                    <Map className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-cyan-400" onClick={() => onEmbedCode({ slug: brand.slug, name: brand.name, color: brand.color })} title="Embed Code">
                    <Code2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-white" onClick={() => onEdit(brand)} title="Quick Edit">
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-red-400" onClick={() => onDelete(brand)} title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// CARD VIEW (single card)
// ═══════════════════════════════════════════════════════
function BrandCard({ brand, onEdit, onDelete, onToggleActive, onStateAvailability }: { brand: any; onEdit: () => void; onDelete: () => void; onToggleActive: () => void; onStateAvailability: () => void }) {
  const [embedOpen, setEmbedOpen] = useState(false);
  return (
    <Card className={`relative ${brand.isActive === false ? "opacity-60" : ""}`}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-2">
            {brand.color && <div className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: brand.color }} />}
            <div>
              <h3 className="text-lg font-bold">{brand.name}</h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {brand.category && <Badge variant="secondary" className="text-xs">{brand.category}</Badge>}
                <Badge
                  variant={brand.isActive !== false ? "default" : "outline"}
                  className={`text-xs ${brand.isActive === false ? "text-orange-400 border-orange-400/30" : ""}`}
                >
                  {brand.isActive !== false ? "Active" : "Inactive"}
                </Badge>
                {brand.isClaimed && <Badge className="text-xs bg-purple-500/20 text-purple-400 border-0">Claimed</Badge>}
              </div>
            </div>
          </div>
          <Switch checked={brand.isActive !== false} onCheckedChange={onToggleActive} />
        </div>
        {brand.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{brand.description}</p>}
        <div className="grid grid-cols-2 gap-2 text-sm mb-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-3 h-3" /> {brand.totalTerritories} territories
          </div>
          {brand.investmentMin && (
            <div className="text-muted-foreground">{fmtK(brand.investmentMin)}–{fmtK(brand.investmentMax || brand.investmentMin)}</div>
          )}
        </div>
        <div className="flex gap-2">
          <Link to={`/map/${brand.slug}`} target="_blank" rel="noopener noreferrer" className="flex-1">
            <Button size="sm" variant="outline" className="w-full"><Globe className="w-3 h-3 mr-1" /> Map</Button>
          </Link>
          <Link to={`/franchise-onboarding/${brand._id}`}>
            <Button size="sm" variant="outline"><FileText className="w-3 h-3 mr-1" /> Profile</Button>
          </Link>
          <Button size="sm" variant="outline" onClick={onStateAvailability} title="State Availability"><Map className="w-3 h-3" /></Button>
          <Button size="sm" variant="outline" onClick={() => setEmbedOpen(true)} title="Embed Code"><Code2 className="w-3 h-3" /></Button>
          <Button size="sm" variant="outline" onClick={onEdit}><Edit className="w-3 h-3" /></Button>
          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={onDelete}><Trash2 className="w-3 h-3" /></Button>
        </div>
        <EmbedCodeDialog
          open={embedOpen}
          onOpenChange={setEmbedOpen}
          brandSlug={brand.slug}
          brandName={brand.name}
          brandColor={brand.color}
        />
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════
// STAT PILL
// ═══════════════════════════════════════════════════════
function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`font-bold text-sm ${color}`}>{value}</span>
      <span className="text-slate-500">{label}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// ADD BRAND FORM
// ═══════════════════════════════════════════════════════
function AddBrandForm({
  newName, setNewName, newSlug, setNewSlug, newDesc, setNewDesc,
  newCategory, setNewCategory, newInvestMin, setNewInvestMin,
  newInvestMax, setNewInvestMax, newFee, setNewFee, newRoyalty, setNewRoyalty,
  autoSlug, onSubmit,
}: any) {
  return (
    <div className="space-y-4 mt-4">
      <div>
        <label className="text-sm font-medium mb-1 block">Brand Name *</label>
        <Input value={newName} onChange={(e: any) => { setNewName(e.target.value); if (!newSlug) setNewSlug(autoSlug(e.target.value)); }} placeholder="e.g. Amazing Franchise" />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Slug</label>
        <Input value={newSlug} onChange={(e: any) => setNewSlug(e.target.value)} placeholder="auto-generated" />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Category</label>
        <Select value={newCategory} onValueChange={setNewCategory}>
          <SelectTrigger><SelectValue placeholder="Select category..." /></SelectTrigger>
          <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Description</label>
        <Textarea value={newDesc} onChange={(e: any) => setNewDesc(e.target.value)} placeholder="Brief description..." rows={3} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium mb-1 block">Min Investment ($)</label>
          <Input type="number" value={newInvestMin} onChange={(e: any) => setNewInvestMin(e.target.value)} placeholder="250000" />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Max Investment ($)</label>
          <Input type="number" value={newInvestMax} onChange={(e: any) => setNewInvestMax(e.target.value)} placeholder="500000" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium mb-1 block">Franchise Fee ($)</label>
          <Input type="number" value={newFee} onChange={(e: any) => setNewFee(e.target.value)} placeholder="35000" />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Royalty (%)</label>
          <Input type="number" value={newRoyalty} onChange={(e: any) => setNewRoyalty(e.target.value)} placeholder="6" />
        </div>
      </div>
      <Button onClick={onSubmit} className="w-full"><Plus className="w-4 h-4 mr-1" /> Create Brand</Button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// EDIT BRAND DIALOG
// ═══════════════════════════════════════════════════════
function EditBrandDialog({
  brand, onClose,
  editName, setEditName, editSlug, setEditSlug,
  editDesc, setEditDesc, editCategory, setEditCategory,
  editInvestMin, setEditInvestMin, editInvestMax, setEditInvestMax,
  editFee, setEditFee, editRoyalty, setEditRoyalty,
  editColor, setEditColor, editWebsite, setEditWebsite,
  editEmail, setEditEmail, onSave,
}: any) {
  return (
    <Dialog open={!!brand} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Edit className="w-5 h-5" /> Edit Brand</DialogTitle>
        </DialogHeader>
        {brand && (
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Brand Name</label>
              <Input value={editName} onChange={(e: any) => setEditName(e.target.value)} placeholder="Brand name" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">URL Slug</label>
              <Input value={editSlug} onChange={(e: any) => setEditSlug(e.target.value)} placeholder="brand-slug" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Category</label>
              <Select value={editCategory} onValueChange={setEditCategory}>
                <SelectTrigger><SelectValue placeholder="Select category..." /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c: string) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Textarea value={editDesc} onChange={(e: any) => setEditDesc(e.target.value)} placeholder="Brief description..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 flex items-center gap-1"><DollarSign className="w-3 h-3" /> Min Investment</label>
                <Input type="number" value={editInvestMin} onChange={(e: any) => setEditInvestMin(e.target.value)} placeholder="250000" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 flex items-center gap-1"><DollarSign className="w-3 h-3" /> Max Investment</label>
                <Input type="number" value={editInvestMax} onChange={(e: any) => setEditInvestMax(e.target.value)} placeholder="500000" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 flex items-center gap-1"><DollarSign className="w-3 h-3" /> Franchise Fee</label>
                <Input type="number" value={editFee} onChange={(e: any) => setEditFee(e.target.value)} placeholder="35000" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 flex items-center gap-1"><Percent className="w-3 h-3" /> Royalty %</label>
                <Input type="number" value={editRoyalty} onChange={(e: any) => setEditRoyalty(e.target.value)} placeholder="6" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 flex items-center gap-1"><Palette className="w-3 h-3" /> Brand Color</label>
              <div className="flex gap-2">
                <Input value={editColor} onChange={(e: any) => setEditColor(e.target.value)} placeholder="#06b6d4" className="flex-1" />
                {editColor && <div className="w-10 h-10 rounded-md border border-white/20 flex-shrink-0" style={{ backgroundColor: editColor }} />}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 flex items-center gap-1"><LinkIcon className="w-3 h-3" /> Website URL</label>
              <Input value={editWebsite} onChange={(e: any) => setEditWebsite(e.target.value)} placeholder="https://example.com" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 flex items-center gap-1"><Mail className="w-3 h-3" /> Contact Email</label>
              <Input type="email" value={editEmail} onChange={(e: any) => setEditEmail(e.target.value)} placeholder="info@brand.com" />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <Button variant="outline" className="border-white/10" onClick={onClose}>Cancel</Button>
              <Button onClick={onSave}><Check className="w-4 h-4 mr-1" /> Save Changes</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
