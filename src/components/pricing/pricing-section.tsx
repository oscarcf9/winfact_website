"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Check, Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Heading } from "@/components/ui/heading";
import { AnimatedSection } from "@/components/ui/animated-section";
import { Section } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { PromoCodeInput } from "@/app/[locale]/pricing/promo-code-input";
import { CheckoutButton } from "./checkout-button";

type PlanData = {
  id: string;
  key: string;
  nameEn: string;
  nameEs: string;
  descriptionEn: string;
  descriptionEs: string;
  price: number;
  currency: string;
  interval: string;
  ctaEn: string;
  ctaEs: string;
  featuresEn: string[];
  featuresEs: string[];
  trialDays: number;
  isPopular: boolean;
  badgeEn: string | null;
  badgeEs: string | null;
  isFree: boolean;
};

const intervalLabels: Record<string, Record<string, string>> = {
  en: { forever: "forever", week: "/week", month: "/month", year: "/year" },
  es: { forever: "siempre", week: "/semana", month: "/mes", year: "/año" },
};

export function PricingSection() {
  const t = useTranslations("pricing");
  const locale = useLocale();
  const [appliedPromo, setAppliedPromo] = useState<string | undefined>();
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [loading, setLoading] = useState(true);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    fetch("/api/pricing")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setPlans(data);
        } else {
          setUseFallback(true);
        }
      })
      .catch(() => setUseFallback(true))
      .finally(() => setLoading(false));
  }, []);

  // Fallback to translation-based rendering
  if (useFallback) {
    return <FallbackPricingSection appliedPromo={appliedPromo} setAppliedPromo={setAppliedPromo} />;
  }

  if (loading) {
    return (
      <Section bg="light">
        <Container>
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </Container>
      </Section>
    );
  }

  const isEs = locale === "es";

  return (
    <>
      <Section bg="light">
        <Container>
          <AnimatedSection direction="up">
            <div className={`grid gap-8 max-w-5xl mx-auto ${
              plans.length === 1 ? "md:grid-cols-1 max-w-md" :
              plans.length === 2 ? "md:grid-cols-2 max-w-3xl" :
              plans.length >= 3 ? "md:grid-cols-3" : ""
            }`}>
              {plans.map((plan) => (
                <Card
                  key={plan.id}
                  className={`flex flex-col relative ${
                    plan.isPopular
                      ? "border-2 border-primary shadow-xl scale-100 md:scale-[1.04]"
                      : ""
                  }`}
                >
                  {plan.isPopular && (plan.badgeEn || plan.badgeEs) && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white px-4 py-1 text-xs">
                      {isEs ? plan.badgeEs : plan.badgeEn}
                    </Badge>
                  )}

                  <CardHeader>
                    <h3 className="font-heading font-bold text-xl text-navy">
                      {isEs ? plan.nameEs : plan.nameEn}
                    </h3>
                    <p className="text-gray-500 text-sm mt-1">
                      {isEs ? plan.descriptionEs : plan.descriptionEn}
                    </p>
                  </CardHeader>

                  <CardContent className="flex-1">
                    <div className="mb-6">
                      <span className="font-mono text-5xl font-bold text-navy">
                        ${plan.price}
                      </span>
                      <span className="text-gray-400 text-sm ml-1">
                        {intervalLabels[locale]?.[plan.interval] || `/${plan.interval}`}
                      </span>
                    </div>

                    <Separator className="mb-6" />

                    <ul className="space-y-3">
                      {(isEs ? plan.featuresEs : plan.featuresEn).map(
                        (feature: string, j: number) => (
                          <li
                            key={j}
                            className="flex items-start gap-2.5 text-sm text-gray-600"
                          >
                            <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                            {feature}
                          </li>
                        )
                      )}
                    </ul>
                  </CardContent>

                  <CardFooter>
                    {plan.isFree ? (
                      <Link href="/sign-up" className="w-full">
                        <Button variant="outline" size="lg" className="w-full">
                          {isEs ? plan.ctaEs : plan.ctaEn}
                        </Button>
                      </Link>
                    ) : (
                      <CheckoutButton
                        plan={plan.key}
                        label={isEs ? plan.ctaEs : plan.ctaEn}
                        variant={plan.isPopular ? "primary" : "outline"}
                        promoCode={appliedPromo}
                      />
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>

            <p className="text-center text-sm text-gray-400 mt-8">
              {t("guarantee")}
            </p>
          </AnimatedSection>
        </Container>
      </Section>

      {/* Promo Code Section */}
      <Section bg="white">
        <Container size="narrow">
          <AnimatedSection direction="up" delay={0.1}>
            <Card className="text-center p-8 md:p-12 border-2 border-dashed border-primary/30 bg-primary/5">
              <Heading as="h2" size="h4" className="text-navy mb-2">
                {t("promo")}
              </Heading>
              <p className="text-gray-500 text-sm mb-6">
                Enter your promo code below to unlock exclusive savings.
              </p>
              <PromoCodeInput
                placeholder={t("promoPlaceholder")}
                buttonLabel={t("promoApply")}
                onPromoApplied={(code) => setAppliedPromo(code)}
                onPromoCleared={() => setAppliedPromo(undefined)}
              />
              {appliedPromo && (
                <p className="text-xs text-primary mt-3">
                  Code {appliedPromo} will be applied to your checkout.
                </p>
              )}
            </Card>
          </AnimatedSection>
        </Container>
      </Section>
    </>
  );
}

/** Fallback that uses translation files (when DB has no plans) */
function FallbackPricingSection({
  appliedPromo,
  setAppliedPromo,
}: {
  appliedPromo: string | undefined;
  setAppliedPromo: (v: string | undefined) => void;
}) {
  const t = useTranslations("pricing");

  return (
    <>
      <Section bg="light">
        <Container>
          <AnimatedSection direction="up">
            <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
              {[0, 1, 2].map((i) => {
                const isPopular = i === 2;
                return (
                  <Card
                    key={i}
                    className={`flex flex-col relative ${
                      isPopular
                        ? "border-2 border-primary shadow-xl scale-100 md:scale-[1.04]"
                        : ""
                    }`}
                  >
                    {isPopular && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white px-4 py-1 text-xs">
                        {t(`tiers.${i}.badge`)}
                      </Badge>
                    )}

                    <CardHeader>
                      <h3 className="font-heading font-bold text-xl text-navy">
                        {t(`tiers.${i}.name`)}
                      </h3>
                      <p className="text-gray-500 text-sm mt-1">
                        {t(`tiers.${i}.description`)}
                      </p>
                    </CardHeader>

                    <CardContent className="flex-1">
                      <div className="mb-6">
                        <span className="font-mono text-5xl font-bold text-navy">
                          {t(`tiers.${i}.price`)}
                        </span>
                        <span className="text-gray-400 text-sm ml-1">
                          {t(`tiers.${i}.period`)}
                        </span>
                      </div>

                      <Separator className="mb-6" />

                      <ul className="space-y-3">
                        {(t.raw(`tiers.${i}.features`) as string[]).map(
                          (feature: string, j: number) => (
                            <li
                              key={j}
                              className="flex items-start gap-2.5 text-sm text-gray-600"
                            >
                              <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                              {feature}
                            </li>
                          )
                        )}
                      </ul>
                    </CardContent>

                    <CardFooter>
                      {i === 0 ? (
                        <Link href="/sign-up" className="w-full">
                          <Button variant="outline" size="lg" className="w-full">
                            {t(`tiers.${i}.cta`)}
                          </Button>
                        </Link>
                      ) : (
                        <CheckoutButton
                          plan={i === 1 ? "vip_weekly" : "vip_monthly"}
                          label={t(`tiers.${i}.cta`)}
                          variant={isPopular ? "primary" : "outline"}
                          promoCode={appliedPromo}
                        />
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>

            <p className="text-center text-sm text-gray-400 mt-8">
              {t("guarantee")}
            </p>
          </AnimatedSection>
        </Container>
      </Section>

      <Section bg="white">
        <Container size="narrow">
          <AnimatedSection direction="up" delay={0.1}>
            <Card className="text-center p-8 md:p-12 border-2 border-dashed border-primary/30 bg-primary/5">
              <Heading as="h2" size="h4" className="text-navy mb-2">
                {t("promo")}
              </Heading>
              <p className="text-gray-500 text-sm mb-6">
                Enter your promo code below to unlock exclusive savings.
              </p>
              <PromoCodeInput
                placeholder={t("promoPlaceholder")}
                buttonLabel={t("promoApply")}
                onPromoApplied={(code) => setAppliedPromo(code)}
                onPromoCleared={() => setAppliedPromo(undefined)}
              />
              {appliedPromo && (
                <p className="text-xs text-primary mt-3">
                  Code {appliedPromo} will be applied to your checkout.
                </p>
              )}
            </Card>
          </AnimatedSection>
        </Container>
      </Section>
    </>
  );
}
