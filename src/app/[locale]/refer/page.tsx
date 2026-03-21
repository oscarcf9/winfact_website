import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Share2, UserPlus, Gift, Trophy, Star, Crown, ArrowRight } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

import { Section } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { Heading } from "@/components/ui/heading";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { AnimatedSection } from "@/components/ui/animated-section";
import { PageHero } from "@/components/ui/page-hero";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "refer" });

  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: {
      canonical: "/refer",
      languages: { en: "/en/refer", es: "/es/refer" },
    },
    openGraph: {
      title: "Refer a Friend | WinFact Picks",
      description:
        "Earn rewards by referring friends to WinFact Picks. $10 credit per referral, free month at 5 referrals.",
      type: "website",
      images: [{ url: "/images/og-default.png" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Refer a Friend | WinFact Picks",
      description: t("subtitle"),
    },
  };
}

const STEP_ICONS = [Share2, UserPlus, Gift];
const TIER_ICONS = [Star, Trophy, Crown];
const _TIER_COLORS = [
  "bg-primary/10 text-primary",
  "bg-accent/10 text-accent",
  "bg-navy/10 text-navy",
];

export default function ReferPage() {
  const t = useTranslations("refer");

  return (
    <>
      <Header />

      <main>
        {/* Hero */}
        <PageHero>
          <Badge className="mb-4 bg-white/10 text-white border border-white/20">
            Referral Program
          </Badge>
          <Heading as="h1" size="h1" className="text-white mb-4">
            {t("title")}
          </Heading>
          <p className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto mb-8">
            {t("subtitle")}
          </p>
          <Link href="/pricing">
            <Button variant="primary" size="xl">
              {t("cta")}
            </Button>
          </Link>
        </PageHero>

        {/* How It Works Steps */}
        <Section bg="white">
          <Container>
            <AnimatedSection direction="up">
              <div className="text-center mb-12">
                <Heading as="h2" className="text-navy mb-4">
                  {t("howItWorks")}
                </Heading>
                <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                  Earning rewards is simple. Just three easy steps.
                </p>
              </div>
            </AnimatedSection>

            <div className="grid gap-8 md:grid-cols-3">
              {STEP_ICONS.map((Icon, i) => (
                <AnimatedSection key={i} direction="up" delay={i * 0.1}>
                <Card className="text-center relative group hover:border-primary/20">
                  {/* Step number */}
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center shadow-md">
                    {i + 1}
                  </div>

                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-5 group-hover:bg-primary group-hover:text-white transition-colors">
                    <Icon className="h-8 w-8" />
                  </div>

                  <h3 className="font-heading font-bold text-xl text-navy mb-3">
                    {t(`steps.${i}.title`)}
                  </h3>
                  <p className="text-gray-500 leading-relaxed">
                    {t(`steps.${i}.description`)}
                  </p>

                  {/* Connector line (hidden on last card and mobile) */}
                  {i < 2 && (
                    <div className="hidden md:block absolute top-1/2 -right-4 w-8 border-t-2 border-dashed border-gray-200" />
                  )}
                </Card>
                </AnimatedSection>
              ))}
            </div>
          </Container>
        </Section>

        {/* Reward Tiers */}
        <Section bg="light">
          <Container>
            <AnimatedSection direction="up">
              <div className="text-center mb-12">
                <Heading as="h2" className="text-navy mb-4">
                  {t("rewards")}
                </Heading>
                <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                  The more friends you refer, the bigger the rewards
                </p>
              </div>
            </AnimatedSection>

            <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
              {TIER_ICONS.map((Icon, i) => {
                const gradients = [
                  "from-primary/10 to-primary/5",
                  "from-accent/10 to-accent/5",
                  "from-navy/10 to-primary/10",
                ];
                const iconBg = [
                  "bg-primary text-white",
                  "bg-accent text-white",
                  "bg-navy text-white",
                ];
                const borderColors = [
                  "border-primary/20 hover:border-primary/50",
                  "border-accent/20 hover:border-accent/50",
                  "border-primary hover:border-primary",
                ];

                return (
                  <AnimatedSection key={i} direction="up" delay={i * 0.15}>
                    <div
                      className={`group relative text-center rounded-2xl border-2 ${borderColors[i]} bg-gradient-to-b ${gradients[i]} p-8 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 ${
                        i === 2 ? "shadow-lg ring-2 ring-primary/20" : "shadow-sm"
                      }`}
                    >
                      {/* Top badge for best tier */}
                      {i === 2 && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <Badge className="bg-primary text-white px-4 py-1 text-xs shadow-md">
                            Best Value
                          </Badge>
                        </div>
                      )}

                      {/* Tier number */}
                      <div className="absolute top-4 left-4 text-6xl font-bold text-navy/5 font-heading select-none">
                        {i + 1}
                      </div>

                      <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl ${iconBg[i]} mb-5 shadow-md group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="h-8 w-8" />
                      </div>

                      <div className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-2">
                        {t(`tiers.${i}.count`)}
                      </div>

                      <p className="font-heading font-bold text-2xl text-navy mb-4">
                        {t(`tiers.${i}.reward`)}
                      </p>

                      {/* Progress indicator */}
                      <div className="flex items-center justify-center gap-1.5 mt-2">
                        {[0, 1, 2].map((dot) => (
                          <div
                            key={dot}
                            className={`h-2 rounded-full transition-all duration-300 ${
                              dot <= i
                                ? `${i === 2 ? "bg-primary" : i === 1 ? "bg-accent" : "bg-primary"} w-6`
                                : "bg-gray-200 w-2"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </AnimatedSection>
                );
              })}
            </div>

            {/* Connecting arrows (desktop only) */}
            <div className="hidden md:flex justify-center items-center gap-4 mt-8">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span className="font-medium">Start</span>
                <ArrowRight className="h-4 w-4" />
                <span className="font-medium text-primary">Grow</span>
                <ArrowRight className="h-4 w-4" />
                <span className="font-medium text-navy font-bold">Earn Big</span>
              </div>
            </div>

            {/* FTC Affiliate Disclosure */}
            <p className="text-center text-xs text-gray-400 mt-8 max-w-xl mx-auto">
              {t("disclosure")}
            </p>
          </Container>
        </Section>

        {/* CTA */}
        <Section bg="gradient">
          <Container size="narrow" className="text-center">
            <Heading as="h2" size="h2" className="text-white mb-4">
              Start Earning Today
            </Heading>
            <p className="text-gray-300 text-lg mb-8 max-w-xl mx-auto">
              Sign up for a free account to get your unique referral link and
              start sharing with friends.
            </p>
            <Link href="/pricing">
              <Button variant="primary" size="xl">
                {t("cta")}
              </Button>
            </Link>
          </Container>
        </Section>
      </main>

      <Footer />
    </>
  );
}
