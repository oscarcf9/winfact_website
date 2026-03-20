import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Gamepad2 } from "lucide-react";
import { MemberTodaysGames } from "@/components/dashboard/todays-games";

export default async function DashboardGamesPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1168D9]/10">
            <Gamepad2 className="h-5 w-5 text-[#1168D9]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0B1F3B]">
              Today&apos;s Games
            </h1>
            <p className="text-sm text-gray-500">
              Live scores, odds & injury reports
            </p>
          </div>
        </div>
      </div>

      {/* Games */}
      <div className="animate-fade-up" style={{ animationDelay: "75ms" }}>
        <MemberTodaysGames />
      </div>
    </div>
  );
}
