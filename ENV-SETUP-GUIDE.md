# WinFact Picks — Environment & API Setup Guide

> **Last updated:** March 2026
> **Total services:** 10 external APIs
> **Total env vars:** 35

---

## Quick Start

```bash
# 1. Copy the template
cp .env.example .env.local

# 2. Fill in all REQUIRED values (see guide below)

# 3. Verify everything is set
bash scripts/check-env.sh

# 4. Push schema to database
npx drizzle-kit push

# 5. Run dev server
npm run dev
```

---

## Complete .env.local Template

```bash
# ══════════════════════════════════════════════════════════════
# WINFACT PICKS — ENVIRONMENT VARIABLES
# ══════════════════════════════════════════════════════════════
#
# Legend:
#   [REQUIRED]  — App will not work without this
#   [OPTIONAL]  — App works without it, but feature is disabled
#   [DEV-ONLY]  — Only needed for local development
#   [FRAMEWORK] — Used by Next.js/Clerk framework, not via process.env
#
# ⚠️ FOR PRODUCTION: Use LIVE keys (pk_live_, sk_live_), not test keys
# ══════════════════════════════════════════════════════════════


# ─── SITE ─────────────────────────────────────────────────────
# [REQUIRED] Your production domain (no trailing slash)
# Dev: http://localhost:3003   Prod: https://winfactpicks.com
NEXT_PUBLIC_SITE_URL=http://localhost:3003


# ─── DATABASE (Turso) ────────────────────────────────────────
# Get from: turso.tech → Dashboard → Your DB → "Connect" tab
# [REQUIRED]
TURSO_DATABASE_URL=libsql://your-db-name.turso.io
TURSO_AUTH_TOKEN=your-auth-token


# ─── AUTHENTICATION (Clerk) ──────────────────────────────────
# Get from: dashboard.clerk.com → API Keys
# [REQUIRED]
# ⚠️ Dev: pk_test_ / sk_test_    Prod: pk_live_ / sk_live_
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx

# Get from: dashboard.clerk.com → Webhooks → Your endpoint → Signing Secret
# [REQUIRED]
CLERK_WEBHOOK_SECRET=whsec_xxxxx

# [FRAMEWORK] — Used by Clerk SDK internally, not via process.env
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/


# ─── PAYMENTS (Stripe) ───────────────────────────────────────
# Get from: dashboard.stripe.com → Developers → API Keys
# [REQUIRED]
# ⚠️ Dev: pk_test_ / sk_test_    Prod: pk_live_ / sk_live_
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx

# Get from: dashboard.stripe.com → Developers → Webhooks → Your endpoint
# [REQUIRED]
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Get from: dashboard.stripe.com → Products → Your product → Price ID
# [REQUIRED] — Create these products in Stripe first (see setup guide below)
STRIPE_VIP_WEEKLY_PRICE_ID=price_xxxxx
STRIPE_VIP_MONTHLY_PRICE_ID=price_xxxxx


# ─── TELEGRAM BOT ────────────────────────────────────────────
# [REQUIRED] — Pick distribution + admin alerts
# Get bot token from: @BotFather on Telegram → /newbot
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz

# Get chat IDs from: https://api.telegram.org/bot<TOKEN>/getUpdates
# Send a message in each chat first, then check getUpdates for the chat_id
# Community group (negative number): where picks are posted
TELEGRAM_FREE_CHAT_ID=-1001234567890
# VIP group (if separate from community): full VIP pick details
TELEGRAM_VIP_CHAT_ID=-1009876543210
# Oscar's personal chat with the bot (positive number): admin alerts
TELEGRAM_ADMIN_CHAT_ID=123456789


# ─── EMAIL (MailerLite) ──────────────────────────────────────
# [REQUIRED for email features] — Pick distribution emails, welcome emails
# Get from: app.mailerlite.com → Integrations → API → Developer API
MAILERLITE_API_KEY=eyJ...your-api-key

# Create these groups in MailerLite → Subscribers → Groups
# Then copy each Group ID from the group settings
MAILERLITE_FREE_GROUP_ID=123456789
MAILERLITE_VIP_GROUP_ID=987654321

# [OPTIONAL] — Auto-created if not set
MAILERLITE_TRANSACTIONAL_GROUP_ID=

# [OPTIONAL] — Sender email for campaigns (default: picks@winfactpicks.com)
MAILERLITE_FROM_EMAIL=picks@winfactpicks.com


# ─── AI SERVICES ─────────────────────────────────────────────
# [REQUIRED for AI blog generation + AI Assistant]
# Get from: console.anthropic.com → API Keys
ANTHROPIC_API_KEY=sk-ant-xxxxx

# [OPTIONAL] — Used for AI-generated blog featured images (DALL-E)
# Get from: platform.openai.com → API Keys
OPENAI_API_KEY=sk-xxxxx


# ─── SPORTS DATA ─────────────────────────────────────────────
# [REQUIRED for live odds, line movements, sharp action detection]
# Get from: the-odds-api.com → Dashboard → API Key
# Free tier: 500 requests/month
ODDS_API_KEY=xxxxx

# ESPN API: No key needed — uses public endpoints for scores/schedules


# ─── MEDIA STORAGE (Cloudflare R2) ───────────────────────────
# [OPTIONAL] — For admin media gallery uploads
# Get from: dash.cloudflare.com → R2 → Manage R2 API Tokens
R2_ACCOUNT_ID=xxxxx
R2_ACCESS_KEY_ID=xxxxx
R2_SECRET_ACCESS_KEY=xxxxx
R2_BUCKET_NAME=winfact-media
R2_PUBLIC_URL=https://media.winfactpicks.com


# ─── SECURITY ────────────────────────────────────────────────
# [REQUIRED] — Protects cron endpoints from unauthorized access
# Generate: openssl rand -hex 32
CRON_SECRET=your-cron-secret-min-16-chars

# [REQUIRED] — Signs email unsubscribe links to prevent tampering
# Generate: openssl rand -hex 32
UNSUBSCRIBE_SECRET=your-unsubscribe-secret


# ─── ANALYTICS ───────────────────────────────────────────────
# [OPTIONAL] — Google Analytics 4
# Get from: analytics.google.com → Admin → Data Streams → Measurement ID
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX


# ─── DATABASE SEED (dev only) ────────────────────────────────
# [DEV-ONLY] — Used by scripts/seed.ts to set up initial admin user
SEED_ADMIN_USER_ID=user_xxxxx
SEED_ADMIN_EMAIL=oscar@example.com
```

