/**
 * WinFact Picks — Wix Member Migration Script
 *
 * Migrates free (non-paying) Wix members to Clerk + Turso.
 *
 * Usage:
 *   npx tsx scripts/migrate-wix-users.ts path/to/members.csv
 *
 * Required env vars:
 *   CLERK_SECRET_KEY, TURSO_DATABASE_URL, TURSO_AUTH_TOKEN
 *
 * Optional:
 *   MAILERLITE_API_KEY (for welcome emails)
 *   NEXT_PUBLIC_SITE_URL (for email links, defaults to https://winfactpicks.com)
 */

import { createReadStream } from "fs";
import { createInterface } from "readline";
import { createClient } from "@libsql/client";

// ─── Config ────────────────────────────────────────────────
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;
const MAILERLITE_API_KEY = process.env.MAILERLITE_API_KEY || "";
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://winfactpicks.com";

if (!CLERK_SECRET_KEY || !TURSO_DATABASE_URL || !TURSO_AUTH_TOKEN) {
  console.error(
    "Missing required env vars: CLERK_SECRET_KEY, TURSO_DATABASE_URL, TURSO_AUTH_TOKEN"
  );
  process.exit(1);
}

const csvPath = process.argv[2];
if (!csvPath) {
  console.error("Usage: npx tsx scripts/migrate-wix-users.ts <path-to-csv>");
  process.exit(1);
}

// ─── Turso client ──────────────────────────────────────────
const turso = createClient({
  url: TURSO_DATABASE_URL,
  authToken: TURSO_AUTH_TOKEN,
});

// ─── Helpers ───────────────────────────────────────────────
import { randomBytes } from "crypto";

function generateReferralCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

async function clerkCreateUser(
  email: string,
  firstName: string,
  lastName: string
): Promise<{ id: string; alreadyExists: boolean } | null> {
  // First check if user exists
  const searchRes = await fetch(
    `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}`,
    {
      headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}` },
    }
  );
  const existing = await searchRes.json();

  if (Array.isArray(existing) && existing.length > 0) {
    return { id: existing[0].id, alreadyExists: true };
  }

  // Create user without password — they'll set one via reset flow
  const createRes = await fetch("https://api.clerk.com/v1/users", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CLERK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email_address: [email],
      first_name: firstName || undefined,
      last_name: lastName || undefined,
      skip_password_requirement: true,
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json();
    throw new Error(
      `Clerk create failed for ${email}: ${JSON.stringify(err.errors || err)}`
    );
  }

  const user = await createRes.json();
  return { id: user.id, alreadyExists: false };
}

async function insertTursoUser(
  clerkId: string,
  email: string,
  name: string | null
): Promise<void> {
  const referralCode = generateReferralCode();
  const now = new Date().toISOString();

  await turso.execute({
    sql: `INSERT OR IGNORE INTO users (id, email, name, role, language, referral_code, created_at, updated_at)
          VALUES (?, ?, ?, 'member', 'en', ?, ?, ?)`,
    args: [clerkId, email, name, referralCode, now, now],
  });
}

async function sendWelcomeEmail(
  email: string,
  firstName: string
): Promise<void> {
  if (!MAILERLITE_API_KEY) return;

  try {
    // Ensure subscriber exists in MailerLite
    await fetch("https://connect.mailerlite.com/api/subscribers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MAILERLITE_API_KEY}`,
      },
      body: JSON.stringify({
        email,
        fields: { name: firstName },
        status: "active",
      }),
    });

    // Send transactional-style welcome via campaign to single subscriber
    // For simplicity, we just ensure they're added to MailerLite.
    // The actual welcome email can be handled by MailerLite automation.
  } catch (err) {
    console.warn(`  [WARN] MailerLite subscriber add failed for ${email}:`, err);
  }
}

// ─── CSV Parsing ───────────────────────────────────────────
type WixMember = {
  email: string;
  first_name: string;
  last_name: string;
  created_date: string;
};

function parseCsvLine(line: string, headers: string[]): WixMember | null {
  // Simple CSV parser — handles basic comma separation
  const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
  if (values.length < headers.length) return null;

  const obj: Record<string, string> = {};
  headers.forEach((h, i) => {
    obj[h] = values[i] || "";
  });

  if (!obj.email || !obj.email.includes("@")) return null;

  return {
    email: obj.email.toLowerCase().trim(),
    first_name: obj.first_name || "",
    last_name: obj.last_name || "",
    created_date: obj.created_date || "",
  };
}

// ─── Main ──────────────────────────────────────────────────
async function main() {
  console.log("=".repeat(60));
  console.log("WinFact Picks — Wix Member Migration");
  console.log("=".repeat(60));
  console.log(`CSV file:  ${csvPath}`);
  console.log(`Site URL:  ${SITE_URL}`);
  console.log(`MailerLite: ${MAILERLITE_API_KEY ? "Configured" : "Not configured (skipping emails)"}`);
  console.log("");

  const rl = createInterface({
    input: createReadStream(csvPath, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  });

  let headers: string[] = [];
  let lineNum = 0;
  let created = 0;
  let skipped = 0;
  let errors = 0;

  for await (const line of rl) {
    lineNum++;

    // Skip empty lines
    if (!line.trim()) continue;

    // First line = headers
    if (lineNum === 1) {
      headers = line
        .toLowerCase()
        .split(",")
        .map((h) => h.trim().replace(/^"|"$/g, ""));
      console.log(`Headers: ${headers.join(", ")}`);
      console.log("");
      continue;
    }

    const member = parseCsvLine(line, headers);
    if (!member) {
      console.log(`[${lineNum}] SKIP — invalid line: ${line.substring(0, 60)}`);
      skipped++;
      continue;
    }

    try {
      // 1. Create in Clerk
      const result = await clerkCreateUser(
        member.email,
        member.first_name,
        member.last_name
      );

      if (!result) {
        console.log(`[${lineNum}] ERROR — Clerk returned null for ${member.email}`);
        errors++;
        continue;
      }

      if (result.alreadyExists) {
        console.log(`[${lineNum}] EXISTS — ${member.email} (Clerk ID: ${result.id})`);
        // Still ensure DB record exists
        const name = [member.first_name, member.last_name]
          .filter(Boolean)
          .join(" ") || null;
        await insertTursoUser(result.id, member.email, name);
        skipped++;
        continue;
      }

      // 2. Insert into Turso DB
      const name = [member.first_name, member.last_name]
        .filter(Boolean)
        .join(" ") || null;
      await insertTursoUser(result.id, member.email, name);

      // 3. Add to MailerLite (welcome email via automation)
      await sendWelcomeEmail(member.email, member.first_name);

      console.log(`[${lineNum}] CREATED — ${member.email} (Clerk ID: ${result.id})`);
      created++;

      // Rate limiting — Clerk has limits, wait 200ms between creates
      await new Promise((r) => setTimeout(r, 200));
    } catch (err) {
      console.error(`[${lineNum}] ERROR — ${member.email}:`, err);
      errors++;
    }
  }

  console.log("");
  console.log("=".repeat(60));
  console.log("Migration Complete");
  console.log("=".repeat(60));
  console.log(`  Created: ${created}`);
  console.log(`  Skipped: ${skipped} (already existed or invalid)`);
  console.log(`  Errors:  ${errors}`);
  console.log(`  Total:   ${lineNum - 1} rows processed`);
  console.log("");
  console.log(
    "NEXT STEP: Users will need to set a password on first login."
  );
  console.log(
    'They can use the "Forgot Password" flow at the sign-in page.'
  );

  await turso.close();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
