import type { Metadata } from "next";
import type { ReactNode } from "react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  return {
    title: "Sign Up — Start Winning With Data",
    description:
      "Create your WinFact Picks account. Get access to data-driven sports betting picks, advanced analytics, and a personalized dashboard.",
    alternates: {
      canonical: `/${locale}/sign-up`,
      languages: { en: "/en/sign-up", es: "/es/sign-up" },
    },
    openGraph: {
      title: "Sign Up | WinFact Picks",
      description:
        "Join thousands of smart bettors using analytics-driven picks to gain an edge.",
    },
  };
}

export default function SignUpLayout({ children }: { children: ReactNode }) {
  return children;
}
