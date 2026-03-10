import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

import { Section } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { Heading } from "@/components/ui/heading";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageHero } from "@/components/ui/page-hero";
import { JsonLd, breadcrumbJsonLd } from "@/components/seo/json-ld";
import { SITE_URL } from "@/lib/constants";
import {
  getOverallPerformance,
  getSportPerformance,
  getMonthlyPerformance,
} from "@/db/queries/performance";
import {
  overallPerformance as staticOverall,
  sportPerformance as staticSport,
  monthlyPerformance as staticMonthly,
} from "@/data/sample-performance";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "performance" });

  return {
    title: "Performance & Track Record",
    description: `${t("subtitle")} View our verified win rate, ROI, units won, and CLV tracking across all sports.`,
    alternates: {
      canonical: "/performance",
      languages: { en: "/en/performance", es: "/es/performance" },
    },
    openGraph: {
      title: "Performance & Track Record | WinFact Picks",
      description: t("subtitle"),
    },
  };
}

const UPPER_SPORTS = new Set(["mlb", "nfl", "nba", "nhl", "ncaa"]);

function formatSportName(scope: string): string {
  if (UPPER_SPORTS.has(scope)) return scope.toUpperCase();
  return scope.charAt(0).toUpperCase() + scope.slice(1);
}

