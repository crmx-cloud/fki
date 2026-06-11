import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Download,
  Trash2,
  Tag,
  TagsIcon,
  Merge,
  ArrowRightLeft,
  Building2,
  MapPin,
  Bell,
  X,
  Plus,
  Check,
  AlertTriangle,
} from "lucide-react";

// ── Stage Config (shared) ─────────────────────────────
export const STAGES = [
  { id: "new_lead" as const, label: "New Lead", color: "#06b6d4", bgClass: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30" },
  { id: "intro_call" as const, label: "Intro Call", color: "#8b5cf6", bgClass: "bg-violet-500/15 text-violet-400 border-violet-500/30" },
  { id: "qualified" as const, label: "Qualified", color: "#3b82f6", bgClass: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  { id: "discovery_day" as const, label: "Discovery Day", color: "#f59e0b", bgClass: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  { id: "pending_contract" as const, label: "Pending Contract", color: "#f97316", bgClass: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  { id: "awarded" as const, label: "Awarded", color: "#22c55e", bgClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  { id: "lost" as const, label: "Lost", color: "#ef4444", bgClass: "bg-red-500/15 text-red-400 border-red-500/30" },
] as const;

export type StageId = typeof STAGES[number]["id"];
export const getStage = (id: string) => STAGES.find((s) => s.id === id) || STAGES[0];

// ── Floating Bulk Action Bar ──────────────────────────
export function BulkActionBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onExport,
  onDelete,
  onAddTags,
  onRemoveTags,
  onMerge,
  onUpdateStage,
  onUpdateBrand,
  onUpdateTerritories,
  onSendNotification,
  isSuperAdmin,
  isAdmin,
}: {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onExport: () => void;
  onDelete: () => void;
  onAddTags: () => void;
  onRemoveTags: () => void;
  onMerge: () => void;
  onUpdateStage: () => void;
  onUpdateBrand: () => void;
  onUpdateTerritories: () => void;
  onSendNotification: () => void;
  isSuperAdmin: boolean;
  isAdmin: boolean;
}) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-200">
      <div className="bg-slate-900 border border-white/10 rounded-xl shadow-2xl shadow-black/50 px-4 py-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 pr-3 border-r border-white/10">
          <span className="text-sm font-medium text-white">{selectedCount} selected</span>
          {selectedCount < totalCount && (
            <button onClick={onSelectAll} className="text-xs text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
              Select all {totalCount}
            </button>
          )}
          <button onClick={onClearSelection} className="text-slate-500 hover:text-slate-300 ml-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {isSuperAdmin && (
            <Button size="sm" variant="ghost" className="h-7 text-xs text-slate-300 hover:text-white hover:bg-white/10" onClick={onExport}>
              <Download className="w-3.5 h-3.5 mr-1" />Export
            </Button>
          )}
          {isAdmin && (
            <Button size="sm" variant="ghost" className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={onDelete}>
              <Trash2 className="w-3.5 h-3.5 mr-1" />Delete
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 text-xs text-slate-300 hover:text-white hover:bg-white/10" onClick={onAddTags}>
            <Tag className="w-3.5 h-3.5 mr-1" />Add Tags
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs text-slate-300 hover:text-white hover:bg-white/10" onClick={onRemoveTags}>
            <TagsIcon className="w-3.5 h-3.5 mr-1" />Remove Tags
          </Button>
          {selectedCount === 2 && (
            <Button size="sm" variant="ghost" className="h-7 text-xs text-slate-300 hover:text-white hover:bg-white/10" onClick={onMerge}>
              <Merge className="w-3.5 h-3.5 mr-1" />Merge
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 text-xs text-slate-300 hover:text-white hover:bg-white/10" onClick={onUpdateStage}>
            <ArrowRightLeft className="w-3.5 h-3.5 mr-1" />Stage
          </Button>
          {isAdmin && (
            <Button size="sm" variant="ghost" className="h-7 text-xs text-slate-300 hover:text-white hover:bg-white/10" onClick={onUpdateBrand}>
              <Building2 className="w-3.5 h-3.5 mr-1" />Brand
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 text-xs text-slate-300 hover:text-white hover:bg-white/10" onClick={onUpdateTerritories}>
            <MapPin className="w-3.5 h-3.5 mr-1" />Territories
          </Button>
          {isAdmin && (
            <Button size="sm" variant="ghost" className="h-7 text-xs text-slate-300 hover:text-white hover:bg-white/10" onClick={onSendNotification}>
              <Bell className="w-3.5 h-3.5 mr-1" />Notify
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Export Dialog ──────────────────────────────────────
const EXPORT_FIELDS = [
  { key: "firstName", label: "First Name" },
  { key: "lastName", label: "Last Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "address", label: "Address" },
  { key: "liquidCapital", label: "Liquid Capital" },
  { key: "mainTerritory", label: "Main Territory" },
  { key: "secondTerritory", label: "2nd Territory" },
  { key: "thirdTerritory", label: "3rd Territory" },
  { key: "numTerritories", label: "# Territories" },
  { key: "stage", label: "Stage" },
  { key: "source", label: "Source" },
  { key: "notes", label: "Notes" },
  { key: "tags", label: "Tags" },
  { key: "createdAt", label: "Date Added" },
];

export function BulkExportDialog({
  open,
  onClose,
  selectedLeads,
  brands,
}: {
  open: boolean;
  onClose: () => void;
  selectedLeads: any[];
  brands: any[];
}) {
  const [selectedFields, setSelectedFields] = useState<Set<string>>(
    new Set(EXPORT_FIELDS.map((f) => f.key))
  );

  const brandMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const b of brands) m[b._id] = b.name;
    return m;
  }, [brands]);

  const toggleField = (key: string) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAll = () => setSelectedFields(new Set(EXPORT_FIELDS.map((f) => f.key)));
  const deselectAll = () => setSelectedFields(new Set());

  const handleExport = () => {
    if (selectedFields.size === 0) { toast.error("Select at least one field"); return; }
    if (selectedLeads.length === 0) { toast.error("No leads to export"); return; }

    const fields = EXPORT_FIELDS.filter((f) => selectedFields.has(f.key));
    const headers = ["Brand", ...fields.map((f) => f.label)];

    const rows = selectedLeads.map((l) => {
      const row = [brandMap[l.brandId] || "Unknown"];
      for (const f of fields) {
        let val = (l as any)[f.key];
        if (f.key === "createdAt") val = val ? new Date(val).toLocaleDateString() : "";
        else if (f.key === "stage") val = getStage(val).label;
        else if (f.key === "tags") val = (val || []).join(", ");
        else val = val?.toString() || "";
        row.push(val);
      }
      return row;
    });

    const csv = [
      headers.join(","),
      ...rows.map((r) => r.map((c) => `"${(c || "").replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${selectedLeads.length} leads`);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export {selectedLeads.length} Contacts</DialogTitle>
          <DialogDescription>Choose which fields to include in the CSV export.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-7 text-xs border-white/10" onClick={selectAll}>Select All</Button>
            <Button size="sm" variant="outline" className="h-7 text-xs border-white/10" onClick={deselectAll}>Deselect All</Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {EXPORT_FIELDS.map((f) => (
              <label key={f.key} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-white">
                <Checkbox checked={selectedFields.has(f.key)} onCheckedChange={() => toggleField(f.key)} />
                {f.label}
              </label>
            ))}
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-white/5">
            <span className="text-xs text-slate-500">{selectedFields.size} fields · {selectedLeads.length} records</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onClose} className="border-white/10 text-slate-300">Cancel</Button>
              <Button size="sm" onClick={handleExport} className="bg-cyan-600 hover:bg-cyan-500 text-white">
                <Download className="w-3.5 h-3.5 mr-1.5" />Export CSV
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Delete Confirmation Dialog ────────────────────────
export function BulkDeleteDialog({
  open,
  onClose,
  selectedIds,
  onComplete,
}: {
  open: boolean;
  onClose: () => void;
  selectedIds: Id<"crmLeads">[];
  onComplete: () => void;
}) {
  const bulkDelete = useMutation(api.crm.bulkDelete);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await bulkDelete({ leadIds: selectedIds });
      toast.success(`${selectedIds.length} contact(s) moved to Recently Deleted`);
      onComplete();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            Delete {selectedIds.length} Contact{selectedIds.length !== 1 ? "s" : ""}?
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-400 mt-1">
          These contacts will be moved to <span className="text-white font-medium">Recently Deleted</span> and can be restored within 6 months.
        </p>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={onClose} className="border-white/10 text-slate-300" disabled={loading}>Cancel</Button>
          <Button size="sm" onClick={handleDelete} className="bg-red-600 hover:bg-red-500 text-white" disabled={loading}>
            {loading ? "Deleting..." : "Yes, Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Add Tags Dialog ───────────────────────────────────
export function BulkAddTagsDialog({
  open,
  onClose,
  selectedIds,
  onComplete,
}: {
  open: boolean;
  onClose: () => void;
  selectedIds: Id<"crmLeads">[];
  onComplete: () => void;
}) {
  const allTags = useQuery(api.tags.list);
  const addToContacts = useMutation(api.tags.addToContacts);
  const createTag = useMutation(api.tags.create);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) { setSearch(""); setSelected([]); }
  }, [open]);

  const filteredTags = useMemo(() => {
    if (!allTags) return [];
    if (!search) return allTags;
    return allTags.filter((t) => t.name.includes(search.toLowerCase()));
  }, [allTags, search]);

  const searchNoMatch = search && allTags && !allTags.some((t) => t.name === search.toLowerCase().trim());

  const toggleTag = (name: string) => {
    setSelected((prev) => prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name]);
  };

  const handleCreateAndSelect = async () => {
    try {
      const result = await createTag({ name: search.trim() });
      setSelected((prev) => [...prev, result.name]);
      setSearch("");
      toast.success(`Tag "${result.name}" created`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create tag");
    }
  };

  const handleApply = async () => {
    if (selected.length === 0) { toast.error("Select at least one tag"); return; }
    setLoading(true);
    try {
      await addToContacts({ tagNames: selected, leadIds: selectedIds });
      toast.success(`Added ${selected.length} tag(s) to ${selectedIds.length} contact(s)`);
      onComplete();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to add tags");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Tags to {selectedIds.length} Contact{selectedIds.length !== 1 ? "s" : ""}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <Input
            placeholder="Search or create tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-white/5 border-white/10"
          />
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selected.map((t) => (
                <Badge key={t} variant="secondary" className="bg-cyan-500/15 text-cyan-400 border-cyan-500/30 cursor-pointer hover:bg-cyan-500/25" onClick={() => toggleTag(t)}>
                  {t} <X className="w-3 h-3 ml-1" />
                </Badge>
              ))}
            </div>
          )}
          <ScrollArea className="h-[200px]">
            <div className="space-y-1">
              {filteredTags.map((tag) => (
                <button
                  key={tag._id}
                  onClick={() => toggleTag(tag.name)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    selected.includes(tag.name)
                      ? "bg-cyan-500/15 text-cyan-400"
                      : "text-slate-300 hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {selected.includes(tag.name) && <Check className="w-3.5 h-3.5" />}
                    <span>{tag.name}</span>
                  </div>
                </button>
              ))}
              {searchNoMatch && (
                <button onClick={handleCreateAndSelect} className="w-full text-left px-3 py-2 rounded-md text-sm text-cyan-400 hover:bg-cyan-500/10 flex items-center gap-2">
                  <Plus className="w-3.5 h-3.5" /> Create "{search.trim().toLowerCase()}"
                </button>
              )}
            </div>
          </ScrollArea>
          <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
            <Button variant="outline" size="sm" onClick={onClose} className="border-white/10 text-slate-300" disabled={loading}>Cancel</Button>
            <Button size="sm" onClick={handleApply} className="bg-cyan-600 hover:bg-cyan-500 text-white" disabled={loading || selected.length === 0}>
              {loading ? "Applying..." : `Add ${selected.length} Tag${selected.length !== 1 ? "s" : ""}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Remove Tags Dialog ────────────────────────────────
export function BulkRemoveTagsDialog({
  open,
  onClose,
  selectedIds,
  selectedLeads,
  onComplete,
}: {
  open: boolean;
  onClose: () => void;
  selectedIds: Id<"crmLeads">[];
  selectedLeads: any[];
  onComplete: () => void;
}) {
  const removeFromContacts = useMutation(api.tags.removeFromContacts);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Collect all unique tags from selected leads
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const lead of selectedLeads) {
      if (lead.tags) lead.tags.forEach((t: string) => tagSet.add(t));
    }
    return Array.from(tagSet).sort();
  }, [selectedLeads]);

  useEffect(() => { if (open) setSelected([]); }, [open]);

  const toggleTag = (name: string) => {
    setSelected((prev) => prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name]);
  };

  const handleApply = async () => {
    if (selected.length === 0) { toast.error("Select at least one tag to remove"); return; }
    setLoading(true);
    try {
      await removeFromContacts({ tagNames: selected, leadIds: selectedIds });
      toast.success(`Removed ${selected.length} tag(s) from ${selectedIds.length} contact(s)`);
      onComplete();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove tags");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Remove Tags from {selectedIds.length} Contact{selectedIds.length !== 1 ? "s" : ""}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          {availableTags.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">No tags on selected contacts.</p>
          ) : (
            <div className="space-y-1">
              {availableTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    selected.includes(tag)
                      ? "bg-red-500/15 text-red-400"
                      : "text-slate-300 hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {selected.includes(tag) && <X className="w-3.5 h-3.5" />}
                    <span>{tag}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
            <Button variant="outline" size="sm" onClick={onClose} className="border-white/10 text-slate-300" disabled={loading}>Cancel</Button>
            <Button size="sm" onClick={handleApply} className="bg-red-600 hover:bg-red-500 text-white" disabled={loading || selected.length === 0}>
              {loading ? "Removing..." : `Remove ${selected.length} Tag${selected.length !== 1 ? "s" : ""}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Merge Contacts Dialog ─────────────────────────────
const MERGE_FIELDS = [
  { key: "firstName", label: "First Name" },
  { key: "lastName", label: "Last Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "address", label: "Address" },
  { key: "liquidCapital", label: "Liquid Capital" },
  { key: "mainTerritory", label: "Main Territory" },
  { key: "secondTerritory", label: "2nd Territory" },
  { key: "thirdTerritory", label: "3rd Territory" },
  { key: "notes", label: "Notes" },
  { key: "stage", label: "Stage" },
] as const;

export function MergeContactsDialog({
  open,
  onClose,
  leads,
  onComplete,
}: {
  open: boolean;
  onClose: () => void;
  leads: any[];
  onComplete: () => void;
}) {
  const mergeContacts = useMutation(api.crm.mergeContacts);
  const [primaryIdx, setPrimaryIdx] = useState(0);
  // Track which fields take secondary value
  const [useSecondary, setUseSecondary] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (open) { setPrimaryIdx(0); setUseSecondary(new Set()); } }, [open]);

  if (leads.length !== 2) return null;
  const primary = leads[primaryIdx];
  const secondary = leads[primaryIdx === 0 ? 1 : 0];

  const handleMerge = async () => {
    setLoading(true);
    try {
      const resolvedFields: Record<string, "secondary"> = {};
      for (const key of useSecondary) {
        resolvedFields[key] = "secondary";
      }
      await mergeContacts({
        primaryId: primary._id,
        secondaryId: secondary._id,
        resolvedFields,
      });
      toast.success("Contacts merged successfully");
      onComplete();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to merge");
    } finally {
      setLoading(false);
    }
  };

  const toggleField = (key: string) => {
    setUseSecondary((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const formatVal = (lead: any, key: string) => {
    const val = lead[key];
    if (!val) return "—";
    if (key === "stage") return getStage(val).label;
    return String(val);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Merge Contacts</DialogTitle>
          <DialogDescription>
            Choose which values to keep. The primary contact keeps the record ID. The secondary will be soft-deleted.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {/* Primary selector */}
          <div className="flex gap-3">
            {leads.map((lead, idx) => (
              <button
                key={lead._id}
                onClick={() => setPrimaryIdx(idx)}
                className={`flex-1 p-3 rounded-lg border text-left transition-colors ${
                  primaryIdx === idx
                    ? "border-cyan-500/50 bg-cyan-500/10"
                    : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {primaryIdx === idx && <Badge className="bg-cyan-500/20 text-cyan-400 text-[10px]">Primary</Badge>}
                  {primaryIdx !== idx && <Badge variant="outline" className="border-white/10 text-slate-500 text-[10px]">Secondary</Badge>}
                </div>
                <p className="text-sm font-medium text-white">{lead.firstName} {lead.lastName || ""}</p>
                <p className="text-xs text-slate-500 mt-0.5">{lead.email || "No email"}</p>
              </button>
            ))}
          </div>

          {/* Field resolution */}
          <div className="border border-white/5 rounded-lg overflow-hidden">
            <div className="grid grid-cols-[140px_1fr_1fr] gap-0 text-xs">
              <div className="px-3 py-2 font-medium text-slate-500 bg-white/[0.02] border-b border-white/5">Field</div>
              <div className="px-3 py-2 font-medium text-cyan-400 bg-white/[0.02] border-b border-l border-white/5">Primary</div>
              <div className="px-3 py-2 font-medium text-slate-400 bg-white/[0.02] border-b border-l border-white/5">Secondary</div>
              {MERGE_FIELDS.map((f) => {
                const pVal = formatVal(primary, f.key);
                const sVal = formatVal(secondary, f.key);
                const isSecondary = useSecondary.has(f.key);
                return (
                  <div key={f.key} className="contents">
                    <div className="px-3 py-2 text-slate-400 border-b border-white/5 flex items-center">{f.label}</div>
                    <button
                      onClick={() => { if (isSecondary) toggleField(f.key); }}
                      className={`px-3 py-2 border-b border-l border-white/5 text-left transition-colors ${
                        !isSecondary ? "bg-cyan-500/5 text-white" : "text-slate-500 hover:bg-white/[0.02]"
                      }`}
                    >
                      {!isSecondary && <Check className="w-3 h-3 inline mr-1 text-cyan-400" />}
                      {pVal}
                    </button>
                    <button
                      onClick={() => { if (!isSecondary) toggleField(f.key); }}
                      className={`px-3 py-2 border-b border-l border-white/5 text-left transition-colors ${
                        isSecondary ? "bg-cyan-500/5 text-white" : "text-slate-500 hover:bg-white/[0.02]"
                      }`}
                    >
                      {isSecondary && <Check className="w-3 h-3 inline mr-1 text-cyan-400" />}
                      {sVal}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Tags and interested territories from both contacts will be merged automatically.
          </p>

          <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
            <Button variant="outline" size="sm" onClick={onClose} className="border-white/10 text-slate-300" disabled={loading}>Cancel</Button>
            <Button size="sm" onClick={handleMerge} className="bg-cyan-600 hover:bg-cyan-500 text-white" disabled={loading}>
              {loading ? "Merging..." : "Merge Contacts"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Update Stage Dialog ───────────────────────────────
export function BulkUpdateStageDialog({
  open,
  onClose,
  selectedIds,
  onComplete,
}: {
  open: boolean;
  onClose: () => void;
  selectedIds: Id<"crmLeads">[];
  onComplete: () => void;
}) {
  const bulkUpdateStage = useMutation(api.crm.bulkUpdateStage);
  const [stage, setStage] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (open) setStage(""); }, [open]);

  const handleApply = async () => {
    if (!stage) { toast.error("Select a stage"); return; }
    setLoading(true);
    try {
      await bulkUpdateStage({ leadIds: selectedIds, stage: stage as StageId });
      toast.success(`Updated ${selectedIds.length} contact(s) to ${getStage(stage).label}`);
      onComplete();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to update stage");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Update Stage for {selectedIds.length} Contact{selectedIds.length !== 1 ? "s" : ""}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <Select value={stage} onValueChange={setStage}>
            <SelectTrigger className="bg-white/5 border-white/10">
              <SelectValue placeholder="Select new stage..." />
            </SelectTrigger>
            <SelectContent>
              {STAGES.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                    {s.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="border-white/10 text-slate-300" disabled={loading}>Cancel</Button>
            <Button size="sm" onClick={handleApply} className="bg-cyan-600 hover:bg-cyan-500 text-white" disabled={loading || !stage}>
              {loading ? "Applying..." : "Apply"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Update Brand Dialog ───────────────────────────────
export function BulkUpdateBrandDialog({
  open,
  onClose,
  selectedIds,
  brands,
  onComplete,
}: {
  open: boolean;
  onClose: () => void;
  selectedIds: Id<"crmLeads">[];
  brands: any[];
  onComplete: () => void;
}) {
  const bulkUpdateBrand = useMutation(api.crm.bulkUpdateBrand);
  const [brandId, setBrandId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (open) setBrandId(""); }, [open]);

  const handleApply = async () => {
    if (!brandId) { toast.error("Select a brand"); return; }
    setLoading(true);
    try {
      await bulkUpdateBrand({ leadIds: selectedIds, brandId: brandId as Id<"brands"> });
      const brand = brands.find((b) => b._id === brandId);
      toast.success(`Moved ${selectedIds.length} contact(s) to ${brand?.name || "brand"}`);
      onComplete();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to update brand");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Move {selectedIds.length} Contact{selectedIds.length !== 1 ? "s" : ""} to Brand</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <Select value={brandId} onValueChange={setBrandId}>
            <SelectTrigger className="bg-white/5 border-white/10">
              <SelectValue placeholder="Select brand..." />
            </SelectTrigger>
            <SelectContent>
              {brands.map((b) => (
                <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="border-white/10 text-slate-300" disabled={loading}>Cancel</Button>
            <Button size="sm" onClick={handleApply} className="bg-cyan-600 hover:bg-cyan-500 text-white" disabled={loading || !brandId}>
              {loading ? "Moving..." : "Apply"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Update Territories Dialog ─────────────────────────
export function BulkUpdateTerritoriesDialog({
  open,
  onClose,
  selectedIds,
  onComplete,
}: {
  open: boolean;
  onClose: () => void;
  selectedIds: Id<"crmLeads">[];
  onComplete: () => void;
}) {
  const bulkUpdateTerritories = useMutation(api.crm.bulkUpdateTerritories);
  const [territories, setTerritories] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (open) setTerritories(""); }, [open]);

  const handleApply = async () => {
    const list = territories.split(",").map((t) => t.trim()).filter(Boolean);
    if (list.length === 0) { toast.error("Enter at least one territory"); return; }
    setLoading(true);
    try {
      await bulkUpdateTerritories({ leadIds: selectedIds, interestedTerritories: list });
      toast.success(`Updated territories for ${selectedIds.length} contact(s)`);
      onComplete();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to update territories");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Territories for {selectedIds.length} Contact{selectedIds.length !== 1 ? "s" : ""}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label className="text-xs text-slate-400">Territories (comma-separated)</Label>
            <Input
              value={territories}
              onChange={(e) => setTerritories(e.target.value)}
              className="mt-1.5 bg-white/5 border-white/10"
              placeholder="Austin TX, Dallas TX, Houston TX"
            />
            <p className="text-[11px] text-slate-600 mt-1">This will replace existing interested territories for selected contacts.</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="border-white/10 text-slate-300" disabled={loading}>Cancel</Button>
            <Button size="sm" onClick={handleApply} className="bg-cyan-600 hover:bg-cyan-500 text-white" disabled={loading}>
              {loading ? "Applying..." : "Apply"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
