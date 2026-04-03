# Buffer Social Cross-Post Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cross-post live game commentary and win celebrations to Twitter/X and Threads via Buffer's API, reusing the same content already posted to Telegram.

**Architecture:** After the existing commentary bot posts to Telegram, it also sends the same message to Buffer which publishes to connected Twitter/X and Threads channels. Fire-and-forget — Buffer failures never block Telegram delivery.

**Tech Stack:** Buffer REST API v1 (`api.bufferapp.com/1/`), existing commentary bot infrastructure, existing Telegram win celebrations.

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/lib/buffer.ts` | Buffer API client — post to connected channels |
| Modify | `src/app/api/cron/live-commentary/route.ts` | Cross-post commentary to Buffer after Telegram |
| Modify | `src/app/api/cron/settle-picks/route.ts` | Cross-post win celebrations to Buffer |

---

## Environment Variables Required

```
BUFFER_ACCESS_TOKEN=   # From https://publish.buffer.com/settings/api
BUFFER_PROFILE_IDS=    # Comma-separated Buffer profile IDs (Twitter + Threads)
```

To get profile IDs after connecting accounts in Buffer:
```bash
curl "https://api.bufferapp.com/1/profiles.json" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Each profile object has an `id` and `service` field. Grab the IDs for your Twitter and Threads profiles.

---

### Task 1: Buffer API Client

**Files:**
- Create: `src/lib/buffer.ts`

- [ ] **Step 1: Create the Buffer client**

Create `src/lib/buffer.ts`:

```typescript
/**
 * Buffer API client for cross-posting to Twitter/X and Threads.
 * Uses Buffer REST API v1: https://api.bufferapp.com/1/
 * Fire-and-forget — failures are logged but never throw.
 */

const BUFFER_API = "https://api.bufferapp.com/1";

/**
 * Post a message to all configured Buffer channels (Twitter/X, Threads).
 * Publishes immediately (now=true).
 * Returns { ok, error? } — never throws.
 */
export async function postToBuffer(text: string): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.BUFFER_ACCESS_TOKEN;
  const profileIds = process.env.BUFFER_PROFILE_IDS;

  if (!token || !profileIds) {
    return { ok: false, error: "Buffer not configured" };
  }

  const ids = profileIds.split(",").map((id) => id.trim()).filter(Boolean);
  if (ids.length === 0) {
    return { ok: false, error: "No Buffer profile IDs configured" };
  }

  try {
    // Buffer v1 API expects application/x-www-form-urlencoded
    const params = new URLSearchParams();
    params.append("text", text);
    params.append("now", "true");
    for (const id of ids) {
      params.append("profile_ids[]", id);
    }

    const response = await fetch(`${BUFFER_API}/updates/create.json`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[buffer] API error:", response.status, errorText);
      return { ok: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    const data = await response.json();
    if (data.success) {
      return { ok: true };
    }

    return { ok: false, error: data.message || "Unknown Buffer error" };
  } catch (error) {
    console.error("[buffer] Request failed:", error);
    return { ok: false, error: String(error) };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/buffer.ts
git commit -m "feat: add Buffer API client for social cross-posting"
```

---

### Task 2: Cross-Post Commentary to Buffer

**Files:**
- Modify: `src/app/api/cron/live-commentary/route.ts`

After the Telegram post succeeds, also send to Buffer. Fire-and-forget — Buffer failures don't affect the Telegram flow or the response.

- [ ] **Step 1: Add Buffer import**

In `src/app/api/cron/live-commentary/route.ts`, add this import after the existing imports:

```typescript
import { postToBuffer } from "@/lib/buffer";
```

- [ ] **Step 2: Add Buffer cross-post after Telegram send**

In the cron route, after the successful Telegram send (after `const result = await sendTelegramMessage(chatId, comment);` and its error check), add before the DB insert:

```typescript

    // Cross-post to Twitter/Threads via Buffer (fire-and-forget)
    postToBuffer(comment).catch((err) =>
      console.error("[commentary] Buffer cross-post failed:", err)
    );
```

The full section should read:

```typescript
    const result = await sendTelegramMessage(chatId, comment);

    if (!result.ok) {
      return NextResponse.json({ status: "error", reason: "telegram_send_failed", error: result.error });
    }

    // Cross-post to Twitter/Threads via Buffer (fire-and-forget)
    postToBuffer(comment).catch((err) =>
      console.error("[commentary] Buffer cross-post failed:", err)
    );

    // 6. Log the commentary
    await db.insert(commentaryLog).values({
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cron/live-commentary/route.ts
git commit -m "feat: cross-post live commentary to Buffer (Twitter/Threads)"
```

---

### Task 3: Cross-Post Win Celebrations to Buffer

**Files:**
- Modify: `src/app/api/cron/settle-picks/route.ts`

- [ ] **Step 1: Add Buffer import**

In `src/app/api/cron/settle-picks/route.ts`, add after the existing telegram import:

```typescript
import { postToBuffer } from "@/lib/buffer";
```

- [ ] **Step 2: Add Buffer cross-post alongside win celebration**

In the win celebration block (the `if (settlement.result === "win")` block that already calls `sendWinCelebration`), add a Buffer cross-post using the same formatted message. Replace the existing win celebration block:

```typescript
          // Post win celebration to Telegram (fire-and-forget)
          if (settlement.result === "win") {
            sendWinCelebration({
              sport: pick.sport,
              matchup: pick.matchup,
              pickText: pick.pickText,
            }).catch((err) =>
              console.error("[settle-picks] Win celebration failed:", err)
            );
          }
```

with:

```typescript
          // Post win celebration to Telegram + Buffer (fire-and-forget)
          if (settlement.result === "win") {
            const celebrationPick = {
              sport: pick.sport,
              matchup: pick.matchup,
              pickText: pick.pickText,
            };

            sendWinCelebration(celebrationPick).catch((err) =>
              console.error("[settle-picks] Win celebration failed:", err)
            );

            // Cross-post to Twitter/Threads via Buffer
            // Import formatWinCelebrationMessage to get the same text
            import("@/lib/telegram-templates").then(({ formatWinCelebrationMessage }) => {
              const message = formatWinCelebrationMessage(celebrationPick);
              postToBuffer(message).catch((err) =>
                console.error("[settle-picks] Buffer win celebration failed:", err)
              );
            }).catch(() => {});
          }
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cron/settle-picks/route.ts
git commit -m "feat: cross-post win celebrations to Buffer (Twitter/Threads)"
```

---

## Post-Implementation Checklist

- [ ] `npm run build` passes with no TypeScript errors
- [ ] `BUFFER_ACCESS_TOKEN` and `BUFFER_PROFILE_IDS` added to Vercel env vars
- [ ] Buffer profile IDs verified via `GET /profiles.json` curl
- [ ] Test: commentary posts appear on Twitter/X and Threads after Telegram
- [ ] Test: win celebrations appear on Twitter/X and Threads after settlement
- [ ] Buffer failures don't block Telegram delivery or crash crons

---

## Cost

| Component | Cost/month |
|-----------|------------|
| Buffer Essentials (2 channels: X + Threads) | ~$12/month |
| Buffer API calls (~720/month) | Included |
| **Total additional** | **~$12/month** |

Combined with the commentary bot: **~$13.50/month total** (Claude API + Buffer).
