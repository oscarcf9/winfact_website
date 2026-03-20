"use client";

import { useState, useRef, useEffect } from "react";
import {
  MoreHorizontal,
  XCircle,
  Gift,
  ArrowUpDown,
  Calendar,
  CreditCard,
  Download,
  StickyNote,
  Mail,
  X,
  Check,
  Loader2,
} from "lucide-react";

type Subscription = {
  id: string;
  tier: string;
  status: string;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: string | null;
} | null;

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  role: string | null;
  notes: string | null;
  subscription: Subscription;
  createdAt: string | null;
};

type Props = {
  user: UserRow;
};

export function SubscriberActionMenu({ user }: Props) {
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function doAction(action: string, extra?: Record<string, unknown>) {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/subscribers/${user.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ ok: true, message: `${action} successful` });
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setFeedback({ ok: false, message: data.error || "Action failed" });
      }
    } catch {
      setFeedback({ ok: false, message: "Network error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div ref={menuRef} className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
      >
        <MoreHorizontal className="h-4 w-4 text-gray-400" />
      </button>

      {open && !modal && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1 animate-fade-up">
          {user.subscription?.status === "active" && (
            <button
              onClick={() => { setModal("cancel"); setOpen(false); }}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-danger hover:bg-danger/5 cursor-pointer"
            >
              <XCircle className="h-3.5 w-3.5" /> Cancel Subscription
            </button>
          )}
          <button
            onClick={() => { setModal("comp"); setOpen(false); }}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            <Gift className="h-3.5 w-3.5" /> Comp VIP Access
          </button>
          <button
            onClick={() => { setModal("change_tier"); setOpen(false); }}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            <ArrowUpDown className="h-3.5 w-3.5" /> Change Plan
          </button>
          {user.subscription && (
            <button
              onClick={() => { setModal("extend"); setOpen(false); }}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              <Calendar className="h-3.5 w-3.5" /> Extend Period
            </button>
          )}
          {user.subscription?.stripeSubscriptionId &&
            !user.subscription.stripeSubscriptionId.startsWith("comp_") && (
            <button
              onClick={() => { setModal("refund"); setOpen(false); }}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              <CreditCard className="h-3.5 w-3.5" /> Issue Refund
            </button>
          )}
          <button
            onClick={() => { setModal("email"); setOpen(false); }}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            <Mail className="h-3.5 w-3.5" /> Send Email
          </button>
          <button
            onClick={() => { setModal("notes"); setOpen(false); }}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            <StickyNote className="h-3.5 w-3.5" /> Notes
          </button>
        </div>
      )}

      {/* Modals */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4" onClick={() => { setModal(null); setFeedback(null); }}>
          <div
            className="bg-white rounded-2xl border border-gray-200 shadow-xl max-w-md w-full p-6 animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-lg text-navy">
                {modal === "cancel" && "Cancel Subscription"}
                {modal === "comp" && "Comp VIP Access"}
                {modal === "change_tier" && "Change Plan"}
                {modal === "extend" && "Extend Period"}
                {modal === "refund" && "Issue Refund"}
                {modal === "email" && "Send Email"}
                {modal === "notes" && "Subscriber Notes"}
              </h3>
              <button onClick={() => { setModal(null); setFeedback(null); }} className="p-1 hover:bg-gray-100 rounded cursor-pointer">
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-4">{user.email}</p>

            {feedback && (
              <div className={`mb-4 p-3 rounded-xl text-sm flex items-center gap-2 ${
                feedback.ok
                  ? "bg-success/10 text-success border border-success/20"
                  : "bg-danger/10 text-danger border border-danger/20"
              }`}>
                {feedback.ok ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                {feedback.message}
              </div>
            )}

            {modal === "cancel" && (
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  This will immediately cancel the subscription for <strong>{user.email}</strong>.
                  Current plan: <strong>{user.subscription?.tier?.replace(/_/g, " ")}</strong>
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => doAction("cancel")}
                    disabled={loading}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-danger text-white text-sm font-medium disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Confirm Cancel"}
                  </button>
                  <button onClick={() => setModal(null)} className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm cursor-pointer">
                    Back
                  </button>
                </div>
              </div>
            )}

            {modal === "comp" && (
              <CompModal loading={loading} onSubmit={(days) => doAction("comp", { days })} />
            )}

            {modal === "change_tier" && (
              <ChangeTierModal loading={loading} currentTier={user.subscription?.tier} onSubmit={(tier) => doAction("change_tier", { tier })} />
            )}

            {modal === "extend" && (
              <ExtendModal loading={loading} onSubmit={(days) => doAction("extend", { days })} />
            )}

            {modal === "refund" && (
              <RefundModal loading={loading} onSubmit={(amount) => doAction("refund", amount ? { amount } : {})} />
            )}

            {modal === "email" && (
              <EmailModal userId={user.id} email={user.email} onClose={() => setModal(null)} />
            )}

            {modal === "notes" && (
              <NotesModal userId={user.id} initialNotes={user.notes || ""} onClose={() => setModal(null)} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CompModal({ loading, onSubmit }: { loading: boolean; onSubmit: (days: number) => void }) {
  const [days, setDays] = useState(30);
  return (
    <div>
      <p className="text-sm text-gray-600 mb-3">Grant free VIP access without a payment.</p>
      <div className="flex gap-2 mb-4">
        {[7, 14, 30, 60, 90].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer ${
              days === d
                ? "bg-primary/10 text-primary border border-primary/20"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {d}d
          </button>
        ))}
      </div>
      <button
        onClick={() => onSubmit(days)}
        disabled={loading}
        className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-medium disabled:opacity-50 cursor-pointer"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : `Grant ${days} Days VIP`}
      </button>
    </div>
  );
}

function ChangeTierModal({ loading, currentTier, onSubmit }: { loading: boolean; currentTier?: string; onSubmit: (tier: string) => void }) {
  const tiers = [
    { value: "vip_weekly", label: "VIP Weekly" },
    { value: "vip_monthly", label: "VIP Monthly" },
  ];
  const [tier, setTier] = useState(currentTier || "vip_monthly");
  return (
    <div>
      <p className="text-sm text-gray-600 mb-3">Change to a different plan.</p>
      <div className="space-y-2 mb-4">
        {tiers.map((t) => (
          <button
            key={t.value}
            onClick={() => setTier(t.value)}
            className={`w-full px-4 py-3 rounded-xl text-sm font-medium text-left cursor-pointer ${
              tier === t.value
                ? "bg-primary/10 text-primary border border-primary/20"
                : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <button
        onClick={() => onSubmit(tier)}
        disabled={loading}
        className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-medium disabled:opacity-50 cursor-pointer"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Change Plan"}
      </button>
    </div>
  );
}

function ExtendModal({ loading, onSubmit }: { loading: boolean; onSubmit: (days: number) => void }) {
  const [days, setDays] = useState(30);
  return (
    <div>
      <p className="text-sm text-gray-600 mb-3">Extend the current billing period.</p>
      <div className="flex gap-2 mb-4">
        {[7, 14, 30].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer ${
              days === d
                ? "bg-primary/10 text-primary border border-primary/20"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            +{d} days
          </button>
        ))}
      </div>
      <button
        onClick={() => onSubmit(days)}
        disabled={loading}
        className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-medium disabled:opacity-50 cursor-pointer"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : `Extend by ${days} Days`}
      </button>
    </div>
  );
}

function RefundModal({ loading, onSubmit }: { loading: boolean; onSubmit: (amount?: number) => void }) {
  const [refundType, setRefundType] = useState<"full" | "partial">("full");
  const [amount, setAmount] = useState("");
  return (
    <div>
      <p className="text-sm text-gray-600 mb-3">Issue a refund via Stripe.</p>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setRefundType("full")}
          className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer ${
            refundType === "full"
              ? "bg-primary/10 text-primary border border-primary/20"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Full Refund
        </button>
        <button
          onClick={() => setRefundType("partial")}
          className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer ${
            refundType === "partial"
              ? "bg-primary/10 text-primary border border-primary/20"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Partial
        </button>
      </div>
      {refundType === "partial" && (
        <div className="mb-4">
          <label className="block text-sm text-gray-500 mb-1">Amount ($)</label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-primary/50"
            placeholder="25.00"
          />
        </div>
      )}
      <button
        onClick={() => onSubmit(refundType === "partial" ? Number(amount) : undefined)}
        disabled={loading || (refundType === "partial" && !amount)}
        className="w-full px-4 py-2.5 rounded-xl bg-danger text-white text-sm font-medium disabled:opacity-50 cursor-pointer"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Issue Refund"}
      </button>
    </div>
  );
}

function EmailModal({ userId, email, onClose }: { userId: string; email: string; onClose: () => void }) {
  const [subject, setSubject] = useState("Message from WinFact Picks");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSend() {
    if (!subject.trim() || !message.trim()) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/subscribers/${userId}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), message: message.trim() }),
      });
      if (res.ok) {
        setSent(true);
        setTimeout(() => onClose(), 1500);
      } else if (res.status === 429) {
        setError("Too many emails sent. Try again in a minute.");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to send email");
      }
    } catch {
      setError("Network error");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="text-center py-4">
        <div className="mx-auto w-10 h-10 rounded-full bg-success/10 flex items-center justify-center mb-3">
          <Check className="h-5 w-5 text-success" />
        </div>
        <p className="text-sm font-medium text-navy">Email sent to {email}</p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-3 p-3 rounded-xl text-sm bg-danger/10 text-danger border border-danger/20 flex items-center gap-2">
          <X className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      <div className="space-y-3 mb-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Subject</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-navy focus:outline-none focus:border-primary/50"
            placeholder="Email subject..."
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-navy focus:outline-none focus:border-primary/50 resize-y"
            placeholder="Write your message..."
          />
        </div>
      </div>
      <div className="flex gap-3">
        <button
          onClick={handleSend}
          disabled={sending || !subject.trim() || !message.trim()}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-medium disabled:opacity-50 cursor-pointer"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          {sending ? "Sending..." : "Send"}
        </button>
        <button onClick={onClose} className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm cursor-pointer">
          Cancel
        </button>
      </div>
    </div>
  );
}

function NotesModal({ userId, initialNotes, onClose }: { userId: string; initialNotes: string; onClose: () => void }) {
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function saveNotes() {
    setSaving(true);
    try {
      await fetch(`/api/admin/subscribers/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={4}
        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-navy focus:outline-none focus:border-primary/50 resize-y mb-3"
        placeholder="Add notes about this subscriber..."
        onBlur={saveNotes}
      />
      <div className="flex items-center justify-between">
        <button
          onClick={saveNotes}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-medium disabled:opacity-50 cursor-pointer"
        >
          {saved ? <Check className="h-3.5 w-3.5" /> : saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {saved ? "Saved" : saving ? "Saving..." : "Save Notes"}
        </button>
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 cursor-pointer">
          Close
        </button>
      </div>
    </div>
  );
}

export function ExportButton() {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/subscribers/export");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `subscribers-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 cursor-pointer"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      Export CSV
    </button>
  );
}
