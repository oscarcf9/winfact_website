"use client";

import { useEffect, useState, useCallback } from "react";

type Prefs = {
  channelEmail: boolean;
  channelPush: boolean;
  sportMlb: boolean;
  sportNfl: boolean;
  sportNba: boolean;
  sportNhl: boolean;
  sportSoccer: boolean;
  sportNcaa: boolean;
};

const defaultPrefs: Prefs = {
  channelEmail: true,
  channelPush: true,
  sportMlb: true,
  sportNfl: true,
  sportNba: true,
  sportNhl: true,
  sportSoccer: true,
  sportNcaa: true,
};

const channelLabels: { key: keyof Prefs; label: string }[] = [
  { key: "channelEmail", label: "Email" },
  { key: "channelPush", label: "Push" },
];

const sportLabels: { key: keyof Prefs; label: string }[] = [
  { key: "sportMlb", label: "MLB" },
  { key: "sportNfl", label: "NFL" },
  { key: "sportNba", label: "NBA" },
  { key: "sportNhl", label: "NHL" },
  { key: "sportSoccer", label: "Soccer" },
  { key: "sportNcaa", label: "NCAA" },
];

function Toggle({
  on,
  onToggle,
  label,
}: {
  on: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
        on
          ? "bg-primary text-white shadow-sm"
          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
      }`}
    >
      <span
        className={`inline-block h-2 w-2 rounded-full ${
          on ? "bg-white" : "bg-gray-400"
        }`}
      />
      {label}
    </button>
  );
}

export function NotificationSettings() {
  const [prefs, setPrefs] = useState<Prefs>(defaultPrefs);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/user/notifications")
      .then((r) => r.json())
      .then((data) => {
        setPrefs({ ...defaultPrefs, ...data });
      })
      .catch(() => {
        // Use defaults on error
      })
      .finally(() => setLoading(false));
  }, []);

  const persist = useCallback(async (updated: Prefs) => {
    setSaving(true);
    try {
      await fetch("/api/user/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
    } catch {
      // Silently fail — optimistic UI
    } finally {
      setSaving(false);
    }
  }, []);

  const toggle = (key: keyof Prefs) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    persist(updated);
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-4 w-32 bg-gray-200 rounded" />
        <div className="flex gap-2">
          <div className="h-9 w-20 bg-gray-200 rounded-full" />
          <div className="h-9 w-20 bg-gray-200 rounded-full" />
        </div>
        <div className="h-4 w-40 bg-gray-200 rounded mt-4" />
        <div className="flex gap-2 flex-wrap">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-9 w-20 bg-gray-200 rounded-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Channels */}
      <div>
        <h3 className="text-sm font-semibold text-navy mb-3">
          Notification Channels
        </h3>
        <div className="flex flex-wrap gap-2">
          {channelLabels.map(({ key, label }) => (
            <Toggle
              key={key}
              on={prefs[key]}
              onToggle={() => toggle(key)}
              label={label}
            />
          ))}
        </div>
      </div>

      {/* Sports */}
      <div>
        <h3 className="text-sm font-semibold text-navy mb-3">
          Sport Preferences
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          Choose which sports you want to receive pick alerts for.
        </p>
        <div className="flex flex-wrap gap-2">
          {sportLabels.map(({ key, label }) => (
            <Toggle
              key={key}
              on={prefs[key]}
              onToggle={() => toggle(key)}
              label={label}
            />
          ))}
        </div>
      </div>

      {saving && (
        <p className="text-xs text-gray-400">Saving...</p>
      )}
    </div>
  );
}
