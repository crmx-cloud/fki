import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Users, MapPin, Tag, Heart, Building2, StickyNote, Link2,
  UserCheck, UserPlus, X, Plus, Search, ChevronRight, ExternalLink,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────

interface AssociationsPanelProps {
  contactId: Id<"crmLeads">;
  lead: any;
  isAdmin: boolean;
  onNavigateBrand?: (slug: string) => void;
}

// ── Association Section ────────────────────────────────────

function AssociationSection({
  icon: Icon,
  title,
  count,
  children,
  color = "slate",
}: {
  icon: any;
  title: string;
  count: number;
  children: React.ReactNode;
  color?: string;
}) {
  const [expanded, setExpanded] = useState(count > 0);

  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 text-${color}-500`} />
          <span className="text-sm font-medium text-slate-700">{title}</span>
          {count > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
              {count}
            </Badge>
          )}
        </div>
        <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? "rotate-90" : ""}`} />
      </button>
      {expanded && (
        <div className="px-3 pb-3 border-t border-slate-50">
          {children}
        </div>
      )}
    </div>
  );
}

// ── User Picker (for Consultant / Setter) ───────────────────

function UserPicker({
  currentUserId,
  label,
  onSelect,
  onClear,
}: {
  currentUserId?: string | null;
  label: string;
  onSelect: (userId: Id<"users">) => void;
  onClear: () => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState("");
  const profiles = useQuery(api.users.listProfiles) || [];

  const internalUsers = profiles.filter(
    (p: any) => ["super_admin", "admin", "standard", "closer", "setter"].includes(p.role) && p.isActive !== false
  );

  const filtered = search
    ? internalUsers.filter((p: any) =>
        `${p.firstName || ""} ${p.lastName || ""} ${p.email || ""}`
          .toLowerCase()
          .includes(search.toLowerCase())
      )
    : internalUsers;

  const current = currentUserId
    ? internalUsers.find((p: any) => p.userId === currentUserId)
    : null;

  return (
    <div className="mt-2">
      {current ? (
        <div className="flex items-center justify-between bg-slate-50 rounded-lg px-2.5 py-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <UserCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="text-sm text-slate-700 truncate">
              {current.firstName || ""} {current.lastName || ""}
            </span>
            <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0">
              {current.role}
            </Badge>
          </div>
          <button type="button" onClick={onClear} className="p-1 rounded hover:bg-slate-200">
            <X className="w-3 h-3 text-slate-400" />
          </button>
        </div>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowPicker(!showPicker)}
          className="h-7 text-xs text-slate-500 gap-1"
        >
          <UserPlus className="w-3 h-3" /> Assign {label}
        </Button>
      )}

      {showPicker && (
        <div className="mt-2 border border-slate-200 rounded-lg bg-white shadow-sm">
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input
                placeholder="Search team..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-7 pl-7 text-xs"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-[160px] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-400">No users found</div>
            ) : (
              filtered.map((p: any) => (
                <button
                  key={p._id}
                  type="button"
                  onClick={() => {
                    onSelect(p.userId);
                    setShowPicker(false);
                    setSearch("");
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2"
                >
                  <span className="text-xs text-slate-700">
                    {p.firstName || ""} {p.lastName || ""}
                  </span>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 ml-auto">
                    {p.role}
                  </Badge>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Associations Panel ────────────────────────────────

export default function AssociationsPanel({
  contactId,
  lead,
  isAdmin,
  onNavigateBrand,
}: AssociationsPanelProps) {
  const associations = useQuery(api.crm.getLeadAssociations, { leadId: contactId });
  const updateLead = useMutation(api.crm.updateLead);

  if (!associations) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-slate-100 rounded-xl" />
        ))}
      </div>
    );
  }

  const handleAssignRep = async (userId: Id<"users">) => {
    await updateLead({ leadId: contactId, salesRepId: userId });
  };

  const handleClearRep = async () => {
    await updateLead({ leadId: contactId, salesRepId: undefined as any });
  };

  const handleAssignSetter = async (userId: Id<"users">) => {
    await updateLead({ leadId: contactId, setterId: userId });
  };

  const handleClearSetter = async () => {
    await updateLead({ leadId: contactId, setterId: undefined as any });
  };

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Link2 className="w-4 h-4 text-indigo-500" />
        <h3 className="text-sm font-semibold text-slate-800">Associations</h3>
      </div>

      {/* Consultant */}
      <AssociationSection
        icon={UserCheck}
        title="Consultant"
        count={associations.salesRep ? 1 : 0}
        color="emerald"
      >
        {isAdmin ? (
          <UserPicker
            currentUserId={lead.salesRepId}
            label="Consultant"
            onSelect={handleAssignRep}
            onClear={handleClearRep}
          />
        ) : associations.salesRep ? (
          <div className="flex items-center gap-2 mt-2 text-sm text-slate-600">
            <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
            {associations.salesRep.name}
          </div>
        ) : (
          <p className="text-xs text-slate-400 mt-2">No sales rep assigned</p>
        )}
      </AssociationSection>

      {/* Setter */}
      <AssociationSection
        icon={Users}
        title="Setter"
        count={associations.setter ? 1 : 0}
        color="blue"
      >
        {isAdmin ? (
          <UserPicker
            currentUserId={lead.setterId}
            label="Setter"
            onSelect={handleAssignSetter}
            onClear={handleClearSetter}
          />
        ) : associations.setter ? (
          <div className="flex items-center gap-2 mt-2 text-sm text-slate-600">
            <UserCheck className="w-3.5 h-3.5 text-blue-500" />
            {associations.setter.name}
          </div>
        ) : (
          <p className="text-xs text-slate-400 mt-2">No setter assigned</p>
        )}
      </AssociationSection>

      {/* Primary Brand */}
      <AssociationSection
        icon={Building2}
        title="Primary Brand"
        count={associations.primaryBrand ? 1 : 0}
        color="violet"
      >
        {associations.primaryBrand ? (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => onNavigateBrand?.(associations.primaryBrand!.slug)}
              className="flex items-center gap-2 text-sm text-violet-600 hover:text-violet-700 hover:underline"
            >
              <Building2 className="w-3.5 h-3.5" />
              {associations.primaryBrand.name}
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <p className="text-xs text-slate-400 mt-2">No brand associated</p>
        )}
      </AssociationSection>

      {/* Interested Brands */}
      <AssociationSection
        icon={Heart}
        title="Interested Brands"
        count={associations.interestedBrands.length}
        color="rose"
      >
        {associations.interestedBrands.length > 0 ? (
          <div className="mt-2 space-y-1">
            {associations.interestedBrands.map((brand: any) => (
              <button
                key={brand._id}
                type="button"
                onClick={() => onNavigateBrand?.(brand.slug)}
                className="w-full flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-50 text-sm text-slate-700"
              >
                <Heart className="w-3 h-3 text-rose-400" />
                <span className="truncate">{brand.name}</span>
                <ExternalLink className="w-3 h-3 ml-auto text-slate-300" />
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 mt-2">No interested brands</p>
        )}
      </AssociationSection>

      {/* Territories */}
      <AssociationSection
        icon={MapPin}
        title="Territories"
        count={associations.territories.length}
        color="cyan"
      >
        {associations.territories.length > 0 ? (
          <div className="mt-2 space-y-1">
            {associations.territories.map((t: any) => (
              <div key={t._id} className="flex items-center justify-between px-2 py-1 rounded-lg bg-slate-50 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="w-3 h-3 text-cyan-500 shrink-0" />
                  <span className="truncate">{t.city}, {t.state}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] text-slate-400">{t.brandName}</span>
                  <Badge variant="outline" className="text-[9px] px-1 py-0">{t.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 mt-2">No territories linked</p>
        )}
      </AssociationSection>

      {/* Tags */}
      <AssociationSection
        icon={Tag}
        title="Tags"
        count={associations.tags.length}
        color="amber"
      >
        {associations.tags.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {associations.tags.map((tag: string) => (
              <Badge key={tag} variant="secondary" className="text-xs px-2 py-0.5">
                {tag}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 mt-2">No tags</p>
        )}
      </AssociationSection>

      {/* Notes */}
      <AssociationSection
        icon={StickyNote}
        title="Notes"
        count={associations.notesCount}
        color="amber"
      >
        <p className="text-xs text-slate-500 mt-2">
          {associations.notesCount > 0
            ? `${associations.notesCount} note${associations.notesCount !== 1 ? "s" : ""} — view in Notes tab`
            : "No notes yet"}
        </p>
      </AssociationSection>
    </div>
  );
}
