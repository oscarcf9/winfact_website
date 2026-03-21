import type { ReactNode } from "react";
import type { Metadata } from "next";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { ReferralPostSignup } from "@/components/referral-capture";
import { PendingCheckout } from "@/components/dashboard/pending-checkout";
import { getActiveSubscription } from "@/db/queries/subscriptions";
import { isVipTier } from "@/lib/constants";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

type Props = {
  children: ReactNode;
};

export default async function DashboardLayout({ children }: Props) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Self-healing: ensure user exists in DB (covers edge case where
  // Clerk webhook was missed or user signed up before DB was set up)
  const [dbUser] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
  if (!dbUser) {
    const clerkUser = await currentUser();
    if (clerkUser) {
      await db.insert(users).values({
        id: userId,
        email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
        name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null,
        createdAt: new Date().toISOString(),
      }).onConflictDoNothing();
    }
  }

  const subscription = await getActiveSubscription(userId);
  const tier = subscription?.tier ?? "free";
  const isVip = isVipTier(tier);

  return (
    <div className="min-h-screen bg-gray-50">
      <ReferralPostSignup />
      <PendingCheckout />
      <DashboardSidebar isVip={isVip} tier={tier} />

      {/* Main content */}
      <div className="lg:pl-64 pb-20 lg:pb-0">
        <main className="p-4 sm:p-6 lg:p-8 max-w-6xl">
          {children}
        </main>
      </div>
    </div>
  );
}
