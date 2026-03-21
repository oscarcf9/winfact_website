"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Menu } from "lucide-react";
import { useAuth, UserButton } from "@clerk/nextjs";
import { Link } from "@/i18n/navigation";
import { NAV_LINKS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "./language-switcher";
import { MobileNav } from "./mobile-nav";
import { PromoBanner } from "./promo-banner";
import { cn } from "@/lib/utils";

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const t = useTranslations("nav");
  const { isSignedIn } = useAuth();

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 50);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-white/90 backdrop-blur-xl border-b border-gray-200/60 shadow-sm"
          : "bg-transparent border-b border-transparent"
      )}
    >
      {!bannerDismissed && (
        <PromoBanner onDismiss={() => setBannerDismissed(true)} />
      )}

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-2">
          <span
            className={cn(
              "font-heading text-xl font-bold transition-all duration-300",
              scrolled ? "text-navy" : "text-white",
              "group-hover:scale-105 group-hover:drop-shadow-[0_0_8px_rgba(17,104,217,0.5)]"
            )}
          >
            Win
            <span className="logo-gradient">
              Fact
            </span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                scrolled
                  ? "text-gray-600 hover:text-primary hover:bg-gray-50"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              )}
            >
              {t(link.labelKey.replace("nav.", ""))}
            </Link>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden lg:flex items-center gap-3">
          <LanguageSwitcher scrolled={scrolled} />
          {isSignedIn ? (
            <>
              <Link
                href="/dashboard"
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  scrolled
                    ? "text-gray-600 hover:text-primary hover:bg-gray-50"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                )}
              >
                {t("dashboard")}
              </Link>
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: cn(
                      "h-9 w-9 ring-2 ring-offset-2",
                      scrolled
                        ? "ring-primary/30 ring-offset-white"
                        : "ring-white/30 ring-offset-transparent"
                    ),
                    userButtonTrigger: "rounded-full focus:shadow-none",
                  },
                }}
              />
            </>
          ) : (
            <>
              <Link
                href="/sign-in"
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  scrolled
                    ? "text-gray-600 hover:text-primary hover:bg-gray-50"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                )}
              >
                {t("login")}
              </Link>
              <Link href="/pricing">
                <Button size="sm">{t("getStarted")}</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(true)}
          className={cn(
            "lg:hidden rounded-lg p-2 transition-colors cursor-pointer",
            scrolled ? "hover:bg-gray-100" : "hover:bg-white/10"
          )}
          aria-label="Open menu"
        >
          <Menu
            className={cn(
              "h-6 w-6 transition-colors duration-300",
              scrolled ? "text-foreground" : "text-white"
            )}
          />
        </button>
      </div>

      <MobileNav isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
    </header>
  );
}
