import { db } from "./index";
import { promoCodes, siteContent, users, subscriptions } from "./schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("=== Seeding test data ===\n");

  // 1. Insert test promo code TEST50
  console.log("--- Fix 1: Promo Code ---");
  try {
    await db.insert(promoCodes).values({
      id: "test-50-id",
      code: "TEST50",
      discountType: "percent",
      discountValue: 50,
      maxRedemptions: 100,
      currentRedemptions: 0,
      isActive: true,
    }).onConflictDoNothing();
    console.log("Inserted TEST50 promo code");
  } catch (e) {
    console.log("TEST50 already exists or error:", (e as Error).message);
  }

  const allPromos = await db.select().from(promoCodes);
  console.log(`Total promo codes in DB: ${allPromos.length}`);
  allPromos.forEach((p) => console.log(`  ${p.code} | ${p.discountType} ${p.discountValue} | active:${p.isActive} | redemptions:${p.currentRedemptions}/${p.maxRedemptions}`));

  // 2. Insert announcement bar content
  console.log("\n--- Fix 4: Announcement Bar Content ---");
  const announcementKeys = [
    { key: "announcement_bar_enabled", value: "true" },
    { key: "announcement_bar_text_en", value: "Use code PICK80 for 80% off your first month!" },
    { key: "announcement_bar_text_es", value: "¡Usa el código PICK80 para 80% de descuento en tu primer mes!" },
    { key: "announcement_bar_cta_en", value: "Claim Offer" },
    { key: "announcement_bar_cta_es", value: "Reclamar Oferta" },
    { key: "announcement_bar_link", value: "/pricing" },
    { key: "announcement_bar_style", value: "default" },
    { key: "announcement_bar_expires_at", value: "" },
    { key: "announcement_bar_promo_code", value: "PICK80" },
  ];

  for (const item of announcementKeys) {
    const existing = await db.select().from(siteContent).where(eq(siteContent.key, item.key)).limit(1);
    if (existing.length === 0) {
      await db.insert(siteContent).values(item);
      console.log(`  Inserted: ${item.key} = "${item.value.substring(0, 40)}..."`);
    } else {
      console.log(`  Exists: ${item.key} = "${existing[0].value.substring(0, 40)}..."`);
    }
  }

  // 3. Check users and subscriptions
  console.log("\n--- Fix 2: Subscribers ---");
  const allUsers = await db.select().from(users);
  console.log(`Total users: ${allUsers.length}`);
  allUsers.slice(0, 5).forEach((u) => console.log(`  ${u.email} | role:${u.role} | notes:${u.notes ? 'has notes' : 'none'}`));

  const allSubs = await db.select().from(subscriptions);
  console.log(`Total subscriptions: ${allSubs.length}`);
  allSubs.slice(0, 5).forEach((s) => console.log(`  ${s.userId} | ${s.tier} | ${s.status}`));

  // 4. Verify announcement API response
  console.log("\n--- Fix 4: Announcement Bar API ---");
  const contentRows = await db.select().from(siteContent);
  console.log(`Total site_content rows: ${contentRows.length}`);
  contentRows.forEach((c) => console.log(`  ${c.key} = "${c.value.substring(0, 50)}"`));

  console.log("\n=== Seed complete ===");
}

main().catch((e) => console.error("Seed error:", e));
