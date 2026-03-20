# Wix Member Migration Guide

## Overview

This script migrates free (non-paying) Wix members to the WinFact Picks platform:
- Creates user accounts in **Clerk** (authentication)
- Creates matching records in **Turso** (database)
- Optionally adds users to **MailerLite** (email marketing)

## Prerequisites

- Node.js 18+
- `npx tsx` available (install globally: `npm i -g tsx`)
- Environment variables set (see below)

## Step 1: Export Members from Wix

1. Go to your Wix dashboard → **Contacts** → **Site Members**
2. Select all members (or filter for non-paying only)
3. Click **Export** → **CSV**
4. The exported file will contain various columns

## Step 2: Format the CSV

The migration script expects these columns:

```
email,first_name,last_name,created_date
```

Use `scripts/wix-members-template.csv` as a reference.

If your Wix export has different column names, rename them:
- `loginEmail` or `Email` → `email`
- `First Name` → `first_name`
- `Last Name` → `last_name`
- `Creation Date` or `Signup Date` → `created_date`

Save the cleaned file (e.g., `scripts/wix-members.csv`).

## Step 3: Set Environment Variables

Create a `.env` file in the project root (or export them in your shell):

```bash
# Required
CLERK_SECRET_KEY=sk_live_xxx        # From Clerk Dashboard → API Keys
TURSO_DATABASE_URL=libsql://xxx     # From your .env.local
TURSO_AUTH_TOKEN=xxx                # From your .env.local

# Optional
MAILERLITE_API_KEY=xxx              # To add users to MailerLite
NEXT_PUBLIC_SITE_URL=https://winfactpicks.com
```

## Step 4: Run the Migration

```bash
# Load env vars and run
npx tsx scripts/migrate-wix-users.ts scripts/wix-members.csv
```

The script will output progress for each user:
```
[2] CREATED — john@example.com (Clerk ID: user_2abc...)
[3] EXISTS — maria@example.com (Clerk ID: user_2def...)
[4] ERROR — bad@email (details...)
```

## Step 5: Verify

After migration, verify:

1. **Clerk Dashboard**: Check that users appear in your Clerk user list
2. **Database**: Run a query to confirm user records exist in the `users` table
3. **Sign-in test**: Try signing in as a migrated user using "Forgot Password"

## How Users Set Their Password

Migrated users are created **without a password**. On first visit:

1. User goes to the sign-in page
2. Clicks **"Forgot Password"**
3. Enters their email
4. Receives a password reset link
5. Sets their password and logs in

## Handling Duplicates

- If a user already exists in Clerk (same email), the script **skips** creation
- It still ensures the Turso database record exists (`INSERT OR IGNORE`)
- The script is safe to run multiple times

## Rate Limits

- The script waits 200ms between Clerk API calls to avoid rate limiting
- For large imports (1000+ users), consider running in batches
