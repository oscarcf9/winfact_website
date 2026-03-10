# WinFact Picks - Website Technical Documentation

> **Last updated:** March 2026
> **Status:** Production-ready, Phase 6 pending (media uploads)

---

## 1. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.1.6 |
| Runtime | React | 19.2.3 |
| Database | Turso (LibSQL/SQLite) | — |
| ORM | Drizzle ORM | 0.45.1 |
| Authentication | Clerk | 7.0.2 |
| Payments | Stripe | 20.4.1 |
| Webhooks | Svix | 1.87.0 |
| Internationalization | next-intl | 4.8.3 |
| Styling | Tailwind CSS | v4 |
| Icons | Lucide React | 0.577.0 |
| Fonts | Google Fonts (Sora, Inter, JetBrains Mono) | — |
| Deployment | Vercel-ready | — |

### NPM Scripts

```
dev          - Start dev server
build        - Production build
start        - Start production server
lint         - ESLint
db:generate  - Generate Drizzle migrations
db:migrate   - Run migrations
db:push      - Push schema to database
db:studio    - Open Drizzle Studio
db:seed      - Seed sample data
```

---

## 2. Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout (Clerk provider, fonts)
│   ├── globals.css             # Theme, animations, custom properties
│   ├── robots.ts               # SEO robots config
│   ├── sitemap.ts              # Dynamic sitemap generation
│   ├── [locale]/               # Localized routes (en, es)
│   │   ├── layout.tsx          # i18n provider, metadata
│   │   ├── page.tsx            # Home page
│   │   ├── about/
│   │   ├── blog/
│   │   │   ├── page.tsx        # Blog listing
│   │   │   └── [slug]/page.tsx # Individual post
│   │   ├── contact/
│   │   ├── dashboard/
│   │   │   ├── page.tsx        # Today's picks
│   │   │   ├── history/        # Pick history
│   │   │   ├── performance/    # User stats
│   │   │   ├── referrals/      # Referral tracking
│   │   │   └── settings/       # Account settings
│   │   ├── disclaimer/
│   │   ├── faq/
│   │   ├── how-it-works/
│   │   ├── performance/        # Public performance page
│   │   ├── pricing/
│   │   ├── privacy/
│   │   ├── refer/
│   │   ├── responsible-gambling/
│   │   ├── sign-in/
│   │   ├── sign-up/
│   │   ├── terms/
│   │   └── admin/              # Admin panel (see admin-panel.md)
│   └── api/
│       ├── picks/today/        # GET - today's picks
│       ├── picks/history/      # GET - historical picks
│       ├── blog/               # GET - blog posts
│       ├── performance/        # GET - performance data
│       ├── user/profile/       # GET - user profile
│       ├── referral/stats/     # GET - referral stats
│       ├── stripe/
│       │   ├── checkout/       # POST - create checkout session
│       │   └── portal/         # POST - billing portal
│       ├── webhooks/
│       │   ├── clerk/          # POST - user sync
│       │   └── stripe/         # POST - subscription events
│       └── admin/              # Protected admin endpoints
├── components/
│   ├── ui/                     # Reusable UI primitives (20+ components)
│   ├── layout/                 # Header, footer, mobile nav, language switcher
│   ├── home/                   # Hero, features, testimonials, CTA, etc.
│   ├── dashboard/              # Pick card, sidebar
│   ├── admin/                  # Sidebar, pick form, post form, content editor
│   ├── pricing/                # Checkout button, comparison table
│   ├── seo/                    # JSON-LD schemas
│   └── how-it-works/           # Steps timeline, mockups
├── db/
│   ├── index.ts                # Turso client singleton
│   ├── seed.ts                 # Sample data seeder
│   ├── schema/                 # 8 table definitions
│   └── queries/                # Query functions by domain
├── i18n/
│   ├── routing.ts              # Locale config
│   ├── request.ts              # Message loading
│   └── navigation.ts           # i18n-aware Link, redirect, useRouter
├── lib/
│   ├── constants.ts            # Site name, URLs, nav links, promo code
│   ├── stripe.ts               # Stripe client & plan configs
│   ├── fonts.ts                # Font definitions
│   └── utils.ts                # cn() class utility
├── data/
│   ├── sports.ts               # 6 sports with icons, colors, leagues
│   ├── features.ts             # 6 platform features
│   ├── sample-posts.ts         # Fallback blog data
│   └── sample-performance.ts   # Fallback performance data
├── middleware.ts                # Auth + i18n + route protection
messages/
├── en.json                     # English translations
└── es.json                     # Spanish translations
public/images/
├── hero-visual.avif
└── sports/                     # MLB, NFL, NBA, NHL, Soccer, NCAA logos
```

---

## 3. Database Schema

### 3.1 `users`

| Column | Type | Notes |
|--------|------|-------|
| id | text (PK) | Clerk user ID |
| email | text | Unique |
| name | text | Nullable |
| role | enum | `admin` / `member` (default: member) |
| language | enum | `en` / `es` (default: en) |
| stripeCustomerId | text | Nullable |
| referralCode | text | Unique |
| referredBy | text (FK) | Self-reference to users.id |
| createdAt | integer | Unix timestamp |
| updatedAt | integer | Unix timestamp |

### 3.2 `picks`

| Column | Type | Notes |
|--------|------|-------|
| id | text (PK) | UUID |
| sport | text | MLB, NFL, NBA, NHL, Soccer, NCAA |
| league | text | Optional |
| matchup | text | Required |
| pickText | text | Required |
| odds | integer | American odds format |
| units | real | Decimal |
| modelEdge | real | Optional |
| confidence | enum | `top` / `strong` / `standard` |
| analysisEn | text | English analysis |
| analysisEs | text | Spanish analysis |
| tier | enum | `free` / `vip` |
| status | enum | `draft` / `published` / `settled` |
| result | enum | `win` / `loss` / `push` (nullable) |
| closingOdds | integer | Nullable |
| clv | real | Closing Line Value (auto-calculated) |
| publishedAt | integer | Set on first publish |
| settledAt | integer | Set on settle |
| createdAt | integer | |
| updatedAt | integer | |

### 3.3 `posts`

| Column | Type | Notes |
|--------|------|-------|
| id | text (PK) | UUID |
| slug | text | Unique URL slug |
| titleEn | text | Required |
| titleEs | text | Optional |
| bodyEn | text | Required |
| bodyEs | text | Optional |
| category | enum | `free_pick` / `game_preview` / `strategy` / `model_breakdown` / `news` |
| featuredImage | text | URL |
| ogImage | text | OG image URL |
| seoTitle | text | Custom SEO title |
| seoDescription | text | Custom meta description |
| canonicalUrl | text | |
| status | enum | `draft` / `published` / `scheduled` |
| publishedAt | integer | |
| author | text | Default: "WinFact" |
| createdAt | integer | |
| updatedAt | integer | |

### 3.4 `postTags`

| Column | Type | Notes |
|--------|------|-------|
| postId | text (FK) | References posts.id |
| sport | text | Composite PK with postId |

### 3.5 `subscriptions`

| Column | Type | Notes |
|--------|------|-------|
| id | text (PK) | UUID |
| userId | text (FK) | References users.id |
| stripeSubscriptionId | text | Unique |
| tier | enum | `free` / `vip_weekly` / `vip_monthly` / `season_pass` |
| status | enum | `active` / `trialing` / `past_due` / `cancelled` / `expired` |
| currentPeriodStart | integer | |
| currentPeriodEnd | integer | |
| createdAt | integer | |

### 3.6 `media`

| Column | Type | Notes |
|--------|------|-------|
| id | text (PK) | UUID |
| filename | text | |
| url | text | Full URL |
| urlWebp | text | Optimized format |
| urlThumb | text | Thumbnail |
| sizeBytes | integer | |
| mimeType | text | |
| width | integer | |
| height | integer | |
| altText | text | |
| uploadedAt | integer | |

### 3.7 `referrals`

| Column | Type | Notes |
|--------|------|-------|
| id | text (PK) | UUID |
| referrerId | text (FK) | References users.id |
| referredEmail | text | |
| status | enum | `pending` / `converted` |
| rewardApplied | integer | Boolean (0/1) |
| createdAt | integer | |
| convertedAt | integer | |

### 3.8 `siteContent`

| Column | Type | Notes |
|--------|------|-------|
| key | text (PK) | Content identifier |
| value | text | Can store JSON strings |
| updatedAt | integer | |

### 3.9 `performanceCache`

| Column | Type | Notes |
|--------|------|-------|
| id | text (PK) | |
| scope | text | `overall` or sport name |
| period | text | `monthly` / `all_time` |
| wins | integer | |
| losses | integer | |
| pushes | integer | |
| unitsWon | real | |
| roiPct | real | |
| clvAvg | real | |
| computedAt | integer | |

---

## 4. Public Pages & Features

### 4.1 Marketing Pages

| Page | Route | Description |
|------|-------|-------------|
| Home | `/` | Hero section, sports marquee, how-it-works steps, feature grid (6 features), testimonials, pricing preview, FAQ accordion, CTA |
| How It Works | `/how-it-works` | Step-by-step process with timeline layout and mockups |
| Pricing | `/pricing` | 3-tier pricing cards (Free, VIP Weekly $45/wk, VIP Monthly $120/mo), promo code `PICK80` for 80% off, feature comparison table |
| Performance | `/performance` | Public stats dashboard showing win rates, ROI, CLV |
| About | `/about` | Company information |
| Contact | `/contact` | Contact form |
| FAQ | `/faq` | Frequently asked questions |
| Refer | `/refer` | Referral program details |

### 4.2 Legal Pages

- `/terms` - Terms of Service
- `/privacy` - Privacy Policy
- `/disclaimer` - Disclaimer
- `/responsible-gambling` - Responsible Gambling

### 4.3 Blog

- `/blog` - Listing page with category filters (free_pick, game_preview, strategy, model_breakdown, news)
- `/blog/[slug]` - Individual post with bilingual content, related posts, JSON-LD article schema

### 4.4 User Dashboard (Protected - requires sign-in)

| Page | Route | Description |
|------|-------|-------------|
| Today's Picks | `/dashboard` | Current day's published picks filtered by subscription tier |
| History | `/dashboard/history` | Historical picks filtered by sport |
| Performance | `/dashboard/performance` | Personal performance stats |
| Referrals | `/dashboard/referrals` | User's referral tracking |
| Settings | `/dashboard/settings` | Account settings |

### 4.5 Authentication

- `/sign-in` - Clerk sign-in page (custom styled)
- `/sign-up` - Clerk registration page (custom styled)

---

## 5. API Routes

### 5.1 Public / User APIs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/picks/today` | Yes | Today's picks (VIP filtering by tier) |
| GET | `/api/picks/history` | Yes | Historical picks by sport |
| GET | `/api/blog` | No | Paginated blog posts, optional category filter |
| GET | `/api/performance` | No | Overall, by-sport, and monthly performance data |
| GET | `/api/user/profile` | Yes | User profile + subscription info |
| GET | `/api/referral/stats` | Yes | User's referral statistics |

