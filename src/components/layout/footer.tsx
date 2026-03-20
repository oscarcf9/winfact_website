import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/ui/container";

const SOCIAL_LINKS = [
  {
    name: "Instagram",
    href: "https://www.instagram.com/winfact_picks/",
    icon: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
  },
  {
    name: "Facebook",
    href: "https://www.facebook.com/winfactpicks",
    icon: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    name: "TikTok",
    href: "https://www.tiktok.com/@winfact_sports",
    icon: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    ),
  },
  {
    name: "X",
    href: "https://x.com/winfactpicks",
    icon: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    name: "YouTube",
    href: "https://www.youtube.com/@WinFactPicks",
    icon: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  {
    name: "Threads",
    href: "https://www.threads.com/@winfact_picks",
    icon: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.59 12c.025 3.086.718 5.496 2.057 7.164 1.432 1.781 3.632 2.695 6.54 2.717 2.227-.02 4.358-.631 5.8-1.673a4.028 4.028 0 001.686-2.716c.228-1.152-.058-2.065-.834-2.713-.493-.412-1.12-.69-1.854-.832-.142 1.19-.577 2.223-1.333 2.958-.942.915-2.28 1.394-3.875 1.394h-.036c-1.349-.01-2.464-.466-3.32-1.36-.8-.835-1.224-1.95-1.224-3.221 0-2.704 1.866-4.65 4.544-4.65 1.022 0 1.948.268 2.675.774.7.488 1.198 1.166 1.46 1.988l-1.922.674c-.317-1.106-1.178-1.567-2.213-1.567-1.725 0-2.625 1.267-2.625 2.781 0 .845.264 1.53.77 1.992.47.429 1.125.653 1.898.658h.021c1.064 0 1.865-.34 2.384-1.013.317-.41.527-.96.618-1.626a7.893 7.893 0 00-2.405-.36l.33-1.886c1.305 0 2.51.194 3.544.579 1.223.456 2.16 1.196 2.783 2.2.576.928.782 2.005.598 3.112a6.033 6.033 0 01-2.574 4.04C17.323 23.269 14.895 23.978 12.186 24z" />
      </svg>
    ),
  },
] as const;

export function Footer() {
  const t = useTranslations("footer");
  const year = new Date().getFullYear();

  return (
    <footer className="bg-navy text-white">
      <Container>
        <div className="py-16">
          <div className="grid gap-12 md:grid-cols-4">
            {/* Brand */}
            <div className="md:col-span-1">
              <span className="font-heading text-xl font-bold">
                Win<span className="text-gradient-primary">Fact</span>
              </span>
              <p className="mt-3 text-sm text-gray-400 leading-relaxed">
                {t("description")}
              </p>

              {/* Social icons */}
              <div className="flex items-center gap-3 mt-5">
                {SOCIAL_LINKS.map((social) => (
                  <a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.name}
                    className="text-gray-400 hover:text-primary transition-colors duration-200"
                  >
                    {social.icon}
                  </a>
                ))}
              </div>
            </div>

            {/* Product */}
            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-primary">
                {t("product")}
              </h3>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/how-it-works" className="text-sm text-gray-400 hover:text-primary transition-colors footer-link">
                    {t("links.howItWorks")}
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="text-sm text-gray-400 hover:text-primary transition-colors footer-link">
                    {t("links.pricing")}
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="text-sm text-gray-400 hover:text-primary transition-colors footer-link">
                    {t("links.blog")}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Community */}
            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-primary">
                {t("community")}
              </h3>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/refer" className="text-sm text-gray-400 hover:text-primary transition-colors footer-link">
                    {t("links.refer")}
                  </Link>
                </li>
                <li>
                  <a
                    href="https://t.me/winfactpicks"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-400 hover:text-primary transition-colors footer-link"
                  >
                    {t("links.telegram")}
                  </a>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-primary">
                {t("support")}
              </h3>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/faq" className="text-sm text-gray-400 hover:text-primary transition-colors footer-link">
                    {t("links.faq")}
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-sm text-gray-400 hover:text-primary transition-colors footer-link">
                    {t("links.contact")}
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="text-sm text-gray-400 hover:text-primary transition-colors footer-link">
                    {t("links.about")}
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Responsible Gambling */}
        <div className="border-t border-white/10 py-6 flex items-start gap-3">
          <span className="shrink-0 inline-flex items-center justify-center rounded-md bg-white/10 text-white text-[10px] font-bold px-2 py-1 leading-none">
            {t("ageNotice")}
          </span>
          <p className="text-xs text-gray-500 leading-relaxed">
            {t("responsible")}
          </p>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            {t("copyright", { year })}
          </p>
          <div className="flex items-center gap-4 flex-wrap">
            <Link href="/privacy" className="text-xs text-gray-500 hover:text-white transition-colors">
              {t("privacy")}
            </Link>
            <Link href="/terms" className="text-xs text-gray-500 hover:text-white transition-colors">
              {t("terms")}
            </Link>
            <Link href="/disclaimer" className="text-xs text-gray-500 hover:text-white transition-colors">
              {t("disclaimer")}
            </Link>
            <Link href="/responsible-gambling" className="text-xs text-gray-500 hover:text-white transition-colors">
              {t("responsibleGambling")}
            </Link>
          </div>
        </div>
      </Container>
    </footer>
  );
}
