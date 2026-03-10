import { getTranslations } from "next-intl/server";
import { TrendingUp, Target, DollarSign, Layers, Send, Globe } from "lucide-react";
import { Section } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { Heading } from "@/components/ui/heading";
import { Card } from "@/components/ui/card";
import { AnimatedSection } from "@/components/ui/animated-section";
import { AnimatedCard } from "@/components/ui/animated-card";
import { GradientText } from "@/components/ui/gradient-text";

const FEATURES = [
  { Icon: TrendingUp, accent: "group-hover:from-primary group-hover:to-blue-600" },
  { Icon: Target, accent: "group-hover:from-primary group-hover:to-accent" },
  { Icon: DollarSign, accent: "group-hover:from-accent group-hover:to-emerald-400" },
  { Icon: Layers, accent: "group-hover:from-primary group-hover:to-violet-500" },
  { Icon: Send, accent: "group-hover:from-primary group-hover:to-blue-600" },
  { Icon: Globe, accent: "group-hover:from-accent group-hover:to-primary" },
];

export async function FeaturesGrid() {
  const t = await getTranslations("features");

  return (
    <Section bg="light" className="relative">
      <Container>
        <AnimatedSection className="text-center mb-14">
          <Heading as="h2" className="text-navy mb-4">
            <GradientText>{t("title")}</GradientText>
          </Heading>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            {t("subtitle")}
          </p>
        </AnimatedSection>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ Icon, accent }, i) => (
            <AnimatedCard key={i} index={i} hoverGlow>
              <Card className="group hover:border-primary/20 relative overflow-hidden">
                {/* Hover gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-accent/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />

                <div className="relative z-10">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 ${accent} text-primary group-hover:text-white mb-5 transition-all duration-300 shadow-sm`}>
                    <Icon className="h-6 w-6" />
                  </div>

                  <h3 className="font-heading font-bold text-lg text-navy mb-2">
                    {t(`items.${i}.title`)}
                  </h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    {t(`items.${i}.description`)}
                  </p>
                </div>
              </Card>
            </AnimatedCard>
          ))}
        </div>
      </Container>
    </Section>
  );
}
