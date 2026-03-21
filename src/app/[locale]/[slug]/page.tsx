import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

import { Section } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { Heading } from "@/components/ui/heading";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { Accordion, AccordionItem } from "@/components/ui/accordion";
import { PageHero } from "@/components/ui/page-hero";
import { JsonLd, faqPageJsonLd, breadcrumbJsonLd } from "@/components/seo/json-ld";
import { getSportPerformanceByKey } from "@/db/queries/performance";
import { getRecentSettledBySport } from "@/db/queries/picks";
import { sportPerformance } from "@/data/sample-performance";
import { SITE_URL } from "@/lib/constants";

const SPORT_PAGES: Record<string, string> = {
  "mlb-picks": "mlb",
  "nfl-picks": "nfl",
  "nba-picks": "nba",
  "nhl-picks": "nhl",
  "soccer-picks": "soccer",
  "ncaa-picks": "ncaa",
};

const SPORT_DB_NAME: Record<string, string> = {
  mlb: "MLB",
  nfl: "NFL",
  nba: "NBA",
  nhl: "NHL",
  soccer: "Soccer",
  ncaa: "NCAA",
};

export function generateStaticParams() {
  return Object.keys(SPORT_PAGES).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;

  const sportKey = SPORT_PAGES[slug];
  if (!sportKey) return {};

  const t = await getTranslations({ locale, namespace: "sports" });

  const title = `${t(`${sportKey}.title`)} Today`;
  const description = t(`${sportKey}.description`);

  return {
    title,
    description,
    alternates: {
      canonical: `/${slug}`,
      languages: { en: `/en/${slug}`, es: `/es/${slug}` },
    },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/${locale}/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

const SPORT_FAQS: Record<
  string,
  { question: string; answer: string }[]
> = {
  mlb: [
    {
      question: "How does WinFact generate MLB picks?",
      answer:
        "Our MLB model analyzes pitching matchups, bullpen usage, park factors, platoon splits, and real-time line movement across 20+ data sources to identify positive expected value bets.",
    },
    {
      question: "What bet types do you cover for MLB?",
      answer:
        "We cover moneylines, run lines, totals (over/under), and first-five-inning bets. Our model is especially strong on totals and F5 lines where pitching data provides a significant edge.",
    },
    {
      question: "When are MLB picks released?",
      answer:
        "MLB picks are typically released by 12 PM EST to give you time to shop for the best lines before first pitch. Additional picks may be released in the afternoon for evening games.",
    },
  ],
  nfl: [
    {
      question: "How does WinFact generate NFL picks?",
      answer:
        "Our NFL model evaluates injury reports, DVOA metrics, weather conditions, situational spots, and sharp money movements to find edges against the spread and on totals.",
    },
    {
      question: "Do you cover NFL player props?",
      answer:
        "Our primary focus is on sides, totals, and teasers where our model has the strongest track record. We occasionally include high-confidence player prop recommendations when significant edges are detected.",
    },
    {
      question: "When are NFL picks released?",
      answer:
        "NFL picks are released by Thursday for TNF, with the full Sunday slate available by Saturday morning. We provide updates if any significant injury news impacts our picks.",
    },
  ],
  nba: [
    {
      question: "How does WinFact generate NBA picks?",
      answer:
        "Our NBA model factors in rest advantages, pace-of-play matchups, travel schedules, rotation changes, and real-time line movement to identify value on the spread and totals.",
    },
    {
      question: "How do you handle NBA load management?",
      answer:
        "We monitor injury reports and lineup confirmations throughout the day. If a key player is ruled out after a pick is released, we re-evaluate and notify members with an updated recommendation.",
    },
    {
      question: "What NBA bet types do you focus on?",
      answer:
        "We primarily focus on spreads and totals, with occasional moneyline value plays on underdogs. Our model excels at identifying rest-advantage spots and back-to-back scheduling edges.",
    },
  ],
  nhl: [
    {
      question: "How does WinFact generate NHL picks?",
      answer:
        "Our NHL model analyzes expected goals (xG), high-danger scoring chances, goaltender save percentages, back-to-back fatigue, and line movement to identify value on puck lines and totals.",
    },
    {
      question: "How important is the starting goalie?",
      answer:
        "Goaltender confirmation is critical for our NHL model. We wait for confirmed starters before finalizing picks and will update members if there is a late goalie change.",
    },
    {
      question: "What NHL markets do you bet?",
      answer:
        "We focus on moneylines, puck lines, and totals. Our model is particularly effective at identifying value in totals markets where expected goals data provides a strong analytical edge.",
    },
  ],
  soccer: [
    {
      question: "Which soccer leagues does WinFact cover?",
      answer:
        "We cover MLS, English Premier League (EPL), La Liga, and UEFA Champions League. Coverage expands during major tournaments such as the World Cup and European Championship.",
    },
    {
      question: "How does your soccer model work?",
      answer:
        "Our model uses expected goals (xG), possession metrics, defensive pressure data, and market analysis to project match outcomes and identify value on match result, both teams to score, and totals markets.",
    },
    {
      question: "When are soccer picks released?",
      answer:
        "Soccer picks are released the morning of match day, typically by 10 AM EST for afternoon fixtures. For Champions League midweek matches, picks go out by noon the day of the match.",
    },
  ],
  ncaa: [
    {
      question: "How does WinFact generate NCAA picks?",
      answer:
        "Our NCAA model leverages efficiency ratings (KenPom for basketball, SP+ for football), transfer portal impact analysis, scheduling factors, and market inefficiencies common in college sports.",
    },
    {
      question: "Why is there more value in college sports?",
      answer:
        "College sports markets are less efficient than professional leagues due to the large number of teams, lower betting limits, and less sharp money. Our model exploits these inefficiencies consistently.",
    },
    {
      question: "Do you cover both college football and basketball?",
      answer:
        "Yes, we cover both NCAAF and NCAAB. Football coverage runs September through January (bowls), and basketball coverage runs November through April (March Madness).",
    },
  ],
};

export default async function SportPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;

  const sportKey = SPORT_PAGES[slug];
  if (!sportKey) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: "sports" });
  const tPage = await getTranslations({ locale, namespace: "sportPage" });
  const tPerf = await getTranslations({ locale, namespace: "performance" });

  const sportName = t(`${sportKey}.name`);
  const sportTitle = t(`${sportKey}.title`);
  const sportDescription = t(`${sportKey}.description`);
  const sportSeason = t(`${sportKey}.season`);

  // Fetch from DB, fall back to static data
  const dbPerformance = await getSportPerformanceByKey(sportKey);
  const staticPerformance = sportPerformance.find(
    (p) => p.sport.toLowerCase() === sportKey.toLowerCase()
  );

  const performance = dbPerformance
    ? {
        wins: dbPerformance.wins,
        losses: dbPerformance.losses,
        pushes: dbPerformance.pushes,
        unitsWon: dbPerformance.unitsWon,
        roi: dbPerformance.roiPct,
        avgClv: dbPerformance.clvAvg,
      }
    : staticPerformance
      ? {
          wins: staticPerformance.wins,
          losses: staticPerformance.losses,
          pushes: staticPerformance.pushes,
          unitsWon: staticPerformance.unitsWon,
          roi: staticPerformance.roi,
          avgClv: staticPerformance.avgClv,
        }
      : null;

  // Fetch recent settled picks for this sport
  const sportDbName = SPORT_DB_NAME[sportKey] ?? sportKey;
  let recentPicks: Awaited<ReturnType<typeof getRecentSettledBySport>> = [];
  try {
    recentPicks = await getRecentSettledBySport(sportDbName, 5);
  } catch {
    // DB unavailable — leave recentPicks empty
  }

  const winRate = performance
    ? ((performance.wins / (performance.wins + performance.losses)) * 100).toFixed(1)
    : "0";

  const faqs = SPORT_FAQS[sportKey] || [];

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: SITE_URL },
          { name: sportTitle, url: `${SITE_URL}/${locale}/${slug}` },
        ])}
      />
      {faqs.length > 0 && <JsonLd data={faqPageJsonLd(faqs)} />}

      <Header />

      <main>
        {/* Hero Section */}
        <PageHero>
          <Badge tier="vip" className="mb-4">
            {sportSeason}
          </Badge>
          <Heading as="h1" size="h1" className="mb-4">
            {sportTitle}
          </Heading>
          <p className="text-lg md:text-xl text-white/80 mb-2">
            {tPage("heroSubtitle")}
          </p>
          <p className="text-base text-white/70 max-w-2xl mx-auto mb-8">
            {sportDescription}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/pricing">
              <Button variant="primary" size="lg">
                {tPage("ctaButton")}
              </Button>
            </Link>
            <Link href="/blog">
              <Button variant="outline" size="lg" className="border-white/30 text-white hover:bg-white/10 hover:text-white">
                Free Picks &amp; Blog
              </Button>
            </Link>
          </div>
        </PageHero>

        {/* Season Performance Section */}
        {performance && (
          <Section bg="light">
            <Container>
              <div className="text-center mb-12">
                <Heading as="h2" size="h2" className="mb-3">
                  {tPage("performanceTitle")}
                </Heading>
                <p className="text-gray-600">
                  {sportName} {tPerf("title").toLowerCase()} — verified and tracked
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                <Card className="text-center">
                  <StatCard
                    value={String(performance.wins)}
                    label={tPerf("wins")}
                  />
                </Card>
                <Card className="text-center">
                  <StatCard
                    value={String(performance.losses)}
                    label={tPerf("losses")}
                  />
                </Card>
                <Card className="text-center">
                  <StatCard
                    value={String(performance.pushes)}
                    label={tPerf("pushes")}
                  />
                </Card>
                <Card className="text-center">
                  <StatCard
                    value={`${winRate}%`}
                    label={tPerf("winRate")}
                  />
                </Card>
                <Card className="text-center">
                  <StatCard
                    value={`+${performance.unitsWon}`}
                    label={tPerf("unitsWon")}
                  />
                </Card>
                <Card className="text-center">
                  <StatCard
                    value={`${performance.roi}%`}
                    label={tPerf("roi")}
                  />
                </Card>
              </div>
              <p className="text-center text-sm text-gray-500 mt-6">
                {tPerf("disclaimer")}
              </p>
            </Container>
          </Section>
        )}

        {/* Recent Results Section */}
        {recentPicks.length > 0 && (
          <Section>
            <Container>
              <div className="text-center mb-12">
                <Heading as="h2" size="h2" className="mb-3">
                  Recent Results
                </Heading>
                <p className="text-gray-600">
                  Last {recentPicks.length} settled {sportName} picks
                </p>
              </div>
              <div className="grid gap-4 max-w-3xl mx-auto">
                {recentPicks.map((pick) => (
                  <Card key={pick.id} className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {pick.matchup}
                        </p>
                        <p className="text-sm text-gray-600">
                          {pick.pickText}{" "}
                          {pick.odds != null && (
                            <span className="font-mono text-xs text-gray-500">
                              ({pick.odds > 0 ? `+${pick.odds}` : pick.odds})
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono text-sm">
                          {pick.units != null ? `${pick.units}u` : ""}
                        </span>
                        {pick.result === "win" && (
                          <Badge className="bg-green-100 text-green-800">
                            Win
                          </Badge>
                        )}
                        {pick.result === "loss" && (
                          <Badge className="bg-red-100 text-red-800">
                            Loss
                          </Badge>
                        )}
                        {pick.result === "push" && (
                          <Badge className="bg-yellow-100 text-yellow-800">
                            Push
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </Container>
          </Section>
        )}

        {/* Sample Pick Format Section */}
        <Section>
          <Container size="narrow">
            <div className="text-center mb-12">
              <Heading as="h2" size="h2" className="mb-3">
                {tPage("samplePick")}
              </Heading>
              <p className="text-gray-600">
                See what a VIP {sportName} pick looks like
              </p>
            </div>
            <Card variant="navy" className="max-w-lg mx-auto">
              <CardHeader>
                <div className="flex items-center justify-between mb-3">
                  <Badge tier="vip">VIP Pick</Badge>
                  <span className="text-xs text-white/50 font-mono">
                    March 9, 2026
                  </span>
                </div>
                <Heading as="h3" size="h4" className="text-white">
                  {sportName} — Game of the Day
                </Heading>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-white/10">
                    <span className="text-white/70 text-sm">Pick</span>
                    <span className="font-mono font-semibold text-accent">
                      Team A -3.5 (-110)
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/10">
                    <span className="text-white/70 text-sm">Confidence</span>
                    <Badge confidence="top">Top Play</Badge>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/10">
                    <span className="text-white/70 text-sm">Model Edge</span>
                    <span className="font-mono font-semibold text-accent">
                      +7.4%
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/10">
                    <span className="text-white/70 text-sm">Unit Size</span>
                    <span className="font-mono font-semibold text-white">
                      2u
                    </span>
                  </div>
                  <div className="pt-3">
                    <p className="text-sm text-white/60 leading-relaxed">
                      Our model identifies a strong edge based on pitching
                      matchup advantages, bullpen fatigue, and reverse line
                      movement confirming sharp action on this side.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Container>
        </Section>

        {/* FAQ Section */}
        {faqs.length > 0 && (
          <Section bg="light">
            <Container size="narrow">
              <div className="text-center mb-12">
                <Heading as="h2" size="h2" className="mb-3">
                  {tPage("faqTitle")}
                </Heading>
                <p className="text-gray-600">
                  Common questions about our {sportName} picks
                </p>
              </div>
              <Accordion>
                {faqs.map((faq, index) => (
                  <AccordionItem
                    key={index}
                    question={faq.question}
                    answer={faq.answer}
                    defaultOpen={index === 0}
                  />
                ))}
              </Accordion>
            </Container>
          </Section>
        )}

        {/* CTA Section */}
        <Section bg="gradient">
          <Container size="narrow" className="text-center">
            <Heading as="h2" size="h2" className="mb-4">
              {tPage("ctaTitle", { sport: sportName })}
            </Heading>
            <p className="text-white/80 text-lg mb-8">
              {tPage("ctaSubtitle", { sport: sportName })}
            </p>
            <Link href="/pricing">
              <Button variant="primary" size="lg">
                {tPage("ctaButton")}
              </Button>
            </Link>
          </Container>
        </Section>
      </main>

      <Footer />
    </>
  );
}