### 5.2 Stripe Integration

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/stripe/checkout` | Yes | Create Stripe checkout session with promo code support |
| POST | `/api/stripe/portal` | Yes | Generate Stripe billing portal link |

### 5.3 Webhooks

| Method | Endpoint | Verification | Description |
|--------|----------|-------------|-------------|
| POST | `/api/webhooks/clerk` | Svix signature | Sync user create/update/delete events to DB |
| POST | `/api/webhooks/stripe` | Stripe signature | Handle subscription lifecycle & payment events |

### 5.4 Admin APIs

See `admin-panel.md` for details.

---

## 6. Middleware & Route Protection

**File:** `src/middleware.ts`

| Route Pattern | Protection |
|--------------|-----------|
| `/(en\|es)/dashboard(.*)` | Requires Clerk authentication |
| `/(en\|es)/admin(.*)` | Requires authentication + admin role |
| `/api/admin(.*)` | Requires authentication + admin role (returns 403) |
| `/api/*` | Skips i18n middleware |
| All other routes | Public, with locale detection |

---

## 7. Internationalization (i18n)

- **Locales:** English (`en`), Spanish (`es`)
- **Default locale:** `en`
- **Implementation:** `next-intl` with dynamic `[locale]` route segments
- **Translation files:** `messages/en.json`, `messages/es.json`
- **Coverage:** All UI strings, navigation, marketing copy, dashboard labels, admin labels, blog categories
- **Components:** Server-side via `getTranslations()`, client-side via `useTranslations()` hook
- **Navigation:** i18n-aware `Link`, `redirect`, `useRouter` from `src/i18n/navigation.ts`
- **Language switcher:** Component in header for toggling locale

---

## 8. Styling & Theme

### Color Palette (CSS custom properties)

| Variable | Value | Usage |
|----------|-------|-------|
| `--navy` | `#0B1F3B` | Primary background |
| `--primary` | `#1168D9` | Brand blue |
| `--secondary` | `#4A88D9` | Secondary blue |
| `--accent` | `#0BC4D9` | Accent teal |
| `--success` | — | Win states |
| `--warning` | — | Caution states |
| `--danger` | — | Loss/error states |

### Typography

| Font | Variable | Usage |
|------|----------|-------|
| Sora | `--font-sora` | Headings |
| Inter | `--font-inter` | Body text |
| JetBrains Mono | `--font-jetbrains-mono` | Code / odds |

### Animations

- `pulse-glow` - Pulsing glow effect
- `gradient-shift` - Animated gradients
- `shimmer` - Loading shimmer
- `breathe` - Breathing scale effect
- `fade-up/down/left/right` - Directional fade-ins
- Glass morphism effects
- Scroll-triggered animations via `animated-section.tsx`
- Page transitions via `page-transition.tsx`
- Reduced motion support (`prefers-reduced-motion`)

---

## 9. SEO

- **robots.ts** - Allows all public routes, disallows `/admin` and `/api`
- **sitemap.ts** - Dynamic generation including all static pages (2 locales) + blog posts from DB with language alternates
- **JSON-LD schemas:** Organization, Article, Product, Breadcrumb
- **Per-page metadata:** Title templates, descriptions, OG images, Twitter cards
- **Canonical URLs** and language alternates on all pages

---

## 10. Subscription & Payment Model

### Plans

| Plan | Price | Trial | Stripe Price ID |
|------|-------|-------|----------------|
| Free | $0 | — | — |
| VIP Weekly | $45/week | 7 days | From env |
| VIP Monthly | $120/month | 7 days | From env |
| Season Pass | TBD | — | — |

### Promo Code

- Code: `PICK80`
- Discount: 80%
- Applied at Stripe checkout

### Flow

1. User selects plan on `/pricing`
2. `CheckoutButton` component calls `/api/stripe/checkout`
3. Stripe Checkout session created with plan, trial, optional promo
4. On success, Stripe webhook (`/api/webhooks/stripe`) creates/updates subscription in DB
5. User can manage billing via Stripe portal (`/api/stripe/portal`)

---

## 11. Component Library

### UI Primitives (`src/components/ui/`)

| Component | Description |
|-----------|-------------|
| `button.tsx` | Variants: primary, outline, ghost |
| `card.tsx` | Card container with header/content/footer slots |
| `badge.tsx` | Variants: sport, confidence, result, tier |
| `heading.tsx` | h1-h6 with custom sizes |
| `input.tsx` | Styled form input |
| `textarea.tsx` | Styled textarea |
| `separator.tsx` | Horizontal divider |
| `accordion.tsx` | Expandable content |
| `stat-card.tsx` | Stat display with label/value |
| `container.tsx` | Max-width layout wrapper |
| `section.tsx` | Page section wrapper |
| `gradient-text.tsx` | Gradient text effect |
| `count-up.tsx` | Animated number counter |
| `background-patterns.tsx` | Decorative backgrounds |
| `animated-section.tsx` | Scroll-triggered animations |
| `animated-card.tsx` | Card with hover animations |
| `page-hero.tsx` | Hero section layout |
| `page-transition.tsx` | Page transition wrapper |
| `interactive-grid.tsx` | Interactive grid layout |

---

## 12. Key Business Logic

### CLV Calculation (Closing Line Value)

When a pick is settled with closing odds:
```
clv = (closingOdds_implied_probability - openOdds_implied_probability) × 100
```
Positive CLV = the line moved in the pick's favor after publication.

### VIP Content Gating

- API checks user's subscription tier
- Free users see only `tier: "free"` picks
- VIP users (active/trialing) see all picks
- Dashboard filters picks accordingly

### Performance Metrics

- **Win Rate** = wins / (wins + losses) × 100
- **Units Won** = sum(units for wins) - sum(units for losses)
- **ROI** = unitsWon / totalRisked × 100
- **Avg CLV** = average of CLV across settled picks
- Computed per-sport and overall
- Cached in `performanceCache` table

### Referral Program

- Users get unique referral codes
- Referrals tracked with pending/converted status
- Rewards marked as applied via admin panel
