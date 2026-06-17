import { useQuery, useMutation } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  User,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Calendar,
  Clock,
  Edit,
  Save,
  X,
  Hash,
  Globe,
  Briefcase,
  TrendingUp,
  Tag,
  StickyNote,
  Building2,
  Users,
  ChevronDown,
  Search,
  UserCheck,
  UserPlus,
  ExternalLink,
  Heart,
  Plus,
  History,
  BarChart3,
  ArrowRight,
  Check,
  Link2,
  Loader2,
} from "lucide-react";
import NotesPanel from "./NotesPanel";
import { formatPhoneDashes } from "@/lib/phone";

// ── Stage + Capital configs ──────────────────────────────
const STAGES = [
  { id: "new_lead", label: "New Lead", color: "#06b6d4", bgClass: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30" },
  { id: "intro_call", label: "Intro Call", color: "#8b5cf6", bgClass: "bg-violet-500/15 text-violet-400 border-violet-500/30" },
  { id: "qualified", label: "Qualified", color: "#3b82f6", bgClass: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  { id: "discovery_day", label: "Discovery Day", color: "#f59e0b", bgClass: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  { id: "pending_contract", label: "Pending Contract", color: "#f97316", bgClass: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  { id: "awarded", label: "Awarded", color: "#22c55e", bgClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  { id: "lost", label: "Lost", color: "#ef4444", bgClass: "bg-red-500/15 text-red-400 border-red-500/30" },
] as const;

const CAPITAL_OPTIONS = [
  "Under $50K",
  "$50K–$100K",
  "$100K–$250K",
  "$250K–$500K",
  "$500K–$1M",
  "$1M+",
];

const getStage = (id: string) => STAGES.find((s) => s.id === id) || STAGES[0];

// ── Tab IDs ──────────────────────────────────────────────
type TabId = "details" | "brands" | "territories" | "pipeline" | "notes" | "tags" | "reps";

const TABS: { id: TabId; icon: any; label: string }[] = [
  { id: "details", icon: User, label: "Contact Details" },
  { id: "brands", icon: Building2, label: "Brands" },
  { id: "territories", icon: MapPin, label: "Territories" },
  { id: "pipeline", icon: TrendingUp, label: "Pipeline" },
  { id: "notes", icon: StickyNote, label: "Notes" },
  { id: "tags", icon: Tag, label: "Tags" },
  { id: "reps", icon: Users, label: "Consultants" },
];

// ── Types ────────────────────────────────────────────────
interface LeadProfilePanelProps {
  leadId: Id<"crmLeads"> | null;
  open: boolean;
  onClose: () => void;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isBrandLimited: boolean;
  brands?: any[];
}

// ── Main Component ──────────────────────────────────────
export function LeadProfilePanel({
  leadId,
  open,
  onClose,
  isAdmin,
  isSuperAdmin,
  isBrandLimited,
  brands = [],
}: LeadProfilePanelProps) {
  const navigate = useNavigate();
  const lead = useQuery(api.crm.getLead, leadId ? { leadId } : "skip");
  const associations = useQuery(api.crm.getLeadAssociations, leadId ? { leadId } : "skip");
  const updateLead = useMutation(api.crm.updateLead);
  const linkToContact = useMutation(api.crm.linkLeadToContact);
  const [linking, setLinking] = useState(false);

  const [activeTab, setActiveTab] = useState<TabId>("details");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const brandMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const b of brands) m[b._id] = b.name;
    return m;
  }, [brands]);

  // Reset when lead changes
  useEffect(() => {
    setEditing(false);
    setActiveTab("details");
  }, [leadId]);

  // Populate form when entering edit mode
  useEffect(() => {
    if (editing && lead) {
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
      });
    }
  }, [editing, lead?._id]);

  const canEdit = isAdmin || isSuperAdmin;

  const handleSave = useCallback(async () => {
    if (!lead || !leadId) return;
    if (!form.firstName?.trim()) {
      toast.error("First name is required");
      return;
    }
    try {
      await updateLead({
        leadId,
        firstName: form.firstName.trim(),
        lastName: form.lastName?.trim() || undefined,
        email: form.email?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
        address: form.address?.trim() || undefined,
        liquidCapital: form.liquidCapital || undefined,
        mainTerritory: form.mainTerritory?.trim() || undefined,
        secondTerritory: form.secondTerritory?.trim() || undefined,
        thirdTerritory: form.thirdTerritory?.trim() || undefined,
        numTerritories: form.numTerritories ? parseInt(form.numTerritories) : undefined,
        stage: form.stage as any,
      });
      toast.success("Lead updated");
      setEditing(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to update lead");
    }
  }, [lead, leadId, form, updateLead]);

  const set = (key: string) => (e: any) =>
    setForm((f) => ({ ...f, [key]: typeof e === "string" ? e : e.target.value }));

  if (!open) return null;

  const stage = lead ? getStage(lead.stage) : null;
  const brandName = lead ? brandMap[lead.brandId] : undefined;

  const displayName = lead
    ? isBrandLimited
      ? `${lead.firstName}${lead.lastName ? ` ${lead.lastName.charAt(0)}.` : ""}`
      : `${lead.firstName} ${lead.lastName || ""}`.trim()
    : "Loading...";

  return (
    <Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) { setEditing(false); onClose(); } }}>
      <SheetContent
        side="right"
        className="sm:max-w-[520px] bg-slate-950 border-white/10 p-0 overflow-hidden flex flex-col"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{displayName}</SheetTitle>
          <SheetDescription>Lead profile details</SheetDescription>
        </SheetHeader>

        {!lead ? (
          <div className="p-6 space-y-4">
            <div className="h-8 w-48 bg-white/5 rounded animate-pulse" />
            <div className="h-4 w-32 bg-white/5 rounded animate-pulse" />
            <div className="space-y-3 mt-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 bg-white/[0.03] rounded animate-pulse" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* ── Fixed Header ─────────────────────── */}
            <div className="px-5 pt-5 pb-3 border-b border-white/[0.06] flex-shrink-0">
              {/* Row 1: Name + Edit */}
              <div className="flex items-start justify-between gap-3 pr-8">
                <div className="min-w-0">
                  {/* Name — clickable link to contact if linked */}
                  {associations?.linkedContact ? (
                    <button
                      type="button"
                      className="group flex items-center gap-1.5 text-left min-w-0"
                      onClick={() => {
                        onClose();
                        navigate(`/contacts?highlight=${associations.linkedContact!._id}`);
                      }}
                      title="View contact record"
                    >
                      <h2 className="text-lg font-semibold text-white truncate group-hover:text-cyan-400 transition-colors">{displayName}</h2>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 transition-colors flex-shrink-0 mt-0.5" />
                    </button>
                  ) : (
                    <h2 className="text-lg font-semibold text-white truncate">{displayName}</h2>
                  )}
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {stage && (
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium border px-2 py-0.5 rounded ${stage.bgClass}`}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: stage.color }} />
                        {stage.label}
                      </span>
                    )}
                    {brandName && (
                      <span className="inline-flex text-[11px] px-2 py-0.5 rounded bg-violet-500/10 text-violet-400 font-medium">
                        {brandName}
                      </span>
                    )}
                    {/* Contact link badge */}
                    {associations?.linkedContact ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium hover:bg-emerald-500/20 transition-colors"
                        onClick={() => {
                          onClose();
                          navigate(`/contacts?highlight=${associations.linkedContact!._id}`);
                        }}
                        title="View linked contact"
                      >
                        <Link2 className="w-3 h-3" />
                        {associations.linkedContact.type === "both"
                          ? "Prospect & Franchisee"
                          : associations.linkedContact.type.charAt(0).toUpperCase() + associations.linkedContact.type.slice(1)}
                      </button>
                    ) : canEdit && associations !== undefined && associations !== null ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10 font-medium hover:bg-white/10 hover:text-slate-300 transition-colors"
                        disabled={linking}
                        onClick={async () => {
                          if (!leadId) return;
                          setLinking(true);
                          try {
                            await linkToContact({ leadId });
                            toast.success("Contact linked");
                          } catch (err: any) {
                            toast.error(err.message || "Failed to link contact");
                          } finally {
                            setLinking(false);
                          }
                        }}
                        title="Link or create a contact record for this lead"
                      >
                        {linking ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <UserPlus className="w-3 h-3" />
                        )}
                        Link Contact
                      </button>
                    ) : null}
                  </div>
                </div>
                {canEdit && !editing && activeTab === "details" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-white/10 text-slate-300 hover:text-white hover:bg-white/5"
                    onClick={() => setEditing(true)}
                  >
                    <Edit className="w-3 h-3 mr-1.5" /> Edit
                  </Button>
                )}
                {editing && (
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" className="h-7 text-xs border-white/10 text-slate-300 hover:bg-white/5" onClick={() => setEditing(false)}>
                      <X className="w-3 h-3 mr-1" /> Cancel
                    </Button>
                    <Button size="sm" className="h-7 text-xs bg-cyan-600 hover:bg-cyan-500 text-white" onClick={handleSave}>
                      <Save className="w-3 h-3 mr-1" /> Save
                    </Button>
                  </div>
                )}
              </div>

              {/* Row 2: Consultant & Setter quick-assign */}
              {canEdit && (
                <div className="flex items-center gap-3 mt-3">
                  <HeaderRepPicker
                    lead={lead}
                    field="salesRep"
                    label="Consultant"
                    currentUserId={lead.salesRepId}
                    leadId={leadId!}
                  />
                  <HeaderRepPicker
                    lead={lead}
                    field="setter"
                    label="Setter"
                    currentUserId={lead.setterId}
                    leadId={leadId!}
                  />
                </div>
              )}
            </div>

            {/* ── Body: Icon Sidebar + Content ─────── */}
            <div className="flex flex-1 min-h-0 overflow-hidden">
              {/* Icon Sidebar */}
              <div className="w-11 flex-shrink-0 border-r border-white/[0.06] flex flex-col items-center py-3 gap-1 bg-slate-950/50">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all relative group ${
                        isActive
                          ? "bg-cyan-500/15 text-cyan-400"
                          : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                      }`}
                      title={tab.label}
                    >
                      <Icon className="w-4 h-4" />
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-cyan-400 rounded-r" />
                      )}
                      {/* Tooltip */}
                      <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 border border-white/10 text-white text-[10px] font-medium rounded whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                        {tab.label}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
                <div className="px-4 py-4">
                  {activeTab === "details" && (
                    <ContactDetailsTab
                      lead={lead}
                      editing={editing}
                      form={form}
                      set={set}
                      isBrandLimited={isBrandLimited}
                      brandName={brandName}
                      linkedContact={associations?.linkedContact ?? null}
                      onContactClick={associations?.linkedContact ? () => {
                        onClose();
                        navigate(`/contacts?highlight=${associations.linkedContact!._id}`);
                      } : undefined}
                    />
                  )}
                  {activeTab === "brands" && (
                    <BrandsTab
                      associations={associations}
                      brandName={brandName}
                    />
                  )}
                  {activeTab === "territories" && (
                    <TerritoriesTab
                      lead={lead}
                      associations={associations}
                    />
                  )}
                  {activeTab === "pipeline" && (
                    <PipelineTab lead={lead} />
                  )}
                  {activeTab === "notes" && leadId && (
                    <NotesTabWrapper contactId={leadId} />
                  )}
                  {activeTab === "tags" && leadId && (
                    <TagsTab
                      lead={lead}
                      leadId={leadId}
                      canEdit={canEdit}
                    />
                  )}
                  {activeTab === "reps" && leadId && (
                    <SalesRepsTab
                      lead={lead}
                      leadId={leadId}
                      associations={associations}
                    />
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ════════════════════════════════════════════════════════════
// ── Header Rep Picker (compact dropdown in header) ─────────
// ════════════════════════════════════════════════════════════

function HeaderRepPicker({
  lead,
  field,
  label,
  currentUserId,
  leadId,
}: {
  lead: any;
  field: "salesRep" | "setter";
  label: string;
  currentUserId?: string | null;
  leadId: Id<"crmLeads">;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const profiles = useQuery(api.users.listProfiles) || [];
  const updateLead = useMutation(api.crm.updateLead);

  const assignableRoles =
    field === "salesRep"
      ? ["super_admin", "admin", "standard", "closer", "setter", "broker"] // consultants assignable as the lead's consultant
      : ["super_admin", "admin", "standard", "closer", "setter"];
  const internalUsers = profiles.filter(
    (p: any) => assignableRoles.includes(p.role) && p.isActive !== false
  );

  const current = currentUserId
    ? internalUsers.find((p: any) => p.userId === currentUserId)
    : null;

  const filtered = search
    ? internalUsers.filter((p: any) =>
        `${p.firstName || ""} ${p.lastName || ""} ${p.email || ""}`
          .toLowerCase()
          .includes(search.toLowerCase())
      )
    : internalUsers;

  const handleAssign = async (userId: Id<"users">) => {
    const key = field === "salesRep" ? "salesRepId" : "setterId";
    await updateLead({ leadId, [key]: userId } as any);
    setOpen(false);
    setSearch("");
    toast.success(`${label} assigned`);
  };

  const handleClear = async () => {
    const key = field === "salesRep" ? "salesRepId" : "setterId";
    await updateLead({ leadId, [key]: undefined } as any);
    setOpen(false);
    toast.success(`${label} removed`);
  };

  return (
    <div className="relative flex-1">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full h-7 px-2.5 rounded-md bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06] transition-colors flex items-center gap-2 text-left"
      >
        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">{label}</span>
        <span className="text-xs text-slate-200 truncate flex-1">
          {current ? `${current.firstName || ""} ${current.lastName || ""}`.trim() : "—"}
        </span>
        <ChevronDown className="w-3 h-3 text-slate-500 flex-shrink-0" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => { setOpen(false); setSearch(""); }} />
          <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-white/10 rounded-lg shadow-2xl z-[101] overflow-hidden">
            <div className="p-2 border-b border-white/[0.06]">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search team..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-7 pl-7 pr-2 text-xs bg-white/5 border border-white/10 rounded text-slate-200 placeholder:text-slate-500 outline-none focus:border-cyan-500/40"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-[160px] overflow-y-auto">
              {current && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="w-full px-3 py-1.5 text-left hover:bg-white/5 flex items-center gap-2 text-red-400 text-xs border-b border-white/[0.04]"
                >
                  <X className="w-3 h-3" /> Remove {label}
                </button>
              )}
              {filtered.length === 0 ? (
                <div className="px-3 py-2 text-xs text-slate-500">No users found</div>
              ) : (
                filtered.map((p: any) => (
                  <button
                    key={p._id}
                    type="button"
                    onClick={() => handleAssign(p.userId)}
                    className={`w-full px-3 py-1.5 text-left hover:bg-white/5 flex items-center gap-2 ${
                      p.userId === currentUserId ? "bg-cyan-500/10" : ""
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-slate-300 font-medium flex-shrink-0">
                      {(p.firstName || "?").charAt(0)}
                    </div>
                    <span className="text-xs text-slate-200 truncate">
                      {p.firstName || ""} {p.lastName || ""}
                    </span>
                    <span className="text-[10px] text-slate-500 ml-auto flex-shrink-0">{p.role}</span>
                    {p.userId === currentUserId && <Check className="w-3 h-3 text-cyan-400 flex-shrink-0" />}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ── Tab 1: Contact Details ─────────────────────────────────
// ════════════════════════════════════════════════════════════

function ContactDetailsTab({
  lead,
  editing,
  form,
  set,
  isBrandLimited,
  brandName,
  linkedContact,
  onContactClick,
}: {
  lead: any;
  editing: boolean;
  form: Record<string, string>;
  set: (key: string) => (e: any) => void;
  isBrandLimited: boolean;
  brandName?: string;
  linkedContact?: { _id: string; type: string } | null;
  onContactClick?: () => void;
}) {
  const displayName = isBrandLimited
    ? `${lead.firstName}${lead.lastName ? ` ${lead.lastName.charAt(0)}.` : ""}`
    : `${lead.firstName} ${lead.lastName || ""}`.trim();

  const createdDate = lead?.createdAt ? new Date(lead.createdAt) : null;
  const updatedDate = lead?.updatedAt ? new Date(lead.updatedAt) : null;

  return (
    <div className="space-y-5">
      {/* Contact Info */}
      <section>
        <TabSectionHeader icon={User} label="Contact Info" />
        <div className="mt-3 space-y-3">
          {editing ? (
            <div className="grid grid-cols-2 gap-3">
              <FieldInput label="First Name *" value={form.firstName} onChange={set("firstName")} />
              <FieldInput label="Last Name" value={form.lastName} onChange={set("lastName")} />
            </div>
          ) : (
            <InfoRow
              label="Name"
              value={displayName}
              icon={linkedContact ? Link2 : undefined}
              link={onContactClick ? "#" : undefined}
              onClick={onContactClick}
            />
          )}
          {!isBrandLimited && (
            <>
              {editing ? (
                <FieldInput label="Email" value={form.email} onChange={set("email")} type="email" />
              ) : (
                <InfoRow label="Email" value={lead.email} icon={Mail} link={lead.email ? `mailto:${lead.email}` : undefined} />
              )}
              {editing ? (
                <FieldInput label="Phone" value={form.phone} onChange={set("phone")} />
              ) : (
                <InfoRow label="Phone" value={lead.phone ? formatPhoneDashes(lead.phone) : undefined} icon={Phone} link={lead.phone ? `tel:${lead.phone.replace(/\D/g, "")}` : undefined} />
              )}
              {editing ? (
                <FieldInput label="Address" value={form.address} onChange={set("address")} />
              ) : (
                <InfoRow label="Address" value={lead.address} icon={MapPin} />
              )}
            </>
          )}
          <InfoRow label="Source" value={lead.source} icon={Globe} badge />
        </div>
      </section>

      {/* Franchise Interest */}
      <section>
        <TabSectionHeader icon={Briefcase} label="Franchise Interest" />
        <div className="mt-3 space-y-3">
          {editing ? (
            <>
              <FieldInput label="Main Territory" value={form.mainTerritory} onChange={set("mainTerritory")} />
              <div className="grid grid-cols-2 gap-3">
                <FieldInput label="2nd Territory" value={form.secondTerritory} onChange={set("secondTerritory")} />
                <FieldInput label="3rd Territory" value={form.thirdTerritory} onChange={set("thirdTerritory")} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FieldInput label="# Territories" value={form.numTerritories} onChange={set("numTerritories")} type="number" />
                <div>
                  <Label className="text-[11px] text-slate-500">&nbsp;Liquid Capital</Label>
                  <Select value={form.liquidCapital} onValueChange={set("liquidCapital")}>
                    <SelectTrigger className="mt-1 h-8 text-sm bg-white/5 border-white/10">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {CAPITAL_OPTIONS.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          ) : (
            <>
              <InfoRow label="Main Territory" value={lead.mainTerritory} icon={MapPin} />
              <InfoRow label="2nd Territory" value={lead.secondTerritory} />
              <InfoRow label="3rd Territory" value={lead.thirdTerritory} />
              <InfoRow label="# Territories" value={lead.numTerritories?.toString()} icon={Hash} />
              <InfoRow label="Liquid Capital" value={lead.liquidCapital} icon={DollarSign} />
            </>
          )}
        </div>
      </section>

      {/* Activity */}
      <section>
        <TabSectionHeader icon={Clock} label="Activity" />
        <div className="mt-3 space-y-2">
          <InfoRow label="Created" value={createdDate ? formatDate(createdDate) : undefined} icon={Calendar} />
          <InfoRow label="Last Updated" value={updatedDate ? formatDate(updatedDate) : undefined} icon={Clock} />
        </div>
      </section>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ── Tab 2: Brands ──────────────────────────────────────────
// ════════════════════════════════════════════════════════════

function BrandsTab({
  associations,
  brandName,
}: {
  associations: any;
  brandName?: string;
}) {
  if (!associations) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-5">
      {/* Primary Brand */}
      <section>
        <TabSectionHeader icon={Building2} label="Primary Brand" />
        {associations.primaryBrand ? (
          <div className="mt-3 p-3 rounded-xl bg-violet-500/[0.06] border border-violet-500/15">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-violet-500/15 flex items-center justify-center">
                <Building2 className="w-4.5 h-4.5 text-violet-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">{associations.primaryBrand.name}</p>
                <p className="text-[11px] text-slate-500">Primary Brand</p>
              </div>
              <button
                type="button"
                onClick={() => window.open(`/brand/${associations.primaryBrand.slug}`, "_blank")}
                className="p-1.5 rounded-md hover:bg-white/5 text-slate-500 hover:text-slate-300 transition-colors"
                title="View brand"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <EmptyState icon={Building2} text="No primary brand" />
        )}
      </section>

      {/* Interested / Hearted Brands */}
      <section>
        <TabSectionHeader icon={Heart} label="Interested Brands" count={associations.interestedBrands.length} />
        {associations.interestedBrands.length > 0 ? (
          <div className="mt-3 space-y-2">
            {associations.interestedBrands.map((brand: any) => (
              <div
                key={brand._id}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors cursor-pointer"
                onClick={() => window.open(`/brand/${brand.slug}`, "_blank")}
              >
                {brand.logoUrl ? (
                  <img src={brand.logoUrl} alt="" className="w-8 h-8 rounded-md object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-md bg-rose-500/10 flex items-center justify-center">
                    <Heart className="w-3.5 h-3.5 text-rose-400" />
                  </div>
                )}
                <span className="text-sm text-slate-200 truncate flex-1">{brand.name}</span>
                <ExternalLink className="w-3 h-3 text-slate-600 flex-shrink-0" />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={Heart} text="No interested brands yet" />
        )}
      </section>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ── Tab 3: Territories ─────────────────────────────────────
// ════════════════════════════════════════════════════════════

const STATUS_COLORS: Record<string, string> = {
  available: "bg-[#e91e9a]/15 text-[#e91e9a] border-[#e91e9a]/30",
  high_interest: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  pending_award: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  sold: "bg-red-500/15 text-red-400 border-red-500/30",
  open: "bg-green-500/15 text-green-400 border-green-500/30",
};

function TerritoriesTab({
  lead,
  associations,
}: {
  lead: any;
  associations: any;
}) {
  const interestedTerritories: string[] = lead?.interestedTerritories || [];

  if (!associations) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-5">
      {/* Preferred Territories (text-based) */}
      <section>
        <TabSectionHeader icon={MapPin} label="Preferred Territories" />
        <div className="mt-3 space-y-2">
          {lead.mainTerritory && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-cyan-500/[0.06] border border-cyan-500/15">
              <MapPin className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
              <span className="text-sm text-slate-200">{lead.mainTerritory}</span>
              <span className="text-[10px] text-cyan-400 ml-auto px-1.5 py-0.5 rounded bg-cyan-500/10 font-medium">#1</span>
            </div>
          )}
          {lead.secondTerritory && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.05]">
              <MapPin className="w-3 h-3 text-slate-500 flex-shrink-0" />
              <span className="text-sm text-slate-300">{lead.secondTerritory}</span>
              <span className="text-[10px] text-slate-500 ml-auto">#2</span>
            </div>
          )}
          {lead.thirdTerritory && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.05]">
              <MapPin className="w-3 h-3 text-slate-500 flex-shrink-0" />
              <span className="text-sm text-slate-300">{lead.thirdTerritory}</span>
              <span className="text-[10px] text-slate-500 ml-auto">#3</span>
            </div>
          )}
          {!lead.mainTerritory && !lead.secondTerritory && !lead.thirdTerritory && (
            <EmptyState icon={MapPin} text="No preferred territories set" />
          )}
        </div>
      </section>

      {/* Interested Territories (name list) */}
      {interestedTerritories.length > 0 && (
        <section>
          <TabSectionHeader icon={MapPin} label="Interested Territories" count={interestedTerritories.length} />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {interestedTerritories.map((t, i) => (
              <span key={i} className="text-xs px-2.5 py-1 rounded-md bg-white/[0.04] text-slate-300 border border-white/[0.06]">
                {t}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Linked Territory Records */}
      <section>
        <TabSectionHeader icon={MapPin} label="Linked Territories" count={associations.territories.length} />
        {associations.territories.length > 0 ? (
          <div className="mt-3 space-y-2">
            {associations.territories.map((t: any) => (
              <div key={t._id} className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0" />
                  <span className="text-sm text-slate-200 truncate">{t.city}, {t.state}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] text-slate-500">{t.brandName}</span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${STATUS_COLORS[t.status] || "bg-white/5 text-slate-400 border-white/10"}`}>
                    {t.status.replace("_", " ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={MapPin} text="No territories linked" />
        )}
      </section>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ── Tab 4: Pipeline ────────────────────────────────────────
// ════════════════════════════════════════════════════════════

function PipelineTab({ lead }: { lead: any }) {
  const currentStage = getStage(lead.stage);
  const createdDate = new Date(lead.createdAt);
  const daysSinceCreated = Math.floor((Date.now() - lead.createdAt) / (1000 * 60 * 60 * 24));

  return (
    <div className="space-y-5">
      {/* Current Stage */}
      <section>
        <TabSectionHeader icon={TrendingUp} label="Current Stage" />
        <div className="mt-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${currentStage.color}20` }}>
              <div className="w-3.5 h-3.5 rounded-full" style={{ background: currentStage.color }} />
            </div>
            <div>
              <p className="text-base font-semibold text-white">{currentStage.label}</p>
              <p className="text-[11px] text-slate-500">{daysSinceCreated} day{daysSinceCreated !== 1 ? "s" : ""} in pipeline</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stage Progress */}
      <section>
        <TabSectionHeader icon={TrendingUp} label="Stage Progress" />
        <div className="mt-3 space-y-1">
          {STAGES.map((s, i) => {
            const currentIdx = STAGES.findIndex((x) => x.id === lead.stage);
            const isPast = i < currentIdx;
            const isCurrent = i === currentIdx;
            const isFuture = i > currentIdx;
            const isLost = lead.stage === "lost" && s.id === "lost";

            return (
              <div key={s.id} className="flex items-center gap-3 py-1.5">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isPast
                      ? "bg-emerald-500/20"
                      : isCurrent
                      ? "ring-2 ring-offset-1 ring-offset-slate-950"
                      : "bg-white/[0.04]"
                  }`}
                  style={isCurrent ? { background: `${s.color}25`, ringColor: s.color } : undefined}
                >
                  {isPast ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <div className="w-2 h-2 rounded-full" style={{ background: isCurrent || isLost ? s.color : "#374151" }} />
                  )}
                </div>
                <span className={`text-sm ${isCurrent ? "text-white font-medium" : isPast ? "text-slate-400" : "text-slate-600"}`}>
                  {s.label}
                </span>
                {isCurrent && (
                  <span className="text-[10px] text-cyan-400 ml-auto px-1.5 py-0.5 rounded bg-cyan-500/10 font-medium">
                    Current
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Pipeline Info */}
      <section>
        <TabSectionHeader icon={Calendar} label="Timeline" />
        <div className="mt-3 space-y-2">
          <InfoRow label="Entered Pipeline" value={formatDate(createdDate)} icon={Calendar} />
          <InfoRow label="Days in Pipeline" value={`${daysSinceCreated} day${daysSinceCreated !== 1 ? "s" : ""}`} icon={Clock} />
        </div>
      </section>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ── Tab 5: Notes (wrapper for dark theme) ──────────────────
// ════════════════════════════════════════════════════════════

function NotesTabWrapper({ contactId }: { contactId: Id<"crmLeads"> }) {
  return (
    <div className="notes-tab-dark">
      <NotesPanel contactId={contactId} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ── Tab 6: Tags ────────────────────────────────────────────
// ════════════════════════════════════════════════════════════

const TAG_COLORS = [
  "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
  "bg-violet-500/15 text-violet-400 border-violet-500/25",
  "bg-amber-500/15 text-amber-400 border-amber-500/25",
  "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  "bg-rose-500/15 text-rose-400 border-rose-500/25",
  "bg-blue-500/15 text-blue-400 border-blue-500/25",
  "bg-orange-500/15 text-orange-400 border-orange-500/25",
  "bg-pink-500/15 text-pink-400 border-pink-500/25",
];

function getTagColor(tag: string) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

function TagsTab({
  lead,
  leadId,
  canEdit,
}: {
  lead: any;
  leadId: Id<"crmLeads">;
  canEdit: boolean;
}) {
  const allTags = useQuery(api.tags.list) || [];
  const addTags = useMutation(api.tags.addToContacts);
  const removeTags = useMutation(api.tags.removeFromContacts);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");

  const leadTags: string[] = lead?.tags || [];
  const suggestedTags = allTags
    .filter((t: any) => !leadTags.includes(t.name.toLowerCase()))
    .slice(0, 8);

  const filteredSuggested = search
    ? suggestedTags.filter((t: any) => t.name.toLowerCase().includes(search.toLowerCase()))
    : suggestedTags;

  const handleRemoveTag = async (tag: string) => {
    try {
      await removeTags({ tagNames: [tag], leadIds: [leadId] });
      toast.success(`Tag "${tag}" removed`);
    } catch (e: any) {
      toast.error(e.message || "Failed to remove tag");
    }
  };

  const handleAddTag = async (tag: string) => {
    try {
      await addTags({ tagNames: [tag], leadIds: [leadId] });
      toast.success(`Tag "${tag}" added`);
    } catch (e: any) {
      toast.error(e.message || "Failed to add tag");
    }
  };

  return (
    <div className="space-y-5">
      {/* Current Tags */}
      <section>
        <div className="flex items-center justify-between">
          <TabSectionHeader icon={Tag} label="Tags" count={leadTags.length} />
          {canEdit && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAdd(!showAdd)}
              className="h-6 text-[11px] border-white/10 text-slate-400 hover:text-white hover:bg-white/5 gap-1"
            >
              <Plus className="w-3 h-3" /> Add
            </Button>
          )}
        </div>
        {leadTags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {leadTags.map((tag) => (
              <span
                key={tag}
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${getTagColor(tag)} group`}
              >
                {tag}
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="opacity-50 group-hover:opacity-100 hover:text-red-400 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}
          </div>
        ) : (
          <EmptyState icon={Tag} text="No tags applied" />
        )}
      </section>

      {/* Add Tag Picker */}
      {showAdd && canEdit && (
        <section>
          <TabSectionHeader icon={Plus} label="Add Tags" />
          <div className="mt-3">
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search available tags..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-sm bg-white/5 border border-white/10 rounded-lg text-slate-200 placeholder:text-slate-500 outline-none focus:border-cyan-500/40"
                autoFocus
              />
            </div>
            {filteredSuggested.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {filteredSuggested.map((t: any) => (
                  <button
                    key={t._id}
                    type="button"
                    onClick={() => handleAddTag(t.name)}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
                  >
                    <Plus className="w-3 h-3" /> {t.name}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No more tags available</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ── Tab 7: Consultants (Option A — Full Detail) ────────────
// ════════════════════════════════════════════════════════════

function SalesRepsTab({
  lead,
  leadId,
  associations,
}: {
  lead: any;
  leadId: Id<"crmLeads">;
  associations: any;
}) {
  const history = useQuery(api.crm.getAssignmentHistory, { leadId });
  const repStats = useQuery(
    api.crm.getRepStats,
    lead.salesRepId ? { userId: lead.salesRepId } : "skip"
  );
  const setterStats = useQuery(
    api.crm.getRepStats,
    lead.setterId ? { userId: lead.setterId } : "skip"
  );

  if (!associations) return <LoadingSkeleton />;

  return (
    <div className="space-y-5">
      {/* Consultant Card */}
      <section>
        <TabSectionHeader icon={UserCheck} label="Consultant" />
        {associations.salesRep ? (
          <RepCard
            user={associations.salesRep}
            role="Consultant"
            stats={repStats}
            color="emerald"
          />
        ) : (
          <EmptyState icon={UserCheck} text="No sales rep assigned" sub="Assign from the header above" />
        )}
      </section>

      {/* Setter Card */}
      <section>
        <TabSectionHeader icon={Users} label="Setter" />
        {associations.setter ? (
          <RepCard
            user={associations.setter}
            role="Setter"
            stats={setterStats}
            color="blue"
          />
        ) : (
          <EmptyState icon={Users} text="No setter assigned" sub="Assign from the header above" />
        )}
      </section>

      {/* Assignment History */}
      <section>
        <TabSectionHeader icon={History} label="Assignment History" count={history?.length || 0} />
        {history && history.length > 0 ? (
          <div className="mt-3 space-y-0">
            {/* Timeline */}
            <div className="relative pl-6">
              <div className="absolute left-[9px] top-2 bottom-2 w-px bg-white/[0.08]" />
              {history.map((h: any, i: number) => (
                <div key={h._id} className="relative pb-4 last:pb-0">
                  {/* Dot */}
                  <div className="absolute left-[-15px] top-1.5 w-[7px] h-[7px] rounded-full bg-slate-600 border-2 border-slate-950" />
                  <div className="text-xs">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-slate-400 font-medium">
                        {h.field === "salesRep" ? "Consultant" : "Setter"}
                      </span>
                      {h.fromName ? (
                        <>
                          <span className="text-slate-500">{h.fromName}</span>
                          <ArrowRight className="w-3 h-3 text-slate-600" />
                          <span className="text-slate-200">{h.toName || "Unassigned"}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-slate-500">assigned to</span>
                          <span className="text-slate-200">{h.toName || "Unassigned"}</span>
                        </>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-600 mt-0.5">
                      by {h.changedByName} · {formatDate(new Date(h.changedAt))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState icon={History} text="No assignment changes yet" />
        )}
      </section>
    </div>
  );
}

// ── Rep Card (shows user info + stats) ─────────────────────

function RepCard({
  user,
  role,
  stats,
  color,
}: {
  user: any;
  role: string;
  stats: any;
  color: "emerald" | "blue";
}) {
  const bgColor = color === "emerald" ? "bg-emerald-500/[0.06] border-emerald-500/15" : "bg-blue-500/[0.06] border-blue-500/15";
  const iconColor = color === "emerald" ? "text-emerald-400 bg-emerald-500/15" : "text-blue-400 bg-blue-500/15";
  const accentColor = color === "emerald" ? "text-emerald-400" : "text-blue-400";

  return (
    <div className={`mt-3 rounded-xl border ${bgColor} overflow-hidden`}>
      {/* User Info */}
      <div className="p-3.5 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${iconColor}`}>
          {(user.name || "?").charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white truncate">{user.name}</p>
          <p className="text-[11px] text-slate-500">{user.role} · {role}</p>
        </div>
      </div>

      {/* Contact Buttons */}
      <div className="px-3.5 pb-3 flex gap-2">
        {user.email && (
          <a
            href={`mailto:${user.email}`}
            className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 px-2.5 py-1.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
          >
            <Mail className="w-3 h-3" /> Email
          </a>
        )}
        <button
          type="button"
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-2.5 py-1.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
          onClick={() => {
            if (user.email) {
              navigator.clipboard.writeText(user.email);
              toast.success("Email copied");
            }
          }}
        >
          <Phone className="w-3 h-3" /> Copy Email
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="border-t border-white/[0.06] px-3.5 py-3 grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className={`text-base font-semibold ${accentColor}`}>{stats.activeLeads}</p>
            <p className="text-[10px] text-slate-500">Active Leads</p>
          </div>
          <div className="text-center">
            <p className={`text-base font-semibold ${accentColor}`}>{stats.closeRate}%</p>
            <p className="text-[10px] text-slate-500">Close Rate</p>
          </div>
          <div className="text-center">
            <p className={`text-base font-semibold ${accentColor}`}>{stats.setRate}%</p>
            <p className="text-[10px] text-slate-500">Set Rate</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ── Shared Helper Components ───────────────────────────────
// ════════════════════════════════════════════════════════════

function TabSectionHeader({ icon: Icon, label, count }: { icon: any; label: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 pb-2 border-b border-white/[0.05]">
      <Icon className="w-3.5 h-3.5 text-slate-500" />
      <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="text-[10px] px-1.5 py-0 rounded bg-white/5 text-slate-500 font-medium">{count}</span>
      )}
    </div>
  );
}

function InfoRow({
  label,
  value,
  icon: Icon,
  link,
  badge,
  onClick,
}: {
  label: string;
  value?: string | null;
  icon?: any;
  link?: string;
  badge?: boolean;
  onClick?: () => void;
}) {
  const displayValue = value || "—";
  const isEmpty = !value;

  return (
    <div className="flex items-start gap-3">
      {Icon && <Icon className="w-3.5 h-3.5 text-slate-600 mt-0.5 flex-shrink-0" />}
      {!Icon && <div className="w-3.5 flex-shrink-0" />}
      <div className="min-w-0 flex-1">
        <span className="text-[11px] text-slate-500 block">{label}</span>
        {badge && !isEmpty ? (
          <span className="inline-flex text-xs px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/5 mt-0.5">
            {displayValue}
          </span>
        ) : link && !isEmpty ? (
          <a
            href={onClick ? undefined : link}
            className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer inline-flex items-center gap-1"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (onClick) onClick();
            }}
          >
            {displayValue}
            {onClick && <ExternalLink className="w-3 h-3" />}
          </a>
        ) : (
          <span className={`text-sm ${isEmpty ? "text-slate-600" : "text-slate-200"}`}>{displayValue}</span>
        )}
      </div>
    </div>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (e: any) => void;
  type?: string;
}) {
  return (
    <div>
      <Label className="text-[11px] text-slate-500">{label}</Label>
      <Input
        value={value}
        onChange={onChange}
        type={type}
        min={type === "number" ? "1" : undefined}
        className="mt-1 h-8 text-sm bg-white/5 border-white/10"
      />
    </div>
  );
}

function EmptyState({ icon: Icon, text, sub }: { icon: any; text: string; sub?: string }) {
  return (
    <div className="mt-3 py-6 text-center">
      <Icon className="w-6 h-6 mx-auto mb-2 text-slate-700" />
      <p className="text-xs text-slate-500">{text}</p>
      {sub && <p className="text-[10px] text-slate-600 mt-1">{sub}</p>}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-14 bg-white/[0.03] rounded-xl animate-pulse" />
      ))}
    </div>
  );
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
