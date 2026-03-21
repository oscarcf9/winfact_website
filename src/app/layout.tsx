import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { ui } from "@clerk/ui";
import { getLocale } from "next-intl/server";
import { sora, inter, jetbrainsMono } from "@/lib/fonts";
import "@/app/globals.css";

type Props = {
  children: ReactNode;
};

const clerkAppearance = {
  variables: {
    colorPrimary: "#1168D9",
    colorDanger: "#EF4444",
    colorSuccess: "#22C55E",
    colorWarning: "#F59E0B",
    colorText: "#0B1F3B",
    colorTextSecondary: "#64748B",
    colorBackground: "#FFFFFF",
    colorInputBackground: "#F8FAFC",
    colorInputText: "#0B1F3B",
    borderRadius: "0.75rem",
    fontFamily: "var(--font-inter), sans-serif",
  },
  elements: {
    // Global card style
    card: {
      backgroundColor: "#FFFFFF",
      border: "1px solid #E2E8F0",
      boxShadow: "0 10px 40px rgba(11, 31, 59, 0.12)",
      borderRadius: "0.75rem",
    },
    // Form inputs
    formFieldInput: {
      borderColor: "#E2E8F0",
      backgroundColor: "#F8FAFC",
      color: "#0B1F3B",
      borderRadius: "0.5rem",
      fontSize: "0.875rem",
      height: "2.75rem",
      "&:focus": {
        borderColor: "#1168D9",
        boxShadow: "0 0 0 3px rgba(17, 104, 217, 0.12)",
      },
    },
    formFieldLabel: {
      color: "#374151",
      fontSize: "0.875rem",
      fontWeight: "500",
    },
    // Primary action button
    formButtonPrimary: {
      backgroundColor: "#1168D9",
      color: "#FFFFFF",
      borderRadius: "0.5rem",
      fontWeight: "600",
      fontSize: "0.875rem",
      height: "2.75rem",
      boxShadow: "0 4px 12px rgba(17, 104, 217, 0.25)",
      "&:hover": {
        backgroundColor: "#4A88D9",
      },
    },
    // Password visibility toggle
    formFieldInputShowPasswordButton: {
      color: "#94A3B8",
      "&:hover": {
        color: "#1168D9",
      },
    },
    // Social login buttons
    socialButtonsBlockButton: {
      border: "1px solid #E2E8F0",
      borderRadius: "0.5rem",
      height: "2.75rem",
      color: "#374151",
      fontSize: "0.875rem",
      fontWeight: "500",
      "&:hover": {
        backgroundColor: "#F8FAFC",
        borderColor: "#CBD5E1",
      },
    },
    // Divider
    dividerLine: {
      backgroundColor: "#E2E8F0",
    },
    dividerText: {
      color: "#94A3B8",
      fontSize: "0.75rem",
    },
    // Links
    footerActionLink: {
      color: "#1168D9",
      fontWeight: "500",
      "&:hover": {
        color: "#4A88D9",
      },
    },
    // Header
    headerTitle: {
      color: "#0B1F3B",
      fontWeight: "700",
    },
    headerSubtitle: {
      color: "#64748B",
    },
    // UserButton popover
    userButtonPopoverCard: {
      backgroundColor: "#FFFFFF",
      border: "1px solid #E2E8F0",
      boxShadow: "0 10px 40px rgba(11, 31, 59, 0.12)",
      borderRadius: "0.75rem",
    },
    userButtonPopoverActionButton: {
      color: "#334155",
      "&:hover": {
        backgroundColor: "#F1F5F9",
        color: "#0B1F3B",
      },
    },
    userButtonPopoverActionButtonText: {
      color: "inherit",
    },
    userButtonPopoverActionButtonIcon: {
      color: "#1168D9",
    },
    userButtonPopoverFooter: {
      display: "none",
    },
    userPreviewMainIdentifier: {
      color: "#0B1F3B",
      fontWeight: "600",
    },
    userPreviewSecondaryIdentifier: {
      color: "#64748B",
    },
    // Alert/error styling
    alertText: {
      color: "#EF4444",
      fontSize: "0.8125rem",
    },
    formFieldErrorText: {
      color: "#EF4444",
      fontSize: "0.8125rem",
    },
  },
};

export default async function RootLayout({ children }: Props) {
  const locale = await getLocale();

  return (
    <ClerkProvider appearance={clerkAppearance} ui={ui}>
      <html lang={locale} className={`${sora.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
        <head>
          <meta name="theme-color" content="#0B1F3B" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
          <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        </head>
        <body className="font-sans antialiased bg-white text-foreground" suppressHydrationWarning>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
