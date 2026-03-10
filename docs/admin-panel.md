# WinFact Picks - Admin Panel Documentation

> **Last updated:** March 2026
> **Access:** Requires Clerk authentication + `admin` role in database

---

## 1. Authentication & Authorization

### Middleware Protection (`src/middleware.ts`)

- All routes matching `/(en|es)/admin(.*)` require authentication **and** admin role
- All API routes matching `/api/admin(.*)` require authentication **and** admin role
- Unauthorized users receive a `403 Forbidden` response on API routes
- Unauthenticated users are redirected to `/sign-in`
- Non-admin authenticated users are redirected to `/`

### Admin Role Verification

1. Clerk middleware checks `publicMetadata.role` for initial gate
2. Admin layout (`src/app/[locale]/admin/layout.tsx`) double-checks by querying the `users` table for `role = "admin"`
3. Both checks must pass for access

### Granting Admin Access

Set `role: "admin"` in:
- The `users` database table (`role` column)
- Clerk user's `publicMetadata` (via Clerk dashboard or API)

---

## 2. Admin Layout & Navigation

### Layout (`src/app/[locale]/admin/layout.tsx`)

- Fixed sidebar on desktop (256px / `lg:pl-64`)
- Light gray background (`#F8FAFC`)
- Content area with responsive padding
- Mobile: hamburger menu with slide-out drawer

### Sidebar Navigation (`src/components/admin/sidebar.tsx`)

**CONTENT Section:**
| Item | Icon | Route |
|------|------|-------|
| Dashboard | LayoutDashboard | `/admin` |
| Picks | Target | `/admin/picks` |
| Blog | FileText | `/admin/blog` |
| Media | Image | `/admin/media` |
| Site Content | Settings | `/admin/content` |

**ANALYTICS Section:**
| Item | Icon | Route |
|------|------|-------|
| Subscribers | Users | `/admin/subscribers` |
| Performance | BarChart3 | `/admin/performance` |
| Referrals | Gift | `/admin/referrals` |

**Additional:**
- Active link highlighting (gradient background, colored border & icon)
- Clerk `UserButton` for profile management
- "View Site" external link
- WinFact logo/branding

---

## 3. Dashboard (`/admin`)

**File:** `src/app/[locale]/admin/page.tsx`

### Statistics Cards

| Metric | Source | Description |
|--------|--------|-------------|
| Active Subscribers | `subscriptions` table (status = `active`) | Count of active paying users |
| Picks This Month | `picks` table (publishedAt in current month) | Picks published this month |
| Published Posts | `posts` table (status = `published`) | Total published blog posts |
| Monthly Revenue | Placeholder (`—`) | Not yet implemented |

### Quick Actions

| Button | Target |
|--------|--------|
| New Pick | `/admin/picks/new` |
| New Post | `/admin/blog/new` |
| View Site | `/` (external) |
| Performance Dashboard | `/admin/performance` |

### Recent Picks Table

- Shows last 5 picks ordered by creation date
- Columns: Sport, Matchup, Pick Text, Status, Result
- Status badges: `published` (blue), `settled` (green), `draft` (gray)
- Result badges: `win` (green), `loss` (red), `push` (yellow)

---

## 4. Picks Management (`/admin/picks`)

### 4.1 Picks List Page

**File:** `src/app/[locale]/admin/picks/page.tsx`

- Displays up to 100 picks, newest first
- **Status filter tabs:** All, Draft, Published, Settled
- **Sport filter** support

**Table Columns:**

| Column | Description |
|--------|-------------|
| Sport | MLB, NFL, NBA, NHL, Soccer, NCAA |
| Matchup | Team vs Team |
| Pick Text | The actual pick recommendation |
| Odds | American odds format with +/- sign |
| Units | Wager size |
| Tier | Free / VIP badge |
| Status | Draft / Published / Settled badge |
| Result | Win / Loss / Push / — |
| Actions | Edit link |

- Empty state shows "Create your first pick" prompt with link to `/admin/picks/new`

### 4.2 Create Pick (`/admin/picks/new`)

**File:** `src/app/[locale]/admin/picks/new/page.tsx`
**Form Component:** `src/components/admin/pick-form.tsx`

**Form Fields:**

