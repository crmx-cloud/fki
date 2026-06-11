import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  CheckCircle,
  MessageCircle,
  User,
  Mail,
  MapPin,
  DollarSign,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * A simple 1-click "I'm Interested" dialog for logged-in prospects.
 *
 * Instead of filling out a whole form, the prospect's profile data
 * is auto-attached. They just confirm and click one button.
 */
export function ProspectInquiryDialog({
  open,
  onClose,
  brandId,
  brandName,
  brandSlug,
}: {
  open: boolean;
  onClose: () => void;
  brandId: Id<"brands">;
  brandName: string;
  brandSlug?: string;
}) {
  const myProfile = useQuery(api.users.getMyProfile);
  const prospectProfile = useQuery(api.prospect.getMyProspectProfile);
  const createLead = useMutation(api.crm.createLeadFromProspect);
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const firstName = myProfile?.profile?.firstName || "";
  const lastName = myProfile?.profile?.lastName || "";
  const email = prospectProfile?.email || myProfile?.user?.email || "";
  const phone = myProfile?.profile?.phone || "";
  const territory = prospectProfile?.primaryCity && prospectProfile?.primaryState
    ? `${prospectProfile.primaryCity}, ${prospectProfile.primaryState}`
    : "";
  const capital = prospectProfile?.liquidCapital || "";
  const timeline = prospectProfile?.timeline || "";

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const noteParts = [
        `Prospect expressed interest via AI Franchise Match`,
        `Source: 1-click inquiry from match dashboard`,
      ];
      if (timeline) noteParts.push(`Timeline: ${timeline}`);
      if (prospectProfile?.ownerType)
        noteParts.push(`Owner type: ${prospectProfile.ownerType}`);
      if (prospectProfile?.priorExperience)
        noteParts.push(`Experience: ${prospectProfile.priorExperience}`);

      await createLead({
        brandId,
        firstName: firstName || "Prospect",
        lastName: lastName || undefined,
        email: email || undefined,
        phone: phone || undefined,
        mainTerritory: territory || undefined,
        liquidCapital: capital || undefined,
        notes: noteParts.join(" | "),
      });

      setDone(true);
      toast.success(`Your interest in ${brandName} has been shared!`);
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong. Please try again.");
    }
    setSubmitting(false);
  };

  // ── Success state ──
  if (done) {
    return (
      <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) { setDone(false); onClose(); } }}>
        <DialogContent className="sm:max-w-md">
          <div className="py-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold mb-2">You're all set! 🎉</h2>
            <p className="text-slate-400 text-sm mb-1">
              The <strong className="text-white">{brandName}</strong> team has been notified.
            </p>
            <p className="text-slate-500 text-xs mb-6">
              A Franchise KI consultant will reach out to help you explore if this is the right fit.
              No pressure — just a helpful conversation.
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                className="border-white/20 text-slate-300 hover:bg-white/10"
                onClick={() => { setDone(false); onClose(); }}
              >
                Close
              </Button>
              {brandSlug && (
                <Button
                  className="bg-cyan-600 hover:bg-cyan-500 text-white"
                  onClick={() => {
                    // Close first — when the inquiry came from this same brand
                    // page, navigating to the identical URL is a no-op and the
                    // dialog would otherwise just sit there looking broken.
                    setDone(false);
                    onClose();
                    navigate(`/brand/${brandSlug}`);
                  }}
                >
                  View Brand Details
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Confirmation dialog ──
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-cyan-400" />
            <span>Interested in</span>
            <span className="text-cyan-400">{brandName}?</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Explanation */}
          <p className="text-sm text-slate-400">
            We'll share your profile with the {brandName} team so they can reach out. A Franchise KI consultant will also connect with you to make sure this is a great fit.
          </p>

          {/* Profile summary card */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2.5">
            <div className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-2">
              Info we'll share
            </div>
            {(firstName || lastName) && (
              <div className="flex items-center gap-2 text-sm">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-slate-300">{firstName} {lastName}</span>
              </div>
            )}
            {email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-slate-300">{email}</span>
              </div>
            )}
            {territory && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-slate-300">{territory}</span>
              </div>
            )}
            {capital && (
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-slate-300">{formatCapital(capital)}</span>
              </div>
            )}
          </div>

          {/* Consent / reassurance */}
          <div className="flex items-start gap-2.5 bg-cyan-500/5 border border-cyan-500/15 rounded-lg p-3">
            <ShieldCheck className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
            <p className="text-xs text-cyan-300/80">
              By clicking below, you agree to be contacted by the Franchise KI team and {brandName} to discuss franchise opportunities. No spam, no pressure — just a friendly conversation.
            </p>
          </div>

          {/* CTA buttons */}
          <div className="flex gap-3 pt-1">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-white/10 text-slate-300 hover:bg-white/5"
            >
              Not Now
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={submitting}
              className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              {submitting ? (
                <>
                  <Sparkles className="w-4 h-4 mr-1.5 animate-pulse" />
                  Sending...
                </>
              ) : (
                <>
                  <MessageCircle className="w-4 h-4 mr-1.5" />
                  Yes, Have Them Reach Out
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Format stored capital keys to display strings */
function formatCapital(value: string): string {
  const map: Record<string, string> = {
    under_50k: "Under $50K",
    "50k_100k": "$50K – $100K",
    "100k_150k": "$100K – $150K",
    "150k_250k": "$150K – $250K",
    "250k_500k": "$250K – $500K",
    "500k_1m": "$500K – $1M",
    "1m_plus": "$1M+",
  };
  return map[value] || value;
}
