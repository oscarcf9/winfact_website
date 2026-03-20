"use client";

import { useState, useEffect, useCallback } from "react";
import {
  User,
  CreditCard,
  Bell,
  Shield,
  Globe,
  Save,
  ExternalLink,
  Loader2,
  CheckCircle,
  Crown,
  Calendar,
  PauseCircle,
  XCircle,
  ChevronRight,
} from "lucide-react";
import { isVipTier } from "@/lib/constants";

/* ────────────────────────────── types ────────────────────────────── */

type UserProfile = {
  id: string;
  email: string;
  name: string | null;
  language: string;
  referralCode: string | null;
  createdAt: string;
};

type Subscription = {
  tier: string;
  status: string;
  currentPeriodEnd: string | null;
} | null;

type NotifPrefs = {
  channelEmail: boolean;
  channelPush: boolean;
  sportMlb: boolean;
  sportNfl: boolean;
  sportNba: boolean;
  sportNhl: boolean;
  sportSoccer: boolean;
  sportNcaa: boolean;
};

type Tab = "profile" | "subscription" | "notifications";

const defaultNotifs: NotifPrefs = {
  channelEmail: true,
  channelPush: true,
  sportMlb: true,
  sportNfl: true,
  sportNba: true,
  sportNhl: true,
  sportSoccer: true,
  sportNcaa: true,
};

const tierLabels: Record<string, string> = {
  free: "Free",
  vip_weekly: "VIP Weekly",
  vip_monthly: "VIP Monthly",
  season_pass: "Season Pass",
};

const statusColors: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  trialing: "bg-blue-50 text-blue-700 border-blue-200",
  past_due: "bg-amber-50 text-amber-700 border-amber-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  expired: "bg-gray-100 text-gray-600 border-gray-200",
};

const statusLabels: Record<string, string> = {
  active: "Active",
  trialing: "Trial",
  past_due: "Past Due",
  cancelled: "Cancelled",
  expired: "Expired",
};

/* ────────────────────────────── helpers ────────────────────────────── */

