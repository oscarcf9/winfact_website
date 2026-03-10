import { db } from "./index";
import { siteContent } from "./schema";
import { eq } from "drizzle-orm";

async function main() {
  // Re-enable the bar
  await db.update(siteContent).set({ value: "true" }).where(eq(siteContent.key, "announcement_bar_enabled"));

  // Set expiry to yesterday
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  await db.update(siteContent).set({ value: yesterday }).where(eq(siteContent.key, "announcement_bar_expires_at"));
  console.log("Set expires_at to:", yesterday);
}

main().catch(console.error);
