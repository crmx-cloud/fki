import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Bell,
  Plus,
  Megaphone,
  Sparkles,
  Zap,
  Gift,
  Info,
  Trash2,
  ExternalLink,
  Eye,
  ArrowRight,
  Heart,
  Calendar,
  Video,
  ImageIcon,
  Link2,
  Search,
  X,
  Clock,
  Globe,
  MapPin,
  Tag,
  DollarSign,
  Users,
  Target,
  Repeat,
  PanelTop,
  Maximize2,
  Monitor,
} from "lucide-react";

const TYPES = [
  { id: "announcement", label: "Announcement", icon: Megaphone, color: "text-cyan-400", bg: "bg-cyan-500/15" },
  { id: "new_brand", label: "New Brand", icon: Sparkles, color: "text-violet-400", bg: "bg-violet-500/15" },
  { id: "feature", label: "Feature", icon: Zap, color: "text-amber-400", bg: "bg-amber-500/15" },
  { id: "offer", label: "Offer", icon: Gift, color: "text-emerald-400", bg: "bg-emerald-500/15" },
  { id: "update", label: "Update", icon: Info, color: "text-blue-400", bg: "bg-blue-500/15" },
] as const;

const DISPLAY_TYPES = [
  { id: "basic", label: "Bell Notification", icon: Bell, color: "text-cyan-400", bg: "bg-cyan-500/15", desc: "Appears in the notification bell. Bell shakes with a blue dot." },
  { id: "top_bar", label: "Top Bar", icon: PanelTop, color: "text-amber-400", bg: "bg-amber-500/15", desc: "Slim horizontal banner across the top. Text, emoji & button only — no image or video." },
  { id: "center_popup", label: "Center Popup", icon: Maximize2, color: "text-violet-400", bg: "bg-violet-500/15", desc: "Full overlay in center of screen. Supports image, video, and all options." },
] as const;

type DisplayType = typeof DISPLAY_TYPES[number]["id"];

const AUDIENCES = [
  { id: "all", label: "Everyone" },
  { id: "leads", label: "Leads Only" },
  { id: "brands", label: "Brands Only" },
] as const;

type NotificationType = typeof TYPES[number]["id"];
type AudienceType = typeof AUDIENCES[number]["id"];

const US_TIMEZONES = [
  { id: "America/New_York", label: "Eastern (ET)" },
  { id: "America/Chicago", label: "Central (CT)" },
  { id: "America/Denver", label: "Mountain (MT)" },
  { id: "America/Los_Angeles", label: "Pacific (PT)" },
  { id: "Pacific/Honolulu", label: "Hawaii (HI)" },
  { id: "America/Anchorage", label: "Alaska (AK)" },
] as const;

const LIQUID_CAPITAL_OPTIONS = [
  { id: "under_50k", label: "Under $50K" },
  { id: "50k_100k", label: "$50K–$100K" },
  { id: "100k_250k", label: "$100K–$250K" },
  { id: "250k_500k", label: "$250K–$500K" },
  { id: "500k_1m", label: "$500K–$1M" },
  { id: "over_1m", label: "$1M+" },
] as const;

const STAGE_OPTIONS = [
  { id: "new_lead", label: "New Lead" },
  { id: "intro_call", label: "Intro Call" },
  { id: "qualified", label: "Qualified" },
  { id: "discovery_day", label: "Discovery Day" },
  { id: "pending_contract", label: "Pending Contract" },
  { id: "awarded", label: "Awarded" },
  { id: "lost", label: "Lost" },
] as const;

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN",
  "IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH",
  "NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT",
  "VT","VA","WA","WV","WI","WY",
] as const;

const DAY_LABELS = [
  { id: 0, label: "Su" },
  { id: 1, label: "Mo" },
  { id: 2, label: "Tu" },
  { id: 3, label: "We" },
  { id: 4, label: "Th" },
  { id: 5, label: "Fr" },
  { id: 6, label: "Sa" },
] as const;

