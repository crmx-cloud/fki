import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Trash2, RotateCcw, AlertTriangle } from "lucide-react";
import { getStage } from "./BulkActions";

export function RecentlyDeletedSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const deletedLeads = useQuery(api.crm.listDeletedLeads);
  const restoreLead = useMutation(api.crm.restoreLead);
  const permanentlyDelete = useMutation(api.crm.permanentlyDelete);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<string | null>(null);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (!deletedLeads) return;
    if (selected.size === deletedLeads.length) setSelected(new Set());
    else setSelected(new Set(deletedLeads.map((l) => l._id)));
  };

  const handleRestore = async (id: Id<"crmLeads">) => {
    setLoading(id);
    try {
      await restoreLead({ leadId: id });
      toast.success("Lead restored");
      setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
    } catch (err: any) {
      toast.error(err.message || "Failed to restore");
    } finally {
      setLoading(null);
    }
  };

  const handlePermanentDelete = async (id: Id<"crmLeads">) => {
    if (!confirm("Permanently delete this lead? This cannot be undone.")) return;
    setLoading(id);
    try {
      await permanentlyDelete({ leadId: id });
      toast.success("Permanently deleted");
      setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    } finally {
      setLoading(null);
    }
  };

  const handleBulkRestore = async () => {
    const ids = Array.from(selected);
    for (const id of ids) {
      try { await restoreLead({ leadId: id as Id<"crmLeads"> }); } catch { /* skip */ }
    }
    toast.success(`Restored ${ids.length} lead(s)`);
    setSelected(new Set());
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Permanently delete ${selected.size} lead(s)? This cannot be undone.`)) return;
    const ids = Array.from(selected);
    for (const id of ids) {
      try { await permanentlyDelete({ leadId: id as Id<"crmLeads"> }); } catch { /* skip */ }
    }
    toast.success(`Permanently deleted ${ids.length} lead(s)`);
    setSelected(new Set());
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="w-full sm:max-w-lg bg-slate-950 border-white/10">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-slate-500" />
            Recently Deleted
          </SheetTitle>
          <SheetDescription>
            Soft-deleted contacts from the last 6 months. Restore or permanently remove them.
          </SheetDescription>
        </SheetHeader>

        {selected.size > 0 && (
          <div className="flex items-center gap-2 mt-4 p-2 rounded-lg bg-white/[0.03] border border-white/5">
            <span className="text-xs text-slate-400 flex-1">{selected.size} selected</span>
            <Button size="sm" variant="ghost" className="h-7 text-xs text-cyan-400 hover:text-cyan-300" onClick={handleBulkRestore}>
              <RotateCcw className="w-3 h-3 mr-1" />Restore
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs text-red-400 hover:text-red-300" onClick={handleBulkDelete}>
              <Trash2 className="w-3 h-3 mr-1" />Delete Forever
            </Button>
          </div>
        )}

        <ScrollArea className="h-[calc(100vh-200px)] mt-4">
          {!deletedLeads ? (
            <div className="py-8 text-center text-slate-500 text-sm">Loading...</div>
          ) : deletedLeads.length === 0 ? (
            <div className="py-12 text-center">
              <Trash2 className="w-8 h-8 text-slate-700 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No recently deleted contacts.</p>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center gap-2 px-3 py-2">
                <Checkbox checked={deletedLeads.length > 0 && selected.size === deletedLeads.length} onCheckedChange={toggleAll} />
                <span className="text-xs text-slate-500">{deletedLeads.length} deleted contact{deletedLeads.length !== 1 ? "s" : ""}</span>
              </div>
              {deletedLeads.map((lead) => {
                const deletedDate = lead.deletedAt ? new Date(lead.deletedAt).toLocaleDateString() : "";
                const stage = getStage(lead.stage);
                return (
                  <div key={lead._id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.02] group">
                    <Checkbox checked={selected.has(lead._id)} onCheckedChange={() => toggleSelect(lead._id)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{lead.firstName} {lead.lastName || ""}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${stage.bgClass}`}>{stage.label}</Badge>
                        <span className="text-[10px] text-slate-600">Deleted {deletedDate}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10" onClick={() => handleRestore(lead._id)} disabled={loading === lead._id}>
                        <RotateCcw className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => handlePermanentDelete(lead._id)} disabled={loading === lead._id}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
