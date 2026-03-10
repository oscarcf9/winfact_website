import type { ReactNode } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { getActiveSubscription } from "@/db/queries/subscriptions";

type Props = {
  children: ReactNode;
};

export default async function DashboardLayout({ children }: Props) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const subscription = await getActiveSubscription(userId);
  const tier = subscription?.tier ?? "free";
  const isVip = tier !== "free";

  return (
    <div className="min-h-screen bg-gray-50">
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
