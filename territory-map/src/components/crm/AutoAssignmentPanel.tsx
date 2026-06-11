import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Shuffle, UserPlus, Users, Trash2, Plus, Check, X,
  ToggleLeft, ToggleRight, Percent, Equal, Settings2,
} from "lucide-react";

interface Assignee {
  userId: Id<"users">;
  ratio?: number;
  name?: string;
  role?: string;
}

export default function AutoAssignmentPanel({ brandId }: { brandId?: Id<"brands"> }) {
  const rules = useQuery(api.autoAssignment.list, { brandId }) || [];
  const profiles = useQuery(api.users.listProfiles) || [];
  const upsert = useMutation(api.autoAssignment.upsert);
  const deleteRule = useMutation(api.autoAssignment.deleteRule);

  const [editing, setEditing] = useState(false);
  const [mode, setMode] = useState<"equal" | "custom_ratio">("equal");
  const [assignAs, setAssignAs] = useState<"sales_rep" | "setter">("sales_rep");
  const [isActive, setIsActive] = useState(true);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [editRuleId, setEditRuleId] = useState<string | null>(null);

  const internalUsers = profiles.filter(
    (p: any) => ["super_admin", "admin", "standard", "closer", "setter"].includes(p.role) && p.isActive !== false
  );

  const availableUsers = internalUsers.filter(
    (p: any) => !assignees.some((a) => a.userId === p.userId)
  );

  const startEdit = (rule?: any) => {
    if (rule) {
      setEditRuleId(rule._id);
      setMode(rule.mode);
      setAssignAs(rule.assignAs);
      setIsActive(rule.isActive);
      setAssignees(
        rule.assignees.map((a: any) => {
          const p = internalUsers.find((u: any) => u.userId === a.userId);
          return { ...a, name: p ? `${p.firstName || ""} ${p.lastName || ""}`.trim() : "Unknown", role: p?.role };
        })
      );
    } else {
      setEditRuleId(null);
      setMode("equal");
      setAssignAs("sales_rep");
      setIsActive(true);
      setAssignees([]);
    }
    setEditing(true);
  };

  const handleSave = async () => {
    if (assignees.length === 0) return alert("Add at least one user");
    try {
      await upsert({
        ruleId: editRuleId ? (editRuleId as Id<"autoAssignmentRules">) : undefined,
        brandId,
        mode,
        isActive,
        assignees: assignees.map((a) => ({ userId: a.userId, ratio: a.ratio })),
        assignAs,
      });
      setEditing(false);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const addUser = (profile: any) => {
    setAssignees([
      ...assignees,
      {
        userId: profile.userId,
        ratio: 1,
        name: `${profile.firstName || ""} ${profile.lastName || ""}`.trim(),
        role: profile.role,
      },
    ]);
  };

  const removeUser = (userId: string) => {
    setAssignees(assignees.filter((a) => a.userId !== userId));
  };

  const updateRatio = (userId: string, ratio: number) => {
    setAssignees(assignees.map((a) => (a.userId === userId ? { ...a, ratio } : a)));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shuffle className="w-4 h-4 text-indigo-500" />
          <h3 className="text-sm font-semibold text-slate-800">Auto-Assignment</h3>
        </div>
        {!editing && (
          <Button size="sm" variant="outline" onClick={() => startEdit()} className="h-7 text-xs gap-1">
            <Plus className="w-3 h-3" /> New Rule
          </Button>
        )}
      </div>

      {/* Existing rules */}
      {!editing && rules.length > 0 && (
        <div className="space-y-2">
          {rules.map((rule: any) => (
            <div key={rule._id} className="border border-slate-200 rounded-xl p-3 bg-white">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant={rule.isActive ? "default" : "secondary"} className="text-[10px] px-1.5">
                    {rule.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <span className="text-xs text-slate-500">
                    {rule.mode === "equal" ? "Equal rotation" : "Custom ratio"} → {rule.assignAs === "sales_rep" ? "Consultant" : "Setter"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => startEdit(rule)} className="h-6 text-[10px] px-2">
                    <Settings2 className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      if (confirm("Delete this rule?")) await deleteRule({ ruleId: rule._id });
                    }}
                    className="h-6 text-[10px] px-2 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {rule.assignees.map((a: any) => {
                  const p = internalUsers.find((u: any) => u.userId === a.userId);
                  return (
                    <Badge key={a.userId} variant="outline" className="text-xs gap-1">
                      {p ? `${p.firstName || ""} ${p.lastName || ""}`.trim() : "?"}
                      {rule.mode === "custom_ratio" && a.ratio && (
                        <span className="text-slate-400">×{a.ratio}</span>
                      )}
                    </Badge>
                  );
                })}
              </div>
              <div className="text-[10px] text-slate-400 mt-2">
                Total assigned: {rule.totalAssigned || 0}
              </div>
            </div>
          ))}
        </div>
      )}

      {!editing && rules.length === 0 && (
        <div className="text-center py-6 text-slate-400">
          <Shuffle className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No auto-assignment rules</p>
          <p className="text-xs">New leads will need manual assignment</p>
        </div>
      )}

      {/* Editor */}
      {editing && (
        <div className="border border-indigo-200 rounded-xl p-4 bg-indigo-50/30 space-y-4">
          {/* Mode toggle */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-600 w-16">Mode:</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setMode("equal")}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${mode === "equal" ? "bg-indigo-100 text-indigo-700 border border-indigo-300" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
              >
                <Equal className="w-3 h-3" /> Equal
              </button>
              <button
                type="button"
                onClick={() => setMode("custom_ratio")}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${mode === "custom_ratio" ? "bg-indigo-100 text-indigo-700 border border-indigo-300" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
              >
                <Percent className="w-3 h-3" /> Custom Ratio
              </button>
            </div>
          </div>

          {/* Assign as */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-600 w-16">Assign as:</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setAssignAs("sales_rep")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${assignAs === "sales_rep" ? "bg-emerald-100 text-emerald-700 border border-emerald-300" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
              >
                Consultant
              </button>
              <button
                type="button"
                onClick={() => setAssignAs("setter")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${assignAs === "setter" ? "bg-blue-100 text-blue-700 border border-blue-300" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
              >
                Setter
              </button>
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-600 w-16">Status:</span>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className="flex items-center gap-1.5 text-xs"
            >
              {isActive ? (
                <ToggleRight className="w-5 h-5 text-emerald-500" />
              ) : (
                <ToggleLeft className="w-5 h-5 text-slate-400" />
              )}
              <span className={isActive ? "text-emerald-600" : "text-slate-400"}>
                {isActive ? "Active" : "Inactive"}
              </span>
            </button>
          </div>

          {/* Assignees */}
          <div>
            <div className="text-xs font-medium text-slate-600 mb-2">Team Members:</div>
            <div className="space-y-1.5">
              {assignees.map((a) => (
                <div key={a.userId} className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-700 flex-1">{a.name}</span>
                  <Badge variant="outline" className="text-[9px] px-1 py-0">{a.role}</Badge>
                  {mode === "custom_ratio" && (
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={a.ratio || 1}
                      onChange={(e) => updateRatio(a.userId, parseInt(e.target.value) || 1)}
                      className="w-14 h-6 text-xs text-center"
                    />
                  )}
                  <button type="button" onClick={() => removeUser(a.userId)} className="p-0.5 rounded hover:bg-red-50">
                    <X className="w-3 h-3 text-red-400" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add user dropdown */}
            {availableUsers.length > 0 && (
              <div className="mt-2">
                <select
                  className="w-full h-7 text-xs border border-slate-200 rounded-lg px-2 bg-white text-slate-600"
                  value=""
                  onChange={(e) => {
                    const p = internalUsers.find((u: any) => u.userId === e.target.value);
                    if (p) addUser(p);
                  }}
                >
                  <option value="">+ Add team member...</option>
                  {availableUsers.map((p: any) => (
                    <option key={p.userId} value={p.userId}>
                      {p.firstName || ""} {p.lastName || ""} ({p.role})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="h-7 text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={assignees.length === 0} className="h-7 text-xs gap-1">
              <Check className="w-3 h-3" /> Save Rule
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
