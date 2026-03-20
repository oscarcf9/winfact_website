export const SITE_NAME = "WinFact Picks";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://winfactpicks.com";
export const SITE_DESCRIPTION = "Data-driven sports betting picks backed by advanced analytics, sharp market insights, and disciplined bankroll strategy.";

export const LOCALES = ["en", "es"] as const;
export const DEFAULT_LOCALE = "en" as const;

export const NAV_LINKS = [
  { href: "/", labelKey: "nav.home" },
  { href: "/how-it-works", labelKey: "nav.howItWorks" },
  { href: "/pricing", labelKey: "nav.pricing" },
  { href: "/blog", labelKey: "nav.blog" },
  { href: "/refer", labelKey: "nav.refer" },
] as const;

export const PROMO_CODE = "PICK80";
export const PROMO_DISCOUNT = "80%";

export const VIP_TIERS = ["vip_weekly", "vip_monthly", "season_pass"] as const;
export type VipTier = (typeof VIP_TIERS)[number];

export function isVipTier(tier: string | null | undefined): boolean {
  return VIP_TIERS.includes(tier as VipTier);
}
