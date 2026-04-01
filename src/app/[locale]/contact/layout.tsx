import type { ReactNode } from "react";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  return {
    title: "Contact WinFact Picks — Get In Touch",
    description:
      "Get in touch with WinFact Picks. Questions about our data-driven sports picks, subscriptions, or partnership inquiries.",
    openGraph: {
      title: "Contact WinFact Picks",
      description:
        "Questions about our data-driven sports picks? Reach out to our team.",
      type: "website",
      images: [{ url: "/images/og-default.png" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Contact WinFact Picks — Get In Touch",
      description:
        "Get in touch with WinFact Picks. Questions about our data-driven sports picks, subscriptions, or partnership inquiries.",
    },
    alternates: {
      canonical: `/${locale}/contact`,
      languages: { en: "/en/contact", es: "/es/contact" },
    },
  };
}

export default function ContactLayout({ children }: { children: ReactNode }) {
  return children;
}
