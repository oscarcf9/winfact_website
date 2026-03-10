# WinFact Admin Hub — Full Feature Roadmap

> **Created:** March 2026
> **Status:** Planning

---

## What You Have vs. What You Need

Current build is a solid **CMS foundation**. What it lacks is the **operational nervous system** — the automation engine, distribution layer, intelligence tools, and business analytics that make it a real command center.

---

## CRITICAL MISSING: Distribution & Automation Engine

This is the biggest gap. Right now picks are managed but not *dispatched*.

### Pick Distribution Hub
- **Multi-channel publisher** — one click (or scheduled auto-send) pushes picks to: Telegram (free + VIP channels), MailerLite email, push notifications (PWA/app), website member dashboard
- **Tier-aware routing** — free picks go everywhere, VIP picks only to paid subscribers; system checks subscription status before delivery
- **Scheduled delivery** — set a time (10am EST default), picks auto-publish across all channels
- **Delivery log** — record of every pick sent: channel, timestamp, delivery status, open rate (email), read rate (Telegram)
- **Last-minute override** — "Send Now" emergency button for injury news or line movement alerts
- **Telegram bot integration** — direct API connection (not Zapier) for instant, formatted messages with odds, units, analysis

### Notification System
- Push notifications via Web Push API (PWA) or Firebase (native app Phase 2)
- SMS alerts for VIP tier (Twilio)
- In-app notification bell with unread count
- Notification preferences per subscriber (channels they want, times, sports)

---

## CRITICAL MISSING: Real-Time Intelligence Dashboard

This is the analytics edge — the thing that makes WinFact picks actually sharp.

### Pre-Game Intelligence Feed
- **Live odds tracker** — pull from The Odds API every 15 min, display opening line vs. current line, flag significant moves (>1.5 points)
- **Sharp money alerts** — bet % vs. money % divergence flagged automatically (e.g., 35% of bets but 65% of money = sharp side)
- **Reverse line movement (RLM) detector** — line moving opposite to public betting %
- **Steam move alerts** — rapid synchronized line moves across books
- **Injury/lineup feed** — auto-pull from SportsDataIO, highlight late scratches with impact rating
- **Weather conditions** — for outdoor sports (MLB, NFL), auto-pull for venue weather
- **Consensus pick aggregator** — pull from 5–10 public services, show where the public is vs. where our model says

### Today's Games Command Center
- Full schedule for the day across all covered sports
- For each game: current odds (all books), our model line, edge %, public betting %s, sharp action indicator, injury flags, our pick status (posted/pending/skip)
- Color-coded by edge tier: green (strong), yellow (moderate), gray (no play)
- "Quick Pick" button — pre-fills the pick form with game data pulled automatically

### Model Output Panel
- Run model projections from within the admin (trigger Python scripts via API endpoint)
- Display multi-model consensus: Model A says -3.5, Model B says -4.2, market is -3, edge = +0.7 to +1.2
- Historical accuracy by model, sport, bet type
- Confidence interval display

---

## HIGH VALUE: Member Portal & App Layer

### Member Dashboard (subscriber-facing)
- **Today's picks** — filtered by their tier, formatted cleanly
- **Pick history** — full archive, filterable by sport/date/result
- **Performance stats** — their "following" stats: units profit if they tailed all picks, W/L record, ROI
- **Bankroll tracker** — input starting bankroll, track unit growth
- **Notification settings** — which channels, which sports, what times
- **Upgrade/downgrade** — self-service subscription management

### Free vs. VIP Content Gating
- Middleware that checks subscription tier before showing content
- Free users see teaser pick + blurred premium picks with "Unlock" CTA
- VIP-only content: sharp money alerts, model edge %, alternate lines analysis

---

## HIGH VALUE: Advanced SEO & Content Management

