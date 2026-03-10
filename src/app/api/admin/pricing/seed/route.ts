import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { pricingPlans } from "@/db/schema";
import { randomUUID } from "crypto";

// POST - Seed default pricing plans (only if table is empty)
export async function POST() {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const existing = await db.select().from(pricingPlans);
  if (existing.length > 0) {
    return NextResponse.json({ message: "Plans already exist", count: existing.length });
  }

  const defaults = [
    {
      id: randomUUID(),
      key: "free",
      nameEn: "Free",
      nameEs: "Gratis",
      descriptionEn: "Get started with free picks and analysis",
      descriptionEs: "Comienza con picks y análisis gratuitos",
      price: 0,
      currency: "USD",
      interval: "forever" as const,
      ctaEn: "Join Free",
      ctaEs: "Unirse Gratis",
      featuresEn: JSON.stringify([
        "Occasional free picks",
        "Sport analysis newsletter",
        "Free community access",
        "Basic performance stats",
      ]),
      featuresEs: JSON.stringify([
        "Picks gratuitos ocasionales",
        "Newsletter de análisis deportivo",
        "Acceso gratuito a la comunidad",
        "Estadísticas básicas de rendimiento",
      ]),
      stripePriceId: null,
      trialDays: 0,
      isPopular: false,
      badgeEn: null,
      badgeEs: null,
      isActive: true,
      isFree: true,
      displayOrder: 0,
    },
    {
      id: randomUUID(),
      key: "vip_weekly",
      nameEn: "VIP Weekly",
      nameEs: "VIP Semanal",
      descriptionEn: "Full access for casual bettors",
      descriptionEs: "Acceso completo para apostadores casuales",
      price: 45,
      currency: "USD",
      interval: "week" as const,
      ctaEn: "Start Free Trial",
      ctaEs: "Comenzar Prueba Gratis",
      featuresEn: JSON.stringify([
        "2-4 daily VIP picks",
        "All sports covered",
        "In-depth analysis (EN/ES)",
        "Mobile App + Dashboard access",
        "7-day free trial",
      ]),
      featuresEs: JSON.stringify([
        "2-4 picks VIP diarios",
        "Todos los deportes cubiertos",
        "Análisis detallado (EN/ES)",
        "App Móvil + acceso al Dashboard",
        "7 días de prueba gratis",
      ]),
      stripePriceId: process.env.STRIPE_VIP_WEEKLY_PRICE_ID || null,
      trialDays: 7,
      isPopular: false,
      badgeEn: null,
      badgeEs: null,
      isActive: true,
      isFree: false,
      displayOrder: 1,
    },
    {
      id: randomUUID(),
      key: "vip_monthly",
      nameEn: "VIP Monthly",
      nameEs: "VIP Mensual",
      descriptionEn: "Best value for serious bettors",
      descriptionEs: "Mejor valor para apostadores serios",
      price: 120,
      currency: "USD",
      interval: "month" as const,
      ctaEn: "Start Free Trial",
      ctaEs: "Comenzar Prueba Gratis",
      featuresEn: JSON.stringify([
        "Everything in Weekly",
        "Performance dashboard",
        "Pick history & filters",
        "Priority support",
        "Best value — save 33%",
        "7-day free trial",
      ]),
      featuresEs: JSON.stringify([
        "Todo lo del plan Semanal",
        "Dashboard de rendimiento",
        "Historial de picks y filtros",
        "Soporte prioritario",
        "Mejor valor — ahorra 33%",
        "7 días de prueba gratis",
      ]),
      stripePriceId: process.env.STRIPE_VIP_MONTHLY_PRICE_ID || null,
      trialDays: 7,
      isPopular: true,
      badgeEn: "Most Popular",
      badgeEs: "Más Popular",
      isActive: true,
      isFree: false,
      displayOrder: 2,
    },
  ];

  for (const plan of defaults) {
    await db.insert(pricingPlans).values(plan);
  }

  return NextResponse.json({ message: "Seeded default plans", count: defaults.length });
}
