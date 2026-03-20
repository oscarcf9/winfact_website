# WinFact Picks — AI-Assisted Development Security Guide

> **Adapted for:** WinFact Picks tech stack & operations
> **Date:** March 2026
> **Context:** Platform built primarily with Claude Code; 57 API routes, 26 DB tables, React Native mobile app

---

## Why This Matters for WinFact

WinFact's entire codebase was built with AI assistance (Claude Code). The source research is clear: AI-assisted commits produce 3–4× more code volume per change, and those large changes escape careful review at significantly higher rates. The same research found AI-coauthored commits leak credentials roughly twice as often as human-only commits (~3.2% vs ~1.5%).

This isn't theoretical for WinFact. The platform handles Stripe payments, Clerk auth tokens, Telegram bot tokens, The Odds API keys, ESPN endpoints, MailerLite API keys, Turso database credentials, and Cloudflare R2 secrets — all flowing through a single-operator codebase that was built fast.

This document maps every risk from the research directly to WinFact's stack, prioritizes them, and provides a paste-ready audit prompt plus an operational checklist.

---

## 1. WinFact-Specific Risk Map

### TIER 1 — Fix Before Launch (High Likelihood × High Impact)

#### 1.1 Secrets & Credential Exposure

**Your exposure surface:**
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`
- `TELEGRAM_BOT_TOKEN` (admin + community)
- `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`
- `THE_ODDS_API_KEY`
- `MAILER_LITE_API_KEY`
- `CLOUDFLARE_R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
- `ANTHROPIC_API_KEY` (blog generation)
- Any ESPN unofficial API tokens

**WinFact-specific risks:**
- Claude Code sessions may have received env values during debugging — those could persist in conversation history or be echoed in generated code comments
- The `db/seed.ts` file might contain real credentials or Stripe price IDs that bleed into version control
- Telegram bot token is especially sensitive: if leaked, an attacker can impersonate the WinFact bot and send fake picks to your entire community
- Vercel environment variables could be misconfigured (preview vs. production)

**Detection:** Run `grep -rn "sk_live\|sk_test\|whsec_\|bot[0-9]\|eyJ\|dbs-\|Bearer\|TURSO\|CLERK\|MAILER" src/` across the codebase. Check `.env.example` to ensure it contains only placeholder values, never real keys.

**Mitigation:**
- Audit every file for hardcoded strings that look like keys
- Confirm all secrets live in Vercel environment variables only
- Add a pre-commit hook or CI step with a secret scanner (e.g., `gitleaks` or `trufflehog`)
- Rotate any key that has ever appeared in a Claude Code conversation or commit diff
- Verify `db/seed.ts` uses dummy data only

---

#### 1.2 Authentication & Authorization Flaws

**Your exposure surface:**
- Clerk middleware gate → admin role check (dual-path: `publicMetadata.role` + DB `users.role`)
- API routes under `/api/admin/*` require auth + admin role
- VIP content gating: free users must never see VIP picks
- Stripe webhook verification (signature check)
- Clerk webhook verification (Svix signature)

**WinFact-specific risks:**
- The `isVip` check historically missed `season_pass` tier — this class of bug (incomplete enum checks) is exactly what AI generates
- Any API route that checks subscription tier client-side instead of server-side is bypassable
- If the admin role check in `middleware.ts` ever falls out of sync with the DB check in `admin/layout.tsx`, an unauthorized user could access admin APIs but not the admin UI (or vice versa)
- The referral `?ref=` parameter not being captured through Clerk signup (known P0) means the auth flow has gaps that could extend to other data

**Detection:** For every `/api/admin/*` and `/api/picks/*` route, manually test: (a) unauthenticated request, (b) authenticated non-admin request, (c) authenticated free-tier request hitting VIP endpoints. Each should return 401/403 as appropriate.

**Mitigation:**
- Centralize all auth checks into a single `requireAdmin()` and `requireVip()` utility — don't repeat the logic per route
- Ensure all tier checks use an exhaustive list: `['vip_weekly', 'vip_monthly', 'season_pass']`
- Test webhook signature verification by sending a request with a tampered signature — it must reject
- Add integration tests that verify access control for each API route

