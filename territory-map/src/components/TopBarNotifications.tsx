import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { X, ExternalLink } from "lucide-react";

export function TopBarNotifications() {
  const notifications = useQuery(api.notifications.list);
  const dismiss = useMutation(api.notifications.dismiss);

  const topBarNotifs = (notifications || []).filter(
    (n) => n.displayType === "top_bar"
  );

  if (topBarNotifs.length === 0) return null;

  const handleDismiss = async (id: Id<"appNotifications">) => {
    try {
      await dismiss({ notificationId: id });
    } catch {
      /* silent */
    }
  };

  return (
    <div className="flex flex-col">
      {topBarNotifs.map((n) => (
        <div
          key={n._id}
          className="border-b border-amber-500/15 bg-gradient-to-r from-amber-500/[0.07] via-amber-500/[0.04] to-transparent px-4 py-2.5 flex items-center gap-3 animate-in slide-in-from-top-1 duration-300"
        >
          <p className="text-sm text-white flex-1 truncate">
            <span className="font-medium">{n.title}</span>
            {n.body && (
              <span className="text-slate-400 ml-2">{n.body}</span>
            )}
          </p>
          {n.ctaUrl && (
            <a
              href={n.ctaUrl}
              target={n.ctaUrl.startsWith("/") ? "_self" : "_blank"}
              rel="noopener noreferrer"
              className="flex-shrink-0"
            >
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 px-2.5"
              >
                {n.ctaText || "View"}{" "}
                <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            </a>
          )}
          <button
            onClick={() => handleDismiss(n._id)}
            className="text-slate-600 hover:text-slate-300 transition-colors flex-shrink-0 p-1 rounded hover:bg-white/5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