| Field | Type | Required | Options/Notes |
|-------|------|----------|---------------|
| Sport | Dropdown | Yes | MLB, NFL, NBA, NHL, Soccer, NCAA |
| League | Text | No | Optional sub-league |
| Matchup | Text | Yes | e.g., "Lakers vs Celtics" |
| Pick Text | Text | Yes | e.g., "Lakers -3.5" |
| Odds | Number | Yes | American odds (e.g., -110, +150) |
| Units | Number | Yes | Wager units |
| Model Edge | Number | No | Edge percentage |
| Confidence | Dropdown | Yes | `standard` / `strong` / `top` |
| Analysis (EN) | Textarea | No | English analysis text |
| Analysis (ES) | Textarea | No | Spanish analysis text |
| Tier | Dropdown | Yes | `free` / `vip` |
| Status | Dropdown | Yes | `draft` / `published` / `settled` |
| Result | Dropdown | Conditional | Only shown when status = `settled`. Options: `win` / `loss` / `push` |
| Closing Odds | Number | Conditional | Only shown when status = `settled` |

**API:** `POST /api/admin/picks`
- Auto-sets `publishedAt` when status = `published`
- Auto-sets `settledAt` when status = `settled`
- Returns new pick UUID

### 4.3 Edit Pick (`/admin/picks/[id]`)

**File:** `src/app/[locale]/admin/picks/[id]/page.tsx`

- Same form as create, pre-populated with existing data
- Tracks status transitions (draft -> published -> settled)

**API:** `PUT /api/admin/picks/[id]`
- Sets `publishedAt` on first publish (not overwritten on subsequent edits)
- Sets `settledAt` on settle
- **Auto-calculates CLV** when settling with closing odds:
  ```
  CLV = (closingOdds_implied_probability - openOdds_implied_probability) × 100
  ```

**API:** `DELETE /api/admin/picks/[id]`
- Deletes the pick record

---

## 5. Blog Management (`/admin/blog`)

### 5.1 Blog List Page

**File:** `src/app/[locale]/admin/blog/page.tsx`

- Displays up to 100 posts, newest first
- **Status filter tabs:** All, Draft, Published, Scheduled

**Table Columns:**

| Column | Description |
|--------|-------------|
| Title | English title (truncated) |
| Slug | URL-safe identifier (monospace) |
| Category | free_pick / game_preview / strategy / model_breakdown / news |
| Status | Draft / Published / Scheduled badge |
| Published Date | Formatted date or — |
| Actions | Edit link |

### 5.2 Create Post (`/admin/blog/new`)

**File:** `src/app/[locale]/admin/blog/new/page.tsx`
**Form Component:** `src/components/admin/post-form.tsx`

**Form Fields:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Title (EN) | Text | Yes | English title |
| Title (ES) | Text | No | Spanish title |
| Slug | Text | Yes | Auto-generated from EN title, or manual entry |
| Slug Generator | Button | — | Converts title to URL-safe slug |
| Body (EN) | Textarea | Yes | English content |
| Body (ES) | Textarea | No | Spanish content |
| Category | Dropdown | Yes | 5 category options |
| Featured Image | Text (URL) | No | Image URL |
| SEO Title | Text | No | Custom title for search engines |
| SEO Description | Textarea | No | Custom meta description |
| Status | Dropdown | Yes | `draft` / `published` / `scheduled` |
| Author | Text | No | Defaults to "WinFact" |
| Sport Tags | Checkboxes | No | MLB, NFL, NBA, NHL, Soccer, NCAA |

**API:** `POST /api/admin/blog`
- Creates post record in `posts` table
- Creates tag entries in `postTags` junction table
- Auto-sets `publishedAt` if status = `published`
- Author defaults to "WinFact"

### 5.3 Edit Post (`/admin/blog/[id]`)

**File:** `src/app/[locale]/admin/blog/[id]/page.tsx`

- Same form as create, pre-populated
- Tags replaced entirely on save (delete old, insert new)

**API:** `PUT /api/admin/blog/[id]`
- Updates post metadata
- Replaces all sport tags
- Sets `publishedAt` only on first publish
- Updates `updatedAt` timestamp

**API:** `DELETE /api/admin/blog/[id]`
- Deletes post tags first (cascade safety)
- Then deletes post record

