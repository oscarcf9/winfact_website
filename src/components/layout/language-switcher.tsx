"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

type LanguageSwitcherProps = {
  className?: string;
  scrolled?: boolean;
};

export function LanguageSwitcher({ className, scrolled = false }: LanguageSwitcherProps) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const toggleLocale = () => {
    const newLocale = locale === "en" ? "es" : "en";
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <button
      onClick={toggleLocale}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
        scrolled
          ? "text-gray-600 hover:text-primary hover:bg-gray-50"
          : "text-white/80 hover:text-white hover:bg-white/10",
        className
      )}
      aria-label={`Switch to ${locale === "en" ? "Spanish" : "English"}`}
    >
      <Globe className="h-4 w-4" />
      <span>{locale === "en" ? "ES" : "EN"}</span>
    </button>
  );
}
