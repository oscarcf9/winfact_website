import { getTranslations } from "next-intl/server";
import { Database, Brain, TrendingUp, Send } from "lucide-react";
import { Section } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { Heading } from "@/components/ui/heading";
import { Card } from "@/components/ui/card";
import { AnimatedSection } from "@/components/ui/animated-section";
import { AnimatedCard } from "@/components/ui/animated-card";
import { DotPattern } from "@/components/ui/background-patterns";

const STEPS = [
  { Icon: Database, color: "from-primary to-blue-600" },
  { Icon: Brain, color: "from-primary to-accent" },
  { Icon: TrendingUp, color: "from-accent to-emerald-400" },
  { Icon: Send, color: "from-primary to-violet-500" },
];

export async function HowItWorks() {
  const t = await getTranslations("howItWorks");

  return (
    <Section bg="white" className="relative overflow-hidden">
      <DotPattern className="opacity-40" />

      <Container className="relative z-10">
        <AnimatedSection className="text-center mb-14">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-3">
            {t("subtitle")}
          </p>
          <Heading as="h2" className="text-navy">
            {t("title")}
          </Heading>
        </AnimatedSection>

        {/* Progress connector line (desktop only) */}
        <div className="hidden lg:block absolute top-[58%] left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-primary/10 via-primary/30 to-primary/10 z-0" />

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 relative z-10">
          {STEPS.map(({ Icon, color }, i) => (
            <AnimatedCard key={i} index={i} hoverGlow>
              <Card className="text-center relative overflow-visible group">
                {/* Step number */}
                <div className={`absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-br ${color} text-white text-xs font-bold rounded-full w-8 h-8 flex items-center justify-center shadow-lg ring-4 ring-white`}>
                  {i + 1}
                </div>

                <div className="pt-4">
                  <div className={`mx-auto inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${color} bg-opacity-10 mb-5`}>
                    <div className="w-14 h-14 rounded-xl bg-white/90 flex items-center justify-center group-hover:bg-white/70 transition-colors">
                      <Icon className="h-7 w-7 text-primary" />
                    </div>
                  </div>

                  <h3 className="font-heading font-bold text-lg text-navy mb-2">
                    {t(`steps.${i}.title`)}
                  </h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    {t(`steps.${i}.description`)}
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
