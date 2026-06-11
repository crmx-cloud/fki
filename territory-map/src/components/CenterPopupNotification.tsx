import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  X,
  ExternalLink,
  Heart,
  Megaphone,
  Sparkles,
  Zap,
  Gift,
  Info,
  Bell,
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

export function CenterPopupNotification() {
  const notifications = useQuery(api.notifications.list);
  const dismiss = useMutation(api.notifications.dismiss);
  const heartBrand = useMutation(api.notifications.heartBrand);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Reset local dismissals when the query data changes
  useEffect(() => {
    setDismissed(new Set());
  }, [notifications?.length]);

  const popups = (notifications || []).filter(
    (n) =>
      n.displayType === "center_popup" && !dismissed.has(n._id.toString())
  );

  // Show only the newest popup at a time
  const current = popups[0];
  if (!current) return null;

  const config = TYPE_CONFIG[current.type] || TYPE_CONFIG.update;
  const NIcon = config.icon;
  const embedUrl = current.videoUrl
    ? getVideoEmbedUrl(current.videoUrl)
    : null;

  const handleDismiss = async () => {
    setDismissed((prev) => new Set([...prev, current._id.toString()]));
    try {
      await dismiss({ notificationId: current._id });
    } catch {
      /* silent */
    }
  };

  const handleHeart = async (brandId: Id<"brands">) => {
    try {
      await heartBrand({ notificationId: current._id, brandId });
    } catch {
      /* silent */
    }
    handleDismiss();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleDismiss}
    >
      <div
        className="bg-slate-950 rounded-2xl border border-white/10 max-w-md w-full mx-4 overflow-hidden shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-2 duration-300 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-black/40 text-slate-400 hover:text-white hover:bg-black/60 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Image banner */}
        {current.imageUrl && (
          <img
            src={current.imageUrl}
            alt=""
            className="w-full h-44 object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        )}

        {/* Content */}
        <div className="p-6">
          <div className="flex gap-3 items-start">
            <div
              className={`w-11 h-11 rounded-xl ${config.bgColor} flex items-center justify-center flex-shrink-0`}
            >
              <NIcon className={`w-5 h-5 ${config.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-white leading-tight">
                {current.title}
              </h2>
              <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">
                {current.body}
              </p>
            </div>
          </div>

          {/* Video embed */}
          {embedUrl && (
            <div className="mt-4 rounded-xl overflow-hidden border border-white/10 aspect-video">
              <iframe
                src={embedUrl}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Video"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 mt-5">
            {current.type === "new_brand" && current.brandId && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs text-pink-400 border-pink-500/20 hover:bg-pink-500/10 hover:text-pink-300"
                onClick={() => handleHeart(current.brandId!)}
              >
                <Heart className="w-3.5 h-3.5 mr-1.5" />
                Heart this brand
              </Button>
            )}
            {current.ctaUrl && (
              <a
                href={current.ctaUrl}
                target={current.ctaUrl.startsWith("/") ? "_self" : "_blank"}
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button
                  size="sm"
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white text-xs"
                >
                  {current.ctaText || "Learn More"}{" "}
                  <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </a>
            )}
            {!current.ctaUrl && (
              <Button
                size="sm"
                variant="outline"
                className="ml-auto text-xs border-white/10 text-slate-400 hover:text-white"
                onClick={handleDismiss}
              >
                Got it
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
