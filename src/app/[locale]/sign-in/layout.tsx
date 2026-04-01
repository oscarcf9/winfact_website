import type { Metadata } from "next";
import type { ReactNode } from "react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  return {
    title: "Sign In — Access Your Dashboard",
    description:
      "Sign in to your WinFact Picks account. Access your picks, performance tracking, and personalized dashboard.",
    alternates: {
      canonical: `/${locale}/sign-in`,
      languages: { en: "/en/sign-in", es: "/es/sign-in" },
    },
    openGraph: {
      title: "Sign In | WinFact Picks",
      description:
        "Sign in to access your data-driven sports betting picks and dashboard.",
    },
  };
}

export default function SignInLayout({ children }: { children: ReactNode }) {
  return children;
}
