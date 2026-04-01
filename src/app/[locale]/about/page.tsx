import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Target, Eye, Globe, ShieldCheck } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

import { Section } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { Heading } from "@/components/ui/heading";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { PageHero } from "@/components/ui/page-hero";
import { Badge } from "@/components/ui/badge";
import { AnimatedSection } from "@/components/ui/animated-section";
import { JsonLd, breadcrumbJsonLd } from "@/components/seo/json-ld";
import { SITE_URL } from "@/lib/constants";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });

  return {
    title: t("title"),
    description: t("missionText"),
    alternates: {
      canonical: `/${locale}/about`,
      languages: { en: "/en/about", es: "/es/about" },
    },
    openGraph: {
      title: "About WinFact Picks",
      description: t("missionText"),
    },
    twitter: {
      card: "summary_large_image",
      title: "About WinFact Picks",
      description: t("missionText"),
    },
  };
}

const VALUE_ICONS = [Target, Eye, Globe, ShieldCheck];

export default function AboutPage() {
  const t = useTranslations("about");

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: SITE_URL },
          { name: "About", url: `${SITE_URL}/about` },
        ])}
      />
      <Header />

      <main>
        {/* Hero */}
        <PageHero>
          <Badge className="mb-4 bg-white/10 text-white border border-white/20">
            {t("badge")}
          </Badge>
          <Heading as="h1" size="h1" className="text-white mb-4">
            {t("title")}
          </Heading>
          <p className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto mb-8">
            {t("subtitle")}
          </p>
          <Link href="/pricing">
            <Button variant="primary" size="xl">
              {t("viewPricing")}
            </Button>
          </Link>
        </PageHero>

        {/* Mission */}
        <Section bg="white">
          <Container>
            <AnimatedSection direction="left">
            <div className="grid gap-12 lg:grid-cols-2 items-center">
              <div>
                <Heading as="h2" size="h3" className="text-navy mb-4">
                  {t("mission")}
                </Heading>
                <p className="text-gray-600 text-lg leading-relaxed">
                  {t("missionText")}
                </p>
              </div>
              <div className="rounded-2xl bg-primary/5 border border-primary/10 p-8 lg:p-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
                    <Target className="h-5 w-5" />
                  </div>
                  <span className="font-heading font-bold text-navy text-lg">
                    {t("values.0.title")}
                  </span>
                </div>
                <p className="text-gray-500 leading-relaxed">
                  {t("dataOverOpinionsDetail")}
                </p>
              </div>
            </div>
            </AnimatedSection>
          </Container>
        </Section>

        {/* Bilingual Advantage */}
        <Section bg="light">
          <Container>
            <AnimatedSection direction="right">
            <div className="grid gap-12 lg:grid-cols-2 items-center">
              <div className="order-2 lg:order-1 rounded-2xl bg-accent/5 border border-accent/10 p-8 lg:p-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-accent/10 text-accent">
                    <Globe className="h-5 w-5" />
                  </div>
                  <span className="font-heading font-bold text-navy text-lg">
                    {t("bilingualLabel")}
                  </span>
                </div>
                <p className="text-gray-500 leading-relaxed">
                  {t("bilingualDetail")}
                </p>
              </div>
              <div className="order-1 lg:order-2">
                <Heading as="h2" size="h3" className="text-navy mb-4">
                  {t("bilingual")}
                </Heading>
                <p className="text-gray-600 text-lg leading-relaxed">
                  {t("bilingualText")}
                </p>
              </div>
            </div>
            </AnimatedSection>
          </Container>
        </Section>

        {/* Transparency */}
        <Section bg="white">
          <Container>
            <AnimatedSection direction="left">
            <div className="grid gap-12 lg:grid-cols-2 items-center">
              <div>
                <Heading as="h2" size="h3" className="text-navy mb-4">
                  {t("transparency")}
                </Heading>
                <p className="text-gray-600 text-lg leading-relaxed">
                  {t("transparencyText")}
                </p>
              </div>
              <div className="rounded-2xl bg-navy/5 border border-navy/10 p-8 lg:p-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-navy/10 text-navy">
                    <Eye className="h-5 w-5" />
                  </div>
                  <span className="font-heading font-bold text-navy text-lg">
                    Full Record Published
                  </span>
                </div>
                <p className="text-gray-500 leading-relaxed">
                  Wins and losses, ROI by sport, CLV on every pick. Our track
                  record is an open book because trust is earned through honesty.
                </p>
              </div>
            </div>
            </AnimatedSection>
          </Container>
        </Section>

        {/* Values Grid */}
        <Section bg="light">
          <Container>
            <div className="text-center mb-12">
              <Heading as="h2" className="text-navy mb-4">
                Our Values
              </Heading>
              <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                The principles that guide every pick we make
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {VALUE_ICONS.map((Icon, i) => (
                <AnimatedSection key={i} direction="up" delay={i * 0.1}>
                <Card className="text-center group hover:border-primary/20">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 text-primary mb-4 group-hover:bg-primary group-hover:text-white transition-colors">
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="font-heading font-bold text-lg text-navy mb-2">
                    {t(`values.${i}.title`)}
                  </h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    {t(`values.${i}.description`)}
                  </p>
                </Card>
                </AnimatedSection>
              ))}
            </div>
          </Container>
        </Section>

        {/* CTA */}
        <Section bg="gradient">
          <Container size="narrow" className="text-center">
            <Heading as="h2" size="h2" className="text-white mb-4">
              Ready to Bet Smarter?
            </Heading>
            <p className="text-gray-300 text-lg mb-8 max-w-xl mx-auto">
              Join thousands of data-driven bettors who trust WinFact for
              transparent, analytics-backed sports picks.
            </p>
            <Link href="/pricing">
              <Button variant="primary" size="xl">
                View Pricing Plans
              </Button>
            </Link>
          </Container>
        </Section>
      </main>

      <Footer />
    </>
  );
}
