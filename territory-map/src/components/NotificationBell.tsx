import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Bell,
  Megaphone,
  Sparkles,
  Zap,
  Gift,
  Info,
  Heart,
  X,
  ExternalLink,
  Clock,
  CheckCheck,
} from "lucide-react";

function getVideoEmbedUrl(url: string): string | null {
  if (!url) return null;
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  const loomMatch = url.match(/loom\.com\/(?:share|embed)\/([a-f0-9]+)/);
  if (loomMatch) return `https://www.loom.com/embed/${loomMatch[1]}`;
  return null;
}

const TYPE_CONFIG: Record<
  string,
  { icon: typeof Bell; color: string; bgColor: string }
> = {
  announcement: {
    icon: Megaphone,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/15",
  },
  new_brand: {
    icon: Sparkles,
    color: "text-violet-400",
    bgColor: "bg-violet-500/15",
  },
  feature: {
    icon: Zap,
    color: "text-amber-400",
    bgColor: "bg-amber-500/15",
  },
  offer: {
    icon: Gift,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/15",
  },
  update: {
    icon: Info,
    color: "text-blue-400",
    bgColor: "bg-blue-500/15",
  },
};

function ageLabel(ts: number): string {
  const age = Date.now() - ts;
  if (age < 3600000) return `${Math.max(1, Math.floor(age / 60000))}m`;
  if (age < 86400000) return `${Math.floor(age / 3600000)}h`;
  return `${Math.floor(age / 86400000)}d`;
}