export function NotificationsAdminPage() {
  const notifications = useQuery(api.notifications.listAll);
  const updateNotification = useMutation(api.notifications.update);
  const deleteNotification = useMutation(api.notifications.deleteNotification);
  const [showCreate, setShowCreate] = useState(false);

  const handleToggle = async (id: Id<"appNotifications">, isActive: boolean) => {
    try {
      await updateNotification({ notificationId: id, isActive });
      toast.success(isActive ? "Notification activated" : "Notification deactivated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    }
  };

  const handleDelete = async (id: Id<"appNotifications">) => {
    if (!confirm("Delete this notification?")) return;
    try {
      await deleteNotification({ notificationId: id });
      toast.success("Notification deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-4 lg:px-6 py-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">Notifications</h1>
            {notifications && <span className="text-sm text-slate-500">{notifications.length} sent</span>}
          </div>
          <Button size="sm" className="h-8 bg-cyan-600 hover:bg-cyan-500 text-white" onClick={() => setShowCreate(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />Create Notification
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 lg:p-6">
        {!notifications ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-white/[0.02] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center">
            <Bell className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <h3 className="text-base font-medium text-white mb-1">No notifications sent</h3>
            <p className="text-sm text-slate-500 max-w-xs mx-auto mb-5">
              Create your first notification to reach your users.
            </p>
            <Button onClick={() => setShowCreate(true)} className="bg-cyan-600 hover:bg-cyan-500 text-white">
              <Plus className="w-4 h-4 mr-2" />Create First Notification
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => {
              const typeConfig = TYPES.find((t) => t.id === n.type) || TYPES[4];
              const Icon = typeConfig.icon;
              const audience = AUDIENCES.find((a) => a.id === n.audience);

              return (
                <div key={n._id} className="rounded-xl border border-white/5 bg-white/[0.02] p-4 hover:bg-white/[0.03] transition-colors group">
                  <div className="flex gap-4">
                    <div className={`w-10 h-10 rounded-xl ${typeConfig.bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${typeConfig.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-white">{n.title}</p>
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{n.body}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Switch checked={n.isActive} onCheckedChange={(v) => handleToggle(n._id, v)} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2.5">
                        <Badge variant="outline" className="text-[10px] border-white/10 text-slate-500">{typeConfig.label}</Badge>
                        <Badge variant="outline" className="text-[10px] border-white/10 text-slate-500">{audience?.label || n.audience}</Badge>
                        {n.displayType && n.displayType !== "basic" && (
                          <Badge variant="outline" className={`text-[10px] ${n.displayType === "top_bar" ? "border-amber-500/30 text-amber-400" : "border-violet-500/30 text-violet-400"}`}>
                            {n.displayType === "top_bar" ? <><PanelTop className="w-2.5 h-2.5 mr-0.5 inline" />Top Bar</> : <><Maximize2 className="w-2.5 h-2.5 mr-0.5 inline" />Popup</>}
                          </Badge>
                        )}
                        {!n.isActive && <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-400">Inactive</Badge>}
                        {n.scheduledAt && <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400"><Calendar className="w-2.5 h-2.5 mr-0.5 inline" />{n.scheduleType === "repeat" ? "Repeat" : "Scheduled"}</Badge>}
                        {n.videoUrl && <Badge variant="outline" className="text-[10px] border-violet-500/30 text-violet-400"><Video className="w-2.5 h-2.5 mr-0.5 inline" />Video</Badge>}
                        {n.targetBrandIds && n.targetBrandIds.length > 0 && <Badge variant="outline" className="text-[10px] border-cyan-500/30 text-cyan-400"><Target className="w-2.5 h-2.5 mr-0.5 inline" />{n.targetBrandIds.length} brands</Badge>}
                        <span className="text-[10px] text-slate-600 ml-auto">
                          {new Date(n.createdAt).toLocaleDateString()}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-slate-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDelete(n._id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CreateNotificationDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}

// ── Create Notification Dialog (Step-by-step, 8 steps) ─────────
function CreateNotificationDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createNotification = useMutation(api.notifications.create);
  const brands = useQuery(api.crm.myBrands);
  const allBrands = useQuery(api.brands.listAll);
  const tags = useQuery(api.tags.list);
  const [step, setStep] = useState(1);
  const TOTAL_STEPS = 9;
  const [ctaLinkType, setCtaLinkType] = useState<"custom" | "brand">("custom");
  const [form, setForm] = useState({
    type: "" as string,
    displayType: "basic" as string,
    title: "",
    body: "",
    imageUrl: "",
    videoUrl: "",
    linkUrl: "",
    audience: "all" as string,
    brandId: "" as string,
    ctaText: "",
    ctaUrl: "",
    // Scheduling
    sendNow: true,
    scheduledDate: "",
    scheduledTime: "09:00",
    timezone: "America/Chicago",
    scheduleType: "single" as string,
    repeatFrequency: "weekly" as string,
    repeatDays: [] as number[],
    repeatEndType: "never" as string,
    repeatEndDate: "",
    repeatEndCount: 3,
    // Targeting
    targetBrandIds: [] as string[],
    targetLiquidCapital: [] as string[],
    targetStages: [] as string[],
    targetStates: [] as string[],
    targetTags: [] as string[],
  });
  const [loading, setLoading] = useState(false);
  const [brandSearch, setBrandSearch] = useState("");
  const [stateSearch, setStateSearch] = useState("");
  const [tagSearch, setTagSearch] = useState("");

  useEffect(() => {
    if (open) {
      setStep(1);
      setForm({
        type: "", displayType: "basic", title: "", body: "", imageUrl: "", videoUrl: "", linkUrl: "",
        audience: "all", brandId: "", ctaText: "", ctaUrl: "",
        sendNow: true, scheduledDate: "", scheduledTime: "09:00",
        timezone: "America/Chicago", scheduleType: "single",
        repeatFrequency: "weekly", repeatDays: [], repeatEndType: "never",
        repeatEndDate: "", repeatEndCount: 3,
        targetBrandIds: [], targetLiquidCapital: [], targetStages: [],
        targetStates: [], targetTags: [],
      });
      setBrandSearch("");
      setStateSearch("");
      setTagSearch("");
    }
  }, [open]);

  const handleSend = async () => {
    if (!form.type || !form.title || !form.body) {
      toast.error("Fill in all required fields");
      return;
    }
    setLoading(true);
    try {
      // Calculate scheduledAt
      let scheduledAt: number | undefined;
      if (!form.sendNow && form.scheduledDate && form.scheduledTime) {
        const dtStr = `${form.scheduledDate}T${form.scheduledTime}:00`;
        scheduledAt = new Date(dtStr).getTime();
      }

      await createNotification({
        type: form.type as NotificationType,
        displayType: form.displayType as DisplayType,
        title: form.title,
        body: form.body,
        audience: form.audience as AudienceType,
        brandId: form.brandId ? (form.brandId as Id<"brands">) : undefined,
        ctaText: form.ctaText || undefined,
        ctaUrl: form.ctaUrl || undefined,
        imageUrl: form.imageUrl || undefined,
        videoUrl: form.videoUrl || undefined,
        linkUrl: form.linkUrl || undefined,
        scheduledAt,
        timezone: !form.sendNow ? form.timezone : undefined,
        scheduleType: !form.sendNow ? (form.scheduleType as "single" | "repeat") : undefined,
        repeatFrequency: !form.sendNow && form.scheduleType === "repeat" ? (form.repeatFrequency as any) : undefined,
        repeatDays: !form.sendNow && form.scheduleType === "repeat" && form.repeatFrequency === "daily" ? form.repeatDays : undefined,
        repeatEndType: !form.sendNow && form.scheduleType === "repeat" ? (form.repeatEndType as any) : undefined,
        repeatEndDate: !form.sendNow && form.scheduleType === "repeat" && form.repeatEndType === "date" && form.repeatEndDate ? new Date(form.repeatEndDate).getTime() : undefined,
        repeatEndCount: !form.sendNow && form.scheduleType === "repeat" && form.repeatEndType === "after_count" ? form.repeatEndCount : undefined,
        targetBrandIds: form.targetBrandIds.length > 0 ? (form.targetBrandIds as Id<"brands">[]) : undefined,
        targetLiquidCapital: form.targetLiquidCapital.length > 0 ? form.targetLiquidCapital : undefined,
        targetStages: form.targetStages.length > 0 ? form.targetStages : undefined,
        targetStates: form.targetStates.length > 0 ? form.targetStates : undefined,
        targetTags: form.targetTags.length > 0 ? form.targetTags : undefined,
      });
      toast.success(form.sendNow ? "Notification sent!" : "Notification scheduled!");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to send");
    } finally {
      setLoading(false);
    }
  };

  const set = (key: string) => (val: string) => setForm((f) => ({ ...f, [key]: val }));
  const toggleArrayItem = (key: string, item: string | number) => {
    setForm((f) => {
      const arr = (f as any)[key] as any[];
      return { ...f, [key]: arr.includes(item) ? arr.filter((i: any) => i !== item) : [...arr, item] };
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Notification</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1 mt-2">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
            <div key={s} className="flex items-center gap-1">
              <button
                onClick={() => { if (s < step) setStep(s); }}
                className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center transition-colors ${
                  step === s ? "bg-cyan-500 text-white" : step > s ? "bg-cyan-500/20 text-cyan-400" : "bg-white/5 text-slate-600"
                }`}
              >
                {s}
              </button>
              {s < TOTAL_STEPS && <div className={`w-4 h-0.5 ${step > s ? "bg-cyan-500/40" : "bg-white/5"}`} />}
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-4">
          {/* Step 1: Type */}
          {step === 1 && (
            <div>
              <Label className="text-xs text-slate-400 mb-3 block">Choose notification type</Label>
              <div className="grid grid-cols-2 gap-2">
                {TYPES.map((t) => {
                  const TIcon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => { set("type")(t.id); setStep(2); }}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        form.type === t.id ? "border-cyan-500/50 bg-cyan-500/10" : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg ${t.bg} flex items-center justify-center mb-2`}>
                        <TIcon className={`w-4 h-4 ${t.color}`} />
                      </div>
                      <p className="text-sm font-medium text-white">{t.label}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Display Type */}
          {step === 2 && (
            <div>
              <Label className="text-xs text-slate-400 mb-3 block">How should this notification appear?</Label>
              <div className="space-y-2">
                {DISPLAY_TYPES.map((dt) => {
                  const DIcon = dt.icon;
                  return (
                    <button
                      key={dt.id}
                      onClick={() => { setForm((f) => ({ ...f, displayType: dt.id })); setStep(3); }}
                      className={`w-full p-4 rounded-xl border text-left transition-all flex gap-3 items-start ${
                        form.displayType === dt.id ? "border-cyan-500/50 bg-cyan-500/10" : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl ${dt.bg} flex items-center justify-center flex-shrink-0`}>
                        <DIcon className={`w-5 h-5 ${dt.color}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{dt.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{dt.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Content + Media */}
          {step === 3 && (
            <div className="space-y-3">
              {form.displayType === "top_bar" && (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5 text-xs text-amber-300 flex items-center gap-2">
                  <PanelTop className="w-4 h-4 flex-shrink-0" />
                  Top bar: slim horizontal banner. Text, emoji & button only — no image or video.
                </div>
              )}
              <div>
                <Label className="text-xs text-slate-400">Title *</Label>
                <Input value={form.title} onChange={(e) => set("title")(e.target.value)} className="mt-1 bg-white/5 border-white/10" placeholder="e.g. New brand just launched!" maxLength={80} />
              </div>
              <div>
                <Label className="text-xs text-slate-400">Body {form.displayType === "top_bar" ? "(short)" : "*"}</Label>
                <Textarea value={form.body} onChange={(e) => set("body")(e.target.value)} className="mt-1 bg-white/5 border-white/10 min-h-[80px]" placeholder={form.displayType === "top_bar" ? "Keep it short — one line recommended" : "Write your notification message..."} maxLength={form.displayType === "top_bar" ? 120 : 500} />
                <p className="text-[11px] text-slate-600 mt-1 text-right">{form.body.length}/{form.displayType === "top_bar" ? 120 : 500}</p>
              </div>
              {form.displayType !== "top_bar" && (
                <>
                  <div>
                    <Label className="text-xs text-slate-400 flex items-center gap-1"><ImageIcon className="w-3 h-3" />Image URL</Label>
                    <Input value={form.imageUrl} onChange={(e) => set("imageUrl")(e.target.value)} className="mt-1 bg-white/5 border-white/10" placeholder="Paste image URL (1200×630 recommended)" />
                    {form.imageUrl && (
                      <div className="mt-2 rounded-lg overflow-hidden border border-white/10">
                        <img src={form.imageUrl} alt="Preview" className="w-full h-32 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      </div>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-slate-400 flex items-center gap-1"><Video className="w-3 h-3" />Video URL</Label>
                    <Input value={form.videoUrl} onChange={(e) => set("videoUrl")(e.target.value)} className="mt-1 bg-white/5 border-white/10" placeholder="YouTube or Loom URL" />
                  </div>
                </>
              )}
              <div>
                <Label className="text-xs text-slate-400 flex items-center gap-1"><Link2 className="w-3 h-3" />Banner Link URL</Label>
                <Input value={form.linkUrl} onChange={(e) => set("linkUrl")(e.target.value)} className="mt-1 bg-white/5 border-white/10" placeholder="Clicking notification goes here" />
                <p className="text-[11px] text-slate-600 mt-1">Optional — entire notification becomes clickable.</p>
              </div>
            </div>
          )}

          {/* Step 4: Audience */}
          {step === 4 && (
            <div className="space-y-3">
              <Label className="text-xs text-slate-400 block">Who should see this?</Label>
              <div className="space-y-2">
                {AUDIENCES.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => set("audience")(a.id)}
                    className={`w-full p-3 rounded-lg border text-left transition-colors ${
                      form.audience === a.id ? "border-cyan-500/50 bg-cyan-500/10" : "border-white/5 hover:bg-white/[0.03]"
                    }`}
                  >
                    <p className="text-sm font-medium text-white">{a.label}</p>
                  </button>
                ))}
              </div>
              {form.type === "new_brand" && brands && (
                <div>
                  <Label className="text-xs text-slate-400">Associated Brand (optional)</Label>
                  <Select value={form.brandId} onValueChange={set("brandId")}>
                    <SelectTrigger className="mt-1 bg-white/5 border-white/10">
                      <SelectValue placeholder="Select brand..." />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map((b) => (
                        <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Step 5: CTA */}
          {step === 5 && (
            <div className="space-y-3">
              <Label className="text-xs text-slate-400 block">Optional call-to-action button</Label>
              <div>
                <Label className="text-xs text-slate-400">Button Text</Label>
                <Input value={form.ctaText} onChange={(e) => set("ctaText")(e.target.value)} className="mt-1 bg-white/5 border-white/10" placeholder="e.g. Check it out" maxLength={30} />
              </div>
              {/* URL type picker */}
              <div>
                <Label className="text-xs text-slate-400 mb-2 block">Button links to</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setCtaLinkType("custom"); set("ctaUrl")(""); }}
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      ctaLinkType === "custom"
                        ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-300"
                        : "border-white/5 text-slate-400 hover:bg-white/[0.03]"
                    }`}
                  >
                    Custom URL
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCtaLinkType("brand"); set("ctaUrl")(""); }}
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      ctaLinkType === "brand"
                        ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-300"
                        : "border-white/5 text-slate-400 hover:bg-white/[0.03]"
                    }`}
                  >
                    Brand Page
                  </button>
                </div>
              </div>
              {/* Brand page picker */}
              {ctaLinkType === "brand" && (
                <div>
                  <Label className="text-xs text-slate-400">Choose a brand</Label>
                  <Select
                    value={allBrands?.find((b) => form.ctaUrl === `/brand/${b.slug}`) ? form.ctaUrl : ""}
                    onValueChange={(val) => set("ctaUrl")(val)}
                  >
                    <SelectTrigger className="mt-1 bg-white/5 border-white/10">
                      <SelectValue placeholder="Select a brand…" />
                    </SelectTrigger>
                    <SelectContent>
                      {allBrands?.filter((b) => b.slug).map((b) => (
                        <SelectItem key={b._id} value={`/brand/${b.slug}`}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.ctaUrl && form.ctaUrl.startsWith("/brand/") && (
                    <p className="text-[11px] text-cyan-500/70 mt-1">→ Links to {form.ctaUrl}</p>
                  )}
                </div>
              )}
              {/* Custom URL input */}
              {ctaLinkType === "custom" && (
                <div>
                  <Label className="text-xs text-slate-400">Button URL</Label>
                  <Input value={form.ctaUrl} onChange={(e) => set("ctaUrl")(e.target.value)} className="mt-1 bg-white/5 border-white/10" placeholder="https://..." />
                </div>
              )}
              <p className="text-[11px] text-slate-600">Leave blank to skip the CTA button.</p>
            </div>
          )}

          {/* Step 6: Schedule */}
          {step === 6 && (
            <div className="space-y-3">
              <Label className="text-xs text-slate-400 block flex items-center gap-1"><Calendar className="w-3 h-3" />Schedule</Label>
              <div className="flex gap-2">
                <button
                  onClick={() => setForm((f) => ({ ...f, sendNow: true }))}
                  className={`flex-1 p-3 rounded-lg border text-center transition-colors ${
                    form.sendNow ? "border-cyan-500/50 bg-cyan-500/10" : "border-white/5 hover:bg-white/[0.03]"
                  }`}
                >
                  <Zap className="w-4 h-4 mx-auto mb-1 text-amber-400" />
                  <p className="text-sm font-medium text-white">Send Now</p>
                </button>
                <button
                  onClick={() => setForm((f) => ({ ...f, sendNow: false }))}
                  className={`flex-1 p-3 rounded-lg border text-center transition-colors ${
                    !form.sendNow ? "border-cyan-500/50 bg-cyan-500/10" : "border-white/5 hover:bg-white/[0.03]"
                  }`}
                >
                  <Clock className="w-4 h-4 mx-auto mb-1 text-cyan-400" />
                  <p className="text-sm font-medium text-white">Schedule</p>
                </button>
              </div>

              {!form.sendNow && (
                <div className="space-y-3 p-3 rounded-lg border border-white/5 bg-white/[0.02]">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-slate-400">Date</Label>
                      <Input type="date" value={form.scheduledDate} onChange={(e) => set("scheduledDate")(e.target.value)} className="mt-1 bg-white/5 border-white/10" />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-400">Time</Label>
                      <Input type="time" value={form.scheduledTime} onChange={(e) => set("scheduledTime")(e.target.value)} className="mt-1 bg-white/5 border-white/10" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-400">Timezone</Label>
                    <Select value={form.timezone} onValueChange={set("timezone")}>
                      <SelectTrigger className="mt-1 bg-white/5 border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {US_TIMEZONES.map((tz) => (
                          <SelectItem key={tz.id} value={tz.id}>{tz.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Single vs Repeat */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setForm((f) => ({ ...f, scheduleType: "single" }))}
                      className={`flex-1 p-2 rounded-lg border text-center text-sm transition-colors ${
                        form.scheduleType === "single" ? "border-cyan-500/50 bg-cyan-500/10 text-white" : "border-white/5 text-slate-400 hover:bg-white/[0.03]"
                      }`}
                    >
                      Single
                    </button>
                    <button
                      onClick={() => setForm((f) => ({ ...f, scheduleType: "repeat" }))}
                      className={`flex-1 p-2 rounded-lg border text-center text-sm transition-colors ${
                        form.scheduleType === "repeat" ? "border-cyan-500/50 bg-cyan-500/10 text-white" : "border-white/5 text-slate-400 hover:bg-white/[0.03]"
                      }`}
                    >
                      <Repeat className="w-3 h-3 inline mr-1" />Repeat
                    </button>
                  </div>

                  {form.scheduleType === "repeat" && (
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs text-slate-400">Frequency</Label>
                        <Select value={form.repeatFrequency} onValueChange={set("repeatFrequency")}>
                          <SelectTrigger className="mt-1 bg-white/5 border-white/10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                            <SelectItem value="annually">Annually</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {form.repeatFrequency === "daily" && (
                        <div>
                          <Label className="text-xs text-slate-400 mb-2 block">Days of Week</Label>
                          <div className="flex gap-1">
                            {DAY_LABELS.map((d) => (
                              <button
                                key={d.id}
                                onClick={() => toggleArrayItem("repeatDays", d.id)}
                                className={`w-9 h-9 rounded-lg text-xs font-medium transition-colors ${
                                  form.repeatDays.includes(d.id) ? "bg-cyan-500 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10"
                                }`}
                              >
                                {d.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* End rule */}
                      <div>
                        <Label className="text-xs text-slate-400 mb-2 block">Ends</Label>
                        <div className="space-y-2">
                          <button onClick={() => setForm((f) => ({ ...f, repeatEndType: "never" }))} className={`w-full p-2 rounded-lg border text-left text-sm transition-colors ${form.repeatEndType === "never" ? "border-cyan-500/50 bg-cyan-500/10 text-white" : "border-white/5 text-slate-400"}`}>Never</button>
                          <button onClick={() => setForm((f) => ({ ...f, repeatEndType: "date" }))} className={`w-full p-2 rounded-lg border text-left text-sm transition-colors ${form.repeatEndType === "date" ? "border-cyan-500/50 bg-cyan-500/10 text-white" : "border-white/5 text-slate-400"}`}>On date</button>
                          {form.repeatEndType === "date" && (
                            <Input type="date" value={form.repeatEndDate} onChange={(e) => set("repeatEndDate")(e.target.value)} className="bg-white/5 border-white/10" />
                          )}
                          <button onClick={() => setForm((f) => ({ ...f, repeatEndType: "after_count" }))} className={`w-full p-2 rounded-lg border text-left text-sm transition-colors ${form.repeatEndType === "after_count" ? "border-cyan-500/50 bg-cyan-500/10 text-white" : "border-white/5 text-slate-400"}`}>After X times</button>
                          {form.repeatEndType === "after_count" && (
                            <Input type="number" min={1} max={100} value={form.repeatEndCount} onChange={(e) => setForm((f) => ({ ...f, repeatEndCount: parseInt(e.target.value) || 1 }))} className="bg-white/5 border-white/10 w-24" />
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 7: Brand Targeting */}
          {step === 7 && (
            <div className="space-y-3">
              <Label className="text-xs text-slate-400 block flex items-center gap-1"><Target className="w-3 h-3" />Brand Targeting <span className="text-slate-600">(optional)</span></Label>
              <p className="text-[11px] text-slate-500">Only show this notification to leads associated with selected brands. Leave empty for all brands.</p>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
                <Input value={brandSearch} onChange={(e) => setBrandSearch(e.target.value)} className="pl-8 bg-white/5 border-white/10" placeholder="Search brands..." />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="text-[11px] h-6 border-white/10 text-slate-400" onClick={() => setForm((f) => ({ ...f, targetBrandIds: (allBrands || []).map((b: any) => b._id) }))}>Select All</Button>
                <Button variant="outline" size="sm" className="text-[11px] h-6 border-white/10 text-slate-400" onClick={() => setForm((f) => ({ ...f, targetBrandIds: [] }))}>Deselect All</Button>
                {form.targetBrandIds.length > 0 && <Badge className="bg-cyan-500/15 text-cyan-400 text-[10px]">{form.targetBrandIds.length} selected</Badge>}
              </div>
              <div className="max-h-[180px] overflow-y-auto space-y-1 pr-1">
                {(allBrands || [])
                  .filter((b: any) => !brandSearch || b.name.toLowerCase().includes(brandSearch.toLowerCase()))
                  .map((b: any) => (
                    <label key={b._id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/[0.03] cursor-pointer">
                      <Checkbox checked={form.targetBrandIds.includes(b._id)} onCheckedChange={() => toggleArrayItem("targetBrandIds", b._id)} />
                      <span className="text-sm text-white">{b.name}</span>
                    </label>
                  ))}
              </div>
              {form.targetBrandIds.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {form.targetBrandIds.map((id) => {
                    const brand = (allBrands || []).find((b: any) => b._id === id);
                    return brand ? (
                      <Badge key={id} variant="outline" className="text-[10px] border-cyan-500/30 text-cyan-400 pr-1">
                        {(brand as any).name}
                        <button onClick={() => toggleArrayItem("targetBrandIds", id)} className="ml-1 hover:text-white"><X className="w-2.5 h-2.5" /></button>
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 8: Advanced Targeting */}
          {step === 8 && (
            <div className="space-y-4">
              <Label className="text-xs text-slate-400 block flex items-center gap-1"><Users className="w-3 h-3" />Advanced Audience Targeting <span className="text-slate-600">(optional)</span></Label>
              <p className="text-[11px] text-slate-500">Further narrow the audience. Leave sections empty for "All".</p>

              {/* Liquid Capital */}
              <div className="p-3 rounded-lg border border-white/5 bg-white/[0.02] space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-slate-300 flex items-center gap-1"><DollarSign className="w-3 h-3" />Budget / Liquid Capital</Label>
                  {form.targetLiquidCapital.length > 0 && <button onClick={() => setForm((f) => ({ ...f, targetLiquidCapital: [] }))} className="text-[10px] text-slate-500 hover:text-white">Clear</button>}
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {LIQUID_CAPITAL_OPTIONS.map((lc) => (
                    <label key={lc.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-white/[0.03] cursor-pointer">
                      <Checkbox checked={form.targetLiquidCapital.includes(lc.id)} onCheckedChange={() => toggleArrayItem("targetLiquidCapital", lc.id)} />
                      <span className="text-xs text-white">{lc.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Sales Stage */}
              <div className="p-3 rounded-lg border border-white/5 bg-white/[0.02] space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-slate-300 flex items-center gap-1"><Target className="w-3 h-3" />Sales Stage</Label>
                  {form.targetStages.length > 0 && <button onClick={() => setForm((f) => ({ ...f, targetStages: [] }))} className="text-[10px] text-slate-500 hover:text-white">Clear</button>}
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {STAGE_OPTIONS.map((st) => (
                    <label key={st.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-white/[0.03] cursor-pointer">
                      <Checkbox checked={form.targetStages.includes(st.id)} onCheckedChange={() => toggleArrayItem("targetStages", st.id)} />
                      <span className="text-xs text-white">{st.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* States */}
              <div className="p-3 rounded-lg border border-white/5 bg-white/[0.02] space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-slate-300 flex items-center gap-1"><MapPin className="w-3 h-3" />States</Label>
                  <div className="flex gap-2">
                    {form.targetStates.length > 0 && <button onClick={() => setForm((f) => ({ ...f, targetStates: [] }))} className="text-[10px] text-slate-500 hover:text-white">Clear</button>}
                    {form.targetStates.length > 0 && <Badge className="bg-cyan-500/15 text-cyan-400 text-[10px]">{form.targetStates.length}</Badge>}
                  </div>
                </div>
                <div className="relative">
                  <Search className="absolute left-2 top-2 w-3 h-3 text-slate-500" />
                  <Input value={stateSearch} onChange={(e) => setStateSearch(e.target.value)} className="pl-7 h-7 text-xs bg-white/5 border-white/10" placeholder="Search states..." />
                </div>
                <div className="max-h-[120px] overflow-y-auto grid grid-cols-4 gap-0.5">
                  {US_STATES.filter((s) => !stateSearch || s.toLowerCase().includes(stateSearch.toLowerCase())).map((st) => (
                    <label key={st} className="flex items-center gap-1 p-1 rounded hover:bg-white/[0.03] cursor-pointer">
                      <Checkbox checked={form.targetStates.includes(st)} onCheckedChange={() => toggleArrayItem("targetStates", st)} />
                      <span className="text-[11px] text-white">{st}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div className="p-3 rounded-lg border border-white/5 bg-white/[0.02] space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-slate-300 flex items-center gap-1"><Tag className="w-3 h-3" />Tags</Label>
                  {form.targetTags.length > 0 && <button onClick={() => setForm((f) => ({ ...f, targetTags: [] }))} className="text-[10px] text-slate-500 hover:text-white">Clear</button>}
                </div>
                {tags && tags.length > 0 ? (
                  <>
                    <div className="relative">
                      <Search className="absolute left-2 top-2 w-3 h-3 text-slate-500" />
                      <Input value={tagSearch} onChange={(e) => setTagSearch(e.target.value)} className="pl-7 h-7 text-xs bg-white/5 border-white/10" placeholder="Search tags..." />
                    </div>
                    <div className="max-h-[100px] overflow-y-auto space-y-0.5">
                      {tags.filter((t: any) => !tagSearch || t.name.toLowerCase().includes(tagSearch.toLowerCase())).map((t: any) => (
                        <label key={t._id} className="flex items-center gap-2 p-1.5 rounded hover:bg-white/[0.03] cursor-pointer">
                          <Checkbox checked={form.targetTags.includes(t.name)} onCheckedChange={() => toggleArrayItem("targetTags", t.name)} />
                          <span className="text-xs text-white">{t.name}</span>
                        </label>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-[11px] text-slate-600">No tags created yet.</p>
                )}
              </div>
            </div>
          )}

          {/* Step 9: Preview + Send */}
          {step === 9 && (
            <div className="space-y-4">
              <Label className="text-xs text-slate-400 block">Preview</Label>
              <NotificationPreview
                type={form.type as NotificationType}
                title={form.title}
                body={form.body}
                ctaText={form.ctaText}
                ctaUrl={form.ctaUrl}
                imageUrl={form.imageUrl}
                videoUrl={form.videoUrl}
                linkUrl={form.linkUrl}
              />
              <div className="text-xs text-slate-500 space-y-1">
                <p>Display: <span className="text-white">{DISPLAY_TYPES.find((d) => d.id === form.displayType)?.label || "Basic"}</span></p>
                <p>Audience: <span className="text-white">{AUDIENCES.find((a) => a.id === form.audience)?.label}</span></p>
                {form.brandId && brands && (
                  <p>Brand: <span className="text-white">{brands.find((b) => b._id === form.brandId)?.name}</span></p>
                )}
                <p>Schedule: <span className="text-white">{form.sendNow ? "Send immediately" : `${form.scheduledDate} ${form.scheduledTime} ${US_TIMEZONES.find((t) => t.id === form.timezone)?.label || form.timezone}${form.scheduleType === "repeat" ? ` (${form.repeatFrequency})` : ""}`}</span></p>
                {form.targetBrandIds.length > 0 && (
                  <p>Brand targets: <span className="text-white">{form.targetBrandIds.length} brand{form.targetBrandIds.length !== 1 ? "s" : ""}</span></p>
                )}
                {form.targetLiquidCapital.length > 0 && (
                  <p>Budget filter: <span className="text-white">{form.targetLiquidCapital.map((lc) => LIQUID_CAPITAL_OPTIONS.find((o) => o.id === lc)?.label).join(", ")}</span></p>
                )}
                {form.targetStages.length > 0 && (
                  <p>Stage filter: <span className="text-white">{form.targetStages.map((s) => STAGE_OPTIONS.find((o) => o.id === s)?.label).join(", ")}</span></p>
                )}
                {form.targetStates.length > 0 && (
                  <p>State filter: <span className="text-white">{form.targetStates.join(", ")}</span></p>
                )}
                {form.targetTags.length > 0 && (
                  <p>Tag filter: <span className="text-white">{form.targetTags.join(", ")}</span></p>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-2 border-t border-white/5">
            {step > 1 ? (
              <Button variant="outline" size="sm" onClick={() => setStep(step - 1)} className="border-white/10 text-slate-300">Back</Button>
            ) : <div />}
            {step < TOTAL_STEPS ? (
              <Button
                size="sm"
                onClick={() => setStep(step + 1)}
                className="bg-cyan-600 hover:bg-cyan-500 text-white"
                disabled={(step === 1 && !form.type) || (step === 2 && !form.displayType) || (step === 3 && (!form.title || !form.body))}
              >
                Next <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            ) : (
              <Button size="sm" onClick={handleSend} className="bg-cyan-600 hover:bg-cyan-500 text-white" disabled={loading}>
                {loading ? "Sending..." : form.sendNow ? "Send Notification" : "Schedule Notification"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Video Embed Helper ──────────────────────────────────
function getVideoEmbedUrl(url: string): string | null {
  if (!url) return null;
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  // Loom
  const loomMatch = url.match(/loom\.com\/(?:share|embed)\/([a-f0-9]+)/);
  if (loomMatch) return `https://www.loom.com/embed/${loomMatch[1]}`;
  return null;
}

// ── Preview Card ──────────────────────────────────────
function NotificationPreview({
  type,
  title,
  body,
  ctaText,
  ctaUrl,
  imageUrl,
  videoUrl,
  linkUrl,
}: {
  type: NotificationType;
  title: string;
  body: string;
  ctaText: string;
  ctaUrl: string;
  imageUrl?: string;
  videoUrl?: string;
  linkUrl?: string;
}) {
  const typeConfig = TYPES.find((t) => t.id === type) || TYPES[4];
  const PIcon = typeConfig.icon;
  const embedUrl = videoUrl ? getVideoEmbedUrl(videoUrl) : null;

  const cardContent = (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
      {imageUrl && (
        <img src={imageUrl} alt="" className="w-full h-36 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
      )}
      <div className="p-4">
        <div className="flex gap-3">
          <div className={`w-10 h-10 rounded-xl ${typeConfig.bg} flex items-center justify-center flex-shrink-0`}>
            <PIcon className={`w-5 h-5 ${typeConfig.color}`} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">{title || "Notification Title"}</p>
            <p className="text-xs text-slate-400 mt-1">{body || "Notification body text..."}</p>
            {embedUrl && (
              <div className="mt-3 rounded-lg overflow-hidden border border-white/10 aspect-video">
                <iframe src={embedUrl} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="Video" />
              </div>
            )}
            <div className="flex items-center gap-2 mt-3">
              {type === "new_brand" && (
                <Button size="sm" variant="ghost" className="h-6 text-[11px] text-pink-400 px-2 pointer-events-none">
                  <Heart className="w-3 h-3 mr-1" />Heart this brand
                </Button>
              )}
              {ctaText && ctaUrl && (
                <Button size="sm" variant="ghost" className="h-6 text-[11px] text-cyan-400 px-2 pointer-events-none">
                  {ctaText} <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              )}
            </div>
            {linkUrl && (
              <p className="text-[10px] text-slate-600 mt-2 flex items-center gap-1"><Link2 className="w-2.5 h-2.5" />Clicks open: {linkUrl}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return cardContent;
}
