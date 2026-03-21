import type { ReactNode } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminThemeProvider } from "@/components/admin/dark-mode-provider";

type Props = {
  children: ReactNode;
};

export default async function AdminLayout({ children }: Props) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/admin-login");
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user || user.role !== "admin") {
    redirect("/");
  }

  return (
    <AdminThemeProvider>
      <div className="min-h-screen bg-[#F8FAFC] text-foreground">
        <AdminSidebar />
        <div className="lg:pl-64 relative">
          <main className="p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </AdminThemeProvider>
  );
}