---

## Vercel Production Environment Variables

Set ALL of these in **Vercel → Project → Settings → Environment Variables → Production**:

| Variable | Scope | Where to Get |
|----------|-------|-------------|
| `NEXT_PUBLIC_SITE_URL` | Production | Your domain: `https://winfactpicks.com` |
| `TURSO_DATABASE_URL` | Production | turso.tech → DB → Connect |
| `TURSO_AUTH_TOKEN` | Production | turso.tech → DB → Tokens |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Production | dashboard.clerk.com → API Keys (**pk_live_**) |
| `CLERK_SECRET_KEY` | Production | dashboard.clerk.com → API Keys (**sk_live_**) |
| `CLERK_WEBHOOK_SECRET` | Production | dashboard.clerk.com → Webhooks → Signing Secret |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | All | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | All | `/sign-up` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | All | `/` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | All | `/` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Production | dashboard.stripe.com → API Keys (**pk_live_**) |
| `STRIPE_SECRET_KEY` | Production | dashboard.stripe.com → API Keys (**sk_live_**) |
| `STRIPE_WEBHOOK_SECRET` | Production | dashboard.stripe.com → Webhooks → Signing Secret |
| `STRIPE_VIP_WEEKLY_PRICE_ID` | Production | Stripe Products → VIP Weekly → Price ID |
| `STRIPE_VIP_MONTHLY_PRICE_ID` | Production | Stripe Products → VIP Monthly → Price ID |
| `TELEGRAM_BOT_TOKEN` | Production | Same bot token as dev |
| `TELEGRAM_FREE_CHAT_ID` | Production | Same chat IDs as dev |
| `TELEGRAM_VIP_CHAT_ID` | Production | Same chat IDs as dev |
| `TELEGRAM_ADMIN_CHAT_ID` | Production | Your personal chat ID with the bot |
| `MAILERLITE_API_KEY` | Production | app.mailerlite.com → Integrations → API |
| `MAILERLITE_FREE_GROUP_ID` | Production | MailerLite → Groups → "WinFact Free" → ID |
| `MAILERLITE_VIP_GROUP_ID` | Production | MailerLite → Groups → "WinFact VIP" → ID |
| `MAILERLITE_FROM_EMAIL` | Production | `picks@winfactpicks.com` |
| `ANTHROPIC_API_KEY` | Production | console.anthropic.com → API Keys |
| `OPENAI_API_KEY` | Production | platform.openai.com → API Keys |
| `ODDS_API_KEY` | Production | the-odds-api.com → Dashboard |
| `R2_ACCOUNT_ID` | Production | dash.cloudflare.com → R2 |
| `R2_ACCESS_KEY_ID` | Production | Cloudflare R2 API Tokens |
| `R2_SECRET_ACCESS_KEY` | Production | Cloudflare R2 API Tokens |
| `R2_BUCKET_NAME` | Production | `winfact-media` |
| `R2_PUBLIC_URL` | Production | Your R2 custom domain |
| `CRON_SECRET` | Production | Generate: `openssl rand -hex 32` |
| `UNSUBSCRIBE_SECRET` | Production | Generate: `openssl rand -hex 32` |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Production | analytics.google.com |