---

#### 1.3 Stripe Payment Security

**Your exposure surface:**
- `/api/stripe/checkout` — creates checkout sessions
- `/api/stripe/portal` — generates billing portal links
- `/api/webhooks/stripe` — handles subscription lifecycle
- `PICK80` promo code

**WinFact-specific risks:**
- If the checkout endpoint doesn't verify the price ID against a server-side allowlist, an attacker could potentially create a session with a manipulated price
- The Stripe webhook handler must verify signatures before processing — AI-generated webhook handlers sometimes skip this
- Missing webhook event types (identified in deployment audit) mean subscription state can desync: a user cancels in Stripe but WinFact's DB still shows active
- If `PICK80` promo code is applied at the Stripe level but not validated server-side, edge cases around multiple applications or expired promos could arise

**Detection:** Review `/api/webhooks/stripe/route.ts` line by line — confirm signature verification happens before any DB writes. Check that the checkout route validates `priceId` against `lib/stripe.ts` constants.

**Mitigation:**
- Validate all Stripe webhook events with `stripe.webhooks.constructEvent()` before processing
- Register the three missing webhook event types identified in your deployment audit
- Server-side allowlist for price IDs — never trust client-provided price values
- Add idempotency checks: if a webhook fires twice for the same event, don't double-process

---

#### 1.4 Input Validation & Injection

**Your exposure surface:**
- Admin pick form: 12+ fields submitted to `/api/admin/picks`
- Admin blog form: 15+ fields submitted to `/api/admin/blog`
- Site content editor: arbitrary key-value pairs to `/api/admin/content`
- Blog body content (rendered as HTML?) — potential XSS vector
- URL parameters (`?ref=`, `?sport=`, `?category=`)

**WinFact-specific risks:**
- If blog `bodyEn`/`bodyEs` is rendered with `dangerouslySetInnerHTML` or equivalent without sanitization, any admin (or compromised admin account) could inject scripts that execute for all site visitors
- The `siteContent` table stores arbitrary values that might be rendered on public pages — if a value contains `<script>`, it could execute
- URL query parameters used for filtering (sport, category) could be reflected in the page without escaping
- Drizzle ORM with LibSQL generally protects against SQL injection, but any raw query usage bypasses this

**Detection:** Search for `dangerouslySetInnerHTML`, `innerHTML`, raw SQL strings (`sql\`...`), and any place URL params are rendered into HTML.

**Mitigation:**
- Sanitize all HTML content before rendering (use a library like `dompurify` or `sanitize-html`)
- Validate and sanitize all API inputs server-side (type, length, allowed characters)
- Never render URL parameters directly into HTML
- Confirm all DB queries use Drizzle's parameterized query builder, not raw strings

---

### TIER 2 — Fix Before Growth Phase (Medium Likelihood × High Impact)

#### 2.1 MailerLite Segment Desync (Known P1)

Cancelled VIP users still receiving VIP emails means they see content they shouldn't. This is both a business logic leak and a trust issue. Beyond the P1 fix, ensure the MailerLite API key has scoped permissions (if available) and that email templates don't contain sensitive pick details that could be forwarded.

#### 2.2 Missing Admin Telegram Alerts (Known P1)

Without alerts for new VIP signups, cancellations, and payment failures, you're flying blind on revenue events. But also: the Telegram bot token used for these alerts must be separate from the community bot token. If a single token handles both admin alerts and community posts, compromising it gives access to everything.

#### 2.3 Database Performance & Missing Indexes (Known P1)

15+ missing indexes means queries slow down as data grows, but it also means certain queries could time out under load, potentially causing cascading failures in the middleware auth checks or pick delivery pipeline. If an auth query times out, does the middleware fail open (granting access) or fail closed (blocking everyone)? Confirm it fails closed.

#### 2.4 Dependency Supply Chain

