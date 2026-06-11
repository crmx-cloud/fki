import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Search,
  Plus,
  LayoutGrid,
  List,
  Settings2,
  Download,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  MoreHorizontal,
  Trash2,
  Edit,
  Sparkles,
  Users,
  TrendingUp,
  Target,
  Trophy,
  ArrowRight,
  ArrowLeft,
  X,
  Check,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  GripVertical,
  Tag,
  Filter,
} from "lucide-react";
import {
  BulkActionBar,
  BulkExportDialog,
  BulkDeleteDialog,
  BulkAddTagsDialog,
  BulkRemoveTagsDialog,
  MergeContactsDialog,
  BulkUpdateStageDialog,
  BulkUpdateBrandDialog,
  BulkUpdateTerritoriesDialog,
} from "@/components/crm/BulkActions";
import { RecentlyDeletedSheet } from "@/components/crm/RecentlyDeleted";
import { LeadProfilePanel } from "@/components/crm/LeadProfilePanel";
import AutoAssignmentPanel from "@/components/crm/AutoAssignmentPanel";

// ── Stage Config ─────────────────────────────────────
const STAGES = [
  { id: "new_lead" as const, label: "New Lead", shortLabel: "New", color: "#06b6d4", bgClass: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30" },
  { id: "intro_call" as const, label: "Intro Call", shortLabel: "Intro", color: "#8b5cf6", bgClass: "bg-violet-500/15 text-violet-400 border-violet-500/30" },
  { id: "qualified" as const, label: "Qualified", shortLabel: "Qual", color: "#3b82f6", bgClass: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  { id: "discovery_day" as const, label: "Discovery Day", shortLabel: "DD", color: "#f59e0b", bgClass: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  { id: "pending_contract" as const, label: "Pending Contract", shortLabel: "Pending", color: "#f97316", bgClass: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  { id: "awarded" as const, label: "Awarded", shortLabel: "Won", color: "#22c55e", bgClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  { id: "lost" as const, label: "Lost", shortLabel: "Lost", color: "#ef4444", bgClass: "bg-red-500/15 text-red-400 border-red-500/30" },
] as const;

type StageId = typeof STAGES[number]["id"];
const getStage = (id: string) => STAGES.find((s) => s.id === id) || STAGES[0];
const getStageIndex = (id: string) => STAGES.findIndex((s) => s.id === id);

const CAPITAL_OPTIONS = [
  "Under $50K",
  "$50K–$100K",
  "$100K–$250K",
  "$250K–$500K",
  "$500K–$1M",
  "$1M+",
];

// ── Main CRM Page ────────────────────────────────────
export function CRMPage() {
  const myBrands = useQuery(api.crm.myBrands);
  const myProfile = useQuery(api.users.getMyProfile);
  const isAdmin = myProfile?.isAdmin === true;
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [view, setView] = useState<"board" | "list">("board");
  const [search, setSearch] = useState("");
  const [showAddLead, setShowAddLead] = useState(false);
  const [editingLead, setEditingLead] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [tagFilterMode, setTagFilterMode] = useState<"any" | "all" | "only">("any");
  const [showRecentlyDeleted, setShowRecentlyDeleted] = useState(false);
  const [showBulkExport, setShowBulkExport] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [showBulkAddTags, setShowBulkAddTags] = useState(false);
  const [showBulkRemoveTags, setShowBulkRemoveTags] = useState(false);
  const [showMerge, setShowMerge] = useState(false);
  const [showBulkStage, setShowBulkStage] = useState(false);
  const [showBulkBrand, setShowBulkBrand] = useState(false);
  const [showBulkTerritories, setShowBulkTerritories] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const isSuperAdmin = myProfile?.isSuperAdmin === true;
  const isBrandAdminOrFranchisor = myProfile?.role === "brand_admin" || myProfile?.role === "franchisor";

  const allTags = useQuery(api.tags.list);
  const allProfiles = useQuery(api.users.listProfiles);
  const profileMap = useMemo(() => {
    const m: Record<string, { name: string; role: string }> = {};
    for (const p of allProfiles || []) {
      m[p.userId] = { name: `${p.firstName || ""} ${p.lastName || ""}`.trim() || p.email || "?", role: p.role };
    }
    return m;
  }, [allProfiles]);

  const isAllBrands = selectedBrandId === "__all__";
  // Default: admin sees "all", non-admin sees first brand
  const effectiveSelection = selectedBrandId || (isAdmin ? "__all__" : myBrands?.[0]?._id || null);
  const brandId = effectiveSelection === "__all__" ? null : (effectiveSelection as Id<"brands"> | null);

  const brandLeads = useQuery(api.crm.listLeads, brandId ? { brandId } : "skip");
  const allLeads = useQuery(api.crm.listAllLeads, effectiveSelection === "__all__" ? {} : "skip");
  const leads = effectiveSelection === "__all__" ? allLeads : brandLeads;

  const brandStats = useQuery(api.crm.getStats, brandId ? { brandId } : "skip");
  const allStats = useQuery(api.crm.getStatsAll, effectiveSelection === "__all__" ? {} : "skip");
  const stats = effectiveSelection === "__all__" ? allStats : brandStats;

  const selectedBrand = myBrands?.find((b) => b._id === brandId);

  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    let result = [...leads];
    if (stageFilter !== "all") {
      result = result.filter((l) => l.stage === stageFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((l) =>
        `${l.firstName} ${l.lastName || ""} ${l.email || ""} ${l.mainTerritory || ""}`
          .toLowerCase()
          .includes(q)
      );
    }
    // Tag filtering
    if (tagFilter.length > 0) {
      result = result.filter((l) => {
        const leadTags = (l as any).tags || [];
        if (tagFilterMode === "only") return tagFilter.length === 1 && leadTags.includes(tagFilter[0]);
        if (tagFilterMode === "all") return tagFilter.every((t) => leadTags.includes(t));
        return tagFilter.some((t) => leadTags.includes(t)); // "any"
      });
    }
    return result;
  }, [leads, stageFilter, search, tagFilter, tagFilterMode]);

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [stageFilter, search, tagFilter, tagFilterMode, selectedBrandId]);

  // Clear selection when leads/filters change
  useEffect(() => { setSelectedIds(new Set()); }, [filteredLeads.length, stageFilter, search, selectedBrandId]);

  // Pagination helpers
  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLeads.slice(start, start + pageSize);
  }, [filteredLeads, currentPage, pageSize]);

  // Selection helpers
  const selectedLeads = useMemo(() => {
    return filteredLeads.filter((l) => selectedIds.has(l._id));
  }, [filteredLeads, selectedIds]);

  const selectedIdArray = useMemo(
    () => Array.from(selectedIds) as Id<"crmLeads">[],
    [selectedIds]
  );

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);
  const selectAllFiltered = useCallback(() => {
    setSelectedIds(new Set(filteredLeads.map((l) => l._id)));
  }, [filteredLeads]);

  if (!myBrands) return <CRMSkeleton />;
  if (myBrands.length === 0) return <CRMEmpty />;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* ── Header ──────────────────────────────── */}
      <div className="px-4 lg:px-6 py-4 border-b border-white/5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">Leads</h1>
            {(myBrands.length > 1 || isAdmin) && (
              <Select value={effectiveSelection || ""} onValueChange={(v) => setSelectedBrandId(v)}>
                <SelectTrigger className="w-[200px] h-8 text-sm bg-white/5 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isAdmin && <SelectItem value="__all__">All Brands</SelectItem>}
                  {myBrands.map((b) => (
                    <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {myBrands.length === 1 && !isAdmin && selectedBrand && (
              <span className="text-sm text-slate-400">{selectedBrand.name}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isSuperAdmin && (
              <Button size="sm" variant="outline" className="h-8 border-white/10 text-slate-300 hover:text-white hover:bg-white/5" onClick={() => setShowRecentlyDeleted(true)}>
                <Trash2 className="w-3.5 h-3.5 mr-1.5" /><span className="hidden sm:inline">Deleted</span>
              </Button>
            )}
            {brandId && (
              <Button size="sm" variant="outline" className="h-8 border-white/10 text-slate-300 hover:text-white hover:bg-white/5" onClick={() => setShowSettings(true)}>
                <Settings2 className="w-3.5 h-3.5 mr-1.5" /><span className="hidden sm:inline">Settings</span>
              </Button>
            )}
            {isSuperAdmin && (effectiveSelection === "__all__" ? (
              <ExportAllButton brands={myBrands} />
            ) : brandId ? (
              <ExportButton brandId={brandId} brandName={selectedBrand?.name || "leads"} />
            ) : null)}
            <Button size="sm" className="h-8 bg-cyan-600 hover:bg-cyan-500 text-white" onClick={() => { setEditingLead(null); setShowAddLead(true); }}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />Add Lead
            </Button>
          </div>
        </div>

        {stats && (
          <div className="flex gap-4 mt-3 text-sm">
            <StatPill icon={Users} label="Total" value={stats.total} />
            <StatPill icon={TrendingUp} label="Active" value={stats.active} color="text-cyan-400" />
            <StatPill icon={Trophy} label="Awarded" value={stats.awarded} color="text-emerald-400" />
            <StatPill icon={Target} label="Last 7d" value={stats.last7} color="text-violet-400" />
          </div>
        )}

        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <div className="relative flex-1 max-w-xs min-w-[160px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <Input placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 pl-8 text-sm bg-white/5 border-white/10" />
          </div>
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-[140px] h-8 text-sm bg-white/5 border-white/10">
              <SelectValue placeholder="All Stages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {STAGES.map((s) => (<SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>))}
            </SelectContent>
          </Select>
          {/* Tag Filter */}
          <TagFilterDropdown
            allTags={allTags || []}
            selectedTags={tagFilter}
            mode={tagFilterMode}
            onTagsChange={setTagFilter}
            onModeChange={setTagFilterMode}
          />
          {/* Page Size */}
          <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
            <SelectTrigger className="w-[80px] h-8 text-sm bg-white/5 border-white/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[20, 50, 100, 200, 500].map((n) => (
                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex border border-white/10 rounded-md overflow-hidden ml-auto">
            <button onClick={() => setView("board")} className={`p-1.5 ${view === "board" ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"}`}>
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button onClick={() => setView("list")} className={`p-1.5 ${view === "list" ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"}`}>
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* CRMX banner removed */}

      <div className="flex-1 overflow-auto">
        {!leads ? (
          <div className="p-8 text-center text-slate-500">Loading leads...</div>
        ) : leads.length === 0 ? (
          <EmptyLeads onAdd={() => setShowAddLead(true)} />
        ) : view === "board" ? (
          <KanbanBoard leads={filteredLeads} onEditLead={(lead: any) => setSelectedLeadId(lead._id)} brandId={brandId!} showBrandName={effectiveSelection === "__all__"} brands={myBrands} />
        ) : (
          <LeadTable
            leads={paginatedLeads}
            onEditLead={(lead: any) => setSelectedLeadId(lead._id)}
            brandId={brandId!}
            showBrandName={effectiveSelection === "__all__"}
            brands={myBrands}
            selectedIds={selectedIds}
            onToggleSelect={(id) => {
              setSelectedIds((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              });
            }}
            onToggleAll={() => {
              const pageIds = paginatedLeads.map((l) => l._id);
              const allSelected = pageIds.every((id) => selectedIds.has(id));
              if (allSelected) {
                setSelectedIds((prev) => {
                  const next = new Set(prev);
                  pageIds.forEach((id) => next.delete(id));
                  return next;
                });
              } else {
                setSelectedIds((prev) => new Set([...prev, ...pageIds]));
              }
            }}
            allOnPageSelected={paginatedLeads.length > 0 && paginatedLeads.every((l) => selectedIds.has(l._id))}
            isBrandAdminOrFranchisor={isBrandAdminOrFranchisor}
            isAdmin={isAdmin}
            totalFiltered={filteredLeads.length}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            profileMap={profileMap}
          />
        )}
      </div>

      {/* Bulk Action Bar */}
      {view === "list" && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          totalCount={filteredLeads.length}
          onSelectAll={selectAllFiltered}
          onClearSelection={clearSelection}
          onExport={() => setShowBulkExport(true)}
          onDelete={() => setShowBulkDelete(true)}
          onAddTags={() => setShowBulkAddTags(true)}
          onRemoveTags={() => setShowBulkRemoveTags(true)}
          onMerge={() => setShowMerge(true)}
          onUpdateStage={() => setShowBulkStage(true)}
          onUpdateBrand={() => setShowBulkBrand(true)}
          onUpdateTerritories={() => setShowBulkTerritories(true)}
          onSendNotification={() => toast.info("Use the Notifications admin page to send notifications")}
          isSuperAdmin={isSuperAdmin}
          isAdmin={isAdmin}
        />
      )}

      {/* Bulk Dialogs */}
      <BulkExportDialog open={showBulkExport} onClose={() => setShowBulkExport(false)} selectedLeads={selectedLeads} brands={myBrands} />
      <BulkDeleteDialog open={showBulkDelete} onClose={() => setShowBulkDelete(false)} selectedIds={selectedIdArray} onComplete={clearSelection} />
      <BulkAddTagsDialog open={showBulkAddTags} onClose={() => setShowBulkAddTags(false)} selectedIds={selectedIdArray} onComplete={clearSelection} />
      <BulkRemoveTagsDialog open={showBulkRemoveTags} onClose={() => setShowBulkRemoveTags(false)} selectedIds={selectedIdArray} selectedLeads={selectedLeads} onComplete={clearSelection} />
      <MergeContactsDialog open={showMerge} onClose={() => setShowMerge(false)} leads={selectedLeads} onComplete={clearSelection} />
      <BulkUpdateStageDialog open={showBulkStage} onClose={() => setShowBulkStage(false)} selectedIds={selectedIdArray} onComplete={clearSelection} />
      <BulkUpdateBrandDialog open={showBulkBrand} onClose={() => setShowBulkBrand(false)} selectedIds={selectedIdArray} brands={myBrands} onComplete={clearSelection} />
      <BulkUpdateTerritoriesDialog open={showBulkTerritories} onClose={() => setShowBulkTerritories(false)} selectedIds={selectedIdArray} onComplete={clearSelection} />
      <RecentlyDeletedSheet open={showRecentlyDeleted} onClose={() => setShowRecentlyDeleted(false)} />
      <LeadProfilePanel
        leadId={selectedLeadId as Id<"crmLeads"> | null}
        open={!!selectedLeadId}
        onClose={() => setSelectedLeadId(null)}
        isAdmin={isAdmin}
        isSuperAdmin={isSuperAdmin}
        isBrandLimited={isBrandAdminOrFranchisor}
        brands={myBrands}
      />

      {/* Add Lead — works in All Brands mode (brand selector inside dialog) */}
      <LeadFormDialog open={showAddLead && !editingLead} onClose={() => setShowAddLead(false)} brandId={brandId} lead={null} brands={myBrands} />
      {brandId && (
        <NotificationSettingsDialog open={showSettings} onClose={() => setShowSettings(false)} brandId={brandId} />
      )}

      {/* Edit Lead — works in All Brands mode too (uses lead's own brandId) */}
      {editingLead && (
        <LeadFormDialog
          open={!!editingLead}
          onClose={() => setEditingLead(null)}
          brandId={editingLead.brandId as Id<"brands">}
          lead={editingLead}
        />
      )}
    </div>
  );
}

// ── Stat Pill ──────────────────────────────────────────
function StatPill({ icon: Icon, label, value, color = "text-slate-300" }: { icon: any; label: string; value: number; color?: string }) {
  return (
    <div className="flex items-center gap-1.5 text-slate-500">
      <Icon className={`w-3.5 h-3.5 ${color}`} />
      <span>{label}</span>
      <span className={`font-medium ${color}`}>{value}</span>
    </div>
  );
}

// ── CRMX Upsell Banner ────────────────────────────────
function CRMXBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="mx-4 lg:mx-6 mt-3 px-4 py-2.5 rounded-lg bg-gradient-to-r from-cyan-950/50 to-violet-950/50 border border-cyan-500/20 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-cyan-400" />
        </div>
        <p className="text-sm text-slate-300 truncate">
          <span className="font-medium text-white">Want automated follow-ups & a booking calendar?</span>
          {" "}Try CRMX free for 60 days.
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <a href="https://gocrmx.com/mapki" target="_blank" rel="noopener noreferrer">
          <Button size="sm" variant="ghost" className="h-7 text-xs text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10">
            Learn More <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </a>
        <button onClick={() => setDismissed(true)} className="text-slate-600 hover:text-slate-400">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Kanban Board ──────────────────────────────────────
function KanbanBoard({ leads, onEditLead, brandId, showBrandName = false, brands = [] }: { leads: any[]; onEditLead: (l: any) => void; brandId: Id<"brands">; showBrandName?: boolean; brands?: any[] }) {
  const brandMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const b of brands) m[b._id] = b.name;
    return m;
  }, [brands]);
  const updateLead = useMutation(api.crm.updateLead);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<Record<string, "asc" | "desc">>({});

  const moveStage = useCallback(async (leadId: Id<"crmLeads">, stage: StageId) => {
    try {
      await updateLead({ leadId, stage });
      toast.success(`Moved to ${getStage(stage).label}`);
    } catch { toast.error("Failed to update stage"); }
  }, [updateLead]);

  const moveLeft = useCallback((lead: any) => {
    const idx = getStageIndex(lead.stage);
    if (idx > 0) moveStage(lead._id, STAGES[idx - 1].id);
  }, [moveStage]);

  const moveRight = useCallback((lead: any) => {
    const idx = getStageIndex(lead.stage);
    if (idx < STAGES.length - 1) moveStage(lead._id, STAGES[idx + 1].id);
  }, [moveStage]);

  // Drag handlers
  const onDragStart = (e: React.DragEvent, leadId: string) => {
    setDragId(leadId);
    e.dataTransfer.effectAllowed = "move";
    // Make the card look lifted
    const el = e.currentTarget as HTMLElement;
    setTimeout(() => el.style.opacity = "0.4", 0);
  };
  const onDragEnd = (e: React.DragEvent) => {
    setDragId(null);
    setDragOverStage(null);
    (e.currentTarget as HTMLElement).style.opacity = "1";
  };
  const onDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStage(stageId);
  };
  const onDrop = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    setDragOverStage(null);
    if (dragId) {
      moveStage(dragId as Id<"crmLeads">, stageId as StageId);
    }
  };

  const toggleSort = (stageId: string) => {
    setSortDir((prev) => ({
      ...prev,
      [stageId]: prev[stageId] === "asc" ? "desc" : "asc",
    }));
  };

  const sortLeads = (stageLeads: any[], stageId: string) => {
    const dir = sortDir[stageId];
    if (!dir) return stageLeads;
    return [...stageLeads].sort((a, b) => {
      const nameA = `${a.firstName} ${a.lastName || ""}`.toLowerCase();
      const nameB = `${b.firstName} ${b.lastName || ""}`.toLowerCase();
      return dir === "asc" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });
  };

  const pipelineStages = STAGES.filter((s) => s.id !== "awarded" && s.id !== "lost");
  const closedStages = STAGES.filter((s) => s.id === "awarded" || s.id === "lost");

  const renderColumn = (stage: typeof STAGES[number]) => {
    const stageLeads = sortLeads(leads.filter((l) => l.stage === stage.id), stage.id);
    const dir = sortDir[stage.id];
    const isOver = dragOverStage === stage.id;

    return (
      <div key={stage.id} className="flex-shrink-0 w-[260px]">
        <button
          onClick={() => toggleSort(stage.id)}
          className="flex items-center gap-2 mb-3 px-1 w-full text-left group/col cursor-pointer"
        >
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: stage.color }} />
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            {stage.label}
          </span>
          <span className="text-xs text-slate-600">{stageLeads.length}</span>
          <div className="ml-auto opacity-0 group-hover/col:opacity-100 transition-opacity">
            {dir === "asc" ? <ChevronUp className="w-3 h-3 text-slate-500" /> :
             dir === "desc" ? <ChevronDown className="w-3 h-3 text-slate-500" /> :
             <ChevronDown className="w-3 h-3 text-slate-600" />}
          </div>
        </button>
        <div
          className={`space-y-2 min-h-[100px] rounded-lg p-1 transition-colors ${isOver ? "bg-white/[0.04] ring-1 ring-cyan-500/30" : ""}`}
          onDragOver={(e) => onDragOver(e, stage.id)}
          onDragLeave={() => setDragOverStage(null)}
          onDrop={(e) => onDrop(e, stage.id)}
        >
          {stageLeads.map((lead) => (
            <LeadCard
              key={lead._id}
              lead={lead}
              stage={stage}
              onEdit={() => onEditLead(lead)}
              onMoveLeft={() => moveLeft(lead)}
              onMoveRight={() => moveRight(lead)}
              canMoveLeft={getStageIndex(lead.stage) > 0}
              canMoveRight={getStageIndex(lead.stage) < STAGES.length - 1}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              isDragging={dragId === lead._id}
              brandName={showBrandName ? brandMap[lead.brandId] : undefined}
            />
          ))}
          {stageLeads.length === 0 && (
            <div className="rounded-lg border border-dashed border-white/5 p-4 text-center text-xs text-slate-600">
              {isOver ? "Drop here" : "No leads"}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 lg:p-6">
      <div className="flex gap-3 overflow-x-auto pb-4 min-w-0">
        {pipelineStages.map(renderColumn)}
      </div>
      {closedStages.some((s) => leads.some((l) => l.stage === s.id)) && (
        <div className="mt-6 pt-4 border-t border-white/5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Closed</p>
          <div className="flex gap-3">
            {closedStages.map((stage) => {
              if (!leads.some((l) => l.stage === stage.id)) return null;
              return renderColumn(stage);
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Lead Card ────────────────────────────────────────
function LeadCard({ lead, stage, onEdit, onMoveLeft, onMoveRight, canMoveLeft, canMoveRight, onDragStart, onDragEnd, isDragging, brandName }: {
  lead: any; stage: typeof STAGES[number]; onEdit: () => void;
  onMoveLeft: () => void; onMoveRight: () => void;
  canMoveLeft: boolean; canMoveRight: boolean;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: (e: React.DragEvent) => void;
  isDragging: boolean;
  brandName?: string;
}) {
  const deleteLead = useMutation(api.crm.deleteLead);
  const daysAgo = Math.floor((Date.now() - lead.createdAt) / 86400000);
  const leftStage = canMoveLeft ? STAGES[getStageIndex(lead.stage) - 1] : null;
  const rightStage = canMoveRight ? STAGES[getStageIndex(lead.stage) + 1] : null;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, lead._id)}
      onDragEnd={onDragEnd}
      className={`rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] p-3 cursor-grab active:cursor-grabbing transition-all group ${isDragging ? "opacity-40 scale-95" : ""}`}
      onClick={onEdit}
    >
      {/* Drag handle hint */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <GripVertical className="w-3 h-3 text-slate-700 mt-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {lead.firstName} {lead.lastName || ""}
            </p>
            {lead.mainTerritory && (
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3 flex-shrink-0" />{lead.mainTerritory}
              </p>
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <button className="p-1 opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-white">
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}><Edit className="w-3.5 h-3.5 mr-2" /> Edit Lead</DropdownMenuItem>
            {lead.phone && <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.open(`tel:${lead.phone}`); }}><Phone className="w-3.5 h-3.5 mr-2" /> Call</DropdownMenuItem>}
            {lead.email && <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.open(`mailto:${lead.email}`); }}><Mail className="w-3.5 h-3.5 mr-2" /> Email</DropdownMenuItem>}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-400 focus:text-red-400" onClick={async (e) => { e.stopPropagation(); if (confirm("Delete this lead?")) { await deleteLead({ leadId: lead._id }); toast.success("Lead deleted"); } }}>
              <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tags */}
      <div className="flex items-center gap-2 mt-2.5 flex-wrap">
        {brandName && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 font-medium truncate max-w-[100px]">
            {brandName}
          </span>
        )}
        {lead.liquidCapital && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400 flex items-center gap-1">
            <DollarSign className="w-2.5 h-2.5" />{lead.liquidCapital}
          </span>
        )}
        {lead.source === "mapki" && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400">Franchise KI</span>
        )}
        <span className="text-[10px] text-slate-600 ml-auto">
          {daysAgo === 0 ? "Today" : `${daysAgo}d`}
        </span>
      </div>

      {/* Quick move arrows — always visible for touch friendliness */}
      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-white/[0.03]">
        <button
          onClick={(e) => { e.stopPropagation(); onMoveLeft(); }}
          disabled={!canMoveLeft}
          className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-colors ${canMoveLeft ? "text-slate-400 hover:text-white hover:bg-white/10 active:bg-white/15" : "text-slate-700 cursor-not-allowed"}`}
          title={leftStage ? `Move to ${leftStage.label}` : ""}
        >
          <ArrowLeft className="w-3 h-3" />
          <span className="hidden sm:inline">{leftStage?.shortLabel || ""}</span>
        </button>
        <div className="flex gap-1.5">
          {lead.phone && (
            <a href={`tel:${lead.phone}`} onClick={(e) => e.stopPropagation()} className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
              <Phone className="w-3 h-3" />
            </a>
          )}
          {lead.email && (
            <a href={`mailto:${lead.email}`} onClick={(e) => e.stopPropagation()} className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
              <Mail className="w-3 h-3" />
            </a>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onMoveRight(); }}
          disabled={!canMoveRight}
          className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-colors ${canMoveRight ? "text-slate-400 hover:text-white hover:bg-white/10 active:bg-white/15" : "text-slate-700 cursor-not-allowed"}`}
          title={rightStage ? `Move to ${rightStage.label}` : ""}
        >
          <span className="hidden sm:inline">{rightStage?.shortLabel || ""}</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ── List / Table View with Inline Edit ───────────────
