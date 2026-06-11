import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useState, useEffect } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Search,
  AlertTriangle,
  ShieldCheck,
  User,
  Phone,
  Mail,
  MapPin,
  Pencil,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

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

const PAGE_SIZE = 25;

export function ProspectProfilesAdminPage() {
  const profiles = useQuery(api.prospect.listProspectProfiles);
  const myProfile = useQuery(api.users.getMyProfile);
  const adminUpdate = useMutation(api.prospect.adminUpdateProspectContact);

  const [search, setSearch] = useState("");
  const [filterWarning, setFilterWarning] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any>(null);
  const [page, setPage] = useState(0);

  if (!myProfile?.isInternal) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">Access denied — internal team only.</p>
      </div>
    );
  }

  const filtered = (profiles || []).filter((p) => {
    const text = `${p.firstName || ""} ${p.lastName || ""} ${p.email || ""} ${p.phone || ""} ${p.city || ""} ${p.state || ""}`.toLowerCase();
    if (search && !text.includes(search.toLowerCase())) return false;
    if (filterWarning && !p.hasContactWarning) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageProfiles = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const warningCount = (profiles || []).filter((p) => p.hasContactWarning).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Prospect Profiles</h1>
        <p className="text-muted-foreground text-sm mt-1">
          View and manage prospect contact information. Changes here are marked as admin-verified.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Search name, email, phone, city..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9 bg-white/5 border-white/10"
          />
        </div>

        {warningCount > 0 && (
          <Button
            variant={filterWarning ? "default" : "outline"}
            size="sm"
            onClick={() => { setFilterWarning(!filterWarning); setPage(0); }}
            className="gap-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            {warningCount} Modified After Verify
          </Button>
        )}

        <span className="text-xs text-slate-500 ml-auto">
          {filtered.length} prospect{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-left">Name</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-left">Email</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-left">Phone</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-left">Location</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-left">Status</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {pageProfiles.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                  {search || filterWarning ? "No prospects match your filters." : "No prospect profiles yet."}
                </td></tr>
              ) : pageProfiles.map((p) => (
                <tr key={p._id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center text-xs font-semibold text-cyan-300">
                        {(p.firstName || p.email || "?").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium">{p.displayName}</div>
                        {p.hasContactWarning && (
                          <div className="flex items-center gap-1 text-xs text-amber-400 mt-0.5">
                            <AlertTriangle className="w-3 h-3" /> Modified after verify
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{p.email || "—"}</td>
                  <td className="px-4 py-3 text-slate-400">{p.phone || "—"}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {[p.city, p.state].filter(Boolean).join(", ") || "—"}
                    {p.zipCode && ` ${p.zipCode}`}
                  </td>
                  <td className="px-4 py-3">
                    {p.adminVerified ? (
                      <Badge variant="outline" className="gap-1 text-emerald-400 border-emerald-500/30 bg-emerald-500/10 text-xs">
                        <ShieldCheck className="w-3 h-3" /> Verified
                      </Badge>
                    ) : p.contactLastEditedBy ? (
                      <Badge variant="outline" className="text-slate-400 border-white/10 text-xs">
                        Edited by {p.contactLastEditedBy}
                      </Badge>
                    ) : (
                      <span className="text-xs text-slate-600">No edits</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setEditingProfile(p)} className="gap-1.5 text-xs">
                      <Pencil className="w-3 h-3" /> Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <span className="text-xs text-slate-500">
              Page {page + 1} of {totalPages}
            </span>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      {editingProfile && (
        <AdminEditContactDialog
          profile={editingProfile}
          onClose={() => setEditingProfile(null)}
          onSave={async (data) => {
            try {
              await adminUpdate({
                prospectProfileId: editingProfile._id as Id<"prospectProfiles">,
                ...data,
              });
              toast.success("Contact info updated & verified ✓");
              setEditingProfile(null);
            } catch (e: any) {
              toast.error(e.message || "Failed to update");
            }
          }}
        />
      )}
    </div>
  );
}

function AdminEditContactDialog({
  profile,
  onClose,
  onSave,
}: {
  profile: any;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}) {
  const [firstName, setFirstName] = useState(profile.firstName || "");
  const [lastName, setLastName] = useState(profile.lastName || "");
  const [email, setEmail] = useState(profile.email || "");
  const [phone, setPhone] = useState(profile.phone || "");
  const [address, setAddress] = useState(profile.address || "");
  const [city, setCity] = useState(profile.city || "");
  const [state, setState] = useState(profile.state || "");
  const [zipCode, setZipCode] = useState(profile.zipCode || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      email: email || undefined,
      phone: phone || undefined,
      address: address || undefined,
      city: city || undefined,
      state: state || undefined,
      zipCode: zipCode || undefined,
    });
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Edit Prospect Contact
          </DialogTitle>
        </DialogHeader>

        {/* Warning banner */}
        {profile.hasContactWarning && (
          <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-amber-300">Prospect modified contact info</p>
              <p className="text-xs text-amber-400/80 mt-0.5">
                This prospect changed their contact details after you last verified them.
                {profile.contactLastEditedAt && (
                  <> Last changed: {new Date(profile.contactLastEditedAt).toLocaleDateString()}</>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Last verified info */}
        {profile.adminVerified && profile.adminVerifiedAt && !profile.hasContactWarning && (
          <div className="flex items-center gap-2 p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            Verified on {new Date(profile.adminVerifiedAt).toLocaleDateString()}
          </div>
        )}

        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-400">First Name</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="mt-1 bg-white/5 border-white/10" />
            </div>
            <div>
              <Label className="text-xs text-slate-400">Last Name</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} className="mt-1 bg-white/5 border-white/10" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-400">Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="mt-1 bg-white/5 border-white/10" />
            </div>
            <div>
              <Label className="text-xs text-slate-400">Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 bg-white/5 border-white/10" />
            </div>
          </div>

          <div>
            <Label className="text-xs text-slate-400">Street Address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1 bg-white/5 border-white/10" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-slate-400">City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} className="mt-1 bg-white/5 border-white/10" />
            </div>
            <div>
              <Label className="text-xs text-slate-400">State</Label>
              <Select value={state} onValueChange={setState}>
                <SelectTrigger className="mt-1 bg-white/5 border-white/10"><SelectValue placeholder="State" /></SelectTrigger>
                <SelectContent>
                  {US_STATES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-400">ZIP</Label>
              <Input value={zipCode} onChange={(e) => setZipCode(e.target.value)} className="mt-1 bg-white/5 border-white/10" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            {saving ? "Saving..." : "Save & Verify"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
