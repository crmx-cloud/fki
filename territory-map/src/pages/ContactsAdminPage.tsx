import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Search,
  UserPlus,
  User,
  Phone,
  Mail,
  MapPin,
  Pencil,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  FileText,
  ExternalLink,
  Ban,
  CheckCircle2,
  Eye,
} from "lucide-react";

type ContactType = "prospect" | "franchisee" | "both";
type ContactStatus = "active" | "deactivated";

const TYPE_COLORS: Record<ContactType, string> = {
  prospect: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  franchisee: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  both: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
};
const TYPE_LABELS: Record<ContactType, string> = {
  prospect: "Prospect",
  franchisee: "Franchisee",
  both: "Prospect + Franchisee",
};
const STATUS_COLORS: Record<ContactStatus, string> = {
  active: "bg-green-500/20 text-green-400",
  deactivated: "bg-red-500/20 text-red-400",
};

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire",
  "New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio",
  "Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota",
  "Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia",
  "Wisconsin","Wyoming",
];

export function ContactsAdminPage() {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<Id<"contacts"> | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const pageSize = 25;
  const cursor = page > 0 ? String(page * pageSize) : undefined;

  const result = useQuery(api.contacts.listContacts, {
    search: search || undefined,
    type: filterType !== "all" ? (filterType as ContactType) : undefined,
    status: filterStatus !== "all" ? (filterStatus as ContactStatus) : undefined,
    limit: pageSize,
    cursor,
  });

  const selectedContact = useQuery(
    api.contacts.getContact,
    selectedId ? { contactId: selectedId } : "skip"
  );

  const contacts = result?.contacts || [];
  const total = result?.total || 0;
  const hasNext = !!result?.nextCursor;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <User className="w-6 h-6 text-cyan-400" /> Contacts
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Unified people directory — prospects, franchisees, and linked records
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowCreate(true)}
          className="bg-cyan-600 hover:bg-cyan-700 text-white"
        >
          <UserPlus className="w-4 h-4 mr-1" /> New Contact
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9 bg-slate-900 border-slate-700 text-white"
          />
        </div>
        <Select value={filterType} onValueChange={(v) => { setFilterType(v); setPage(0); }}>
          <SelectTrigger className="w-40 bg-slate-900 border-slate-700 text-white">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="prospect">Prospects</SelectItem>
            <SelectItem value="franchisee">Franchisees</SelectItem>
            <SelectItem value="both">Both</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(0); }}>
          <SelectTrigger className="w-40 bg-slate-900 border-slate-700 text-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="deactivated">Deactivated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary stat */}
      <p className="text-xs text-slate-500 mb-3">{total} contact{total !== 1 ? "s" : ""} found</p>

      {/* Contact Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 text-xs uppercase border-b border-slate-800">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3 hidden md:table-cell">Phone</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 hidden lg:table-cell">Source</th>
                <th className="px-4 py-3 hidden lg:table-cell">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {contacts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    {search ? "No contacts match your search" : "No contacts yet"}
                  </td>
                </tr>
              ) : (
                contacts.map((c: any) => (
                  <tr
                    key={c._id}
                    className="border-b border-slate-800/50 hover:bg-slate-800/40 cursor-pointer transition-colors"
                    onClick={() => setSelectedId(c._id)}
                  >
                    <td className="px-4 py-3 font-medium text-white">
                      {c.firstName} {c.lastName || ""}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{c.email}</td>
                    <td className="px-4 py-3 text-slate-400 hidden md:table-cell">{c.phone || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={TYPE_COLORS[c.type as ContactType]}>
                        {TYPE_LABELS[c.type as ContactType] || c.type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={STATUS_COLORS[c.status as ContactStatus]}>
                        {c.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden lg:table-cell capitalize">{c.source}</td>
                    <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Eye className="w-4 h-4 text-slate-500" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > pageSize && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
            <Button
              variant="ghost"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
              className="text-slate-400"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
            </Button>
            <span className="text-xs text-slate-500">
              Page {page + 1} of {Math.ceil(total / pageSize)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={!hasNext}
              onClick={() => setPage(page + 1)}
              className="text-slate-400"
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      {selectedId && (
        <ContactDetailPanel
          contact={selectedContact}
          onClose={() => setSelectedId(null)}
          onEdit={() => setShowEdit(true)}
        />
      )}

      {/* Edit Dialog */}
      {showEdit && selectedContact && (
        <EditContactDialog
          contact={selectedContact}
          onClose={() => setShowEdit(false)}
        />
      )}

      {/* Create Dialog */}
      {showCreate && (
        <CreateContactDialog onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
 * Contact Detail Panel — slide-over with linked records
 * ═══════════════════════════════════════════════════════════ */

function ContactDetailPanel({
  contact,
  onClose,
  onEdit,
}: {
  contact: any;
  onClose: () => void;
  onEdit: () => void;
}) {
  const deactivate = useMutation(api.contacts.deactivateContact);
  const reactivate = useMutation(api.contacts.reactivateContact);
  const deleteContact = useMutation(api.contacts.deleteContact);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!contact) {
    return (
      <Sheet open onOpenChange={onClose}>
        <SheetContent className="bg-slate-900 border-slate-700 text-white w-full sm:max-w-xl">
          <div className="flex items-center justify-center py-12">
            <div className="animate-pulse text-slate-400">Loading contact...</div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  const handleDeactivate = async () => {
    try {
      await deactivate({ contactId: contact._id });
      toast.success("Contact deactivated");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleReactivate = async () => {
    try {
      await reactivate({ contactId: contact._id });
      toast.success("Contact reactivated");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteContact({ contactId: contact._id });
      toast.success("Contact deleted");
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const p = contact.prospectProfile;
  const fmtTs = (t?: number) => (t ? new Date(t).toLocaleString() : "—");

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="bg-slate-900 border-slate-700 text-white w-full sm:max-w-xl overflow-y-auto p-0">
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-slate-800">
          <SheetTitle className="text-xl flex items-center gap-2 text-white">
            <User className="w-5 h-5 text-cyan-400" />
            {contact.firstName} {contact.lastName || ""}
          </SheetTitle>
          <div className="flex flex-wrap gap-2 mt-1">
            <Badge variant="outline" className={TYPE_COLORS[contact.type as ContactType]}>
              {TYPE_LABELS[contact.type as ContactType]}
            </Badge>
            <Badge variant="outline" className={STATUS_COLORS[contact.status as ContactStatus]}>
              {contact.status === "active" ? (<><ShieldCheck className="w-3 h-3 mr-1" /> Active</>) : (<><ShieldAlert className="w-3 h-3 mr-1" /> Deactivated</>)}
            </Badge>
            <Badge variant="outline" className="bg-slate-800 text-slate-400 border-slate-700 capitalize">Source: {contact.source}</Badge>
          </div>
        </SheetHeader>

        <div className="px-5 py-4 space-y-5">
          {/* AI Profile Brief — the summary so you don't have to dig */}
          {contact.brief && (
            <div className="p-3.5 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <p className="text-xs text-blue-300 font-semibold mb-1.5 flex items-center gap-1">🤖 AI Profile Brief</p>
              <p className="text-sm text-slate-200 leading-relaxed">{contact.brief}</p>
            </div>
          )}

          {/* Top PerfectFit matches — what the system recommended */}
          {contact.matches?.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Top PerfectFit Matches</h3>
              <div className="space-y-1.5">
                {contact.matches.map((m: any, i: number) => (
                  <div key={m.slug} className="flex items-start gap-2 p-2 bg-slate-800/50 rounded border border-slate-700/50">
                    <span className="text-xs font-bold text-slate-500 w-4 shrink-0">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-white truncate">{m.name}</span>
                        <span className="text-xs font-bold text-cyan-400 shrink-0">{m.score}/100</span>
                      </div>
                      {m.reason && <p className="text-[11px] text-slate-400 truncate">{m.reason}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contact info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InfoRow icon={<Mail className="w-4 h-4" />} label="Email" value={contact.email || p?.email} />
            <InfoRow icon={<Phone className="w-4 h-4" />} label="Phone" value={contact.phone || p?.phone} />
            <InfoRow icon={<MapPin className="w-4 h-4" />} label="Location" value={[contact.city || p?.primaryCity, contact.state || p?.primaryState].filter(Boolean).join(", ") || undefined} />
            <InfoRow icon={<ShieldCheck className="w-4 h-4" />} label="Verified" value={contact.verification ? `Email ${contact.verification.emailVerified ? "✓" : "—"} · Phone ${contact.verification.phoneVerified ? "✓" : "—"}` : undefined} />
          </div>

          {/* FULL PerfectFit criteria — everything they entered */}
          {p ? (
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">PerfectFit Profile — All Criteria</h3>
              <div className="rounded-lg border border-slate-700/50 divide-y divide-slate-800">
                {PROFILE_FIELDS.map(([key, label, fmt]) => {
                  const raw = (p as any)[key];
                  const val = fmt ? fmt(raw) : Array.isArray(raw) ? raw.join(", ") : raw;
                  if (val === undefined || val === null || val === "" || (Array.isArray(raw) && raw.length === 0)) return null;
                  return (
                    <div key={key} className="flex items-start justify-between gap-3 px-3 py-1.5 text-sm">
                      <span className="text-slate-500">{label}</span>
                      <span className="text-slate-200 text-right">{String(val)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500 italic">No PerfectFit profile yet — this contact hasn't completed the quiz/profile.</p>
          )}

          {/* Notes */}
          {contact.notes?.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Notes ({contact.notes.length})</h3>
              <div className="space-y-2">
                {contact.notes.map((n: any) => (
                  <div key={n._id} className="p-2.5 bg-slate-800/40 rounded border border-slate-700/50">
                    {n.isPinned && <span className="text-[10px] text-amber-400 font-semibold">📌 Pinned</span>}
                    <p className="text-sm text-slate-200 whitespace-pre-wrap">{n.content}</p>
                    <p className="text-[10px] text-slate-500 mt-1">{fmtTs(n.createdAt)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Linked leads */}
          {contact.leads?.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Linked Leads ({contact.leads.length})</h3>
              <div className="space-y-1.5">
                {contact.leads.map((lead: any) => (
                  <div key={lead._id} className="flex items-center justify-between p-2 bg-slate-800/40 rounded border border-slate-700/50 text-sm">
                    <span className="text-slate-300">{lead.brandName}</span>
                    <Badge variant="outline" className="text-xs capitalize bg-slate-700/50 text-slate-400">{lead.stage?.replace(/_/g, " ")}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Owned brands */}
          {contact.ownedBrands?.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" /> Franchise Brands ({contact.ownedBrands.length})</h3>
              <div className="space-y-1.5">
                {contact.ownedBrands.map((brand: any) => (
                  <div key={brand._id} className="flex items-center gap-2 p-2 bg-purple-500/10 rounded border border-purple-500/20 text-sm">
                    <Briefcase className="w-3 h-3 text-purple-400" /><span className="text-white font-medium">{brand.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="text-xs text-slate-500 space-y-0.5 pt-1">
            <p>Contact created {fmtTs(contact.createdAt)} · updated {fmtTs(contact.updatedAt)}</p>
            {p?.contactLastEditedAt && <p>Profile last edited {fmtTs(p.contactLastEditedAt)}</p>}
            {p?._creationTime && <p>Profile created {fmtTs(p._creationTime)}</p>}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-800">
            <Button size="sm" variant="outline" onClick={onEdit} className="border-slate-600 text-white hover:bg-slate-800"><Pencil className="w-3 h-3 mr-1" /> Edit</Button>
            {contact.status === "active" ? (
              <Button size="sm" variant="outline" onClick={handleDeactivate} className="border-amber-600 text-amber-400 hover:bg-amber-500/10"><Ban className="w-3 h-3 mr-1" /> Deactivate</Button>
            ) : (
              <Button size="sm" variant="outline" onClick={handleReactivate} className="border-green-600 text-green-400 hover:bg-green-500/10"><CheckCircle2 className="w-3 h-3 mr-1" /> Reactivate</Button>
            )}
            {!confirmDelete ? (
              <Button size="sm" variant="outline" onClick={() => setConfirmDelete(true)} className="border-red-600 text-red-400 hover:bg-red-500/10"><Trash2 className="w-3 h-3 mr-1" /> Delete</Button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-400">Are you sure?</span>
                <Button size="sm" variant="destructive" onClick={handleDelete}>Yes, delete</Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)} className="text-slate-400">Cancel</Button>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* Humanized labels for the full PerfectFit criteria list. [key, label, formatter?] */
const PROFILE_FIELDS: [string, string, ((v: any) => string | undefined)?][] = [
  ["liquidCapital", "Liquid capital", (v) => ({ under_50k: "Under $50K", "50k_100k": "$50K–$100K", "100k_150k": "$100K–$150K", "150k_250k": "$150K–$250K", "250k_500k": "$250K–$500K", "500k_1m": "$500K–$1M", "1m_plus": "$1M+" } as any)[v] || v],
  ["totalInvestmentBudget", "Total investment budget"],
  ["ownerType", "Ownership style", (v) => ({ owner_operator: "Owner/Operator", semi_absentee: "Semi-Absentee", absentee: "Absentee/Executive", investor: "Investor/Multi-Unit" } as any)[v] || v],
  ["preferredCategories", "Industries of interest", (v) => (v || []).join(", ")],
  ["primaryCity", "Primary city"],
  ["primaryState", "Primary state"],
  ["primaryRadius", "Primary radius (mi)"],
  ["secondaryCity", "Secondary city"],
  ["secondaryState", "Secondary state"],
  ["timeline", "Timeline", (v) => ({ asap: "ASAP", "3_months": "Within 3 months", "6_months": "Within 6 months", "12_months": "Within 12 months", exploring: "Just exploring" } as any)[v] || v],
  ["priorExperience", "Prior experience"],
  ["sbaFinancingIntent", "SBA financing intent"],
  ["ownershipModel", "Ownership model(s)", (v) => (v || []).join(", ")],
  ["runFromHome", "Run from home?"],
  ["fullTimePartTime", "Full / part time"],
  ["multiUnitInterest", "Multi-unit interest"],
  ["veteranStatus", "Veteran", (v) => (v === true ? "Yes" : v === false ? "No" : undefined)],
  ["revenueGoal", "Revenue goal"],
  ["incomeGoal", "Income goal"],
  ["mustHaveFilters", "Must-haves", (v) => (v || []).join(", ").replace(/_/g, " ")],
  ["brandMaturity", "Brand maturity pref"],
  ["supportImportance", "Support importance"],
  ["supportPriorities", "Support priorities", (v) => (v || []).join(", ")],
  ["employeeComfort", "Employee comfort"],
  ["spacePreference", "Space preference"],
  ["motivations", "Motivations", (v) => (v || []).join(", ")],
  ["riskTolerance", "Risk tolerance"],
  ["professionalBackground", "Professional background", (v) => (v || []).join(", ")],
  ["lifestylePriorities", "Lifestyle priorities", (v) => (v || []).join(", ")],
  ["avoidList", "Wants to avoid", (v) => (v || []).join(", ").replace(/_/g, " ")],
];

/* ═══════════════════════════════════════════════════════════
 * Edit Contact Dialog
 * ═══════════════════════════════════════════════════════════ */

function EditContactDialog({ contact, onClose }: { contact: any; onClose: () => void }) {
  const update = useMutation(api.contacts.updateContact);
  const [form, setForm] = useState({
    firstName: contact.firstName || "",
    lastName: contact.lastName || "",
    email: contact.email || "",
    phone: contact.phone || "",
    address: contact.address || "",
    city: contact.city || "",
    state: contact.state || "",
    zipCode: contact.zipCode || "",
    type: contact.type || "prospect",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await update({
        contactId: contact._id,
        ...form,
        type: form.type as ContactType,
      });
      toast.success("Contact updated");
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Contact</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-400 text-xs">First Name</Label>
              <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
            </div>
            <div>
              <Label className="text-slate-400 text-xs">Last Name</Label>
              <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
            </div>
          </div>
          <div>
            <Label className="text-slate-400 text-xs">Email</Label>
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
          </div>
          <div>
            <Label className="text-slate-400 text-xs">Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
          </div>
          <div>
            <Label className="text-slate-400 text-xs">Address</Label>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-slate-400 text-xs">City</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
            </div>
            <div>
              <Label className="text-slate-400 text-xs">State</Label>
              <Select value={form.state || "__none__"} onValueChange={(v) => setForm({ ...form, state: v === "__none__" ? "" : v })}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-400 text-xs">Zip</Label>
              <Input value={form.zipCode} onChange={(e) => setForm({ ...form, zipCode: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
            </div>
          </div>
          <div>
            <Label className="text-slate-400 text-xs">Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="prospect">Prospect</SelectItem>
                <SelectItem value="franchisee">Franchisee</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={onClose} className="text-slate-400">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-cyan-600 hover:bg-cyan-700 text-white">
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════════
 * Create Contact Dialog
 * ═══════════════════════════════════════════════════════════ */

function CreateContactDialog({ onClose }: { onClose: () => void }) {
  const create = useMutation(api.contacts.createContact);
  const [form, setForm] = useState({
    type: "prospect" as ContactType,
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
  });
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!form.firstName || !form.email) {
      toast.error("First name and email are required");
      return;
    }
    setSaving(true);
    try {
      await create({
        ...form,
        lastName: form.lastName || undefined,
        phone: form.phone || undefined,
        address: form.address || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        zipCode: form.zipCode || undefined,
        source: "manual",
      });
      toast.success("Contact created");
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-cyan-400" /> New Contact
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label className="text-slate-400 text-xs">Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as ContactType })}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="prospect">Prospect</SelectItem>
                <SelectItem value="franchisee">Franchisee</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-400 text-xs">First Name *</Label>
              <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="bg-slate-800 border-slate-700 text-white" placeholder="John" />
            </div>
            <div>
              <Label className="text-slate-400 text-xs">Last Name</Label>
              <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="bg-slate-800 border-slate-700 text-white" placeholder="Doe" />
            </div>
          </div>
          <div>
            <Label className="text-slate-400 text-xs">Email *</Label>
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-slate-800 border-slate-700 text-white" placeholder="john@example.com" />
          </div>
          <div>
            <Label className="text-slate-400 text-xs">Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="bg-slate-800 border-slate-700 text-white" placeholder="(555) 123-4567" />
          </div>
          <div>
            <Label className="text-slate-400 text-xs">Address</Label>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-slate-400 text-xs">City</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
            </div>
            <div>
              <Label className="text-slate-400 text-xs">State</Label>
              <Select value={form.state} onValueChange={(v) => setForm({ ...form, state: v })}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-400 text-xs">Zip</Label>
              <Input value={form.zipCode} onChange={(e) => setForm({ ...form, zipCode: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={onClose} className="text-slate-400">Cancel</Button>
            <Button onClick={handleCreate} disabled={saving} className="bg-cyan-600 hover:bg-cyan-700 text-white">
              {saving ? "Creating..." : "Create Contact"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════════ */

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-slate-500 mt-0.5">{icon}</span>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm text-white">{value || "—"}</p>
      </div>
    </div>
  );
}
