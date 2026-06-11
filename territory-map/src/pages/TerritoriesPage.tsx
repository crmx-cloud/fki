import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useRef, useCallback } from "react";
import { MapPin, Plus, Upload, Download, X, Trash2, FileUp, ClipboardPaste, ChevronRight, CheckCircle2, AlertCircle, Map as MapIcon, Code, ExternalLink, Globe, ChevronDown } from "lucide-react";
import { ALL_US_STATES, MAJOR_CITIES } from "@/lib/us-states-geo";
import { toast } from "sonner";
import { EmbedCodeDialog } from "@/components/EmbedCodeDialog";
import type { Id } from "../../convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  available:     { color: "#e879f9", label: "Available" },
  high_interest: { color: "#fbbf24", label: "High Interest" },
  pending_award: { color: "#f97316", label: "Pending Award" },
  sold:          { color: "#ef4444", label: "Sold" },
  open:          { color: "#22d3ee", label: "Open" },
};
const STATUSES = ["available", "high_interest", "pending_award", "sold", "open"] as const;
const GEOCODE_URL = "https://nominatim.openstreetmap.org/search";

type ImportStep = "input" | "preview" | "importing" | "done";
type ParsedRow = { city: string; state: string; status: string; valid: boolean; error?: string };

export function TerritoriesPage() {
  const myProfile = useQuery(api.users.getMyProfile);
  const allBrands = useQuery(api.brands.listAll);
  const allTerritories = useQuery(api.territories.listAll);

  // Brand-scoped filtering for brand_admin / franchisor users
  const isBrandAdmin = myProfile?.isBrandAdmin;
  const isFranchisor = myProfile?.profile?.role === "franchisor";
  const isBrandScoped = isBrandAdmin || (isFranchisor && !myProfile?.isAdmin);
  const accessibleBrandIds = myProfile?.brandIds || [];

  const brands = isBrandScoped
    ? allBrands?.filter((b) => accessibleBrandIds.includes(b._id))
    : allBrands;

  const territories = isBrandScoped
    ? allTerritories?.filter((t) => accessibleBrandIds.includes(t.brandId))
    : allTerritories;
  const updateTerritory = useMutation(api.territories.update);
  const createTerritory = useMutation(api.territories.create);
  const deleteTerritory = useMutation(api.territories.remove);

  const [filterBrand, setFilterBrand] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [newCity, setNewCity] = useState("");
  const [newState, setNewState] = useState("");
  const [newBrandId, setNewBrandId] = useState<string>("");
  const [newStatus, setNewStatus] = useState<(typeof STATUSES)[number]>("available");
  const [isCreating, setIsCreating] = useState(false);

  // Import wizard state
  const [importStep, setImportStep] = useState<ImportStep>("input");
  const [importBrandId, setImportBrandId] = useState<string>("");
  const [importText, setImportText] = useState("");
  const [importDefaultStatus, setImportDefaultStatus] = useState<string>("available");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0, errors: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete confirmation
  const [deletingTerritory, setDeletingTerritory] = useState<{ id: Id<"territories">; city: string; state: string } | null>(null);

  // Embed code dialog
  const [embedBrand, setEmbedBrand] = useState<{ slug: string; name: string; color?: string } | null>(null);

  const brandMap = new Map(brands?.map((b) => [b._id, b]) || []);
  const filtered = territories?.filter((t) => {
    if (filterBrand && t.brandId !== filterBrand) return false;
    if (filterStatus && t.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const brand = brandMap.get(t.brandId);
      if (!t.city.toLowerCase().includes(q) && !t.state.toLowerCase().includes(q) && !(brand?.name || "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  async function geocode(city: string, state: string): Promise<{ lat?: number; lng?: number }> {
    try {
      const resp = await fetch(`${GEOCODE_URL}?q=${encodeURIComponent(`${city}, ${state}, USA`)}&format=json&limit=1&countrycodes=us`);
      const data = await resp.json();
      if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    } catch {}
    return {};
  }

  async function handleAdd() {
    if (!newCity.trim() || !newState.trim() || !newBrandId) return;
    setIsCreating(true);
    try {
      const { lat, lng } = await geocode(newCity, newState);
      await createTerritory({
        brandId: newBrandId as Id<"brands">,
        city: newCity.trim(), state: newState.trim().toUpperCase(),
        status: newStatus,
        latitude: lat, longitude: lng,
      });
      setNewCity(""); setNewState("");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deletingTerritory) return;
    await deleteTerritory({ id: deletingTerritory.id });
    setDeletingTerritory(null);
  }

  function parseCSVText(text: string, defaultStatus: string): ParsedRow[] {
    const lines = text.trim().split("\n").filter((l) => l.trim());
    const rows: ParsedRow[] = [];
    for (const line of lines) {
      const parts = line.split(",").map((p) => p.trim().replace(/^["']|["']$/g, ""));
      // Skip header row
      if (parts[0]?.toLowerCase() === "city" && parts[1]?.toLowerCase() === "state") continue;
      if (parts.length < 2) {
        rows.push({ city: parts[0] || "", state: "", status: defaultStatus, valid: false, error: "Need at least City, State" });
        continue;
      }
      const city = parts[0];
      const state = parts[1].toUpperCase();
      if (!city || !state) {
        rows.push({ city, state, status: defaultStatus, valid: false, error: "Missing city or state" });
        continue;
      }
      const rawStatus = parts[2]?.toLowerCase()?.replace(/\s+/g, "_") || "";
      const status = STATUSES.includes(rawStatus as any) ? rawStatus : defaultStatus;
      rows.push({ city, state, status, valid: true });
    }
    return rows;
  }

  function handleFileUpload(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setImportText(text);
    };
    reader.readAsText(file);
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith(".csv") || file.name.endsWith(".txt") || file.type === "text/csv" || file.type === "text/plain")) {
      handleFileUpload(file);
    }
  }, []);

  function handlePreview() {
    const rows = parseCSVText(importText, importDefaultStatus);
    setParsedRows(rows);
    setImportStep("preview");
  }

  async function handleImportConfirm() {
    if (!importBrandId) return;
    const validRows = parsedRows.filter((r) => r.valid);
    setImportStep("importing");
    setImportProgress({ done: 0, total: validRows.length, errors: 0 });

    let done = 0;
    let errors = 0;
    for (const row of validRows) {
      try {
        await new Promise((r) => setTimeout(r, 250)); // Rate limit geocoding
        const { lat, lng } = await geocode(row.city, row.state);
        await createTerritory({
          brandId: importBrandId as Id<"brands">,
          city: row.city,
          state: row.state,
          status: row.status as any,
          latitude: lat,
          longitude: lng,
        });
        done++;
      } catch {
        errors++;
      }
      setImportProgress({ done: done + errors, total: validRows.length, errors });
    }
    setImportStep("done");
    setImportProgress({ done, total: validRows.length, errors });
  }

  function resetImport() {
    setImportStep("input");
    setImportText("");
    setParsedRows([]);
    setImportProgress({ done: 0, total: 0, errors: 0 });
  }

  function handleExportCSV() {
    if (!filtered) return;
    const header = "City,State,Brand,Status,Latitude,Longitude\n";
    const rows = filtered.map((t) => {
      const brand = brandMap.get(t.brandId);
      return `${t.city},${t.state},${brand?.name || ""},${t.status},${t.latitude || ""},${t.longitude || ""}`;
    }).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "territories.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleStatusChange(id: Id<"territories">, status: string) {
    await updateTerritory({ id, status: status as any });
  }

  return (
    <div className="space-y-6 max-w-[1200px]">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Territories</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {filtered?.length ?? 0} territories {filterBrand || filterStatus || searchQuery ? "(filtered)" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border bg-card text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button
            onClick={() => { setShowImport(!showImport); setShowAdd(false); resetImport(); }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border bg-card text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Upload className="w-3.5 h-3.5" /> Import
          </button>
          <button
            onClick={() => { setShowAdd(!showAdd); setShowImport(false); }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
      </div>

      {/* === State Registration Panel === */}
      <StateRegistrationPanel brands={brands || []} />

      {/* === Import Wizard === */}
      {showImport && (
        <div className="bg-card border rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-sm">Import Territories</h3>
              {/* Step indicator */}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className={importStep === "input" ? "text-primary font-semibold" : ""}>1. Input</span>
                <ChevronRight className="w-3 h-3" />
                <span className={importStep === "preview" ? "text-primary font-semibold" : ""}>2. Preview</span>
                <ChevronRight className="w-3 h-3" />
                <span className={importStep === "importing" || importStep === "done" ? "text-primary font-semibold" : ""}>3. Import</span>
              </div>
            </div>
            <button onClick={() => setShowImport(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>

          {/* Step 1: Input */}
          {importStep === "input" && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select
                  value={importBrandId}
                  onChange={(e) => setImportBrandId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
                >
                  <option value="">Select Brand *</option>
                  {brands?.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
                </select>
                <select
                  value={importDefaultStatus}
                  onChange={(e) => setImportDefaultStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{STATUS_CONFIG[s].label} (default)</option>)}
                </select>
              </div>

              {/* Drag & drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                  isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-muted-foreground/40"
                }`}
              >
                <FileUp className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Drop a CSV file here</span> or click to browse
                </p>
                <p className="text-xs text-muted-foreground mt-1">Supports .csv and .txt files</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt,text/csv,text/plain"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground flex items-center gap-1"><ClipboardPaste className="w-3 h-3" /> or paste CSV below</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={"City, State\nCity, State, Status\n\nExamples:\nAustin, TX\nDallas, TX, high_interest\nHouston, TX, available"}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm resize-none h-32 font-mono"
              />

              <div className="flex items-center gap-3">
                <button
                  onClick={handlePreview}
                  disabled={!importBrandId || !importText.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  Preview Import <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs text-muted-foreground">
                  {importText.trim() ? `${importText.trim().split("\n").filter(l => l.trim()).length} lines detected` : ""}
                </span>
              </div>
            </div>
          )}

          {/* Step 2: Preview */}
          {importStep === "preview" && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground">
                  Brand: <span className="font-medium text-foreground">{brandMap.get(importBrandId as any)?.name || "?"}</span>
                </span>
                <span className="text-muted-foreground">
                  Valid: <span className="font-medium text-emerald-500">{parsedRows.filter(r => r.valid).length}</span>
                </span>
                {parsedRows.filter(r => !r.valid).length > 0 && (
                  <span className="text-muted-foreground">
                    Invalid: <span className="font-medium text-destructive">{parsedRows.filter(r => !r.valid).length}</span>
                  </span>
                )}
              </div>

              <div className="max-h-60 overflow-y-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                    <tr>
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">City</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">State</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((row, i) => (
                      <tr key={i} className={`border-t ${!row.valid ? "bg-destructive/5" : ""}`}>
                        <td className="py-1.5 px-3">{row.city || "—"}</td>
                        <td className="py-1.5 px-3">{row.state || "—"}</td>
                        <td className="py-1.5 px-3">
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: `${STATUS_CONFIG[row.status]?.color || "#999"}15`, color: STATUS_CONFIG[row.status]?.color || "#999" }}>
                            {STATUS_CONFIG[row.status]?.label || row.status}
                          </span>
                        </td>
                        <td className="py-1.5 px-3 text-center">
                          {row.valid ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <AlertCircle className="w-3.5 h-3.5 text-destructive" title={row.error} />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-muted-foreground">
                Each territory will be auto-geocoded (adds ~0.3s per territory). Only valid rows will be imported.
              </p>

              <div className="flex items-center gap-3">
                <button onClick={() => setImportStep("input")} className="px-4 py-2 rounded-lg border text-sm hover:bg-muted transition-colors">
                  ← Back
                </button>
                <button
                  onClick={handleImportConfirm}
                  disabled={parsedRows.filter(r => r.valid).length === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  Import {parsedRows.filter(r => r.valid).length} Territories
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Importing */}
          {importStep === "importing" && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                <span>Importing and geocoding territories... {importProgress.done}/{importProgress.total}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${importProgress.total > 0 ? (importProgress.done / importProgress.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {/* Step 4: Done */}
          {importStep === "done" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span className="font-medium">Import complete!</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Successfully imported <span className="font-semibold text-foreground">{importProgress.done}</span> territories
                {importProgress.errors > 0 && <>, <span className="text-destructive">{importProgress.errors} failed</span></>}.
                All imported territories are now geocoded and visible on the map.
              </p>
              <div className="flex gap-3">
                <button onClick={() => { resetImport(); }} className="px-4 py-2 rounded-lg border text-sm hover:bg-muted transition-colors">
                  Import More
                </button>
                <button onClick={() => setShowImport(false)} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add single */}
      {showAdd && (
        <div className="bg-card border rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">New Territory</h3>
            <button onClick={() => setShowAdd(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <input placeholder="City" value={newCity} onChange={(e) => setNewCity(e.target.value)} className="px-3 py-2 rounded-lg border bg-background text-sm" />
            <input placeholder="State (NJ)" value={newState} onChange={(e) => setNewState(e.target.value)} className="px-3 py-2 rounded-lg border bg-background text-sm" />
            <select value={newBrandId} onChange={(e) => setNewBrandId(e.target.value)} className="px-3 py-2 rounded-lg border bg-background text-sm">
              <option value="">Brand</option>
              {brands?.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
            <select value={newStatus} onChange={(e) => setNewStatus(e.target.value as any)} className="px-3 py-2 rounded-lg border bg-background text-sm">
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
            </select>
            <button
              onClick={handleAdd}
              disabled={isCreating || !newCity || !newState || !newBrandId}
              className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isCreating ? "Adding..." : "Add"}
            </button>
          </div>
        </div>
      )}

      {/* Filters + search */}
      <div className="flex gap-2 flex-wrap">
        <input
          type="text"
          placeholder="Search city, state, brand..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-3 py-1.5 rounded-lg border bg-card text-sm w-48"
        />
        <select value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)} className="px-3 py-1.5 rounded-lg border bg-card text-sm">
          <option value="">All Brands</option>
          {brands?.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-1.5 rounded-lg border bg-card text-sm">
          <option value="">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
        </select>
        {(filterBrand || filterStatus || searchQuery) && (
          <button onClick={() => { setFilterBrand(""); setFilterStatus(""); setSearchQuery(""); }} className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">
            Clear
          </button>
        )}
      </div>

      {/* Brand Quick Actions — shown when a brand is selected */}
      {filterBrand && (() => {
        const selectedBrand = brandMap.get(filterBrand as any);
        if (!selectedBrand) return null;
        return (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border bg-card/50">
            <span className="text-xs text-muted-foreground mr-1">Quick:</span>
            <button
              onClick={() => window.open(`/map/${selectedBrand.slug}`, "_blank")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border bg-card text-muted-foreground hover:text-foreground hover:border-cyan-500/40 transition-colors"
            >
              <MapIcon className="w-3 h-3" /> View Public Map <ExternalLink className="w-2.5 h-2.5 opacity-50" />
            </button>
            <button
              onClick={() => setEmbedBrand({ slug: selectedBrand.slug, name: selectedBrand.name, color: selectedBrand.color })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border bg-card text-muted-foreground hover:text-foreground hover:border-cyan-500/40 transition-colors"
            >
              <Code className="w-3 h-3" /> Copy Embed Code
            </button>
          </div>
        );
      })()}

      {/* Table */}
      <div className="bg-card border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">City</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">State</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">Brand</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">Status</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">Coords</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs w-10"></th>
              </tr>
            </thead>
            <tbody>
              {!filtered ? (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No territories found</td></tr>
              ) : (
                filtered.map((t) => {
                  const brand = brandMap.get(t.brandId);
                  const cfg = STATUS_CONFIG[t.status];
                  return (
                    <tr key={t._id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 px-4 font-medium">{t.city}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">{t.state}</td>
                      <td className="py-2.5 px-4">
                        {brand?.slug ? (
                          <button
                            onClick={() => window.open(`/map/${brand.slug}`, "_blank")}
                            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md font-medium hover:ring-1 hover:ring-current/30 transition-all cursor-pointer"
                            style={{ backgroundColor: `${brand?.color || "#64748b"}12`, color: brand?.color || "#94a3b8" }}
                            title={`View ${brand.name} map`}
                          >
                            {brand.name}
                            <ExternalLink className="w-2.5 h-2.5 opacity-50" />
                          </button>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-md font-medium" style={{ backgroundColor: `${brand?.color || "#64748b"}12`, color: brand?.color || "#94a3b8" }}>
                            {brand?.name || "—"}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        <select
                          value={t.status}
                          onChange={(e) => handleStatusChange(t._id, e.target.value)}
                          className="text-xs px-2 py-1 rounded-md font-semibold border-0 cursor-pointer appearance-none"
                          style={{ backgroundColor: `${cfg?.color}12`, color: cfg?.color }}
                        >
                          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                        </select>
                      </td>
                      <td className="py-2.5 px-4 text-xs text-muted-foreground font-mono">
                        {t.latitude && t.longitude ? `${t.latitude.toFixed(2)}, ${t.longitude.toFixed(2)}` : "—"}
                      </td>
                      <td className="py-2.5 px-4">
                        <button
                          onClick={() => setDeletingTerritory({ id: t._id, city: t.city, state: t.state })}
                          className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Delete territory"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Embed Code Dialog */}
      {embedBrand && (
        <EmbedCodeDialog
          open={!!embedBrand}
          onOpenChange={(open) => { if (!open) setEmbedBrand(null); }}
          brandSlug={embedBrand.slug}
          brandName={embedBrand.name}
          brandColor={embedBrand.color}
        />
      )}

      {/* Delete Territory Confirmation Dialog */}
      <Dialog open={!!deletingTerritory} onOpenChange={(open) => { if (!open) setDeletingTerritory(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Territory</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-400 mt-1">
            Are you sure you want to delete{" "}
            <strong className="text-white">
              {deletingTerritory?.city}, {deletingTerritory?.state}
            </strong>
            ? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              className="border-white/10 text-slate-300 hover:bg-white/5"
              onClick={() => setDeletingTerritory(null)}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-500 text-white"
              onClick={handleConfirmDelete}
            >
              Yes, Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TerritoriesPage;

/* ═══════════════════════════════════════════════════════════
 * State Registration Panel
 * Admins pick which states a brand is registered to sell in.
 * Option to auto-pin major cities on newly registered states.
 * ═══════════════════════════════════════════════════════════ */

const GEOCODE_BATCH_URL = "https://nominatim.openstreetmap.org/search";

function StateRegistrationPanel({ brands }: { brands: any[] }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const registeredStates = useQuery(
    api.brands.getRegisteredStates,
    selectedBrandId ? { brandId: selectedBrandId as Id<"brands"> } : "skip"
  );
  const updateStates = useMutation(api.brands.updateRegisteredStates);
  const createBatch = useMutation(api.territories.createBatch);
  const [localStates, setLocalStates] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [showPinPrompt, setShowPinPrompt] = useState<string[]>([]);
  const [pinning, setPinning] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Sync from server
  const serverSet = registeredStates ? new Set(registeredStates) : null;
  const displayStates = dirty ? localStates : (serverSet || localStates);

  function toggleState(state: string) {
    const newSet = new Set(displayStates);
    const wasRegistered = newSet.has(state);
    if (wasRegistered) {
      newSet.delete(state);
    } else {
      newSet.add(state);
    }
    setLocalStates(newSet);
    setDirty(true);

    // If adding states, queue them for pin prompt
    if (!wasRegistered) {
      setShowPinPrompt((prev) => [...prev, state]);
    } else {
      setShowPinPrompt((prev) => prev.filter((s) => s !== state));
    }
  }

  function selectAllStates() {
    setLocalStates(new Set(ALL_US_STATES));
    setDirty(true);
    // Find newly added states
    const newlyAdded = ALL_US_STATES.filter((s) => !displayStates.has(s));
    if (newlyAdded.length > 0) {
      setShowPinPrompt(newlyAdded);
    }
  }

  function clearAllStates() {
    setLocalStates(new Set());
    setDirty(true);
    setShowPinPrompt([]);
  }

  async function handleSave() {
    if (!selectedBrandId) return;
    setSaving(true);
    try {
      await updateStates({
        brandId: selectedBrandId as Id<"brands">,
        registeredStates: Array.from(localStates).sort(),
      });
      setDirty(false);
      toast.success(`Registered states updated (${localStates.size} states)`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handlePinCities(statesToPin: string[]) {
    if (!selectedBrandId || statesToPin.length === 0) return;
    setPinning(true);
    try {
      const territories: { city: string; state: string; status: "available"; latitude?: number; longitude?: number }[] = [];
      for (const state of statesToPin) {
        const cities = MAJOR_CITIES[state] || [];
        for (const c of cities) {
          territories.push({
            city: c.city,
            state,
            status: "available" as const,
            latitude: c.lat,
            longitude: c.lng,
          });
        }
      }
      if (territories.length > 0) {
        await createBatch({
          brandId: selectedBrandId as Id<"brands">,
          territories,
        });
        toast.success(`Pinned ${territories.length} cities across ${statesToPin.length} state(s)`);
      }
      setShowPinPrompt([]);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setPinning(false);
    }
  }

  return (
    <div className="bg-card border rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-sky-400" />
          <span className="font-semibold text-sm">State Registration</span>
          <span className="text-xs text-muted-foreground ml-1">
            — Legal availability by state
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t">
          {/* Brand Selector */}
          <div className="pt-4">
            <label className="text-xs text-muted-foreground block mb-1">Select Brand</label>
            <select
              value={selectedBrandId}
              onChange={(e) => {
                setSelectedBrandId(e.target.value);
                setDirty(false);
                setShowPinPrompt([]);
              }}
              className="w-full max-w-xs px-3 py-2 rounded-lg border bg-background text-sm"
            >
              <option value="">Choose a brand...</option>
              {brands.map((b) => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
          </div>

          {selectedBrandId && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {displayStates.size} of {ALL_US_STATES.length} states registered
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={selectAllStates}
                    className="text-xs text-sky-400 hover:underline"
                  >
                    Select All
                  </button>
                  <button
                    onClick={clearAllStates}
                    className="text-xs text-red-400 hover:underline"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* State Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1.5">
                {ALL_US_STATES.map((state) => {
                  const isRegistered = displayStates.has(state);
                  return (
                    <button
                      key={state}
                      onClick={() => toggleState(state)}
                      className={`px-2 py-1.5 rounded-md text-xs font-medium transition-all border ${
                        isRegistered
                          ? "bg-sky-500/15 border-sky-500/40 text-sky-400"
                          : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/60"
                      }`}
                    >
                      {state.length > 12 ? state.substring(0, 10) + "…" : state}
                    </button>
                  );
                })}
              </div>

              {/* Pin Major Cities Prompt */}
              {showPinPrompt.length > 0 && (
                <div className="bg-sky-500/10 border border-sky-500/30 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-sky-300">
                      Pin major cities as Available?
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {showPinPrompt.length} new state(s): {showPinPrompt.slice(0, 5).join(", ")}
                      {showPinPrompt.length > 5 ? ` +${showPinPrompt.length - 5} more` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowPinPrompt([])}
                      className="text-xs"
                    >
                      Skip
                    </Button>
                    <Button
                      size="sm"
                      disabled={pinning}
                      onClick={() => handlePinCities(showPinPrompt)}
                      className="bg-sky-600 hover:bg-sky-700 text-white text-xs"
                    >
                      {pinning ? "Pinning…" : `Pin Cities (${showPinPrompt.reduce((acc, s) => acc + (MAJOR_CITIES[s]?.length || 0), 0)})`}
                    </Button>
                  </div>
                </div>
              )}

              {/* Save Button */}
              {dirty && (
                <div className="flex justify-end">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-sky-600 hover:bg-sky-700 text-white"
                  >
                    {saving ? "Saving…" : `Save Registered States (${localStates.size})`}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
