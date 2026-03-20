import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Database, Brain, TrendingUp, Smartphone, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

import { Section } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { Heading } from "@/components/ui/heading";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHero } from "@/components/ui/page-hero";
import { AnimatedSection } from "@/components/ui/animated-section";
import { JsonLd, breadcrumbJsonLd } from "@/components/seo/json-ld";
import { SITE_URL } from "@/lib/constants";
import {
  DataFeedMockup,
  ModelConsensusMockup,
  SharpActionMockup,
  AppDeliveryMockup,
} from "@/components/how-it-works/step-mockups";
import {
  StepsTimeline,
  StaggeredList,
  ScaleIn,
} from "@/components/how-it-works/steps-timeline";

const STEP_ICONS = [Database, Brain, TrendingUp, Smartphone];

const STEP_DETAILS = [
  {
    details: [
      "Injury reports & player status updates",
      "Real-time weather conditions",
      "Historical head-to-head matchup data",
      "Line movement from 20+ sportsbooks",
      "Team-level and player-level advanced stats",
    ],
  },
  {
    details: [
      "Multiple independent statistical models per sport",
      "Consensus scoring: picks only released when models agree",
      "Expected Value (EV) calculation on every potential bet",
      "Historical backtesting against closing lines",
      "Continuous model refinement based on performance data",
    ],
  },
  {
    details: [
      "Track where sharp (professional) money is flowing",
      "Identify reverse line movement signals",
      "Monitor steam moves across major sportsbooks",
      "Cross-reference public vs sharp betting percentages",
      "Validate model edges with real-market confirmation",
    ],
  },
  {
    details: [
      "Instant push notifications via the WinFact mobile app",
      "Full pick analysis and breakdowns in-app",
      "Email digest with morning, afternoon, and evening picks",
      "Personal member dashboard with pick history & stats",
      "Bilingual coverage: every pick in English and Spanish",
    ],
  },
] as const;

const STEP_MOCKUPS = [
  DataFeedMockup,
  ModelConsensusMockup,
  SharpActionMockup,
  AppDeliveryMockup,
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "howItWorks" });

  return {
    title: "How It Works",
    description: `${t("pageSubtitle")} Learn about our data-driven process for generating winning sports betting picks.`,
    alternates: {
      canonical: "/how-it-works",
      languages: { en: "/en/how-it-works", es: "/es/how-it-works" },
    },
    openGraph: {
      title: "How It Works | WinFact Picks",
      description: t("pageSubtitle"),
    },
  };
}

export default function HowItWorksPage() {
  const t = useTranslations("howItWorks");

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: SITE_URL },
          { name: "How It Works", url: `${SITE_URL}/how-it-works` },
        ])}
      />
      <Header />

      <main>
        {/* Hero */}
        <PageHero>
          <Badge className="mb-4 bg-white/10 text-white border border-white/20">
            Our Process
          </Badge>
          <Heading as="h1" size="h1" className="text-white mb-4">
            {t("pageTitle")}
          </Heading>
          <p className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto mb-8">
            {t("pageSubtitle")}
          </p>
          <Link href="/pricing">
            <Button variant="primary" size="xl">
              Get Started
            </Button>
          </Link>
        </PageHero>

        {/* Steps with Timeline + Mockups */}
        <Section bg="white">
          <Container>
            <AnimatedSection direction="up">
              <div className="text-center mb-12 md:mb-20">
                <Heading as="h2" className="text-navy mb-4">
                  {t("title")}
                </Heading>
                <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                  {t("subtitle")}
                </p>
              </div>
            </AnimatedSection>

            <StepsTimeline>
              {STEP_ICONS.map((Icon, i) => {
                const isEven = i % 2 === 0;
                const Mockup = STEP_MOCKUPS[i];
                return (
                  <div
                    key={i}
                    className={`flex flex-col gap-8 md:gap-10 lg:flex-row ${
                      !isEven ? "lg:flex-row-reverse" : ""
                    } items-center`}
                  >
                    {/* Mockup */}
                    <div className="w-full max-w-xs mx-auto lg:mx-0 lg:w-5/12 flex justify-center">
                      <ScaleIn delay={0.2 + i * 0.05}>
                        <div className="relative w-full">
                          <div className="absolute inset-0 -m-4 bg-primary/5 rounded-3xl blur-xl" />
                          <div className="relative">
                            <Mockup />
                          </div>
                          <div className="absolute -top-3 -left-3 md:-top-4 md:-left-4 bg-primary text-white text-base md:text-lg font-bold rounded-full w-8 h-8 md:w-10 md:h-10 flex items-center justify-center shadow-lg z-10">
                            {i + 1}
                          </div>
                        </div>
                      </ScaleIn>
                    </div>

                    {/* Content */}
                    <div className="w-full lg:w-7/12">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                          <Icon className="h-5 w-5" />
                        </div>
                        <h3 className="font-heading font-bold text-xl md:text-2xl text-navy">
                          {t(`steps.${i}.title`)}
                        </h3>
                      </div>
                      <p className="text-gray-600 leading-relaxed mb-5">
                        {t(`steps.${i}.description`)}
                      </p>
                      <StaggeredList>
                        {STEP_DETAILS[i].details.map((detail, j) => (
                          <span
                            key={j}
                            className="flex items-start gap-2.5 text-sm text-gray-600"
                          >
                            <ArrowRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                            {detail}
                          </span>
                        ))}
                      </StaggeredList>
                    </div>
                  </div>
                );
              })}
            </StepsTimeline>
          </Container>
        </Section>

        {/* CTA to Pricing */}
        <Section bg="navy">
          <Container size="narrow">
            <div className="text-center">
              <Heading as="h2" size="h3" className="text-white mb-4">
                Ready to Get Started?
              </Heading>
              <p className="text-white/70 mb-8 text-lg leading-relaxed">
                Now that you know how we build our edge, it&apos;s time to put
                it to work. Choose a plan and start receiving data-driven picks
                today.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/pricing">
                  <Button variant="primary" size="lg">
                    View Pricing Plans
                  </Button>
                </Link>
                <Link href="/blog">
                  <Button variant="ghost" size="lg" className="text-white hover:text-accent hover:bg-white/10">
                    Free Picks &amp; Blog
                  </Button>
                </Link>
              </div>
            </div>
          </Container>
        </Section>
      </main>

      <Footer />
    </>
  );
}
