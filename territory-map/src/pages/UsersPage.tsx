import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import {
  Users, ShieldAlert, ShieldCheck, Building2, Mail, X, UserPlus,
  Clock, CheckCircle2, XCircle, Crown, Shield, UserCog, Trash2,
  ToggleLeft, ToggleRight, AlertTriangle,
} from "lucide-react";
import type { Id } from "../../convex/_generated/dataModel";

const ROLE_CONFIG: Record<string, { label: string; color: string; desc: string; icon: any }> = {
  super_admin: { label: "Super Admin", color: "#f97316", desc: "Full control — Brent, Bennett, Madison", icon: Crown },
  admin:       { label: "Admin",       color: "#8b5cf6", desc: "Manage users (not super admins), brands, leads, territories", icon: Shield },
  standard:    { label: "Standard",    color: "#06b6d4", desc: "Create & edit brands, leads, territories", icon: UserCog },
  closer:      { label: "Closer",      color: "#22c55e", desc: "Sales rep — closes deals, manages assigned leads", icon: UserCog },
  setter:      { label: "Setter",      color: "#14b8a6", desc: "Sets appointments, qualifies leads for closers", icon: UserCog },
  broker:      { label: "Consultant",  color: "#ec4899", desc: "Vetted franchise consultant — assigned leads only, read-only tags, no export", icon: UserCog },
  brand_admin: { label: "Brand Admin", color: "#3b82f6", desc: "Access scoped to assigned brands only", icon: Building2 },
  franchisor:  { label: "Franchisor",  color: "#f59e0b", desc: "Marketplace franchisor account", icon: Building2 },
  prospect:    { label: "Prospect",    color: "#64748b", desc: "Public user / franchise prospect", icon: Users },
};

const INVITE_ROLES = ["admin", "standard", "closer", "setter", "broker", "brand_admin", "franchisor", "prospect"];

const PERM_LABELS: Record<string, string> = {
  canEditTerritories: "Edit Territories",
  canManageBrand: "Manage Brand",
  canViewContacts: "View Contacts",
  canExportData: "Export Data",
  canInviteUsers: "Invite Users",
};

const SALES_PERM_LABELS: Record<string, string> = {
  canCreateContacts: "Create Contacts",
  canEditContacts: "Edit Contacts",
  canDeleteContacts: "Delete Contacts",
  canManageCustomFields: "Manage Custom Fields",
};

const LEAD_VISIBILITY_OPTIONS: { value: string; label: string; desc: string }[] = [
  { value: "own_only", label: "Own Leads Only", desc: "See only leads assigned to them" },
  { value: "all", label: "All Leads", desc: "See all leads (sales manager)" },
  { value: "team", label: "Team Leads", desc: "See own + managed users' leads (area manager)" },
];

