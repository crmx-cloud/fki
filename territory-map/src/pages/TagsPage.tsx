import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Tag, Plus, Search, Trash2, Upload, AlertTriangle } from "lucide-react";

const TAG_RE = /^[a-z0-9_\-*|]+$/;
const TAG_MAX_LEN = 30;

export function TagsPage() {
  const tags = useQuery(api.tags.list);
  const allLeads = useQuery(api.crm.listAllLeads);
  const createTag = useMutation(api.tags.create);
  const createBulk = useMutation(api.tags.createBulk);
  const importCsv = useMutation(api.tags.importFromCsv);
  const deleteTag = useMutation(api.tags.deleteTag);
  const deleteBulk = useMutation(api.tags.deleteBulk);

  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Count leads per tag
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (allLeads) {
      for (const lead of allLeads) {
        if (lead.tags) {
          for (const t of lead.tags) {
            counts[t] = (counts[t] || 0) + 1;
          }
        }
      }
    }
    return counts;
  }, [allLeads]);

  const filteredTags = useMemo(() => {
    if (!tags) return [];
    if (!search) return tags;
    return tags.filter((t) => t.name.includes(search.toLowerCase()));
  }, [tags, search]);

  const toggleSelect = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filteredTags.length) setSelected(new Set());
    else setSelected(new Set(filteredTags.map((t) => t.name)));
  };

  const handleDeleteSelected = async () => {
    const names = Array.from(selected);
    try {
      await deleteBulk({ names });
      toast.success(`Deleted ${names.length} tag(s)`);
      setSelected(new Set());
      setShowDeleteConfirm(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete tags");
    }
  };

  const handleDeleteSingle = async (name: string) => {
    try {
      await deleteTag({ name });
      toast.success(`Tag "${name}" deleted`);
      setSelected((prev) => { const n = new Set(prev); n.delete(name); return n; });
    } catch (err: any) {
      toast.error(err.message || "Failed to delete tag");
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="px-4 lg:px-6 py-4 border-b border-white/5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">Tags</h1>
            {tags && <span className="text-sm text-slate-500">{tags.length} total</span>}
          </div>
          <Button size="sm" className="h-8 bg-cyan-600 hover:bg-cyan-500 text-white" onClick={() => setShowCreate(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />Create Tag
          </Button>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <Input placeholder="Search tags..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 pl-8 text-sm bg-white/5 border-white/10" />
          </div>
          {selected.size > 0 && (
            <Button size="sm" variant="outline" className="h-8 text-red-400 border-red-500/30 hover:bg-red-500/10" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />Delete {selected.size}
            </Button>
          )}
        </div>
      </div>

      {/* Tags list */}
      <div className="flex-1 overflow-auto p-4 lg:p-6">
        {!tags ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-white/[0.02] rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filteredTags.length === 0 ? (
          <div className="py-16 text-center">
            <Tag className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <h3 className="text-base font-medium text-white mb-1">
              {search ? "No matching tags" : "No tags yet"}
            </h3>
            <p className="text-sm text-slate-500 max-w-xs mx-auto">
              {search ? "Try a different search." : "Create tags to organize and filter your contacts."}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center gap-3 px-3 py-2 text-xs text-slate-500">
              <Checkbox
                checked={filteredTags.length > 0 && selected.size === filteredTags.length}
                onCheckedChange={toggleAll}
              />
              <span className="flex-1">Tag Name</span>
              <span className="w-20 text-right">Contacts</span>
              <span className="w-16" />
            </div>
            {filteredTags.map((tag) => (
              <div key={tag._id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.02] group transition-colors">
                <Checkbox checked={selected.has(tag.name)} onCheckedChange={() => toggleSelect(tag.name)} />
                <div className="flex-1 flex items-center gap-2">
                  <Badge variant="secondary" className="bg-white/5 text-slate-300 border-white/10 text-xs">
                    {tag.name}
                  </Badge>
                </div>
                <span className="w-20 text-right text-sm text-slate-400">{tagCounts[tag.name] || 0}</span>
                <div className="w-16 flex justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-slate-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDeleteSingle(tag.name)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Tag Dialog */}
      <CreateTagDialog open={showCreate} onClose={() => setShowCreate(false)} />

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={(v) => { if (!v) setShowDeleteConfirm(false); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Delete {selected.size} Tag{selected.size !== 1 ? "s" : ""}?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-400 mt-1">
            This will also remove these tags from all contacts that use them. This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(false)} className="border-white/10 text-slate-300">Cancel</Button>
            <Button size="sm" onClick={handleDeleteSelected} className="bg-red-600 hover:bg-red-500 text-white">Delete Tags</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Create Tag Dialog ─────────────────────────────────
function CreateTagDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createTag = useMutation(api.tags.create);
  const createBulk = useMutation(api.tags.createBulk);
  const importCsv = useMutation(api.tags.importFromCsv);

  const [singleName, setSingleName] = useState("");
  const [bulkNames, setBulkNames] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const singleValid = singleName.trim().length > 0 && singleName.trim().length <= TAG_MAX_LEN && TAG_RE.test(singleName.trim().toLowerCase());
  const singleWarning = singleName.trim().length > 0 && !TAG_RE.test(singleName.trim().toLowerCase())
    ? "Only letters, numbers, _ - * | allowed"
    : singleName.trim().length > TAG_MAX_LEN
    ? `Exceeds ${TAG_MAX_LEN} characters`
    : null;

  const handleCreateSingle = async () => {
    setLoading(true);
    try {
      await createTag({ name: singleName.trim() });
      toast.success(`Tag "${singleName.trim().toLowerCase()}" created`);
      setSingleName("");
    } catch (err: any) {
      if (err.message?.includes("already exists")) {
        toast.error(`Tag "${singleName.trim().toLowerCase()}" already exists. Apply it to contacts instead.`);
      } else {
        toast.error(err.message || "Failed to create tag");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBulk = async () => {
    if (!bulkNames.trim()) { toast.error("Enter some tag names"); return; }
    setLoading(true);
    try {
      const result = await createBulk({ names: bulkNames });
      const parts = [];
      if (result.created.length > 0) parts.push(`Created: ${result.created.join(", ")}`);
      if (result.skipped.length > 0) parts.push(`Already existed: ${result.skipped.join(", ")}`);
      toast.success(parts.join(". ") || "Done");
      setBulkNames("");
    } catch (err: any) {
      toast.error(err.message || "Failed to create tags");
    } finally {
      setLoading(false);
    }
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const text = await file.text();
      const result = await importCsv({ csvContent: text });
      const parts = [];
      if (result.created.length > 0) parts.push(`Created ${result.created.length} tag(s)`);
      if (result.skipped.length > 0) parts.push(`${result.skipped.length} already existed`);
      if (result.invalid.length > 0) parts.push(`${result.invalid.length} invalid`);
      toast.success(parts.join(". ") || "Import complete");
    } catch (err: any) {
      toast.error(err.message || "Failed to import CSV");
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Tags</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="single" className="mt-2">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="single" className="text-xs">Single</TabsTrigger>
            <TabsTrigger value="bulk" className="text-xs">Bulk</TabsTrigger>
            <TabsTrigger value="csv" className="text-xs">CSV Import</TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="space-y-3 mt-3">
            <div>
              <Label className="text-xs text-slate-400">Tag Name</Label>
              <Input
                value={singleName}
                onChange={(e) => setSingleName(e.target.value.toLowerCase())}
                className="mt-1 bg-white/5 border-white/10"
                placeholder="e.g. high-priority"
                maxLength={TAG_MAX_LEN + 5}
              />
              <div className="flex items-center justify-between mt-1">
                {singleWarning ? (
                  <span className="text-[11px] text-amber-400">{singleWarning}</span>
                ) : (
                  <span className="text-[11px] text-slate-600">letters, numbers, _ - * | only</span>
                )}
                <span className="text-[11px] text-slate-600">{singleName.trim().length}/{TAG_MAX_LEN}</span>
              </div>
            </div>
            <Button size="sm" onClick={handleCreateSingle} disabled={!singleValid || loading} className="bg-cyan-600 hover:bg-cyan-500 text-white w-full">
              {loading ? "Creating..." : "Create Tag"}
            </Button>
          </TabsContent>

          <TabsContent value="bulk" className="space-y-3 mt-3">
            <div>
              <Label className="text-xs text-slate-400">Tag Names (comma-separated)</Label>
              <Textarea
                value={bulkNames}
                onChange={(e) => setBulkNames(e.target.value)}
                className="mt-1 bg-white/5 border-white/10 min-h-[100px] text-sm"
                placeholder="vip, hot-lead, q1-2026, follow-up"
              />
            </div>
            <Button size="sm" onClick={handleCreateBulk} disabled={!bulkNames.trim() || loading} className="bg-cyan-600 hover:bg-cyan-500 text-white w-full">
              {loading ? "Creating..." : "Create Tags"}
            </Button>
          </TabsContent>

          <TabsContent value="csv" className="space-y-3 mt-3">
            <p className="text-xs text-slate-400">Upload a CSV file with one tag per row (first column is used).</p>
            <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleCsvUpload} className="hidden" />
            <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={loading} className="w-full border-white/10 text-slate-300 hover:bg-white/5">
              <Upload className="w-3.5 h-3.5 mr-2" />{loading ? "Importing..." : "Choose CSV File"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
