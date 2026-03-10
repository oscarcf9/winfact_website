import { getTranslations } from "next-intl/server";
import { getLocale } from "next-intl/server";
import { Star } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Section } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { GradientText } from "@/components/ui/gradient-text";
import { AnimatedSection } from "@/components/ui/animated-section";
import { GradientOrb } from "@/components/ui/background-patterns";
import { InteractiveGrid } from "@/components/ui/interactive-grid";
import { HeroVisual } from "./hero-visual";
import { getSiteContent } from "@/db/queries/site-content";

export async function Hero() {
  const t = await getTranslations("hero");
  const locale = await getLocale();

  // Fetch DB overrides (empty string = use i18n default)
  const [headlineEn, headlineEs, subEn, subEs, ctaEn, ctaEs] = await Promise.all([
    getSiteContent("hero_headline_en"),
    getSiteContent("hero_headline_es"),
    getSiteContent("hero_subheadline_en"),
    getSiteContent("hero_subheadline_es"),
    getSiteContent("hero_cta_text_en"),
    getSiteContent("hero_cta_text_es"),
  ]);

  // Use DB value if it exists and is non-empty, otherwise use i18n
  const headline = locale === "es"
    ? (headlineEs?.trim() || headlineEn?.trim() || null)
    : (headlineEn?.trim() || null);

  const subheadline = locale === "es"
    ? (subEs?.trim() || subEn?.trim() || null)
    : (subEn?.trim() || null);

  const ctaText = locale === "es"
    ? (ctaEs?.trim() || ctaEn?.trim() || null)
    : (ctaEn?.trim() || null);

  return (
    <Section bg="gradient" spacing="hero" className="relative overflow-hidden">
      {/* Background decorations */}
      <InteractiveGrid />
      <GradientOrb color="primary" size="lg" className="top-[-10%] left-[-10%]" />
      <GradientOrb color="accent" size="md" className="bottom-[10%] right-[-5%]" />

      <Container className="relative z-10">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          {/* Left column */}
          <AnimatedSection direction="left" className="text-center lg:text-left">
            {/* Eyebrow badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 mb-6">
              <span className="text-xs font-medium text-white/70">
                {t("eyebrow")}
              </span>
            </div>

            <Heading as="h1" size="h1" className="text-white mb-6">
              {headline || (
                <>
                  {t("headline.line1")}{" "}
                  <GradientText>{t("headline.highlight")}</GradientText>
                </>
              )}
            </Heading>

            <p className="mx-auto lg:mx-0 max-w-lg text-lg md:text-xl text-white/70 mb-8">
              {subheadline || t("subheadline")}
            </p>

            <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4 mb-8">
              <Link href="/pricing">
                <Button variant="primary" size="lg">
                  {ctaText || t("cta1")}
                </Button>
              </Link>
            </div>

            {/* Social proof strip */}
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
              {/* Avatar circles */}
              <div className="flex -space-x-2">
                {["J", "C", "M", "A"].map((initial, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full border-2 border-navy bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[10px] font-bold text-white"
                  >
                    {initial}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 text-sm text-white/80">
                <span>{t("socialProof.members")}</span>
                <span className="text-white/30">|</span>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-warning text-warning" />
                  ))}
                  <span className="ml-1">{t("socialProof.rating")}</span>
                </div>
              </div>
            </div>
          </AnimatedSection>

          {/* Right column */}
          <AnimatedSection direction="right" delay={0.3}>
            <HeroVisual />
          </AnimatedSection>
        </div>
      </Container>
    </Section>
  );
}
