"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { X } from "lucide-react";
import { Link } from "@/i18n/navigation";

const styleMap: Record<string, string> = {
  default: "bg-navy text-white/90",
  urgent: "bg-gradient-to-r from-red-600 to-orange-500 text-white",
  success: "bg-gradient-to-r from-emerald-600 to-green-500 text-white",
};

type BannerData = {
  visible: boolean;
  hasContent: boolean;
  textEn: string | null;
  textEs: string | null;
  ctaEn: string | null;
  ctaEs: string | null;
  link: string;
  style: string;
};

export function PromoBanner({ onDismiss }: { onDismiss: () => void }) {
  const t = useTranslations("promo");
  const locale = useLocale();
  const [data, setData] = useState<BannerData | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/site-content/announcement")
      .then((res) => res.json())
      .then((d: BannerData) => {
        setData(d);
        setLoaded(true);
      })
      .catch(() => {
        // On error, show with i18n defaults
        setLoaded(true);
      });
  }, []);

  // If API says not visible, tell parent to dismiss
  if (loaded && data && !data.visible) {
    // Return nothing - the parent state handles this
    return null;
  }

  // Determine display text
  const text = data?.hasContent
    ? (locale === "es" ? (data.textEs || data.textEn) : data.textEn) || t("text")
    : t("text");

  const cta = data?.hasContent
    ? (locale === "es" ? (data.ctaEs || data.ctaEn) : data.ctaEn) || t("cta")
    : t("cta");

  const href = data?.link || "/pricing";
  const bgClass = styleMap[data?.style || "default"] || styleMap.default;

  return (
    <div className={`relative ${bgClass} text-sm font-medium`}>
      <div className="mx-auto flex items-center justify-center gap-3 px-4 py-2.5">
        <p>{text}</p>
        <Link
          href={href}
          className="rounded-md bg-primary px-3 py-1 text-xs font-bold text-white hover:bg-primary/80 transition-colors"
        >
          {cta}
        </Link>
        <button
          onClick={onDismiss}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