**Your exposure surface:** Next.js 16.1.6, React 19.2.3, Drizzle 0.45.1, Clerk 7.0.2, Stripe 20.4.1, Svix 1.87.0, next-intl 4.8.3, Tailwind v4, Expo SDK, plus all transitive dependencies.

**Risk:** AI may have suggested specific package versions during development that are now outdated or have known CVEs. The mobile app (31 source files, Expo SDK) adds a second dependency surface.

**Mitigation:**
- Run `npm audit` on both the web and mobile projects
- Check that `package-lock.json` is committed and matches `package.json`
- Set up Dependabot or Renovate for automated vulnerability alerts
- Review any unfamiliar packages that Claude Code may have introduced

#### 2.5 Cloud & Infrastructure Configuration

**Your exposure surface:** Vercel (deployment + cron), Turso (database), Cloudflare R2 (media — Phase 6), Clerk (auth), Stripe (payments).

**Risks:**
- Vercel preview deployments may expose admin routes if middleware doesn't run in preview mode
- Turso database access — confirm the auth token is scoped correctly and the database URL isn't publicly accessible
- When Cloudflare R2 launches (Phase 6), bucket permissions must be set to private by default with signed URLs for access
- Vercel cron jobs (auto-settler) run with what credentials? If they have the same env vars as the main app, a misconfigured cron could be an attack vector

**Mitigation:**
- Verify Vercel preview deployments require authentication for admin/dashboard routes
- Confirm Turso database is not accessible from outside the Vercel network
- Document the security requirements for R2 before Phase 6 begins

---

### TIER 3 — Monitor Ongoing (Lower Likelihood, Still Important)

#### 3.1 AI Content Generation Integrity

The blog generation system uses the Anthropic Claude API with real odds data. The guardrail that "AI blog posts must use real API data only — no LLM fabrication" is a policy, not a technical control. If the API data fetch fails and the system falls back gracefully, does it still publish? A blog post with fabricated odds or records would destroy the "transparent, data-backed" brand promise.

**Mitigation:** Add validation that blog posts contain verifiable data points before they can be published. If the data API call fails, the post should be flagged as draft, not auto-published.

#### 3.2 Licensing & IP

Claude Code was trained on public code. There's a nonzero chance that specific patterns in the WinFact codebase closely mirror GPL-licensed code. For a commercial SaaS product, this could create licensing conflicts.

**Mitigation:** Run a license scan on the codebase (e.g., `license-checker` npm package) to verify all dependencies are compatible with commercial use. For the application code itself, this is lower risk but worth a periodic check.

#### 3.3 Privacy & Data Handling

WinFact collects email, name, payment info (via Stripe), and betting preferences. The platform operates in FL/TX/NY/NJ/CA — states with varying data privacy laws (CCPA in CA, etc.).

**Risks:**
- User data logged in plaintext in Vercel function logs
- Clerk stores auth data — confirm their data processing agreement covers your obligations
- MailerLite stores email lists — confirm GDPR/CCPA compliance if you have EU visitors
- The referral system stores `referredEmail` — is this email collected with consent?

**Mitigation:** Review what gets logged in Vercel. Ensure Stripe handles all PCI-sensitive data (never store card numbers). Add a data retention policy. Verify your privacy policy covers all data processors (Clerk, Stripe, MailerLite, Turso, Vercel).

---

## 2. Pre-Launch Security Checklist

### Secrets & Environment
- [ ] All secrets live in Vercel env vars only — zero hardcoded values in code
- [ ] `.env.example` contains only placeholder values
- [ ] `.env` and `.env.local` are in `.gitignore`
- [ ] `db/seed.ts` contains no real credentials or Stripe IDs
- [ ] Telegram bot token has never been committed to git history
- [ ] All API keys have been rotated at least once since development began
- [ ] Vercel preview deployments use separate (non-production) API keys where possible