function Toggle({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
        on ? "bg-primary" : "bg-gray-200"
      }`}
      role="switch"
      aria-checked={on}
      aria-label={label}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
          on ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function SectionDivider() {
  return <div className="border-t border-gray-100" />;
}

/* ────────────────────────────── main ────────────────────────────── */

export function SettingsClient() {
  const [tab, setTab] = useState<Tab>("profile");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [subscription, setSubscription] = useState<Subscription>(null);
  const [notifs, setNotifs] = useState<NotifPrefs>(defaultNotifs);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  // Editable profile state
  const [editName, setEditName] = useState("");
  const [editLang, setEditLang] = useState("en");

  // Load data
  useEffect(() => {
    async function load() {
      try {
        const [profileRes, notifsRes] = await Promise.all([
          fetch("/api/user/profile"),
          fetch("/api/user/notifications"),
        ]);

        if (profileRes.ok) {
          const data = await profileRes.json();
          setProfile(data.user);
          setSubscription(data.subscription);
          setEditName(data.user.name || "");
          setEditLang(data.user.language || "en");
        }

        if (notifsRes.ok) {
          const data = await notifsRes.json();
          setNotifs({ ...defaultNotifs, ...data });
        }
      } catch {
        // Use defaults
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Save profile
  const saveProfile = useCallback(async () => {
    if (!profile) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, language: editLang }),
      });
      if (res.ok) {
        setProfile({ ...profile, name: editName, language: editLang });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }, [profile, editName, editLang]);

  // Toggle notification pref
  const toggleNotif = useCallback(
    async (key: keyof NotifPrefs) => {
      const updated = { ...notifs, [key]: !notifs[key] };
      setNotifs(updated);
      try {
        await fetch("/api/user/notifications", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updated),
        });
      } catch {
        // revert on error
        setNotifs(notifs);
      }
    },
    [notifs]
  );

  // Open Stripe portal
  const openPortal = useCallback(async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // silent
    } finally {
      setPortalLoading(false);
    }
  }, []);

  const isVip =
    subscription &&
    isVipTier(subscription.tier) &&
    (subscription.status === "active" || subscription.status === "trialing");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: typeof User }[] = [
    { id: "profile", label: "Profile", icon: User },
    { id: "subscription", label: "Subscription", icon: CreditCard },
    { id: "notifications", label: "Notifications", icon: Bell },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      {/* ─── Tab Navigation ─── */}
      <div className="flex gap-1 bg-gray-50 p-1 rounded-xl mb-6">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
              tab === id
                ? "bg-white text-navy shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ─── Profile Tab ─── */}
      {tab === "profile" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="font-heading font-bold text-navy">Personal Information</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Update your name and language preference
            </p>
          </div>

          {/* Fields */}
          <div className="px-6 py-5 space-y-5">
            {/* Email (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email Address
              </label>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-600">
                <span>{profile?.email}</span>
                <span className="ml-auto text-xs text-gray-400">Managed by Clerk</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                To change your email or password, use the security section below.
              </p>
            </div>

            <SectionDivider />

            {/* Display Name */}
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1.5">
                Display Name
              </label>
              <input
                id="displayName"
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-navy focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>

            {/* Language */}
            <div>
              <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1.5">
                <Globe className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" />
                Language
              </label>
              <select
                id="language"
                value={editLang}
                onChange={(e) => setEditLang(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-navy bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            </div>

            {/* Referral Code */}
            {profile?.referralCode && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Your Referral Code
                </label>
                <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                  <code className="font-mono text-primary font-semibold">{profile.referralCode}</code>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(profile.referralCode!)}
                    className="ml-auto text-xs text-primary hover:text-secondary font-medium"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}

            {/* Member Since */}
            {profile?.createdAt && (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Calendar className="h-3.5 w-3.5" />
                Member since{" "}
                {new Date(profile.createdAt).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-600">
                <CheckCircle className="h-4 w-4" />
                Saved
              </span>
            )}
            <button
              onClick={saveProfile}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-secondary transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Changes
            </button>
          </div>

          {/* Security / Clerk */}
          <div className="px-6 py-5 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
            <h3 className="text-sm font-semibold text-navy mb-1">Security & Account</h3>
            <p className="text-xs text-gray-500 mb-3">
              Change your email, password, or manage connected accounts.
            </p>
            <a
              href="/user"
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 text-sm text-primary hover:text-secondary font-medium transition-colors"
            >
              Open Account Settings
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* ─── Subscription Tab ─── */}
      {tab === "subscription" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          {/* VIP Badge Header */}
          {isVip && (
            <div className="h-1 bg-gradient-to-r from-primary via-accent to-secondary" />
          )}

          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h2 className="font-heading font-bold text-navy">Subscription</h2>
              {isVip && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-primary to-secondary px-2.5 py-0.5 text-xs font-semibold text-white">
                  <Crown className="h-3 w-3" />
                  VIP
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage your plan and billing
            </p>
          </div>

          {subscription ? (
            <div className="px-6 py-5 space-y-4">
              {/* Plan & Status Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="block text-xs font-medium text-gray-500 mb-1">Plan</span>
                  <span className="text-sm font-semibold text-navy">
                    {tierLabels[subscription.tier] || subscription.tier}
                  </span>
                </div>
                <div>
                  <span className="block text-xs font-medium text-gray-500 mb-1">Status</span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${
                      statusColors[subscription.status] || "bg-gray-100 text-gray-600 border-gray-200"
                    }`}
                  >
                    {subscription.status === "active" || subscription.status === "trialing" ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      <XCircle className="h-3 w-3" />
                    )}
                    {statusLabels[subscription.status] || subscription.status}
                  </span>
                </div>
              </div>

              {/* Renewal Date */}
              {subscription.currentPeriodEnd && (
                <>
                  <SectionDivider />
                  <div>
                    <span className="block text-xs font-medium text-gray-500 mb-1">
                      {subscription.status === "cancelled" ? "Access Until" : "Next Renewal"}
                    </span>
                    <span className="text-sm font-semibold text-navy">
                      {new Date(subscription.currentPeriodEnd).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </>
              )}

              <SectionDivider />

              {/* Action Buttons */}
              <div className="space-y-2">
                <button
                  onClick={openPortal}
                  disabled={portalLoading}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-gray-200 hover:border-primary/30 hover:bg-primary/5 text-sm font-medium text-navy transition-all group"
                >
                  <span className="flex items-center gap-2.5">
                    <CreditCard className="h-4 w-4 text-gray-400 group-hover:text-primary" />
                    Manage Billing & Payment
                  </span>
                  {portalLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-primary" />
                  )}
                </button>

                <button
                  onClick={openPortal}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-gray-200 hover:border-amber-300 hover:bg-amber-50 text-sm font-medium text-navy transition-all group"
                >
                  <span className="flex items-center gap-2.5">
                    <PauseCircle className="h-4 w-4 text-gray-400 group-hover:text-amber-600" />
                    Pause or Cancel Subscription
                  </span>
                  <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-amber-600" />
                </button>

                <button
                  onClick={openPortal}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-gray-200 hover:border-primary/30 hover:bg-primary/5 text-sm font-medium text-navy transition-all group"
                >
                  <span className="flex items-center gap-2.5">
                    <Shield className="h-4 w-4 text-gray-400 group-hover:text-primary" />
                    Change Plan
                  </span>
                  <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-primary" />
                </button>
              </div>
            </div>
          ) : (
            <div className="px-6 py-10 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
                <CreditCard className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 mb-4">
                No active subscription. Unlock VIP picks and premium features.
              </p>
              <a
                href="/pricing"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-secondary transition-colors"
              >
                <Crown className="h-4 w-4" />
                View Plans
              </a>
            </div>
          )}
        </div>
      )}

      {/* ─── Notifications Tab ─── */}
      {tab === "notifications" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="font-heading font-bold text-navy">Notification Preferences</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Choose how and when you want to be notified
            </p>
          </div>

          {/* Channels */}
          <div className="px-6 py-5 space-y-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Channels
            </h3>

            <div className="space-y-3">
              {[
                { key: "channelEmail" as const, label: "Email Notifications", desc: "Receive pick alerts and updates via email" },
                { key: "channelPush" as const, label: "Push Notifications", desc: "Get instant alerts on your device" },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between py-2">
                  <div>
                    <span className="block text-sm font-medium text-navy">{label}</span>
                    <span className="block text-xs text-gray-500">{desc}</span>
                  </div>
                  <Toggle on={notifs[key]} onToggle={() => toggleNotif(key)} label={label} />
                </div>
              ))}
            </div>
          </div>

          <SectionDivider />

          {/* Sports */}
          <div className="px-6 py-5 space-y-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Sport Alerts
            </h3>
            <p className="text-xs text-gray-500 -mt-2">
              Toggle which sports you want to receive pick notifications for.
            </p>

            <div className="space-y-3">
              {[
                { key: "sportMlb" as const, label: "MLB", emoji: "⚾" },
                { key: "sportNfl" as const, label: "NFL", emoji: "🏈" },
                { key: "sportNba" as const, label: "NBA", emoji: "🏀" },
                { key: "sportNhl" as const, label: "NHL", emoji: "🏒" },
                { key: "sportSoccer" as const, label: "Soccer", emoji: "⚽" },
                { key: "sportNcaa" as const, label: "NCAA", emoji: "🎓" },
              ].map(({ key, label, emoji }) => (
                <div key={key} className="flex items-center justify-between py-2">
                  <span className="flex items-center gap-2.5 text-sm font-medium text-navy">
                    <span className="text-base">{emoji}</span>
                    {label}
                  </span>
                  <Toggle on={notifs[key]} onToggle={() => toggleNotif(key)} label={label} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
