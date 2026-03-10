import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Settings } from "lucide-react";
import { Heading } from "@/components/ui/heading";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
          <Settings className="h-5 w-5 text-primary" />
        </div>
        <div>
          <Heading as="h1" size="h3" className="text-navy">
            Settings
          </Heading>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage your profile, subscription, and preferences
          </p>
        </div>
      </div>

      <SettingsClient />
    </div>
  );
}