export function UsersPage() {
  const myProfile = useQuery(api.users.getMyProfile);
  const profiles = useQuery(api.users.listProfiles);
  const brands = useQuery(api.brands.listAll);
  const invites = useQuery(api.users.listInvites);
  const updateProfile = useMutation(api.users.updateProfile);
  const deleteProfileMut = useMutation(api.users.deleteProfile);
  const createInvite = useMutation(api.users.createInvite);
  const revokeInvite = useMutation(api.users.revokeInvite);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<string>("");
  const [editBrandIds, setEditBrandIds] = useState<string[]>([]);
  const [editPerms, setEditPerms] = useState<Record<string, boolean>>({});
  const [editActive, setEditActive] = useState<boolean>(true);
  const [editLeadVisibility, setEditLeadVisibility] = useState<string>("own_only");
  const [editManagedUserIds, setEditManagedUserIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Invite form
  const [showInvite, setShowInvite] = useState(false);
  const [invEmail, setInvEmail] = useState("");
  const [invFirstName, setInvFirstName] = useState("");
  const [invPhone, setInvPhone] = useState("");
  const [invRole, setInvRole] = useState("standard");
  const [invBrandIds, setInvBrandIds] = useState<string[]>([]);
  const [invPerms, setInvPerms] = useState<Record<string, boolean>>({
    canEditTerritories: true,
    canViewContacts: true,
    canExportData: true,
  });
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);

  const isSuperAdmin = myProfile?.isSuperAdmin;
  const isAdmin = myProfile?.isAdmin;

  // Must be at least admin to see this page
  if (myProfile !== undefined && !isAdmin) {
    return (
      <div className="space-y-6 max-w-[1200px]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage team access and permissions</p>
        </div>
        <div className="bg-card border rounded-2xl p-12 text-center">
          <ShieldAlert className="w-12 h-12 mx-auto mb-3 text-destructive opacity-50" />
          <h2 className="text-lg font-bold mb-1">Access Denied</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            User management is restricted to administrators. Contact your admin for access.
          </p>
        </div>
      </div>
    );
  }

  const brandMap = new Map(brands?.map((b) => [b._id, b]) || []);

  // Which roles can this user assign?
  const assignableRoles = isSuperAdmin
    ? ["super_admin", "admin", "standard", "brand_admin", "franchisor", "prospect"]
    : ["admin", "standard", "brand_admin", "franchisor", "prospect"];

  function startEdit(profile: any) {
    setEditingId(profile._id);
    setEditRole(profile.role);
    setEditBrandIds(profile.brandIds || []);
    setEditPerms(profile.permissions || {});
    setEditActive(profile.isActive !== false);
    setEditLeadVisibility(profile.permissions?.leadVisibility || "own_only");
    setEditManagedUserIds(profile.managedUserIds || []);
  }

  async function saveEdit(profileId: string) {
    setSaving(true);
    try {
      const isSalesRole = ["closer", "setter", "broker"].includes(editRole);
      const permsToSend = isSalesRole
        ? { ...editPerms, leadVisibility: editLeadVisibility }
        : ["brand_admin", "franchisor"].includes(editRole)
          ? editPerms
          : undefined;

      await updateProfile({
        profileId: profileId as Id<"userProfiles">,
        role: editRole as any,
        brandIds: editRole === "brand_admin" ? editBrandIds as Id<"brands">[] : undefined,
        permissions: permsToSend as any,
        isActive: editActive,
        ...(isSalesRole && editLeadVisibility === "team"
          ? { managedUserIds: editManagedUserIds as Id<"users">[] }
          : {}),
      });
      setEditingId(null);
    } catch (e: any) {
      alert(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(profileId: string, email: string) {
    if (!confirm(`Permanently delete ${email}? This removes their account and all sessions.`)) return;
    try {
      await deleteProfileMut({ profileId: profileId as Id<"userProfiles"> });
    } catch (e: any) {
      alert(e.message || "Failed to delete");
    }
  }

  async function toggleActive(profile: any) {
    try {
      await updateProfile({
        profileId: profile._id as Id<"userProfiles">,
        role: profile.role,
        isActive: profile.isActive === false ? true : false,
      });
    } catch (e: any) {
      alert(e.message || "Failed to toggle");
    }
  }

  function toggleEditBrand(brandId: string) {
    setEditBrandIds((prev) =>
      prev.includes(brandId) ? prev.filter((id) => id !== brandId) : [...prev, brandId]
    );
  }

  async function handleInvite() {
    if (!invEmail.trim() || !invFirstName.trim()) {
      setInviteMsg("First name and email are required.");
      return;
    }
    setInviting(true);
    setInviteMsg(null);
    try {
      const result = await createInvite({
        email: invEmail.trim().toLowerCase(),
        firstName: invFirstName.trim(),
        phone: invPhone.trim() || undefined,
        role: invRole as any,
        brandIds: invRole === "brand_admin" ? invBrandIds as Id<"brands">[] : undefined,
        permissions: ["brand_admin", "franchisor"].includes(invRole) ? invPerms : undefined,
      });
      if ((result as any).existingUser) {
        setInviteMsg(`${invEmail} already has an account — their role has been updated.`);
      } else if ((result as any).updated) {
        setInviteMsg(`Updated pending invite for ${invEmail}.`);
      } else {
        setInviteMsg(`Invite sent to ${invEmail} — they'll get an email with a signup link.`);
      }
      setInvEmail("");
      setInvFirstName("");
      setInvPhone("");
    } catch (e: any) {
      setInviteMsg(`Error: ${e.message}`);
    } finally {
      setInviting(false);
    }
  }

  const pendingInvites = invites?.filter((i) => i.status === "pending") || [];

  return (
    <div className="space-y-6 max-w-[1200px]">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {profiles?.length || 0} users · {pendingInvites.length} pending invite{pendingInvites.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowInvite(!showInvite)}
          className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
        >
          <UserPlus className="w-4 h-4" />
          Invite User
        </button>
      </div>

      {/* Invite form */}
      {showInvite && (
        <div className="bg-card border rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Mail className="w-4 h-4 text-cyan-500" />
              Invite Team Member
            </h3>
            <button onClick={() => { setShowInvite(false); setInviteMsg(null); }} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">First Name *</label>
              <input
                type="text"
                value={invFirstName}
                onChange={(e) => setInvFirstName(e.target.value)}
                placeholder="First name"
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Email Address *</label>
              <input
                type="email"
                value={invEmail}
                onChange={(e) => setInvEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Mobile Phone</label>
              <input
                type="tel"
                value={invPhone}
                onChange={(e) => setInvPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
              />
              {["super_admin", "admin", "standard"].includes(invRole) && !invEmail.endsWith("@franchiseki.com") && invEmail.includes("@") && (
                <p className="text-xs text-amber-500 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Internal roles require @franchiseki.com email
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Role</label>
              <select
                value={invRole}
                onChange={(e) => setInvRole(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
              >
                {(isSuperAdmin ? ["super_admin", ...INVITE_ROLES] : INVITE_ROLES).map((r) => (
                  <option key={r} value={r}>{ROLE_CONFIG[r]?.label || r}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Brand selector for brand_admin */}
          {invRole === "brand_admin" && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Assign Brands</label>
              <div className="flex flex-wrap gap-1.5">
                {brands?.map((b) => (
                  <button
                    key={b._id}
                    onClick={() => setInvBrandIds((prev) => prev.includes(b._id) ? prev.filter((x) => x !== b._id) : [...prev, b._id])}
                    className={`text-xs px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                      invBrandIds.includes(b._id)
                        ? "bg-cyan-500/20 text-cyan-400 font-semibold border border-cyan-500/30"
                        : "bg-muted text-muted-foreground hover:bg-muted/80 border border-transparent"
                    }`}
                  >
                    <Building2 className="w-3 h-3" />
                    {b.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Permissions for brand_admin/franchisor */}
          {["brand_admin", "franchisor"].includes(invRole) && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Permissions</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(PERM_LABELS).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={invPerms[key] ?? false}
                      onChange={(e) => setInvPerms((prev) => ({ ...prev, [key]: e.target.checked }))}
                      className="w-3.5 h-3.5 rounded"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Permissions for closer/setter */}
          {["closer", "setter"].includes(invRole) && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Lead Visibility</label>
                <div className="flex flex-wrap gap-2">
                  {LEAD_VISIBILITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setInvPerms((prev) => ({ ...prev, leadVisibility: opt.value } as any))}
                      className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                        (invPerms as any).leadVisibility === opt.value
                          ? "bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30"
                          : "bg-muted text-muted-foreground hover:bg-muted/80 border border-transparent"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Contact Permissions</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(SALES_PERM_LABELS).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={invPerms[key] ?? true}
                        onChange={(e) => setInvPerms((prev) => ({ ...prev, [key]: e.target.checked }))}
                        className="w-3.5 h-3.5 rounded"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleInvite}
              disabled={inviting || !invEmail.trim()}
              className="text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 font-medium"
            >
              {inviting ? "Sending…" : "Send Invite"}
            </button>
            {inviteMsg && (
              <p className={`text-xs ${inviteMsg.startsWith("Error") ? "text-destructive" : "text-emerald-500"}`}>
                {inviteMsg}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <div className="bg-card border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b bg-amber-500/5">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              Pending Invites ({pendingInvites.length})
            </h3>
          </div>
          <div className="divide-y">
            {pendingInvites.map((inv) => {
              const cfg = ROLE_CONFIG[inv.role] || ROLE_CONFIG.prospect;
              return (
                <div key={inv._id} className="flex items-center gap-3 px-4 py-2.5">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{inv.email}</span>
                  <span className="text-xs px-2 py-0.5 rounded-md font-semibold" style={{ backgroundColor: `${cfg.color}15`, color: cfg.color }}>
                    {cfg.label}
                  </span>
                  {inv.brandIds?.map((bId) => (
                    <span key={bId} className="text-xs px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400">
                      {brandMap.get(bId)?.name || "?"}
                    </span>
                  ))}
                  <div className="ml-auto">
                    <button
                      onClick={async () => {
                        if (confirm(`Revoke invite for ${inv.email}?`)) {
                          await revokeInvite({ inviteId: inv._id });
                        }
                      }}
                      className="text-xs px-2 py-1 rounded text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Role legend */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Object.entries(ROLE_CONFIG).map(([role, cfg]) => {
          const count = profiles?.filter((p: any) => p.role === role).length || 0;
          const Icon = cfg.icon;
          return (
            <div key={role} className="bg-card border rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                <span className="text-xs font-medium">{cfg.label}</span>
                <span className="ml-auto text-sm font-bold" style={{ color: cfg.color }}>{count}</span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-tight">{cfg.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Users table */}
      <div className="bg-card border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">User</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">Email</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">Role</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">Status</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">Brand Access</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs w-32">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!profiles ? (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">Loading…</td></tr>
              ) : profiles.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No users found</td></tr>
              ) : (
                profiles.map((p: any) => {
                  const cfg = ROLE_CONFIG[p.role] || ROLE_CONFIG.prospect;
                  const isEditing = editingId === p._id;
                  const isMe = p.userId === myProfile?.user?._id;
                  const isTargetSuperAdmin = p._isSuperAdmin;
                  const isInactive = p.isActive === false;

                  return (
                    <tr key={p._id} className={`border-b last:border-0 hover:bg-muted/20 transition-colors ${isInactive ? "opacity-50" : ""}`}>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold" style={{ borderColor: cfg.color, borderWidth: 2 }}>
                            {(p.firstName || p.name || p.email || "U").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium flex items-center gap-1.5">
                              {p.firstName || p.name || "—"} {p.lastName || ""}
                              {isMe && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">You</span>}
                              {isTargetSuperAdmin && <Crown className="w-3 h-3 text-orange-400" />}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground text-xs">{p.email || "—"}</td>
                      <td className="py-2.5 px-4">
                        {isEditing ? (
                          <select
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value)}
                            className="text-xs px-2 py-1 rounded-md border bg-background"
                          >
                            {assignableRoles.map((r) => (
                              <option key={r} value={r}>{ROLE_CONFIG[r]?.label || r}</option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className="text-xs px-2 py-0.5 rounded-md font-semibold inline-flex items-center gap-1"
                            style={{ backgroundColor: `${cfg.color}15`, color: cfg.color }}
                          >
                            {cfg.label}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        {isEditing ? (
                          <button
                            onClick={() => setEditActive(!editActive)}
                            className={`text-xs px-2 py-1 rounded-md flex items-center gap-1 ${editActive ? "bg-emerald-500/15 text-emerald-500" : "bg-red-500/15 text-red-400"}`}
                          >
                            {editActive ? <><ToggleRight className="w-3 h-3" /> Active</> : <><ToggleLeft className="w-3 h-3" /> Inactive</>}
                          </button>
                        ) : (
                          <span className={`text-xs px-2 py-0.5 rounded-md ${isInactive ? "bg-red-500/15 text-red-400" : "bg-emerald-500/15 text-emerald-500"}`}>
                            {isInactive ? "Inactive" : "Active"}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        {isEditing && editRole === "brand_admin" ? (
                          <div className="flex flex-wrap gap-1">
                            {brands?.slice(0, 20).map((b) => (
                              <button
                                key={b._id}
                                onClick={() => toggleEditBrand(b._id)}
                                className={`text-xs px-2 py-0.5 rounded-md transition-colors ${
                                  editBrandIds.includes(b._id)
                                    ? "bg-cyan-500/20 text-cyan-400 font-semibold"
                                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                                }`}
                              >
                                {b.name}
                              </button>
                            ))}
                          </div>
                        ) : isEditing && ["closer", "setter"].includes(editRole) ? (
                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-1">
                              {LEAD_VISIBILITY_OPTIONS.map((opt) => (
                                <button
                                  key={opt.value}
                                  onClick={() => setEditLeadVisibility(opt.value)}
                                  className={`text-[10px] px-2 py-0.5 rounded-md transition-colors ${
                                    editLeadVisibility === opt.value
                                      ? "bg-emerald-500/20 text-emerald-400 font-semibold"
                                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                                  }`}
                                  title={opt.desc}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {Object.entries(SALES_PERM_LABELS).map(([key, label]) => (
                                <label key={key} className="flex items-center gap-1 text-[10px] cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={editPerms[key] ?? true}
                                    onChange={(e) => setEditPerms((prev) => ({ ...prev, [key]: e.target.checked }))}
                                    className="w-3 h-3 rounded"
                                  />
                                  {label}
                                </label>
                              ))}
                            </div>
                          </div>
                        ) : p.role === "brand_admin" && p.brandIds?.length ? (
                          <div className="flex flex-wrap gap-1">
                            {p.brandIds.map((bId: any) => (
                              <span key={bId} className="text-xs px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400">
                                {brandMap.get(bId)?.name || "?"}
                              </span>
                            ))}
                          </div>
                        ) : ["closer", "setter"].includes(p.role) ? (
                          <div className="flex flex-wrap gap-1">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                              {p.permissions?.leadVisibility === "all" ? "All Leads" : p.permissions?.leadVisibility === "team" ? "Team Leads" : "Own Leads"}
                            </span>
                            {p.permissions?.canCreateContacts !== false && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Create</span>}
                            {p.permissions?.canEditContacts !== false && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Edit</span>}
                            {p.permissions?.canDeleteContacts && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Delete</span>}
                          </div>
                        ) : ["super_admin", "admin", "standard"].includes(p.role) ? (
                          <span className="text-xs text-muted-foreground">All brands</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        {isEditing ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => saveEdit(p._id)}
                              disabled={saving}
                              className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                            >
                              {saving ? "…" : "Save"}
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="text-xs px-2 py-1 rounded border hover:bg-muted"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            {/* Edit — admin+ can edit, but admins can't edit super admins */}
                            {(!isTargetSuperAdmin || isSuperAdmin) && (
                              <button
                                onClick={() => startEdit(p)}
                                className="text-xs px-2 py-1 rounded border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                              >
                                Edit
                              </button>
                            )}
                            {/* Toggle active — admin+ can toggle, super admins can toggle anyone non-super */}
                            {!isMe && !isTargetSuperAdmin && (
                              <button
                                onClick={() => toggleActive(p)}
                                className="text-xs px-1.5 py-1 rounded border text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                                title={isInactive ? "Reactivate" : "Deactivate"}
                              >
                                {isInactive ? <ToggleLeft className="w-3 h-3" /> : <ToggleRight className="w-3 h-3" />}
                              </button>
                            )}
                            {/* Delete — super admin only, can't delete fellow super admins */}
                            {isSuperAdmin && !isMe && !isTargetSuperAdmin && (
                              <button
                                onClick={() => handleDelete(p._id, p.email || "user")}
                                className="text-xs px-1.5 py-1 rounded border text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                title="Delete user"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Access control info */}
      <div className="bg-card border rounded-2xl p-5">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan-500" />
          Permission Matrix
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3 font-medium text-muted-foreground">Capability</th>
                <th className="text-center py-2 px-2 font-medium text-orange-400">Super Admin</th>
                <th className="text-center py-2 px-2 font-medium text-violet-400">Admin</th>
                <th className="text-center py-2 px-2 font-medium text-cyan-400">Standard</th>
                <th className="text-center py-2 px-2 font-medium text-emerald-400">Closer</th>
                <th className="text-center py-2 px-2 font-medium text-teal-400">Setter</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {[
                ["Manage Users", "✅", "✅ (not super)", "❌", "❌", "❌"],
                ["Delete Users", "✅ (not SA)", "❌", "❌", "❌", "❌"],
                ["Toggle Inactive", "✅", "✅", "❌", "❌", "❌"],
                ["Create Brands", "✅", "✅", "✅", "❌", "❌"],
                ["Edit Brands", "✅", "✅", "✅", "❌", "❌"],
                ["Delete Brands", "✅", "❌", "❌", "❌", "❌"],
                ["Export Brands", "✅", "❌", "❌", "❌", "❌"],
                ["View Leads", "✅ all", "✅ all", "✅ all", "⚙ configurable", "⚙ configurable"],
                ["Create Leads", "✅", "✅", "✅", "⚙ configurable", "⚙ configurable"],
                ["Edit Leads", "✅", "✅", "✅", "⚙ configurable", "⚙ configurable"],
                ["Delete Leads", "✅", "✅", "❌", "⚙ configurable", "❌"],
                ["Manage Territories", "✅ all", "✅ all", "✅ create/edit", "❌", "❌"],
              ].map(([cap, sa, admin, standard, closer, setter]) => (
                <tr key={cap as string} className="hover:bg-muted/20">
                  <td className="py-1.5 px-3 font-medium">{cap}</td>
                  <td className="py-1.5 px-2 text-center">{sa}</td>
                  <td className="py-1.5 px-2 text-center">{admin}</td>
                  <td className="py-1.5 px-2 text-center">{standard}</td>
                  <td className="py-1.5 px-2 text-center">{closer}</td>
                  <td className="py-1.5 px-2 text-center">{setter}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
