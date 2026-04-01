/**
 * Delete all blog posts from the database.
 *
 * Usage:
 *   npx tsx scripts/delete-all-posts.ts
 *
 * Required env vars: TURSO_DATABASE_URL, TURSO_AUTH_TOKEN
 */

import { createClient } from "@libsql/client";

const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_DATABASE_URL || !TURSO_AUTH_TOKEN) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN");
  process.exit(1);
}

const client = createClient({
  url: TURSO_DATABASE_URL,
  authToken: TURSO_AUTH_TOKEN,
});

async function main() {
  // Count posts first
  const countResult = await client.execute("SELECT COUNT(*) as count FROM posts");
  const count = countResult.rows[0]?.count ?? 0;
  console.log(`Found ${count} posts to delete`);

  if (Number(count) === 0) {
    console.log("No posts to delete.");
    return;
  }

  // Delete tags first (foreign key), then posts
  await client.execute("DELETE FROM post_tags");
  console.log("Deleted all post_tags");

  await client.execute("DELETE FROM posts");
  console.log("Deleted all posts");

  console.log("Done. All blog posts have been removed.");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