### SEO Command Center
- **Site health dashboard** — crawl errors, indexing status (Google Search Console API), Core Web Vitals
- **Keyword tracker** — track rankings for target keywords (sports betting picks, MLB picks today, etc.) — pull from Google Search Console
- **Internal linking suggester** — AI scans new blog posts, suggests internal links to existing content
- **Schema markup manager** — add/edit JSON-LD structured data (FAQ, Article, BreadcrumbList, SportsEvent) without touching code
- **Sitemap generator** — auto-regenerate on new content published
- **Canonical URL manager** — prevent duplicate content across sport-specific landing pages
- **Page speed monitor** — Lighthouse scores tracked over time
- **Backlink tracker** — pull from a free API (Ahrefs has no free tier; use Google Search Console's links data)

### Content Calendar & Blog Scheduler
- **Visual calendar view** — drag-and-drop scheduling for blog posts, free picks, social content
- **Content pipeline** — Idea → Draft → Review → Scheduled → Published stages
- **AI writing assistant** — Claude-powered blog post generator: input topic + keywords + sport, get full bilingual draft
- **Template library** — "Game Preview," "Free Pick of the Day," "Model Breakdown," "Sharp Money Report" templates
- **Social snippet generator** — auto-generate Twitter thread + IG caption from blog post
- **Publish to multiple destinations** — blog post goes to website + email newsletter + Telegram announcement
- **Duplicate for Spanish** — one-click translate/adapt English post for Spanish audience

---

## HIGH VALUE: Sales, Revenue & Business Analytics

### Revenue Dashboard
- MRR, ARR, total revenue — broken down by tier (Weekly/Monthly/VIP)
- New MRR, expansion MRR (upgrades), churned MRR — all tracked monthly
- LTV by tier, average subscription length
- Revenue by traffic source (organic, paid, referral)
- Stripe webhooks → your DB (real-time, not Zapier polling)

### Subscriber Analytics
- **Funnel visualization** — Visit → Sign up → Free → Paid → VIP conversion rates at each step
- **Cohort retention** — of subscribers who joined in Month X, how many are still active at Month 1, 2, 3, 6?
- **Churn analysis** — when do people cancel, what plan were they on, how long did they last?
- **Reactivation tracker** — lapsed subscribers, last active date, auto-trigger win-back campaign
- **Subscriber map** — geographic breakdown (FL, TX, NY, NJ, CA priority markets)
- **Language preference** — EN vs. ES split, engagement comparison

### Promotions & Discount Engine
- Create and manage promo codes (PICK80, etc.) — set % off, $ off, free trial days, expiration, usage limits
- Track promo performance: redemptions, conversion rate, revenue impact
- A/B test landing pages with different offers
- Flash sale scheduler — time-limited offers that auto-expire

### Referral & Commission System
- Full referral dashboard: referrer → referee → conversion tracking
- Commission tiers: $10/referral cash, free month at 5 referrals, VIP discount at 10
- **Affiliate program** — unique tracking links, commission rates per affiliate, payout tracking
- **Influencer/partner management** — custom commission rates, performance by partner
- **Payout queue** — pending commissions, approved/paid status, payment method (PayPal, Stripe, Venmo)
- Tax form collection (W-9 for US affiliates over $600)

---

## OPERATIONAL EXCELLENCE: Results & Performance Tracking

### Results Management
- **Settle picks** in bulk — enter final scores, system auto-calculates W/L/Push for all affected picks
- **CLV auto-calculator** — compare our pick line to closing line, track CLV per pick and in aggregate
- **Performance leaderboard** — public-facing: W/L record, units, ROI, by sport and by month
- **Verified record badge** — show picks were posted BEFORE game started (timestamp proof)
- **Model attribution** — which model called the winner, track model-by-model accuracy over time
- **Bad beat log** — track picks that lost despite high edge (variance documentation)

### Audit Trail
- Every pick logged with: post time, opening line at post, closing line, result, CLV
- Tamper-proof: picks can be edited pre-game but changes are logged with timestamp
- Export to CSV/PDF for public transparency reports

---

## AI-POWERED MODULES

### AI Analysis Assistant (Claude-powered, built into admin)
- **Pre-game brief** — input a game, get AI-generated "need to know" briefing: key trends, injuries, situational angles, model edge, sharp action summary
- **Pick writer** — input raw analysis notes, AI generates polished bilingual pick writeup
- **Injury impact analyzer** — paste injury report, AI estimates point spread impact
- **Line movement explainer** — input line history, AI explains why the line moved and who's likely behind it
- **Weekly recap generator** — auto-generate subscriber newsletter recap of the week's picks

### Predictive Alerts
- "Line about to close" notifications — games within 2 hours of start with strong edges not yet posted
- "Sharp steam incoming" — early warning based on book movement patterns
- "High-value game" daily highlight — AI flags top 3 games with strongest model edge each morning

---

## INFRASTRUCTURE & ENTERPRISE FEATURES

### Media & Asset Management
- Full media library with folders (pick graphics, blog images, social content, logos)
- Cloudflare R2 storage (cheap, fast CDN)
- Auto-resize on upload (thumbnail, social, full-size)
- Tag and search assets
- Usage tracker — see which images are used on which pages
- Bulk upload + bulk delete

### Multi-User Team Access
- Role-based access: Owner, Analyst, Writer, Support
- Analysts can run models and post picks, Writers can only manage blog/content, Support can see subscribers only
- Activity log — who did what, when

### API & Integrations Hub
- Central place to manage all API keys and connection status
- Health check dashboard — is Odds API responding? Is Telegram bot live? Is MailerLite connected?
- Webhook log — see every incoming/outgoing webhook with payload and status
- Rate limit monitor — avoid API overages

### Mobile Admin App
- PWA version of admin for on-the-go pick posting
- Quick pick form optimized for mobile
- Push notification to yourself for sharp money alerts

---

## Build Priority Order

| Phase | Focus | Timeline |
|-------|-------|----------|
| **Phase 1** | Distribution engine (Telegram + email auto-send from admin) | Immediate |
| **Phase 2** | Today's Games intelligence dashboard + odds/sharp money feeds | Month 1 |
| **Phase 3** | Member portal (subscriber dashboard, pick history, gating) | Month 1–2 |
| **Phase 4** | Revenue/subscriber analytics + referral/commission system | Month 2 |
| **Phase 5** | SEO command center + content calendar | Month 2–3 |
| **Phase 6** | AI assistant modules + advanced model integration | Month 3 |
| **Phase 7** | Media library, team access, API hub | Month 3–4 |
