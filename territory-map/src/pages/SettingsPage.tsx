import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import {
  Check,
  ChevronRight,
  Loader2,
  Moon,
  Palette,
  Pencil,
  Sun,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";

/* ── Helpers ──────────────────────────────────────────── */
function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/* ── Component ────────────────────────────────────────── */
export function SettingsPage() {
  const user = useQuery(api.auth.currentUser);
  const myProfile = useQuery(api.users.getMyProfile);
  const { theme, toggleTheme, switchable } = useTheme();
  const { signIn, signOut } = useAuthActions();
  const updateMyProfile = useMutation(api.users.updateMyProfile);
  const deleteAccount = useMutation(api.users.deleteAccount);
  const navigate = useNavigate();
  const isProspect = myProfile?.profile?.role === "prospect";

  /* ── Profile editing state ── */
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  // Sync form fields when profile loads or editing is cancelled
  useEffect(() => {
    if (myProfile?.profile && !editing) {
      setFirstName(myProfile.profile.firstName || "");
      setLastName(myProfile.profile.lastName || "");
      setPhone(myProfile.profile.phone ? formatPhone(myProfile.profile.phone) : "");
    }
  }, [myProfile?.profile, editing]);

  const handleSaveProfile = async () => {
    if (!firstName.trim()) {
      toast.error("First name is required");
      return;
    }
    setSaving(true);
    try {
      await updateMyProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        // Prospect phone lives on the PerfectFit profile (field is read-only here)
        ...(isProspect ? {} : { phone: phone.replace(/\D/g, "") }),
      });
      toast.success("Profile updated");
      setEditing(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditing(false);
    // useEffect will reset fields from profile
  };

  /* ── Password / Delete state ── */
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [passwordStep, setPasswordStep] = useState<"request" | "verify">(
    "request",
  );

  const handleRequestPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData();
    formData.append("email", user?.email || "");
    formData.append("flow", "reset");

    try {
      await signIn("password", formData);
      setPasswordStep("verify");
    } catch {
      setError("Could not send reset code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.append("email", user?.email || "");
    formData.append("flow", "reset-verification");

    try {
      await signIn("password", formData);
      setSuccess("Password changed successfully!");
      setTimeout(() => {
        setChangePasswordOpen(false);
        setPasswordStep("request");
        setSuccess("");
      }, 1500);
    } catch {
      setError("Invalid code or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    setError("");

    try {
      await deleteAccount();
      await signOut();
      navigate("/");
    } catch {
      setError("Could not delete account. Please try again.");
      setLoading(false);
    }
  };

  /* ── Derived display values ── */
  const displayFirst = myProfile?.profile?.firstName || "";
  const displayLast = myProfile?.profile?.lastName || "";
  const displayName = [displayFirst, displayLast].filter(Boolean).join(" ") || user?.name || "User";
  const initials = [displayFirst, displayLast]
    .filter(Boolean)
    .map((n) => n.charAt(0).toUpperCase())
    .join("") || (user?.name?.charAt(0).toUpperCase() ?? "U");

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your profile and account preferences
        </p>
      </div>

      {/* ── Profile Card ────────────────────────────── */}
      <Card className="overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
        <CardContent className="-mt-10 pb-6">
          {/* Header row: avatar + name + edit button */}
          <div className="flex items-end justify-between">
            <div className="flex items-end gap-4">
              <Avatar className="size-16 border-4 border-background shadow-lg">
                <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                  {editing
                    ? [firstName, lastName]
                        .filter(Boolean)
                        .map((n) => n.charAt(0).toUpperCase())
                        .join("") || "U"
                    : initials}
                </AvatarFallback>
              </Avatar>
              <div className="pb-1">
                {!editing && (
                  <>
                    <p className="font-semibold">{displayName}</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </>
                )}
              </div>
            </div>
            {!editing && (
              <Button
                size="sm"
                variant="ghost"
                className="mb-1"
                onClick={() => setEditing(true)}
              >
                <Pencil className="size-3.5 mr-1.5" />
                Edit
              </Button>
            )}
          </div>

          {/* Editable fields */}
          {editing ? (
            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={user?.email || ""}
                  disabled
                  className="opacity-60"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed — it's tied to your login.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                {isProspect ? (
                  <>
                    <Input id="phone" type="tel" value={phone} disabled className="opacity-60" />
                    <p className="text-xs text-muted-foreground">
                      Phone is managed in{" "}
                      <Link to="/my-profile" className="text-primary underline underline-offset-2">
                        your PerfectFit profile
                      </Link>{" "}
                      so your matches and consultant always have the right number.
                    </p>
                  </>
                ) : (
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    placeholder="(555) 123-4567"
                  />
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={handleSaveProfile}
                  disabled={saving || !firstName.trim()}
                >
                  {saving ? (
                    <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  ) : (
                    <Check className="size-3.5 mr-1.5" />
                  )}
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancelEdit}
                  disabled={saving}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            /* Read-only detail rows */
            <div className="mt-5 space-y-3">
              <div className="grid grid-cols-[100px_1fr] gap-x-4 gap-y-2 text-sm">
                <span className="text-muted-foreground">Phone</span>
                <span className="font-medium">
                  {myProfile?.profile?.phone
                    ? formatPhone(myProfile.profile.phone)
                    : "—"}
                </span>
                <span className="text-muted-foreground">Role</span>
                <span className="font-medium capitalize">
                  {(myProfile?.profile?.role || "prospect").replace(/_/g, " ")}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Appearance ──────────────────────────────── */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="size-4 text-muted-foreground" />
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {switchable ? (
            <div className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50">
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-full bg-secondary flex items-center justify-center">
                  {theme === "light" ? (
                    <Moon className="size-5 text-foreground" />
                  ) : (
                    <Sun className="size-5 text-foreground" />
                  )}
                </div>
                <div>
                  <Label htmlFor="dark-mode" className="font-medium">
                    Dark mode
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Toggle between light and dark themes
                  </p>
                </div>
              </div>
              <Switch
                id="dark-mode"
                checked={theme === "dark"}
                onCheckedChange={toggleTheme}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground px-4 py-2">
              Theme follows your system preference
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Account ─────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="size-4 text-muted-foreground" />
            Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <button
            onClick={() => setChangePasswordOpen(true)}
            className="w-full flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50 text-left"
          >
            <div>
              <p className="font-medium text-sm">Change password</p>
              <p className="text-sm text-muted-foreground">
                Update your password
              </p>
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => setDeleteAccountOpen(true)}
            className="w-full flex items-center justify-between rounded-lg border border-destructive/20 p-4 transition-colors hover:bg-destructive/5 text-left"
          >
            <div>
              <p className="font-medium text-sm text-destructive">
                Delete account
              </p>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account
              </p>
            </div>
            <ChevronRight className="size-4 text-destructive" />
          </button>
        </CardContent>
      </Card>

      {/* ── Change Password Dialog ──────────────────── */}
      <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              {passwordStep === "request"
                ? "We'll send a verification code to your email."
                : "Enter the code from your email and your new password."}
            </DialogDescription>
          </DialogHeader>

          {passwordStep === "request" ? (
            <form onSubmit={handleRequestPasswordReset}>
              <div className="py-4">
                <p className="text-sm text-muted-foreground">
                  A reset code will be sent to:{" "}
                  <span className="font-medium text-foreground">
                    {user?.email}
                  </span>
                </p>
              </div>
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2 mb-4">
                  {error}
                </p>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setChangePasswordOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="size-4 animate-spin" />}
                  Send Code
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Verification Code</Label>
                <Input
                  id="code"
                  name="code"
                  type="text"
                  placeholder="Enter code from email"
                  autoComplete="one-time-code"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  placeholder="••••••••"
                  minLength={6}
                  autoComplete="new-password"
                  required
                />
              </div>
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
              {success && (
                <p className="text-sm text-success bg-success/10 rounded-lg px-3 py-2">
                  {success}
                </p>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPasswordStep("request");
                    setError("");
                  }}
                >
                  Back
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="size-4 animate-spin" />}
                  Change Password
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Account Dialog ───────────────────── */}
      <Dialog open={deleteAccountOpen} onOpenChange={setDeleteAccountOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete your
              account and remove all your data.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete your account?
            </p>
          </div>
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteAccountOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={loading}
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
