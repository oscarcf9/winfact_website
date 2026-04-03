# WinFact Ticket Generator — Integration Plan

> **Target:** WinFact Picks admin panel (Next.js App Router, Vercel)
> **Route:** `/admin/ticket-generator`
> **Date:** 2026-04-03

---

## 1. Architecture Decisions

### 1.1 — Rendering Approach: HTML/CSS + html-to-image

**Decision:** Render the ticket as a styled React component (HTML/CSS), then export via `html-to-image` (or `html2canvas`) to PNG.

**Why:**
- The ticket design is straightforward (no complex Canvas/SVG operations needed)
- HTML/CSS gives us Tailwind-compatible styling + easy maintenance
- `html-to-image` uses the DOM renderer directly (better font rendering than Canvas API)
- Live preview is just rendering the React component — no separate preview pipeline needed
- The Flutter original uses the same approach (widget → screenshot → PNG)

**Export library:** `html-to-image` (preferred over `html2canvas` — better text rendering, smaller bundle, supports `toBlob` and `toPng` natively)

**Resolution:** Export at 2x pixel ratio for Retina quality (1770x1240px actual output from 885x620 logical)

### 1.2 — Form Architecture: Single Component + Conditional Rendering

**Decision:** One `TicketForm` component with `useState` for form state, conditional fields based on bet type and sub-type.

**Why:**
- The form is not complex enough to need React Hook Form (no deep nesting, no cross-field validation schemas)
- Only 2 bet types (Single/Parlay) with minor field variations
- `useState` + simple handler functions keeps it readable and lightweight
- Matches the Flutter original's single-screen approach

### 1.3 — Sport/Bet-Type Configuration: TypeScript Config File

**Decision:** Hardcoded TypeScript configuration object mapping sports to their available bet sub-types.

**Why:**
- The current Flutter app has a flat list of 10 sub-types — this is a small, stable dataset
- Adding new bet types requires design changes anyway (new display labels, new ticket layouts)
- Database storage adds unnecessary complexity for something that changes quarterly at most
- A `.ts` config file is version-controlled, type-safe, and zero-latency

**Future option:** If the team wants admin-editable bet types, we can migrate to DB later without changing the component architecture.

### 1.4 — Image Export Pipeline: html-to-image → toBlob → download

```
TicketPreview (React) → html-to-image.toPng() → Blob → download link
                                                     → optional R2 upload
```

**Steps:**
1. Render `<TicketCanvas>` component with all bet data (hidden or visible)
2. Call `toPng(element, { pixelRatio: 2, quality: 1.0 })` on the ticket DOM node
3. Convert to Blob for download: `saveAs(blob, 'ticket.png')`
4. Optionally upload to R2 via API route

**No server-side rendering** — everything is client-side. No Puppeteer/Playwright needed.

### 1.5 — Storage: Download Only (Phase 1), R2 Optional (Phase 2)

**Phase 1:** Download directly to user's machine. No server storage. Matches current Flutter behavior.

**Phase 2 (optional):** Add "Save to Library" button that uploads to Cloudflare R2 via existing media upload infrastructure and creates a record in the `media` table.

**Rationale:** The ticket generator is a tool, not a content pipeline. Most tickets will be used immediately (posted to social, attached to picks). Permanent storage is a nice-to-have, not a requirement.

### 1.6 — Logo/Asset Management: Public Folder + Inline