type SortKey = "firstName" | "lastName" | "stage" | "mainTerritory" | "secondTerritory" | "thirdTerritory" | "createdAt";

function LeadTable({ leads, onEditLead, brandId, showBrandName = false, brands = [], selectedIds, onToggleSelect, onToggleAll, allOnPageSelected, isBrandAdminOrFranchisor, isAdmin, totalFiltered, currentPage, totalPages, onPageChange, profileMap = {} }: { leads: any[]; onEditLead: (l: any) => void; brandId: Id<"brands">; showBrandName?: boolean; brands?: any[]; selectedIds: Set<string>; onToggleSelect: (id: string) => void; onToggleAll: () => void; allOnPageSelected: boolean; isBrandAdminOrFranchisor: boolean; isAdmin: boolean; totalFiltered: number; currentPage: number; totalPages: number; onPageChange: (p: number) => void; profileMap?: Record<string, { name: string; role: string }> }) {
  const brandMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const b of brands) m[b._id] = b.name;
    return m;
  }, [brands]);
  const updateLead = useMutation(api.crm.updateLead);
  const softDelete = useMutation(api.crm.softDelete);
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    return [...leads].sort((a, b) => {
      let va = a[sortKey] ?? "";
      let vb = b[sortKey] ?? "";
      if (sortKey === "createdAt") {
        va = a.createdAt || 0;
        vb = b.createdAt || 0;
        return sortDir === "asc" ? va - vb : vb - va;
      }
      if (sortKey === "stage") {
        va = getStageIndex(a.stage);
        vb = getStageIndex(b.stage);
        return sortDir === "asc" ? va - vb : vb - va;
      }
      const sa = String(va).toLowerCase();
      const sb = String(vb).toLowerCase();
      return sortDir === "asc" ? sa.localeCompare(sb) : sb.localeCompare(sa);
    });
  }, [leads, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const SortHeader = ({ label, field, className = "" }: { label: string; field: SortKey; className?: string }) => (
    <th
      className={`px-3 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-300 transition-colors select-none whitespace-nowrap ${className}`}
      onClick={() => toggleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortKey === field && (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
      </div>
    </th>
  );

  const Cell = ({ value, className = "" }: { value: string; className?: string }) => (
    <td className={`px-3 py-3 ${className}`}>
      <span className="text-xs text-slate-400 truncate block max-w-[150px]">{value || "—"}</span>
    </td>
  );

  // For brand_admin/franchisor: show "FirstName L." format
  const formatName = (lead: any) => {
    if (isBrandAdminOrFranchisor) {
      const initial = lead.lastName ? ` ${lead.lastName.charAt(0)}.` : "";
      return `${lead.firstName}${initial}`;
    }
    return `${lead.firstName} ${lead.lastName || ""}`.trim();
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: "1000px" }}>
          <thead>
            <tr className="border-b border-white/5 text-left">
              <th className="px-3 py-3 pl-4 lg:pl-6 w-10">
                <Checkbox checked={allOnPageSelected && leads.length > 0} onCheckedChange={onToggleAll} />
              </th>
              <SortHeader label="Name" field="firstName" />
              {!isBrandAdminOrFranchisor && <th className="px-3 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">Phone</th>}
              {!isBrandAdminOrFranchisor && <th className="px-3 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">Email</th>}
              <SortHeader label="Stage" field="stage" />
              {showBrandName && <th className="px-3 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">Brand</th>}
              <SortHeader label="Territory" field="mainTerritory" />
              <th className="px-3 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">Tags</th>
              {!isBrandAdminOrFranchisor && <th className="px-3 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">Rep</th>}
              {!isBrandAdminOrFranchisor && <th className="px-3 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">Setter</th>}
              <SortHeader label="Added" field="createdAt" />
              <th className="px-3 py-3 w-10 sticky right-0 bg-slate-950/90 backdrop-blur"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((lead) => {
              const stage = getStage(lead.stage);
              const daysAgo = Math.floor((Date.now() - lead.createdAt) / 86400000);
              const isSelected = selectedIds.has(lead._id);
              const leadTags: string[] = (lead as any).tags || [];
              return (
                <tr
                  key={lead._id}
                  className={`border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer transition-colors ${isSelected ? "bg-cyan-500/[0.05]" : ""}`}
                  onClick={() => onEditLead(lead)}
                >
                  <td className="px-3 py-3 pl-4 lg:pl-6" onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={isSelected} onCheckedChange={() => onToggleSelect(lead._id)} />
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-xs font-medium text-white">{formatName(lead)}</span>
                  </td>
                  {!isBrandAdminOrFranchisor && <Cell value={lead.phone || ""} />}
                  {!isBrandAdminOrFranchisor && <Cell value={lead.email || ""} />}
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    {!isBrandAdminOrFranchisor ? (
                      <Select
                        value={lead.stage}
                        onValueChange={async (v) => { await updateLead({ leadId: lead._id, stage: v as StageId }); toast.success(`Moved to ${getStage(v).label}`); }}
                      >
                        <SelectTrigger className={`h-6 w-auto text-[11px] font-medium border px-2 gap-1 ${stage.bgClass}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STAGES.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
                                {s.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className={`text-[11px] font-medium border px-2 py-0.5 rounded ${stage.bgClass}`}>{stage.label}</span>
                    )}
                  </td>
                  {showBrandName && (
                    <td className="px-3 py-3">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 font-medium whitespace-nowrap">
                        {brandMap[lead.brandId] || "—"}
                      </span>
                    </td>
                  )}
                  <Cell value={lead.mainTerritory || ""} />
                  <td className="px-3 py-3">
                    <div className="flex gap-1 flex-wrap max-w-[160px]">
                      {leadTags.slice(0, 3).map((t) => (
                        <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400 border border-white/5">{t}</span>
                      ))}
                      {leadTags.length > 3 && (
                        <span className="text-[10px] text-slate-600">+{leadTags.length - 3}</span>
                      )}
                    </div>
                  </td>
                  {!isBrandAdminOrFranchisor && (
                    <td className="px-3 py-3">
                      {lead.salesRepId && profileMap[lead.salesRepId] ? (
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 whitespace-nowrap">
                          {profileMap[lead.salesRepId].name}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-600">—</span>
                      )}
                    </td>
                  )}
                  {!isBrandAdminOrFranchisor && (
                    <td className="px-3 py-3">
                      {lead.setterId && profileMap[lead.setterId] ? (
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-400 whitespace-nowrap">
                          {profileMap[lead.setterId].name}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-600">—</span>
                      )}
                    </td>
                  )}
                  <td className="px-3 py-3">
                    <span className="text-xs text-slate-500 whitespace-nowrap">
                      {daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : `${daysAgo}d ago`}
                    </span>
                  </td>
                  <td className="px-3 py-3 sticky right-0 bg-slate-950/90 backdrop-blur" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 text-slate-500 hover:text-white"><MoreHorizontal className="w-4 h-4" /></button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => onEditLead(lead)}><Edit className="w-3.5 h-3.5 mr-2" /> Edit</DropdownMenuItem>
                        {lead.phone && <DropdownMenuItem onClick={() => window.open(`tel:${lead.phone}`)}><Phone className="w-3.5 h-3.5 mr-2" /> Call</DropdownMenuItem>}
                        {lead.email && <DropdownMenuItem onClick={() => window.open(`mailto:${lead.email}`)}><Mail className="w-3.5 h-3.5 mr-2" /> Email</DropdownMenuItem>}
                        {isAdmin && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-400 focus:text-red-400" onClick={async () => {
                              try { await softDelete({ leadId: lead._id }); toast.success("Moved to Recently Deleted"); } catch (err: any) { toast.error(err.message); }
                            }}>
                              <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 lg:px-6 py-3 border-t border-white/5 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {(currentPage - 1) * leads.length + 1}–{Math.min(currentPage * leads.length, totalFiltered)} of {totalFiltered}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-1.5 rounded text-slate-500 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let page: number;
              if (totalPages <= 7) page = i + 1;
              else if (currentPage <= 4) page = i + 1;
              else if (currentPage >= totalPages - 3) page = totalPages - 6 + i;
              else page = currentPage - 3 + i;
              return (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={`w-7 h-7 rounded text-xs ${currentPage === page ? "bg-cyan-600 text-white" : "text-slate-500 hover:text-white hover:bg-white/5"}`}
                >
                  {page}
                </button>
              );
            })}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded text-slate-500 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ── Lead Form Dialog (supports All Brands mode with brand selector) ──
function LeadFormDialog({ open, onClose, brandId, lead, brands }: {
  open: boolean; onClose: () => void; brandId: Id<"brands"> | null; lead: any | null; brands?: any[];
}) {
  const createLead = useMutation(api.crm.createLead);
  const updateLead = useMutation(api.crm.updateLead);
  const deleteLead = useMutation(api.crm.deleteLead);
  const isEdit = !!lead;

  const emptyForm = {
    firstName: "", lastName: "", email: "", phone: "", address: "",
    liquidCapital: "", mainTerritory: "", secondTerritory: "", thirdTerritory: "",
    numTerritories: "", stage: "new_lead", notes: "",
  };

  const [form, setForm] = useState(emptyForm);
  const [selectedBrand, setSelectedBrand] = useState<string>(brandId || "");

  // Sync selectedBrand when brandId prop changes or dialog opens
  useEffect(() => {
    if (open) {
      setSelectedBrand(brandId || (brands && brands.length === 1 ? brands[0]._id : ""));
    }
  }, [open, brandId]);

  // CRITICAL FIX: useEffect to populate form when lead changes or dialog opens
  useEffect(() => {
    if (open && lead) {
      setForm({
        firstName: lead.firstName || "",
        lastName: lead.lastName || "",
        email: lead.email || "",
        phone: lead.phone || "",
        address: lead.address || "",
        liquidCapital: lead.liquidCapital || "",
        mainTerritory: lead.mainTerritory || "",
        secondTerritory: lead.secondTerritory || "",
        thirdTerritory: lead.thirdTerritory || "",
        numTerritories: lead.numTerritories?.toString() || "",
        stage: lead.stage || "new_lead",
        notes: lead.notes || "",
      });
    } else if (open && !lead) {
      setForm(emptyForm);
    }
  }, [open, lead?._id]);

  // Resolve the effective brand ID (prop takes priority, then user selection)
  const effectiveBrandId = brandId || (selectedBrand as Id<"brands"> | "");

  const handleSave = async () => {
    if (!form.firstName.trim()) { toast.error("First name is required"); return; }
    if (!effectiveBrandId) { toast.error("Please select a brand"); return; }
    try {
      const data = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        liquidCapital: form.liquidCapital || undefined,
        mainTerritory: form.mainTerritory.trim() || undefined,
        secondTerritory: form.secondTerritory.trim() || undefined,
        thirdTerritory: form.thirdTerritory.trim() || undefined,
        numTerritories: form.numTerritories ? parseInt(form.numTerritories) : undefined,
        stage: form.stage as StageId,
        notes: form.notes.trim() || undefined,
      };
      if (isEdit) {
        await updateLead({ leadId: lead._id, ...data });
        toast.success("Lead updated");
      } else {
        await createLead({ brandId: effectiveBrandId as Id<"brands">, ...data, source: "manual" });
        toast.success("Lead created");
      }
      onClose();
    } catch (err: any) { toast.error(err.message || "Failed to save lead"); }
  };

  const set = (key: string) => (e: any) =>
    setForm((f) => ({ ...f, [key]: typeof e === "string" ? e : e.target.value }));

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Lead" : "Add New Lead"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {/* Brand selector — shown when no specific brand is pre-selected (All Brands mode) */}
          {!brandId && brands && brands.length > 0 && (
            <div><Label className="text-xs text-slate-400">Brand *</Label>
            <Select value={selectedBrand} onValueChange={setSelectedBrand}>
              <SelectTrigger className="mt-1 bg-white/5 border-white/10"><SelectValue placeholder="Select a brand..." /></SelectTrigger>
              <SelectContent>{brands.map((b) => (<SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>))}</SelectContent>
            </Select></div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs text-slate-400">First Name *</Label>
            <Input value={form.firstName} onChange={set("firstName")} className="mt-1 bg-white/5 border-white/10" placeholder="John" /></div>
            <div><Label className="text-xs text-slate-400">Last Name</Label>
            <Input value={form.lastName} onChange={set("lastName")} className="mt-1 bg-white/5 border-white/10" placeholder="Smith" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs text-slate-400">Email</Label>
            <Input value={form.email} onChange={set("email")} type="email" className="mt-1 bg-white/5 border-white/10" placeholder="john@example.com" /></div>
            <div><Label className="text-xs text-slate-400">Phone</Label>
            <Input value={form.phone} onChange={set("phone")} className="mt-1 bg-white/5 border-white/10" placeholder="(555) 123-4567" /></div>
          </div>
          <div><Label className="text-xs text-slate-400">Address</Label>
          <Input value={form.address} onChange={set("address")} className="mt-1 bg-white/5 border-white/10" placeholder="City, State" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs text-slate-400">Liquid Capital</Label>
            <Select value={form.liquidCapital} onValueChange={set("liquidCapital")}>
              <SelectTrigger className="mt-1 bg-white/5 border-white/10"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>{CAPITAL_OPTIONS.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent>
            </Select></div>
            <div><Label className="text-xs text-slate-400"># Territories Interested</Label>
            <Input value={form.numTerritories} onChange={set("numTerritories")} type="number" min="1" className="mt-1 bg-white/5 border-white/10" placeholder="1" /></div>
          </div>
          <div><Label className="text-xs text-slate-400">Main Territory Interest</Label>
          <Input value={form.mainTerritory} onChange={set("mainTerritory")} className="mt-1 bg-white/5 border-white/10" placeholder="Austin, TX" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs text-slate-400">2nd Territory</Label>
            <Input value={form.secondTerritory} onChange={set("secondTerritory")} className="mt-1 bg-white/5 border-white/10" placeholder="Dallas, TX" /></div>
            <div><Label className="text-xs text-slate-400">3rd Territory</Label>
            <Input value={form.thirdTerritory} onChange={set("thirdTerritory")} className="mt-1 bg-white/5 border-white/10" placeholder="Houston, TX" /></div>
          </div>
          <div><Label className="text-xs text-slate-400">Stage</Label>
          <Select value={form.stage} onValueChange={set("stage")}>
            <SelectTrigger className="mt-1 bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
            <SelectContent>{STAGES.map((s) => (<SelectItem key={s.id} value={s.id}><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ background: s.color }} />{s.label}</div></SelectItem>))}</SelectContent>
          </Select></div>
          <div><Label className="text-xs text-slate-400">Notes</Label>
          <Textarea value={form.notes} onChange={set("notes")} className="mt-1 bg-white/5 border-white/10 min-h-[80px]" placeholder="Any additional notes..." /></div>
          <div className="flex items-center justify-between pt-2">
            {isEdit ? (
              <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                onClick={async () => { if (confirm("Delete this lead permanently?")) { await deleteLead({ leadId: lead._id }); toast.success("Lead deleted"); onClose(); } }}>
                <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
              </Button>
            ) : <div />}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onClose} className="border-white/10 text-slate-300 hover:bg-white/5">Cancel</Button>
              <Button size="sm" onClick={handleSave} className="bg-cyan-600 hover:bg-cyan-500 text-white">{isEdit ? "Save Changes" : "Add Lead"}</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Notification Settings Dialog ─────────────────────
function NotificationSettingsDialog({ open, onClose, brandId }: { open: boolean; onClose: () => void; brandId: Id<"brands"> }) {
  const settings = useQuery(api.crm.getNotificationSettings, { brandId });
  const updateSettings = useMutation(api.crm.updateNotificationSettings);
  const [enabled, setEnabled] = useState(false);
  const [emails, setEmails] = useState("");

  useEffect(() => {
    if (open && settings) {
      setEnabled(settings.emailsEnabled);
      setEmails(settings.notifyEmails.join(", "));
    }
  }, [open, settings?.emailsEnabled]);

  const handleSave = async () => {
    const emailList = emails.split(",").map((e) => e.trim()).filter((e) => e.includes("@"));
    if (enabled && emailList.length === 0) { toast.error("Add at least one email address"); return; }
    if (emailList.length > 5) { toast.error("Maximum 5 email addresses"); return; }
    try {
      await updateSettings({ brandId, emailsEnabled: enabled, notifyEmails: emailList });
      toast.success("Notification settings saved");
      onClose();
    } catch (err: any) { toast.error(err.message || "Failed to save settings"); }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>CRM Settings</DialogTitle></DialogHeader>
        <div className="space-y-6 mt-2 max-h-[70vh] overflow-y-auto">
          {/* Notification settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Mail className="w-4 h-4 text-cyan-500" /> Lead Notifications
            </h3>
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium">Email notifications</p><p className="text-xs text-slate-500 mt-0.5">Get emailed when a new lead comes in</p></div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>
            {enabled && (
              <div>
                <Label className="text-xs text-slate-400">Send notifications to (up to 5, comma-separated)</Label>
                <Textarea value={emails} onChange={(e) => setEmails(e.target.value)} className="mt-1.5 bg-white/5 border-white/10 min-h-[80px] text-sm" placeholder="sales@yourbrand.com, owner@yourbrand.com" />
                <p className="text-[11px] text-slate-600 mt-1.5">{emails.split(",").filter((e) => e.trim().includes("@")).length} of 5 addresses used</p>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button size="sm" onClick={handleSave} className="bg-cyan-600 hover:bg-cyan-500 text-white">Save Notifications</Button>
            </div>
          </div>

          {/* Auto-assignment section */}
          <div className="border-t border-white/5 pt-5">
            <AutoAssignmentPanel brandId={brandId} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Export All Button (admin) ─────────────────────────
function ExportAllButton({ brands }: { brands: any[] }) {
  const leads = useQuery(api.crm.exportAllLeads);
  const brandMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const b of brands) m[b._id] = b.name;
    return m;
  }, [brands]);
  const handleExport = () => {
    if (!leads || leads.length === 0) { toast.error("No leads to export"); return; }
    const headers = ["Brand","First Name","Last Name","Email","Phone","Address","Liquid Capital","Main Territory","2nd Territory","3rd Territory","# Territories","Stage","Source","Notes","Date Added"];
    const rows = leads.map((l: any) => [
      brandMap[l.brandId]||"Unknown", l.firstName, l.lastName||"", l.email||"", l.phone||"", l.address||"", l.liquidCapital||"",
      l.mainTerritory||"", l.secondTerritory||"", l.thirdTerritory||"", l.numTerritories?.toString()||"",
      getStage(l.stage).label, l.source||"", (l.notes||"").replace(/"/g,'""'), new Date(l.createdAt).toLocaleDateString(),
    ]);
    const csv = [headers.join(","), ...rows.map((r: any) => r.map((c: any) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `all-brands-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("All leads exported");
  };
  return (
    <Button size="sm" variant="outline" className="h-8 border-white/10 text-slate-300 hover:text-white hover:bg-white/5" onClick={handleExport}>
      <Download className="w-3.5 h-3.5 mr-1.5" /><span className="hidden sm:inline">Export All</span>
    </Button>
  );
}

// ── Export Button ─────────────────────────────────────
function ExportButton({ brandId, brandName }: { brandId: Id<"brands">; brandName: string }) {
  const leads = useQuery(api.crm.exportLeads, { brandId });
  const handleExport = () => {
    if (!leads || leads.length === 0) { toast.error("No leads to export"); return; }
    const headers = ["First Name","Last Name","Email","Phone","Address","Liquid Capital","Main Territory","2nd Territory","3rd Territory","# Territories","Stage","Source","Notes","Date Added"];
    const rows = leads.map((l) => [
      l.firstName, l.lastName||"", l.email||"", l.phone||"", l.address||"", l.liquidCapital||"",
      l.mainTerritory||"", l.secondTerritory||"", l.thirdTerritory||"", l.numTerritories?.toString()||"",
      getStage(l.stage).label, l.source||"", (l.notes||"").replace(/"/g,'""'), new Date(l.createdAt).toLocaleDateString(),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${brandName.replace(/\s+/g, "-").toLowerCase()}-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Leads exported");
  };
  return (
    <Button size="sm" variant="outline" className="h-8 border-white/10 text-slate-300 hover:text-white hover:bg-white/5" onClick={handleExport}>
      <Download className="w-3.5 h-3.5 mr-1.5" /><span className="hidden sm:inline">Export</span>
    </Button>
  );
}

// ── Empty States ─────────────────────────────────────
function EmptyLeads({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4"><Users className="w-8 h-8 text-slate-500" /></div>
      <h3 className="text-lg font-medium text-white mb-1">No leads yet</h3>
      <p className="text-sm text-slate-500 max-w-xs mb-5">Add your first lead manually or wait for prospects to find you on Franchise KI.</p>
      <Button onClick={onAdd} className="bg-cyan-600 hover:bg-cyan-500 text-white"><Plus className="w-4 h-4 mr-2" /> Add Your First Lead</Button>
    </div>
  );
}

function CRMEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4"><Target className="w-8 h-8 text-slate-500" /></div>
      <h3 className="text-lg font-medium text-white mb-1">No brands assigned</h3>
      <p className="text-sm text-slate-500 max-w-xs">You need brand access to use the CRM. Contact your admin for access.</p>
    </div>
  );
}

// ── Tag Filter Dropdown ───────────────────────────────
function TagFilterDropdown({
  allTags,
  selectedTags,
  mode,
  onTagsChange,
  onModeChange,
}: {
  allTags: any[];
  selectedTags: string[];
  mode: "any" | "all" | "only";
  onTagsChange: (tags: string[]) => void;
  onModeChange: (mode: "any" | "all" | "only") => void;
}) {
  const [search, setSearch] = useState("");

  const filteredTags = useMemo(() => {
    if (!search) return allTags;
    return allTags.filter((t) => t.name.includes(search.toLowerCase()));
  }, [allTags, search]);

  const toggleTag = (name: string) => {
    if (selectedTags.includes(name)) {
      onTagsChange(selectedTags.filter((t) => t !== name));
    } else {
      onTagsChange([...selectedTags, name]);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={`h-8 text-sm border-white/10 ${selectedTags.length > 0 ? "text-cyan-400 border-cyan-500/30" : "text-slate-400"}`}>
          <Tag className="w-3.5 h-3.5 mr-1.5" />
          {selectedTags.length > 0 ? `${selectedTags.length} tag${selectedTags.length !== 1 ? "s" : ""}` : "Tags"}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[260px] p-0 bg-slate-950 border-white/10">
        <div className="p-2 border-b border-white/5">
          <Input placeholder="Search tags..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-7 text-xs bg-white/5 border-white/10" />
        </div>
        {/* Mode selector */}
        <div className="px-2 py-1.5 border-b border-white/5 flex gap-1">
          {(["any", "all", "only"] as const).map((m) => (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${mode === m ? "bg-cyan-500/15 text-cyan-400" : "text-slate-500 hover:text-slate-300"}`}
            >
              {m === "any" ? "Any" : m === "all" ? "All" : "Only"}
            </button>
          ))}
        </div>
        <div className="max-h-[200px] overflow-auto py-1">
          {filteredTags.length === 0 ? (
            <p className="text-xs text-slate-600 text-center py-3">No tags found</p>
          ) : filteredTags.map((tag) => (
            <button
              key={tag._id}
              onClick={() => toggleTag(tag.name)}
              className={`w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center gap-2 ${
                selectedTags.includes(tag.name) ? "text-cyan-400 bg-cyan-500/5" : "text-slate-300 hover:bg-white/[0.03]"
              }`}
            >
              {selectedTags.includes(tag.name) && <Check className="w-3 h-3 flex-shrink-0" />}
              <span>{tag.name}</span>
            </button>
          ))}
        </div>
        {selectedTags.length > 0 && (
          <div className="p-2 border-t border-white/5">
            <button onClick={() => onTagsChange([])} className="text-[10px] text-slate-500 hover:text-slate-300">
              Clear all
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function CRMSkeleton() {
  return (
    <div className="flex-1 flex flex-col p-6 space-y-4">
      <div className="h-8 w-48 bg-white/5 rounded animate-pulse" />
      <div className="h-6 w-full max-w-xs bg-white/5 rounded animate-pulse" />
      <div className="flex gap-3">{[1,2,3,4,5].map((i) => (<div key={i} className="w-[260px] h-[300px] bg-white/[0.02] rounded-lg animate-pulse" />))}</div>
    </div>
  );
}