function NotificationCard({
  n,
  onDismiss,
  onHeart,
  isDimmed,
}: {
  n: any;
  onDismiss?: (id: Id<"appNotifications">) => void;
  onHeart?: (
    nId: Id<"appNotifications">,
    bId: Id<"brands">
  ) => void;
  isDimmed?: boolean;
}) {
  const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.update;
  const NIcon = config.icon;
  const embedUrl = n.videoUrl ? getVideoEmbedUrl(n.videoUrl) : null;

  const cardInner = (
    <>
      {n.imageUrl && (
        <img
          src={n.imageUrl}
          alt=""
          className={`w-full h-24 object-cover rounded-t-lg ${isDimmed ? "opacity-50" : ""}`}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      )}
      <div className="p-3">
        <div className="flex gap-3">
          <div
            className={`w-8 h-8 rounded-lg ${config.bgColor} flex items-center justify-center flex-shrink-0 ${isDimmed ? "opacity-50" : ""}`}
          >
            <NIcon className={`w-4 h-4 ${config.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p
                className={`text-sm font-medium leading-tight ${isDimmed ? "text-slate-500" : "text-white"}`}
              >
                {n.title}
              </p>
              <span className="text-[10px] text-slate-600 flex-shrink-0">
                {ageLabel(n.dismissedAt || n.createdAt)}
              </span>
            </div>
            <p
              className={`text-xs mt-0.5 line-clamp-2 ${isDimmed ? "text-slate-600" : "text-slate-400"}`}
            >
              {n.body}
            </p>
            {embedUrl && !isDimmed && (
              <div className="mt-2 rounded-lg overflow-hidden border border-white/10 aspect-video">
                <iframe
                  src={embedUrl}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="Video"
                />
              </div>
            )}
            <div className="flex items-center gap-2 mt-2">
              {!isDimmed &&
                n.type === "new_brand" &&
                n.brandId &&
                onHeart && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[11px] text-pink-400 hover:text-pink-300 hover:bg-pink-500/10 px-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onHeart(n._id, n.brandId!);
                    }}
                  >
                    <Heart className="w-3 h-3 mr-1" />
                    Heart this brand
                  </Button>
                )}
              {n.ctaUrl && (
                <a
                  href={n.ctaUrl}
                  target={n.ctaUrl.startsWith("/") ? "_self" : "_blank"}
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    size="sm"
                    variant="ghost"
                    className={`h-6 text-[11px] px-2 ${isDimmed ? "text-slate-600" : "text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"}`}
                  >
                    {n.ctaText || "Learn More"}{" "}
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                </a>
              )}
              {isDimmed && n.hearted && (
                <span className="text-[10px] text-pink-500/60 flex items-center gap-0.5">
                  <Heart className="w-2.5 h-2.5 fill-current" /> Hearted
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="relative group rounded-lg overflow-hidden hover:bg-white/[0.03] transition-colors">
      {n.linkUrl && !isDimmed ? (
        <a
          href={n.linkUrl}
          target={n.linkUrl.startsWith("/") ? "_self" : "_blank"}
          rel="noopener noreferrer"
          className="block"
        >
          {cardInner}
        </a>
      ) : (
        cardInner
      )}
      {onDismiss && !isDimmed && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onDismiss(n._id);
          }}
          className="absolute top-2 right-2 p-1 rounded text-slate-600 hover:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

export function NotificationBell() {
  const unreadCount = useQuery(api.notifications.getUnreadCount);
  const data = useQuery(api.notifications.listWithHistory);
  const dismiss = useMutation(api.notifications.dismiss);
  const heartBrand = useMutation(api.notifications.heartBrand);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"new" | "history">("new");

  const active = data?.active || [];
  const history = data?.history || [];
  const hasUnread = (unreadCount || 0) > 0;

  const handleDismiss = async (id: Id<"appNotifications">) => {
    try {
      await dismiss({ notificationId: id });
    } catch {
      /* silent */
    }
  };

  const handleHeart = async (
    notificationId: Id<"appNotifications">,
    brandId: Id<"brands">
  ) => {
    try {
      await heartBrand({ notificationId, brandId });
      await dismiss({ notificationId });
    } catch {
      /* silent */
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) setTab(active.length > 0 ? "new" : "history");
      }}
    >
      <PopoverTrigger asChild>
        <button
          className={`relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all ${hasUnread ? "notification-bell-shake" : ""}`}
        >
          <Bell className="w-5 h-5" />
          {hasUnread && (
            <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-40" />
              <span className="relative inline-flex rounded-full h-5 w-5 bg-cyan-500 text-white text-[10px] font-bold items-center justify-center leading-none">
                {unreadCount! > 9 ? "9+" : unreadCount}
              </span>
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[380px] p-0 bg-slate-950 border-white/10"
      >
        {/* Header with tabs */}
        <div className="px-4 py-3 border-b border-white/5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            {hasUnread && (
              <Badge className="bg-cyan-500/15 text-cyan-400 text-[10px]">
                {unreadCount} new
              </Badge>
            )}
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setTab("new")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                tab === "new"
                  ? "bg-white/10 text-white"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Bell className="w-3 h-3 inline mr-1" />
              New{" "}
              {active.length > 0 && (
                <span className="text-cyan-400 ml-0.5">({active.length})</span>
              )}
            </button>
            <button
              onClick={() => setTab("history")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                tab === "history"
                  ? "bg-white/10 text-white"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Clock className="w-3 h-3 inline mr-1" />
              History
              {history.length > 0 && (
                <span className="text-slate-600 ml-0.5">
                  ({history.length})
                </span>
              )}
            </button>
          </div>
        </div>

        <ScrollArea className="max-h-[420px]">
          {tab === "new" && (
            <>
              {active.length === 0 ? (
                <div className="py-10 text-center">
                  <CheckCheck className="w-6 h-6 text-slate-700 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">All caught up!</p>
                  {history.length > 0 && (
                    <button
                      onClick={() => setTab("history")}
                      className="text-[11px] text-cyan-500 hover:text-cyan-400 mt-1"
                    >
                      View history →
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-2 space-y-1.5">
                  {active.map((n) => (
                    <NotificationCard
                      key={n._id}
                      n={n}
                      onDismiss={handleDismiss}
                      onHeart={handleHeart}
                    />
                  ))}
                </div>
              )}
            </>
          )}
          {tab === "history" && (
            <>
              {history.length === 0 ? (
                <div className="py-10 text-center">
                  <Clock className="w-6 h-6 text-slate-700 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">
                    No notifications in the last 30 days
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-1.5">
                  {history.map((n) => (
                    <NotificationCard key={n._id} n={n} isDimmed />
                  ))}
                </div>
              )}
            </>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
