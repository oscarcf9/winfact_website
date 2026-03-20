"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { usePathname } from "next/navigation";
import { X, Copy, Check } from "lucide-react";
import { Link } from "@/i18n/navigation";

const DISMISS_KEY = "winfact_banner_dismissed";

const styleMap: Record<string, string> = {
  default: "bg-navy text-white/90",
  promo: "bg-gradient-to-r from-primary to-accent text-white",
  info: "bg-navy text-white/90",
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
  promoCode: string | null;
};

export function PromoBanner({ onDismiss }: { onDismiss: () => void }) {
  const t = useTranslations("promo");
  const locale = useLocale();
  const pathname = usePathname();
  const [data, setData] = useState<BannerData | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState(false);

  // Hide on auth pages
  const hiddenPaths = ["/sign-in", "/sign-up"];
  const isHiddenRoute = hiddenPaths.some((p) => pathname.includes(p));

  useEffect(() => {
    // Check sessionStorage dismissal
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "true") {
        setLoaded(true);
        return;
      }
    } catch {
      // sessionStorage not available
    }

    fetch("/api/site-content/announcement")
      .then((res) => res.json())
      .then((d: BannerData) => {
        setData(d);
        setLoaded(true);
      })
      .catch(() => {
        setLoaded(true);
      });
  }, []);

  function handleDismiss() {
    try {
      sessionStorage.setItem(DISMISS_KEY, "true");
    } catch {
      // ignore
    }
    onDismiss();
  }

  async function handleCopyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: ignore
    }
  }

  // Don't render while loading, on hidden routes, or if dismissed via sessionStorage
  if (!loaded || isHiddenRoute) return null;

  // If API says not visible or was dismissed
  if (loaded && data && !data.visible) return null;

  // If no data and sessionStorage says dismissed
  if (!data) return null;

  const text = data.hasContent
    ? (locale === "es" ? (data.textEs || data.textEn) : data.textEn) || t("text")
    : t("text");

  const cta = data.hasContent
    ? (locale === "es" ? (data.ctaEs || data.ctaEn) : data.ctaEn) || t("cta")
    : t("cta");

  const href = data.link || "/pricing";
  const bgClass = styleMap[data.style || "default"] || styleMap.default;

  return (
    <div className={`relative ${bgClass} text-sm font-medium`}>
      <div className="mx-auto flex items-center justify-center gap-3 px-10 py-2.5 flex-wrap sm:flex-nowrap">
        <p className="text-center sm:text-left">{text}</p>

        <div className="flex items-center gap-2">
          {data.promoCode && (
            <button
              onClick={() => handleCopyCode(data.promoCode!)}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/20 border border-white/30 text-xs font-mono font-bold hover:bg-white/30 transition-colors cursor-pointer"
              title="Click to copy"
            >
              {data.promoCode}
              {copied ? (
                <Check className="h-3 w-3" />
              ) : (
                <Copy className="h-3 w-3 opacity-70" />
              )}
            </button>
          )}

          <Link
            href={href}
            className="rounded-md bg-white/20 border border-white/30 px-3 py-1 text-xs font-heading font-bold hover:bg-white/30 transition-colors"
          >
            {cta}
          </Link>
        </div>

        <button
          onClick={handleDismiss}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
