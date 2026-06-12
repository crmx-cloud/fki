import { useEffect, useRef, useState } from "react";
import type { Id as ConvexId } from "../../convex/_generated/dataModel";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { MessageCircle, Send } from "lucide-react";

/**
 * User ↔ consultant chat. Prospects get their single thread; consultants
 * and admins get a thread list + conversation pane. Real-time via Convex
 * reactivity. The thread always belongs to the prospect — reassigning a
 * consultant never loses history.
 */

function timeLabel(ts: number) {
  const d = new Date(ts);
  const today = new Date().toDateString() === d.toDateString();
  return today
    ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString([], { month: "short", day: "numeric" }) +
        " " + d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function TypingDots({ label }: { label: string }) {
  return (
    <div className="flex justify-start">
      <div className="bg-white/[0.07] rounded-2xl rounded-bl-md px-4 py-3">
        <div className="text-[10px] font-semibold text-slate-400 mb-1">{label}</div>
        <div className="flex gap-1 items-center h-3">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce motion-reduce:animate-none"
              style={{ animationDelay: `${i * 150}ms`, animationDuration: "1s" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Other side typing? Polls the reactive deadline against a ticking clock. */
function useOtherTyping(prospectUserId?: ConvexId<"users">) {
  const status = useQuery(
    api.chat.typingStatus,
    prospectUserId === undefined ? {} : { prospectUserId }
  );
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return (status?.otherTypingUntil ?? 0) > now;
}

function Bubbles({ messages, mySide, otherTyping, typingLabel }: { messages: any[]; mySide: "prospect" | "team"; otherTyping?: boolean; typingLabel?: string }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, otherTyping]);
  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
      {messages.length === 0 && (
        <div className="text-center text-sm text-muted-foreground py-16">
          {mySide === "prospect"
            ? "Ask anything about your matches, the process, or a specific brand — a vetted consultant will reply here."
            : "No messages yet in this conversation."}
        </div>
      )}
      {messages.map((m) => {
        const mine = mySide === "prospect" ? m.senderRole === "prospect" : m.senderRole !== "prospect";
        return (
          <div key={m._id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 ${
              mine
                ? "bg-cyan-600 text-white rounded-br-md"
                : "bg-white/[0.07] text-slate-100 rounded-bl-md"
            }`}>
              {!mine && (
                <div className="text-[10px] font-semibold opacity-70 mb-0.5">
                  {m.senderRole === "consultant" ? "Your consultant" : m.senderRole === "admin" ? "FranchiseKI team" : m.senderName}
                </div>
              )}
              <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
              <div className={`text-[10px] mt-1 ${mine ? "text-cyan-100/70" : "text-slate-500"}`}>{timeLabel(m.ts)}</div>
            </div>
          </div>
        );
      })}
      {otherTyping && <TypingDots label={typingLabel ?? "typing…"} />}
      <div ref={endRef} />
    </div>
  );
}

function Composer({ onSend, onTyping, disabled }: { onSend: (body: string) => Promise<void>; onTyping?: (typing: boolean) => void; disabled?: boolean }) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const lastBeat = useRef(0);
  const submit = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await onSend(body);
      setDraft("");
      lastBeat.current = 0;
      onTyping?.(false);
    } finally {
      setSending(false);
    }
  };
  return (
    <div className="border-t border-border p-3 flex gap-2">
      <textarea
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          // typing heartbeat, throttled to ~1 per 2s (server keeps it alive 5s)
          const now = Date.now();
          if (e.target.value && now - lastBeat.current > 2000) {
            lastBeat.current = now;
            onTyping?.(true);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="Type a message…"
        rows={1}
        disabled={disabled}
        className="flex-1 resize-none rounded-xl bg-white/[0.06] border border-border px-3.5 py-2.5 text-sm outline-none focus:border-cyan-400/50 placeholder:text-slate-500"
      />
      <Button onClick={submit} disabled={disabled || sending || !draft.trim()} className="bg-cyan-600 hover:bg-cyan-500 text-white self-end">
        <Send className="w-4 h-4" />
      </Button>
    </div>
  );
}

// ── Prospect view: single thread ────────────────────────────────────────
function ProspectMessages() {
  const messages = useQuery(api.chat.myThread) ?? [];
  const send = useMutation(api.chat.send);
  const markRead = useMutation(api.chat.markRead);
  const setTyping = useMutation(api.chat.setTyping);
  const otherTyping = useOtherTyping(undefined);
  useEffect(() => {
    if (messages.some((m: any) => !m.readByProspect)) markRead({}).catch(() => {});
  }, [messages.length]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="flex flex-col h-[calc(100vh-9rem)] max-w-3xl bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="font-bold flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-cyan-400" /> Your Consultant
        </h2>
        <p className="text-[11px] text-muted-foreground">
          Free for you — consultants are paid by franchisors when a territory is awarded. Replies typically within one business day.
        </p>
      </div>
      <Bubbles messages={messages} mySide="prospect" otherTyping={otherTyping} typingLabel="Your consultant is typing" />
      <Composer onSend={(body) => send({ body })} onTyping={(t) => setTyping({ isTyping: t }).catch(() => {})} />
    </div>
  );
}

// ── Team view: thread list + conversation ───────────────────────────────
function TeamMessages() {
  const threads = useQuery(api.chat.listThreads) ?? [];
  const [selected, setSelected] = useState<Id<"users"> | null>(null);
  const messages = useQuery(api.chat.thread, selected ? { prospectUserId: selected } : "skip") ?? [];
  const send = useMutation(api.chat.send);
  const markRead = useMutation(api.chat.markRead);
  const setTyping = useMutation(api.chat.setTyping);
  const otherTyping = useOtherTyping(selected ?? undefined);
  useEffect(() => {
    if (selected && messages.some((m: any) => !m.readByTeam)) markRead({ prospectUserId: selected }).catch(() => {});
  }, [selected, messages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex h-[calc(100vh-9rem)] bg-card border border-border rounded-xl overflow-hidden">
      <div className="w-72 shrink-0 border-r border-border overflow-y-auto">
        <div className="px-4 py-3 border-b border-border font-bold text-sm">Conversations</div>
        {threads.length === 0 && (
          <p className="text-xs text-muted-foreground p-4">No conversations yet. Threads appear when a prospect sends a message.</p>
        )}
        {threads.map((t: any) => (
          <button
            key={String(t.prospectUserId)}
            onClick={() => setSelected(t.prospectUserId)}
            className={`w-full text-left px-4 py-3 border-b border-border/50 hover:bg-white/[0.04] transition-colors ${
              String(selected) === String(t.prospectUserId) ? "bg-white/[0.06]" : ""
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-sm truncate">{t.prospectName}</span>
              {t.unread > 0 && (
                <span className="shrink-0 text-[10px] font-bold bg-cyan-500 text-slate-950 rounded-full px-1.5 py-0.5">{t.unread}</span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
              {t.lastFrom === "prospect" ? "" : "You: "}{t.lastBody}
            </p>
          </button>
        ))}
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        {selected ? (
          <>
            <Bubbles messages={messages} mySide="team" otherTyping={otherTyping} typingLabel="Prospect is typing" />
            <Composer
              onSend={(body) => send({ body, prospectUserId: selected })}
              onTyping={(t) => setTyping({ prospectUserId: selected, isTyping: t }).catch(() => {})}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            Select a conversation
          </div>
        )}
      </div>
    </div>
  );
}

export function MessagesPage() {
  const myProfile = useQuery(api.users.getMyProfile);
  if (myProfile === undefined) return <div className="p-8 text-muted-foreground">Loading…</div>;
  const role = myProfile?.role ?? "prospect";
  const team = ["admin", "super_admin", "broker"].includes(role) || myProfile?.isAdmin;
  return (
    <div className="space-y-4 max-w-[1200px]">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
        <p className="text-sm text-muted-foreground">
          {team ? "Conversations with prospects — threads stay with the prospect across reassignment." : "Chat with your vetted franchise consultant"}
        </p>
      </div>
      {team ? <TeamMessages /> : <ProspectMessages />}
    </div>
  );
}