### Authentication & Access Control
- [ ] Every `/api/admin/*` route returns 403 for non-admin authenticated users
- [ ] Every `/api/admin/*` route returns 401 for unauthenticated users
- [ ] Every `/api/picks/today` response filters by user's actual subscription tier
- [ ] VIP tier check includes `season_pass` alongside `vip_weekly` and `vip_monthly`
- [ ] Admin role verified in BOTH middleware AND page/API level
- [ ] Webhook signature verification tested with tampered payloads

### Payments
- [ ] Stripe checkout validates price ID server-side
- [ ] Stripe webhook signature verified before any DB writes
- [ ] All required webhook event types are registered
- [ ] Promo code `PICK80` verified in Stripe Dashboard
- [ ] No raw card data ever touches WinFact servers (Stripe handles all PCI)

### Input & Output
- [ ] All API inputs validated server-side (type, length, format)
- [ ] Blog content sanitized before rendering (no raw HTML injection)
- [ ] Site content values sanitized before rendering
- [ ] URL parameters not reflected into HTML unsanitized
- [ ] API error responses don't expose stack traces or internal paths
- [ ] Admin API responses don't leak to non-admin users

### Infrastructure
- [ ] Middleware covers all protected route patterns
- [ ] Security headers configured (CSP, X-Frame-Options, X-Content-Type-Options)
- [ ] Rate limiting on authentication and payment endpoints
- [ ] `og-default.png` created (deployment audit item)
- [ ] Vercel environment variables confirmed for production

### Monitoring
- [ ] Admin Telegram alerts configured (new VIP, cancellation, payment failure)
- [ ] Error logging captures auth failures and payment issues
- [ ] Sensitive data (tokens, PII) excluded from logs
- [ ] Database query failures fail closed (deny access), not open

### Dependencies
- [ ] `npm audit` returns no critical/high vulnerabilities
- [ ] `package-lock.json` committed and consistent
- [ ] No unfamiliar or zero-download packages in dependency tree

### Legal & Compliance
- [ ] Privacy policy lists all data processors (Clerk, Stripe, MailerLite, Turso, Vercel)
- [ ] Terms of service current and accessible
- [ ] Responsible gambling page live
- [ ] Sales tax decision made (Stripe Tax recommended from deployment audit)
- [ ] Data retention policy documented

---

## 3. Ongoing Security Practices

Since WinFact will continue using Claude Code for development, these practices should become permanent:

1. **Small commits, always.** Never let Claude Code generate a 500-line change in one pass. Break tasks into focused, reviewable chunks.

2. **Review every AI output.** Treat Claude Code like a junior developer — fast but needs oversight. Read every line before committing.

3. **Secret scan on every push.** Add `gitleaks` or equivalent to CI. A 30-second scan prevents credential leaks.

4. **Rotate keys quarterly.** Even without a known leak, rotate Stripe, Clerk, Telegram, Turso, and API keys on a schedule.

5. **Test access control after every auth change.** Any time middleware or role checks are modified, re-run the full access control test suite.

6. **Pin dependency versions.** Don't accept `^` or `~` ranges for critical packages. Lock to exact versions and update deliberately.

7. **Separate bot tokens.** Use one Telegram bot token for community posting and a different one for admin alerts. If one is compromised, the other still works.

8. **Never paste production data into Claude Code.** If debugging a production issue, sanitize the data first. Claude Code conversations may be stored and reviewed.

---

## 4. Quick Reference: What Breaks Trust Fastest

For a sports handicapping platform, the hierarchy of catastrophic failures is:

1. **Fake/wrong picks delivered** — If the AI content system publishes fabricated data, or if a bug delivers wrong picks to paying users, the brand is finished. Trust is the product.

2. **Payment data breach** — Stripe handles PCI, but if Stripe keys leak, an attacker could issue refunds, view customer lists, or manipulate subscriptions.

3. **VIP content leaked to free users** — Paying customers see free users getting the same picks. Immediate churn.

4. **Bot impersonation** — Telegram bot token leaked → attacker sends fake picks or scam links to the entire community under the WinFact name.

5. **Admin takeover** — If admin auth is bypassable, an attacker can publish picks, modify performance records, or access subscriber data.

Every security decision should be prioritized against this hierarchy.
