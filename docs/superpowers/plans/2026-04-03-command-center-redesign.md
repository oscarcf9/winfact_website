# Command Center Redesign - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge Intelligence + AI Assistant into a unified Command Center page where cappers browse games with real odds, manually trigger AI analysis, and create/distribute picks - all without leaving the page.

**Architecture:** The existing Intelligence page (`/admin/intelligence`) becomes the Command Center. The AI Assistant page (`/admin/ai`) is eliminated with a redirect. The analysis panel is inline on the Intelligence page. All AI output is Spanish-only. The gamesToday refresh is fixed to store odds data and compute edge tiers.

**Tech Stack:** Next.js 14, React, Drizzle ORM (Turso/SQLite), Anthropic Claude API (claude-sonnet-4-20250514), DOMPurify, Tailwind CSS.

---

## Task Overview

1. Add odds columns to gamesToday schema
2. Fix refresh to store odds data + compute edge tiers
3. Update game cards to show odds data
4. Add inline analysis panel with Spanish-only AI
5. Fix pickStatus backlink in picks API
6. Fix weekly recap (SQL filter + Spanish only)
7. Remove AI Assistant page + sidebar update
8. Error handling + DOMPurify sanitization

---

## Task 1: Schema - Add Odds Columns

**Files:** Modify `src/db/schema/games-today.ts`

Add 6 columns for raw odds data after the `weather` field.

---

## Task 2: Fix Refresh - Store Odds + Compute Edge

**Files:** Modify `src/app/api/admin/games-today/route.ts`

Parse h2h/spreads/totals from bookmakers, store in new columns, compute edgeTier.

---

## Task 3: Update Game Cards

**Files:** Modify `src/components/admin/intelligence-dashboard.tsx`, `messages/en.json`, `messages/es.json`

Show moneyline, spread, total on cards. Fix Picks Posted counter.

---

## Task 4: Inline Analysis Panel

**Files:** Modify `src/components/admin/intelligence-dashboard.tsx`, `src/lib/ai-assistant.ts`, `src/app/api/admin/ai/analysis/route.ts`

Add slide-out panel with pre-filled game data, Spanish-only AI prompt, save/publish actions.

---

## Task 5: Fix pickStatus Backlink

**Files:** Modify `src/app/api/admin/picks/route.ts`

After creating pick, update matching gamesToday record.

---

## Task 6: Fix Weekly Recap

**Files:** Modify `src/app/api/admin/ai/recap/route.ts`, `src/lib/ai-assistant.ts`

SQL date filter, Spanish-only output, Telegram-formatted.

---

## Task 7: Remove AI Page + Sidebar

**Files:** Modify `src/app/[locale]/admin/ai/page.tsx`, `src/components/admin/sidebar.tsx`, `messages/en.json`, `messages/es.json`

Redirect /admin/ai, remove nav item, rename to Command Center.

---

## Task 8: Error Handling + DOMPurify

**Files:** Modify `src/components/admin/intelligence-dashboard.tsx`

Install dompurify, replace silent catch, sanitize HTML output.