function formatPeriod(period: string): string {
  const [year, month] = period.split("-");
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export default async function PerformancePage() {
  const t = await getTranslations("performance");

  const [overallResult, sportDataResult, monthlyResult] = await Promise.all([
    getOverallPerformance(),
    getSportPerformance(),
    getMonthlyPerformance(),
  ]);

  // Fall back to static data if DB returns null / empty
  const overallPerformance = overallResult ?? {
    wins: staticOverall.wins,
    losses: staticOverall.losses,
    pushes: staticOverall.pushes,
    unitsWon: staticOverall.unitsWon,
    roiPct: staticOverall.roi,
    clvAvg: staticOverall.avgClv,
  };

  const sportPerformance =
    sportDataResult.length > 0
      ? sportDataResult
      : staticSport.map((s) => ({
          scope: s.sport.toLowerCase(),
          wins: s.wins,
          losses: s.losses,
          pushes: s.pushes,
          unitsWon: s.unitsWon,
          roiPct: s.roi,
          clvAvg: s.avgClv,
        }));

  const monthlyPerformance =
    monthlyResult.length > 0
      ? monthlyResult
      : staticMonthly.map((m) => ({
          period: "", // static data already has formatted month
          wins: m.wins,
          losses: m.losses,
          unitsWon: m.unitsWon,
          roiPct: m.roi,
          _formattedMonth: m.month,
        }));

  const winRate = (
    (overallPerformance.wins /
      (overallPerformance.wins + overallPerformance.losses)) *
    100
  ).toFixed(1);

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: SITE_URL },
          { name: "Performance", url: `${SITE_URL}/performance` },
        ])}
      />
      <Header />

      <main>
        {/* Hero */}
        <PageHero>
          <Badge className="mb-4 bg-white/10 text-white border border-white/20">
            Track Record
          </Badge>
          <Heading as="h1" size="h1" className="text-white mb-4">
            {t("title")}
          </Heading>
          <p className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto">
            {t("subtitle")}
          </p>
        </PageHero>

        {/* Overall Stats */}
        <Section bg="white">
          <Container>
            <div className="text-center mb-12">
              <Heading as="h2" className="text-navy mb-4">
                {t("overallTitle")}
              </Heading>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 max-w-5xl mx-auto">
              <Card className="text-center">
                <StatCard
                  value={overallPerformance.wins.toString()}
                  label={t("wins")}
                />
              </Card>
              <Card className="text-center">
                <StatCard
                  value={overallPerformance.losses.toString()}
                  label={t("losses")}
                />
              </Card>
              <Card className="text-center">
                <StatCard
                  value={overallPerformance.pushes.toString()}
                  label={t("pushes")}
                />
              </Card>
              <Card className="text-center">
                <StatCard value={`${winRate}%`} label={t("winRate")} />
              </Card>
              <Card className="text-center">
                <StatCard
                  value={`+${overallPerformance.unitsWon}`}
                  label={t("unitsWon")}
                />
              </Card>
              <Card className="text-center">
                <StatCard
                  value={`${overallPerformance.roiPct}%`}
                  label={t("roi")}
                />
              </Card>
            </div>

            <div className="text-center mt-6">
              <Badge confidence="top" className="text-sm px-4 py-1.5">
                {t("avgClv")}: +{overallPerformance.clvAvg}%
              </Badge>
            </div>
          </Container>
        </Section>

        {/* Sport Breakdown */}
        <Section bg="light">
          <Container>
            <div className="text-center mb-12">
              <Heading as="h2" className="text-navy mb-4">
                {t("bySport")}
              </Heading>
            </div>

            <div className="max-w-5xl mx-auto overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-4 px-4 font-semibold text-navy">
                      Sport
                    </th>
                    <th className="text-center py-4 px-4 font-semibold text-navy">
                      {t("wins")}
                    </th>
                    <th className="text-center py-4 px-4 font-semibold text-navy">
                      {t("losses")}
                    </th>
                    <th className="text-center py-4 px-4 font-semibold text-navy">
                      {t("pushes")}
                    </th>
                    <th className="text-center py-4 px-4 font-semibold text-navy">
                      {t("winRate")}
                    </th>
                    <th className="text-center py-4 px-4 font-semibold text-navy">
                      {t("unitsWon")}
                    </th>
                    <th className="text-center py-4 px-4 font-semibold text-navy">
                      {t("roi")}
                    </th>
                    <th className="text-center py-4 px-4 font-semibold text-navy">
                      {t("avgClv")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sportPerformance.map((sport, idx) => {
                    const sportWinRate = (
                      (sport.wins / (sport.wins + sport.losses)) *
                      100
                    ).toFixed(1);
                    return (
                      <tr
                        key={sport.scope}
                        className={`border-b border-gray-100 ${
                          idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                        }`}
                      >
                        <td className="py-3.5 px-4 font-semibold text-navy">
                          {formatSportName(sport.scope)}
                        </td>
                        <td className="py-3.5 px-4 text-center text-success font-medium">
                          {sport.wins}
                        </td>
                        <td className="py-3.5 px-4 text-center text-danger font-medium">
                          {sport.losses}
                        </td>
                        <td className="py-3.5 px-4 text-center text-gray-500">
                          {sport.pushes}
                        </td>
                        <td className="py-3.5 px-4 text-center font-medium">
                          {sportWinRate}%
                        </td>
                        <td className="py-3.5 px-4 text-center text-success font-mono font-medium">
                          +{sport.unitsWon}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-medium">
                          {sport.roiPct}%
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-primary font-medium">
                          +{sport.clvAvg}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Container>
        </Section>

        {/* Monthly Trend */}
        <Section bg="white">
          <Container>
            <div className="text-center mb-12">
              <Heading as="h2" className="text-navy mb-4">
                {t("monthlyTrend")}
              </Heading>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
              {monthlyPerformance.map((month) => {
                const isPositive = month.unitsWon > 0;
                const displayMonth =
                  "_formattedMonth" in month
                    ? (month as typeof month & { _formattedMonth: string })
                        ._formattedMonth
                    : formatPeriod(month.period);
                return (
                  <Card
                    key={month.period || displayMonth}
                    className="relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-heading font-bold text-navy">
                        {displayMonth}
                      </h3>
                      {isPositive ? (
                        <TrendingUp className="h-5 w-5 text-success" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-danger" />
                      )}
                    </div>

                    <div className="flex items-baseline gap-2 mb-3">
                      <span
                        className={`font-mono text-2xl font-bold ${
                          isPositive ? "text-success" : "text-danger"
                        }`}
                      >
                        {isPositive ? "+" : ""}
                        {month.unitsWon}u
                      </span>
                      <span className="text-sm text-gray-400">
                        ({month.roiPct}% ROI)
                      </span>
                    </div>

                    <Separator className="mb-3" />

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Record</span>
                      <span className="font-medium text-navy">
                        <span className="text-success">{month.wins}W</span>
                        {" - "}
                        <span className="text-danger">{month.losses}L</span>
                      </span>
                    </div>

                    {/* Visual bar indicator */}
                    <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-success rounded-full transition-all"
                        style={{
                          width: `${(month.wins / (month.wins + month.losses)) * 100}%`,
                        }}
                      />
                    </div>
                  </Card>
                );
              })}
            </div>
          </Container>
        </Section>

        {/* Disclaimer & CTA */}
        <Section bg="navy">
          <Container size="narrow">
            <div className="text-center">
              <p className="text-white/50 text-sm mb-8 leading-relaxed">
                {t("disclaimer")}
              </p>
              <Separator className="bg-white/10 mb-8" />
              <Heading as="h2" size="h3" className="text-white mb-4">
                Ready to Win With Data?
              </Heading>
              <p className="text-white/70 mb-8 text-lg">
                Join our VIP members and get access to every pick, every sport,
                every day.
              </p>
              <Link href="/pricing">
                <Button variant="primary" size="lg">
                  View Pricing Plans
                </Button>
              </Link>
            </div>
          </Container>
        </Section>
      </main>

      <Footer />
    </>
  );
}