---

## 6. Media Library (`/admin/media`)

**File:** `src/app/[locale]/admin/media/page.tsx`

### Current Features

- Grid view of uploaded media (up to 100 items)
- Ordered by upload date (newest first)
- Each card displays:
  - Thumbnail / preview image
  - Filename
  - File size (KB)
  - Dimensions (width × height)
  - MIME type for non-image files
- Hover scale effect on images
- Empty state with upload icon

### Pending (Phase 6)

> Media upload to Cloudflare R2 will be available in Phase 6

**Database schema is ready** — `media` table supports:
- Multiple URL variants (original, WebP, thumbnail)
- File metadata (size, MIME type, dimensions)
- Alt text for accessibility

---

## 7. Site Content Editor (`/admin/content`)

**File:** `src/app/[locale]/admin/content/page.tsx`
**Component:** `src/components/admin/content-editor.tsx`

### Purpose

Key-value editor for dynamic site content that can be updated without code deploys.

### Content Blocks

Editable content includes:
- Hero text
- Promo banner copy
- Testimonials
- Any other site-wide dynamic text

### Features

| Feature | Description |
|---------|-------------|
| Inline editing | Each content item has a textarea for its value |
| Auto-save on blur | Content saves when textarea loses focus |
| Manual save button | Per-item save with loading state |
| "Saved" indicator | Success feedback after save |
| Add new block | Button to create new content entries |
| Timestamp display | Shows when each item was last updated |

**API:** `PUT /api/admin/content`
- Upserts key-value pairs (creates if new, updates if existing)
- Body: `{ key: string, value: string }`
- Updates `updatedAt` timestamp

**Database:** `siteContent` table (key-value store, value can be JSON)

---

## 8. Subscribers Management (`/admin/subscribers`)

**File:** `src/app/[locale]/admin/subscribers/page.tsx`

### Statistics Cards

| Metric | Filter |
|--------|--------|
| Total Users | All users |
| Active | Subscription status = `active` |
| Trialing | Subscription status = `trialing` |
| Cancelled | Subscription status = `cancelled` |

### Filter Tabs

`All` | `active` | `trialing` | `past_due` | `cancelled` | `none` (no subscription)

### Subscribers Table

| Column | Description |
|--------|-------------|
| Email | User email |
| Name | User name |
| Role | Admin / Member badge |
| Plan | Subscription tier (free / vip_weekly / vip_monthly / season_pass) or `—` |
| Status | active / trialing / past_due / cancelled / — |
| Join Date | User creation date |

**Data source:** JOIN of `users` and `subscriptions` tables

---

## 9. Performance Dashboard (`/admin/performance`)

**File:** `src/app/[locale]/admin/performance/page.tsx`

### Key Metrics (All-Time)

| Metric | Calculation | Display |
|--------|------------|---------|
| Win Rate | wins / (wins + losses) × 100 | Percentage |
| Record | W - L - P | Wins, Losses, Pushes |
| Units Won | Σ(win units) - Σ(loss units) | Green if positive, Red if negative |
| ROI | unitsWon / totalRisked × 100 | Percentage |
| Avg CLV | Average CLV across settled picks | Percentage |

### By-Sport Breakdown Table

| Column | Description |
|--------|-------------|
| Sport | Sport name |
| Record | W - L - P for that sport |
| Win% | Sport-specific win rate |
| Units | Color-coded profit/loss |

### Data Source

- Queries all picks with `status = "settled"`
- Aggregates by sport
- Win = result `win`, Loss = result `loss`, Push = result `push`
- Pushes excluded from win rate denominator

---

## 10. Referrals Management (`/admin/referrals`)

**File:** `src/app/[locale]/admin/referrals/page.tsx`

### Statistics Cards

| Metric | Calculation |
|--------|------------|
| Total Referrals | Count of all referral records |
| Converted | Count where status = `converted` |
| Rewards Given | Count where rewardApplied = `true` |
| Conversion Rate | converted / total × 100 |

### Referrals Table

| Column | Description |
|--------|-------------|
| Referrer | User email/name of referrer |
| Referred Email | Email of referred person |
| Status | `pending` (yellow) / `converted` (green) |
| Reward | `Applied` / `—` |
| Date | Referral creation date |