---

## Webhook Endpoints to Register

### 1. Clerk Webhook

**Dashboard:** dashboard.clerk.com → Webhooks → Add Endpoint

| Setting | Value |
|---------|-------|
| **URL** | `https://winfactpicks.com/api/webhooks/clerk` |
| **Events** | `user.created`, `user.updated`, `user.deleted` |

Copy the **Signing Secret** → set as `CLERK_WEBHOOK_SECRET` in Vercel.

### 2. Stripe Webhook

**Dashboard:** dashboard.stripe.com → Developers → Webhooks → Add Endpoint

> **Make sure you are in LIVE MODE** (toggle at top of Stripe dashboard)

| Setting | Value |
|---------|-------|
| **URL** | `https://winfactpicks.com/api/webhooks/stripe` |
| **Events** | See list below |

**Events to subscribe:**
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `customer.subscription.trial_will_end`
- `invoice.payment_failed`
- `invoice.payment_succeeded`
- `charge.refunded`

Copy the **Signing Secret** → set as `STRIPE_WEBHOOK_SECRET` in Vercel.

---

## Stripe Dashboard Setup

### Products & Prices

Go to **dashboard.stripe.com → Products** (in LIVE mode):

**Product 1: VIP Weekly**
- Name: `VIP Weekly`
- Price: `$45.00 / week`, recurring
- Copy the **Price ID** (starts with `price_`) → `STRIPE_VIP_WEEKLY_PRICE_ID`

**Product 2: VIP Monthly**
- Name: `VIP Monthly`
- Price: `$120.00 / month`, recurring
- Copy the **Price ID** → `STRIPE_VIP_MONTHLY_PRICE_ID`

### Promo Code: PICK80

Go to **Products → Coupons → Create Coupon**:
- Discount type: Percentage
- Percentage off: 80%
- Duration: Once (first payment only)
- Redemption limits: Optional
- Create a **Promotion Code**: `PICK80`

### Customer Portal

Go to **Settings → Billing → Customer Portal**:
- Enable: Cancel subscription, Update payment method
- Redirect: `https://winfactpicks.com/dashboard/settings`

