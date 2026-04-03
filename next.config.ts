import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://clerk.winfactpicks.com https://*.clerk.accounts.dev https://www.googletagmanager.com https://challenges.cloudflare.com",
              "worker-src 'self' blob:",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://p.typekit.net https://use.typekit.net",
              "font-src 'self' https://fonts.gstatic.com https://use.typekit.net",
              "img-src 'self' data: blob: https://*.cloudflare.com https://*.r2.dev https://img.clerk.com https://*.stripe.com https://media.winfactpicks.com https://a.espncdn.com https://*.espncdn.com https://p.typekit.net",
              "frame-src https://js.stripe.com https://clerk.winfactpicks.com https://*.clerk.accounts.dev https://challenges.cloudflare.com",
              "connect-src 'self' data: blob: https://api.stripe.com https://clerk.winfactpicks.com https://*.clerk.accounts.dev https://www.google-analytics.com https://api.mailerlite.com https://api.telegram.org https://p.typekit.net",
              "object-src 'none'",
              "base-uri 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