---

## 11. Admin API Reference

### Picks

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/picks` | Create new pick |
| PUT | `/api/admin/picks/[id]` | Update existing pick |
| DELETE | `/api/admin/picks/[id]` | Delete pick |

**POST Body:**
```json
{
  "sport": "NBA",
  "league": "optional",
  "matchup": "Lakers vs Celtics",
  "pickText": "Lakers -3.5",
  "odds": -110,
  "units": 2,
  "modelEdge": 5.2,
  "confidence": "strong",
  "analysisEn": "English analysis...",
  "analysisEs": "Spanish analysis...",
  "tier": "vip",
  "status": "published"
}
```

**PUT Body (settle example):**
```json
{
  "status": "settled",
  "result": "win",
  "closingOdds": -120
}
```

**CLV Auto-Calculation on Settle:**
- Converts both opening and closing American odds to implied probabilities
- CLV = (closing_probability - opening_probability) × 100
- Stored in `clv` column

### Blog

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/blog` | Create new post |
| PUT | `/api/admin/blog/[id]` | Update post |
| DELETE | `/api/admin/blog/[id]` | Delete post & tags |

**POST Body:**
```json
{
  "titleEn": "Game Preview: Lakers vs Celtics",
  "titleEs": "Vista previa: Lakers vs Celtics",
  "slug": "game-preview-lakers-celtics",
  "bodyEn": "Full article content...",
  "bodyEs": "Contenido del artículo...",
  "category": "game_preview",
  "featuredImage": "https://...",
  "seoTitle": "Custom SEO Title",
  "seoDescription": "Custom meta description",
  "status": "published",
  "author": "WinFact",
  "tags": ["NBA"]
}
```

### Site Content

| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/api/admin/content` | Upsert content key-value |

**PUT Body:**
```json
{
  "key": "hero_title",
  "value": "Data-Driven Sports Picks"
}
```

---

## 12. Admin Components

### Sidebar (`src/components/admin/sidebar.tsx`)

- Responsive navigation with mobile drawer
- Active state detection based on current pathname
- Clerk UserButton integration
- 8 navigation items across 2 sections

### Pick Form (`src/components/admin/pick-form.tsx`)

- Reused for both create and edit
- Conditional fields based on status (result/closingOdds only for settled)
- Client-side validation
- Loading states on submit
- Cancel button returns to picks list

### Post Form (`src/components/admin/post-form.tsx`)

- Reused for both create and edit
- Slug auto-generation from English title
- Sport tag checkboxes
- SEO fields section
- Client-side validation
- Loading states on submit

### Content Editor (`src/components/admin/content-editor.tsx`)

- Dynamic key-value list
- Per-item save buttons with loading/success states
- Auto-save on textarea blur
- Add new content block functionality

---

## 13. File Reference

```
Admin Pages:
├── src/app/[locale]/admin/
│   ├── layout.tsx              # Auth guard + sidebar layout
│   ├── page.tsx                # Dashboard
│   ├── picks/
│   │   ├── page.tsx            # Picks list
│   │   ├── new/page.tsx        # Create pick
│   │   └── [id]/page.tsx       # Edit pick
│   ├── blog/
│   │   ├── page.tsx            # Posts list
│   │   ├── new/page.tsx        # Create post
│   │   └── [id]/page.tsx       # Edit post
│   ├── media/page.tsx          # Media library
│   ├── content/page.tsx        # Site content editor
│   ├── subscribers/page.tsx    # Subscriber management
│   ├── performance/page.tsx    # Performance analytics
│   └── referrals/page.tsx      # Referral tracking

Admin API Routes:
├── src/app/api/admin/
│   ├── picks/
│   │   ├── route.ts            # POST (create)
│   │   └── [id]/route.ts       # PUT, DELETE
│   ├── blog/
│   │   ├── route.ts            # POST (create)
│   │   └── [id]/route.ts       # PUT, DELETE
│   └── content/
│       └── route.ts            # PUT (upsert)

Admin Components:
├── src/components/admin/
│   ├── sidebar.tsx             # Navigation sidebar
│   ├── pick-form.tsx           # Pick create/edit form
│   ├── post-form.tsx           # Post create/edit form
│   └── content-editor.tsx      # CMS key-value editor
```