---

## Telegram Bot Setup

### 1. Create the Bot
- Open Telegram → search `@BotFather` → send `/newbot`
- Follow prompts → copy the **bot token** → `TELEGRAM_BOT_TOKEN`

### 2. Get Community Group Chat ID
- Add the bot to your WinFact community Telegram group
- Send any message in the group
- Visit: `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
- Find `"chat":{"id":-100XXXXXXXXXX}` → that negative number is `TELEGRAM_FREE_CHAT_ID`

### 3. Get VIP Group Chat ID (if separate)
- Same process for VIP group → `TELEGRAM_VIP_CHAT_ID`

### 4. Get Admin Chat ID (Oscar's personal)
- Send a direct message to the bot from your personal Telegram
- Visit the same `/getUpdates` URL
- Find your personal chat ID (positive number) → `TELEGRAM_ADMIN_CHAT_ID`

---

## MailerLite Setup

### 1. Get API Key
- Go to **app.mailerlite.com → Integrations → API → Developer API**
- Copy → `MAILERLITE_API_KEY`

### 2. Create Subscriber Groups
- Go to **Subscribers → Groups → Create Group**
- Create: `WinFact Free` → copy Group ID → `MAILERLITE_FREE_GROUP_ID`
- Create: `WinFact VIP` → copy Group ID → `MAILERLITE_VIP_GROUP_ID`
- (Optional) Create: `winfact_transactional` → `MAILERLITE_TRANSACTIONAL_GROUP_ID`

### 3. Verified Sender Domain
- Go to **Settings → Domains → Add Domain**
- Verify `winfactpicks.com` for sending emails
- Set `MAILERLITE_FROM_EMAIL=picks@winfactpicks.com`

---

## External Services Summary

| Service | Purpose | Required? | Free Tier | Est. Monthly Cost |
|---------|---------|-----------|-----------|-------------------|
| **Turso** | SQLite database | Yes | 9GB, 500M row reads | $0–29 |
| **Clerk** | Authentication & user management | Yes | 10K MAU | $0–25 |
| **Stripe** | Subscription payments | Yes | No monthly fee | 2.9% + $0.30/txn |
| **Telegram Bot API** | Pick distribution + admin alerts | Yes | Unlimited | $0 |
| **MailerLite** | Email campaigns & transactional | Yes | 1K subscribers | $0–25 |
| **Anthropic Claude** | AI blog generation + AI Assistant | Yes | Pay per token | $5–20 |
| **The Odds API** | Live odds & sharp money data | Yes | 500 req/mo | $0–80 |
| **ESPN** | Live scores & schedules | Yes | Public API | $0 |
| **Cloudflare R2** | Media file storage | Optional | 10GB | $0–5 |
| **OpenAI (DALL-E)** | AI blog featured images | Optional | Pay per image | $1–10 |
| **Google Analytics** | Traffic analytics | Optional | Unlimited | $0 |
| **Vercel** | Hosting + serverless + cron | Yes | Hobby free | $0–20 |

**Estimated total at launch: $5–50/month** (scales with usage)

---

## Dev vs Production Differences

| Variable | Dev Value | Prod Value |
|----------|-----------|------------|
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3003` | `https://winfactpicks.com` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_test_...` | `pk_live_...` |
| `CLERK_SECRET_KEY` | `sk_test_...` | `sk_live_...` |
| `CLERK_WEBHOOK_SECRET` | Dev webhook secret | Prod webhook secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | `pk_live_...` |
| `STRIPE_SECRET_KEY` | `sk_test_...` | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Dev webhook secret | Prod webhook secret |
| `STRIPE_VIP_WEEKLY_PRICE_ID` | Test mode price ID | Live mode price ID |
| `STRIPE_VIP_MONTHLY_PRICE_ID` | Test mode price ID | Live mode price ID |
| All others | Same value in dev and prod | Same value |

---

## Validation Script

Run `bash scripts/check-env.sh` to verify all variables are set.