- **Banner image** (`hero4_new.png`): Store in `/public/admin/ticket-assets/` — not in R2 (it's a static asset, not user-uploaded content)
- **Icons** (`copy_icon.png`, `share.png`): Inline as React SVG components for crisp rendering at any scale
- **Fonts** (`MyCustomFont`, `Neusa-Medium`, `Neusa-WideMedium`): Load via `@font-face` in a ticket-specific CSS module, scoped to avoid affecting global styles
- **Team logos**: Optional file upload, converted to base64 data URL for embedding in the ticket (no persistence needed)

---

## 2. File Structure

```
src/app/[locale]/admin/ticket-generator/
├── page.tsx                              # Server component: just imports TicketGenerator

src/components/admin/ticket-generator/
├── ticket-generator.tsx                  # Main client component: form + preview layout
├── ticket-form.tsx                       # Left panel: all form inputs
├── ticket-preview.tsx                    # Right panel: live preview + export controls
├── ticket-canvas.tsx                     # The actual ticket render (HTML/CSS replica)
├── ticket-canvas-parlay.tsx              # Parlay-specific ticket variations
├── sport-config.ts                       # Sport → bet sub-type mappings
├── payout-calculator.ts                  # Odds → payout math (TypeScript port)
├── ticket-types.ts                       # TypeScript interfaces (BetData, TeamData, ParlayLeg)
├── ticket-fonts.css                      # @font-face declarations for ticket fonts
└── use-ticket-export.ts                  # Custom hook for html-to-image export logic

public/admin/ticket-assets/
├── hero4_new.png                         # Banner image
├── MyCustomFont-Regular.otf              # Primary ticket font
├── Neusa-Medium.otf                      # Team acronym font
└── Neusa-WideMedium.otf                  # Bet type display font
```

### 2.1 — Page Component

```tsx
// src/app/[locale]/admin/ticket-generator/page.tsx
import { TicketGenerator } from "@/components/admin/ticket-generator/ticket-generator";

export default function TicketGeneratorPage() {
  return <TicketGenerator />;
}
```

That's it. Auth is handled by the admin layout (`src/app/[locale]/admin/layout.tsx`) which already:
1. Checks Clerk session
2. Verifies DB role === "admin"
3. Redirects non-admins

### 2.2 — Component Hierarchy

```
TicketGenerator (client, "use client")
├── TicketForm
│   ├── BetTypeSelector (Single/Parlay radio)
│   ├── SubTypeDropdown (bet sub-type)
│   ├── BetDescriptionInput
│   ├── TeamInputs (×2 for single, ×N for parlay legs)
│   │   ├── AcronymField
│   │   ├── ScoreField
│   │   └── LogoUpload (optional)
│   ├── OddsInput
│   └── WagerInput + PaidDisplay (auto-calculated)
└── TicketPreview
    ├── TicketCanvas (the visual ticket — ref'd for export)
    └── ExportControls (Generate PNG, Download, Preview Full Size)
```

---

## 3. API Routes

### 3.1 — No API Routes Needed (Phase 1)

The ticket generator is entirely client-side:
- Form state is local React state
- Payout calculation is a pure function
- Image export is client-side via `html-to-image`
- Download is a direct blob download

### 3.2 — Optional API Route (Phase 2 — R2 Storage)

```
POST /api/admin/ticket-generator/save
```

**Request:** `FormData` with PNG blob
**Response:** `{ url: string, mediaId: string }`
**Auth:** `requireAdmin()` — same pattern as all other admin API routes

Implementation would reuse the existing R2 upload logic from the media gallery.

---

## 4. Security Compliance

### 4.1 — Access Control (Already Covered)

| Protection Layer | Status | Details |
|-----------------|--------|---------|
| Clerk middleware | ✅ Already protects all `/admin/*` | Redirects unauthenticated users to login |
| Admin layout DB check | ✅ Already protects all admin pages | Checks `users.role === "admin"` via Drizzle |
| API route auth | N/A Phase 1 | If Phase 2 API added: use `requireAdmin()` |
| Sitemap exclusion | ✅ Automatic | Sitemap only includes hardcoded public routes |
| robots.txt | ✅ Already blocks `/admin/` | Existing `Disallow: /admin/` rule |

### 4.2 — Additional Security Measures

- Add `<meta name="robots" content="noindex, nofollow">` in the page's metadata export (belt-and-suspenders)
- No `console.log` referencing "ticket generator" in production — use `if (process.env.NODE_ENV === 'development')` guards
- Exported PNG will be clean — `html-to-image` produces standard PNG with no EXIF, no metadata, no hidden text
- No reference to "WinFact", "ticket generator", or "generated" in the PNG output

### 4.3 — Sidebar Integration

The ticket generator should be added to the sidebar under a new **"Tools"** section (collapsible, below Settings):

```tsx
// In sidebar.tsx, add to nav items:
{
  title: "Tools",
  items: [
    { label: "Ticket Generator", href: "/admin/ticket-generator", icon: ReceiptIcon }
  ]
}
```

This is safe because:
- The entire sidebar only renders inside the admin layout
- The admin layout already gates on `role === "admin"`
- Non-admin users never see the sidebar component

---

## 5. Implementation Phases

### Phase 1: Core Ticket Generator (MVP)

**Deliverables:**
1. Admin page at `/admin/ticket-generator`
2. Form with all current bet types and sub-types
3. Live ticket preview (HTML/CSS replica)
4. PNG export/download
5. Payout auto-calculation
6. Sidebar navigation item

**Scope:** Pixel-perfect replica of the Flutter ticket output, client-side only.

### Phase 2: Enhancements (Post-Launch)

**Potential additions:**
1. Save to R2 media library
2. Link generated tickets to picks in the database
3. Batch generation (CSV import → multiple tickets)
4. Additional sportsbook themes beyond Hard Rock Bet
5. Fix the parlay odds display bug (calculate real combined odds instead of hardcoded "+782")
6. Add date/time display to tickets
7. Template presets for common bet types

---

## 6. Known Bugs to Fix During Port

These bugs exist in the Flutter original and should be **fixed** in the web version:

1. **Parlay odds display** — Calculate and display real combined odds instead of hardcoded "+782"
2. **Ticket height clipping** — Ensure the full ticket renders (widget is 820px but captured at 620px)
3. **Ticket ID regeneration** — Memoize the ID so it's consistent between preview and export
4. **Empty bet title fallback** — The `_getBetTitle()` function references team names that are never collected; the web version should only use `betDescription`

---

## 7. Dependencies to Add

```json
{
  "html-to-image": "^1.11.x",
  "file-saver": "^2.0.x"
}
```

**Dev dependencies:**
```json
{
  "@types/file-saver": "^2.0.x"
}
```

No other new dependencies needed. The form, preview, and styling all use existing Next.js + Tailwind infrastructure.
