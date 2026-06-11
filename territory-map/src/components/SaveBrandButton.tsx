import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Heart } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SaveBrandButtonProps {
  brandId: Id<"brands">;
  /** Pre-fetched set of saved brand IDs from parent (avoids N+1 queries) */
  savedBrandIds?: string[];
  /** Visual variant */
  variant?: "icon-dark" | "icon-light" | "pill" | "overlay";
  className?: string;
}

/**
 * Heart toggle to save/unsave a brand.
 *
 * Use the parent's `savedBrandIds` array to avoid one query per card.
 * Pass `variant` for visual context:
 *   - "icon-dark"  → transparent bg, white icon (dark pages like Explore)
 *   - "icon-light" → transparent bg, dark icon (light pages like BrandListing)
 *   - "pill"       → outlined chip "Save" / "Saved"
 *   - "overlay"    → semi-transparent circle for card overlays
 */
export function SaveBrandButton({
  brandId,
  savedBrandIds,
  variant = "icon-dark",
  className,
}: SaveBrandButtonProps) {
  const toggleSave = useMutation(api.savedItems.toggleSave);
  const [busy, setBusy] = useState(false);

  const isSaved = savedBrandIds?.includes(brandId) ?? false;

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      const res = await toggleSave({ brandId });
      toast(res.saved ? "Brand saved!" : "Removed from saved", {
        description: res.saved
          ? "Go to Saved Brands to compare"
          : undefined,
      });
    } catch {
      toast.error("Sign in to save brands", {
        action: {
          label: "Sign In",
          onClick: () => (window.location.href = "/login"),
        },
      });
    } finally {
      setBusy(false);
    }
  };

  /* ── Pill variant ── */
  if (variant === "pill") {
    return (
      <button
        onClick={handleClick}
        disabled={busy}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all",
          isSaved
            ? "bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20"
            : "bg-white/10 text-white/70 border-white/20 hover:bg-white/20 hover:text-white",
          busy && "opacity-50",
          className
        )}
      >
        <Heart className={cn("w-3.5 h-3.5", isSaved && "fill-current")} />
        {isSaved ? "Saved" : "Save"}
      </button>
    );
  }

  /* ── Overlay variant ── */
  if (variant === "overlay") {
    return (
      <button
        onClick={handleClick}
        disabled={busy}
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center transition-all backdrop-blur-sm",
          isSaved
            ? "bg-red-500/90 text-white shadow-lg shadow-red-500/25"
            : "bg-black/40 text-white/70 hover:bg-black/60 hover:text-white",
          busy && "opacity-50",
          className
        )}
        title={isSaved ? "Remove from saved" : "Save brand"}
      >
        <Heart className={cn("w-4 h-4", isSaved && "fill-current")} />
      </button>
    );
  }

  /* ── Icon variants (dark / light) ── */
  const isDark = variant === "icon-dark";

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      className={cn(
        "w-9 h-9 rounded-lg flex items-center justify-center transition-all",
        isSaved
          ? "text-red-400 bg-red-500/15 hover:bg-red-500/25"
          : isDark
            ? "text-white/50 hover:text-red-400 hover:bg-white/10"
            : "text-slate-400 hover:text-red-400 hover:bg-slate-100",
        busy && "opacity-50",
        className
      )}
      title={isSaved ? "Remove from saved" : "Save brand"}
    >
      <Heart className={cn("w-4.5 h-4.5", isSaved && "fill-current")} />
    </button>
  );
}
