/**
 * One-time script: Generate referral codes for existing users who don't have one.
 *
 * Run with: npx tsx scripts/backfill-referral-codes.ts
 */

import { db } from "../src/db";
import { users } from "../src/db/schema";
import { eq, isNull, or } from "drizzle-orm";
import { randomBytes } from "crypto";

function generateReferralCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

async function main() {
  const usersWithoutCodes = await db
    .select({ id: users.id, email: users.email, referralCode: users.referralCode })
    .from(users)
    .where(or(isNull(users.referralCode), eq(users.referralCode, "")));

  console.log(`Found ${usersWithoutCodes.length} users without referral codes`);

  let updated = 0;
  for (const user of usersWithoutCodes) {
    let attempts = 0;
    while (attempts < 5) {
      const code = generateReferralCode();
      try {
        await db.update(users)
          .set({ referralCode: code })
          .where(eq(users.id, user.id));
        console.log(`  ${user.email}: ${code}`);
        updated++;
        break;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("UNIQUE") && attempts < 4) {
          attempts++;
          continue;
        }
        console.error(`  Failed for ${user.email}:`, msg);
        break;
      }
    }
  }

  console.log(`\nDone. Updated ${updated}/${usersWithoutCodes.length} users.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
