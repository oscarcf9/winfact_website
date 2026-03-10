import { db } from "./index";
import { siteContent } from "./schema";
import { eq } from "drizzle-orm";

async function main() {
  // Read current
  const before = await db.select().from(siteContent).where(eq(siteContent.key, "announcement_bar_enabled"));
  console.log("Before:", before[0]?.value);

  // Toggle to false
  await db.update(siteContent).set({ value: "false" }).where(eq(siteContent.key, "announcement_bar_enabled"));

  // Verify
  const after = await db.select().from(siteContent).where(eq(siteContent.key, "announcement_bar_enabled"));
  console.log("After:", after[0]?.value);
}

main().catch(console.error);
