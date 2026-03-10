import { getTranslations } from "next-intl/server";
import { Section } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { AnimatedSection } from "@/components/ui/animated-section";
import { SportLogo } from "./sport-logo";

const SPORTS = [
  { key: "mlb", name: "MLB", image: "/images/sports/mlb.png" },
  { key: "nfl", name: "NFL", image: "/images/sports/nfl.png" },
  { key: "nba", name: "NBA", image: "/images/sports/nba.png" },
  { key: "nhl", name: "NHL", image: "/images/sports/nhl.png" },
  { key: "ncaa", name: "NCAA", subtitle: "College Basketball", image: "/images/sports/ncaaf.png" },
  { key: "soccer", name: "Soccer", subtitle: "MLS, EPL, La Liga, UCL", image: "/images/sports/soccer.png" },
  { key: "tennis", name: "Tennis", image: "/images/sports/tennis.png" },
] as const;

function SportCard({
  name,
  subtitle,
  image,
}: {
  name: string;
  subtitle?: string;
  image: string;
}) {
  return (
    <div className="group relative flex flex-col items-center justify-center rounded-xl border border-gray-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-xl hover:border-primary/30 hover:scale-105 hover:-translate-y-1 cursor-default w-[calc(50%-0.5rem)] sm:w-[calc(25%-0.75rem)]">
      <div className="flex items-center justify-center w-20 h-20 rounded-xl bg-gray-50 mb-4 overflow-hidden group-hover:bg-primary/5 transition-colors duration-300">
        <SportLogo src={image} name={name} />
      </div>

      <span className="font-heading text-sm font-bold text-navy uppercase tracking-wider">
        {name}
      </span>

      {subtitle && (
        <span className="text-[11px] text-gray-400 mt-1 text-center leading-tight">
          {subtitle}
        </span>
      )}
    </div>
  );
}

export async function SportsMarquee() {
  const t = await getTranslations("sportsMarquee");

  return (
    <Section bg="light" spacing="tight">
      <Container>
        <AnimatedSection>
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-gray-400 mb-8">
            {t("title")}
          </p>
        </AnimatedSection>

        <div className="flex flex-wrap justify-center gap-4 max-w-3xl mx-auto">
          {SPORTS.map((sport) => (
            <SportCard
              key={sport.key}
              name={sport.name}
              subtitle={"subtitle" in sport ? sport.subtitle : undefined}
              image={sport.image}
            />
          ))}
        </div>

        <div className="mt-8 section-divider-gradient mx-auto max-w-md" />
      </Container>
    </Section>
  );
}
