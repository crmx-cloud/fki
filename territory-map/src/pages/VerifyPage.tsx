import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PublicNav } from "@/components/PublicNav";
import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, Phone, ShieldCheck, CheckCircle2, ArrowRight } from "lucide-react";

/**
 * Email + phone verification — codes are sent from our CRMX system.
 * Unlocks the full due-diligence experience (dossier depth, favorites,
 * side-by-side compare) per the verified email + phone gate.
 */
export function VerifyPage() {
  const status = useQuery(api.verification.myStatus);
  const requestCode = useMutation(api.verification.requestCode);
  const verifyCode = useAction(api.verificationSend.verifyCode);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const welcome = searchParams.get("welcome") === "1";
  const next = searchParams.get("next") || (welcome ? "/my-profile" : "/dashboard");

  if (status === undefined) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (status === null) {
    navigate("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white motion-page">
      <PublicNav />
      <div className="max-w-xl mx-auto px-6 py-14">
        <Reveal className="text-center mb-10">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-7 h-7 text-cyan-400" />
          </div>
          <h1 className="text-3xl font-extrabold mb-2">
            {welcome ? "One Last Step — Verify Your Account" : "Verify Your Contact Info"}
          </h1>
          <p className="text-slate-400">
            {welcome
              ? "We just emailed you a 6-digit code. Email verification is required to see your matches — verifying your phone too unlocks your full due-diligence toolkit."
              : "A verified email and phone unlocks your full due diligence toolkit — dossier, favorites, and side-by-side comparisons."}
          </p>
        </Reveal>

        <div className="space-y-5">
          <VerifyCard
            kind="email"
            icon={Mail}
            title="Email"
            target={status.email || ""}
            verified={status.emailVerified}
            requestCode={requestCode}
            verifyCode={verifyCode}
          />
          <VerifyCard
            kind="phone"
            icon={Phone}
            title="Phone"
            target={status.phone || ""}
            verified={status.phoneVerified}
            requestCode={requestCode}
            verifyCode={verifyCode}
            allowTargetEdit
          />
        </div>

        {(status.fullyVerified || (welcome && status.emailVerified)) && (
          <Reveal className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 text-emerald-400 font-semibold mb-4">
              <CheckCircle2 className="w-5 h-5" />
              {status.fullyVerified ? "You're fully verified" : "Email verified — you're in"}
            </div>
            <div>
              <Button
                className="bg-cyan-600 hover:bg-cyan-500 text-white"
                onClick={() => navigate(next)}
              >
                {welcome ? "Continue — build my profile" : "Continue"}
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </Reveal>
        )}
      </div>
    </div>
  );
}

function VerifyCard({
  kind,
  icon: Icon,
  title,
  target,
  verified,
  requestCode,
  verifyCode,
  allowTargetEdit = false,
}: {
  kind: "email" | "phone";
  icon: any;
  title: string;
  target: string;
  verified: boolean;
  requestCode: (args: { kind: "email" | "phone"; phone?: string }) => Promise<any>;
  verifyCode: (args: { kind: "email" | "phone"; code: string }) => Promise<{ ok: boolean; error?: string }>;
  allowTargetEdit?: boolean;
}) {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [code, setCode] = useState("");
  const [phoneInput, setPhoneInput] = useState(target);
  const [checking, setChecking] = useState(false);

  const send = async () => {
    setSending(true);
    try {
      await requestCode({ kind, ...(kind === "phone" && phoneInput ? { phone: phoneInput } : {}) });
      setSent(true);
      toast.success(
        kind === "email" ? "Code sent — check your inbox" : "Code texted to your phone"
      );
    } catch (e: any) {
      toast.error(e?.message?.replace(/^.*Error: /, "") || "Couldn't send the code — try again");
    }
    setSending(false);
  };

  const check = async () => {
    setChecking(true);
    const res = await verifyCode({ kind, code });
    if (res.ok) toast.success(`${title} verified!`);
    else toast.error(res.error || "Verification failed");
    setChecking(false);
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold">{title}</div>
            <div className="text-sm text-slate-400 truncate">{target || "Not on file"}</div>
          </div>
        </div>
        {verified ? (
          <span className="inline-flex items-center gap-1.5 text-emerald-400 text-sm font-semibold">
            <CheckCircle2 className="w-4 h-4" /> Verified
          </span>
        ) : (
          !sent && (
            <Button
              size="sm"
              disabled={sending || (kind === "phone" && !phoneInput)}
              className="bg-cyan-600 hover:bg-cyan-500 text-white"
              onClick={send}
            >
              {sending ? "Sending…" : "Send Code"}
            </Button>
          )
        )}
      </div>

      {!verified && kind === "phone" && allowTargetEdit && !sent && (
        <div className="mt-4">
          <Label className="text-xs text-slate-500">Mobile number</Label>
          <Input
            className="mt-1.5 max-w-xs"
            placeholder="(555) 123-4567"
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
          />
        </div>
      )}

      {!verified && sent && (
        <div className="mt-4 flex items-end gap-3 flex-wrap">
          <div>
            <Label className="text-xs text-slate-500">Enter the 6-digit code</Label>
            <Input
              className="mt-1.5 w-40 tracking-[0.3em] text-center font-bold"
              maxLength={6}
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <Button
            size="sm"
            disabled={code.length !== 6 || checking}
            className="bg-emerald-600 hover:bg-emerald-500 text-white"
            onClick={check}
          >
            {checking ? "Checking…" : "Verify"}
          </Button>
          <button className="text-xs text-slate-500 hover:text-slate-300 underline mb-2" onClick={send}>
            Resend code
          </button>
        </div>
      )}
    </div>
  );
}
