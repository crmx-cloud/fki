import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Link } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { BadgeCheck, Building2, Mail, Phone, ExternalLink } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  approved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  rejected: "bg-red-500/15 text-red-400 border-red-500/20",
};

/**
 * Admin view of brand-listing claims: who claimed what, their contact info
 * (future advertising leads), and claim status with one-click approval.
 */
export function ClaimsAdminPage() {
  const claims = useQuery(api.claims.listAll);
  const approveClaim = useMutation(api.claims.approveClaim);

  const counts = {
    total: claims?.length || 0,
    pending: claims?.filter((c: any) => c.status === "pending").length || 0,
    approved: claims?.filter((c: any) => c.status === "approved").length || 0,
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="p-6 max-w-5xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BadgeCheck className="w-6 h-6 text-cyan-400" /> Brand Claims
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Franchisors who claimed their listings — each one is a verified contact and a future
              advertising lead.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6 max-w-md">
            <div className="bg-card border rounded-xl p-4 text-center">
              <div className="text-2xl font-bold">{counts.total}</div>
              <div className="text-xs text-muted-foreground">Total Claims</div>
            </div>
            <div className="bg-card border rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-amber-400">{counts.pending}</div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
            <div className="bg-card border rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-emerald-400">{counts.approved}</div>
              <div className="text-xs text-muted-foreground">Approved</div>
            </div>
          </div>

          {claims === undefined ? (
            <div className="text-muted-foreground text-sm py-12 text-center">Loading claims…</div>
          ) : claims.length === 0 ? (
            <div className="text-muted-foreground text-sm py-12 text-center">
              No claims yet. Claim CTAs are live on every unclaimed brand page.
            </div>
          ) : (
            <div className="space-y-3">
              {claims.map((c: any) => (
                <div
                  key={c._id}
                  className="bg-card border rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="font-semibold">{c.brandName}</span>
                      <Badge className={`text-[10px] border ${STATUS_STYLES[c.status] || ""}`}>
                        {c.status}
                      </Badge>
                      {c.brandSlug && (
                        <Link
                          to={`/brand/${c.brandSlug}`}
                          className="text-xs text-cyan-500 hover:underline inline-flex items-center gap-1"
                        >
                          listing <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground space-y-1">
                      <div>{c.contactName}</div>
                      <div className="flex items-center gap-4 flex-wrap text-xs">
                        <span className="inline-flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {c.contactEmail}
                        </span>
                        {c.contactPhone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {c.contactPhone}
                          </span>
                        )}
                        <span>{new Date(c._creationTime).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  {c.status === "pending" && (
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white shrink-0"
                      onClick={() =>
                        approveClaim({ claimId: c._id })
                          .then(() => toast.success(`${c.brandName} claim approved`))
                          .catch((e) => toast.error(e?.message || "Approval failed"))
                      }
                    >
                      Approve
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
