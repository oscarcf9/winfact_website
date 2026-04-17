import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

/**
 * GET /api/admin/distribution/buffer-diag
 *
 * Admin-only read endpoint. Reports whether Buffer tokens and channel IDs are
 * visible to the running Vercel function (env-var-as-seen-at-runtime, not as
 * configured in the dashboard — there's a difference if a redeploy is needed
 * to pick up new vars). Masks tokens to 4-char prefix/suffix so they don't
 * leak into logs.
 */
export async function GET() {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const diag = {
    tokens: {
      BUFFER_LIVE_TOKEN: maskToken(process.env.BUFFER_LIVE_TOKEN),
      BUFFER_ACCESS_TOKEN: maskToken(process.env.BUFFER_ACCESS_TOKEN),
    },
    channels: {
      instagram: {
        envOverride: maskId(process.env.BUFFER_INSTAGRAM_CHANNEL_ID),
        hardcodedFallback: "692a85d829ea336fd63c6413",
      },
      facebook: {
        envOverride: maskId(process.env.BUFFER_FACEBOOK_CHANNEL_ID),
        hardcodedFallback: "692a863b29ea336fd63c647f",
      },
      twitter: {
        envOverride: maskId(process.env.BUFFER_TWITTER_CHANNEL_ID),
        hardcodedFallback: "69d014acaf47dacb6986f73f",
      },
      threads: {
        envOverride: maskId(process.env.BUFFER_THREADS_CHANNEL_ID),
        hardcodedFallback: "69d01392af47dacb6986f297",
      },
    },
    org: {
      envOverride: process.env.BUFFER_ORG_ID ?? null,
      hardcodedFallback: "68dde1d4ae0ea4e53700e8cf",
    },
    telegram: {
      TELEGRAM_ADMIN_CHAT_ID: process.env.TELEGRAM_ADMIN_CHAT_ID ? "SET" : "UNSET",
      TELEGRAM_FREE_CHAT_ID: process.env.TELEGRAM_FREE_CHAT_ID ? "SET" : "UNSET",
      TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN ? "SET" : "UNSET",
    },
    runtime: {
      vercelEnv: process.env.VERCEL_ENV ?? null,
      nodeEnv: process.env.NODE_ENV ?? null,
    },
  };

  return NextResponse.json(diag);
}

function maskToken(token: string | undefined): string {
  if (!token) return "UNSET";
  if (token.length < 8) return "SET_SHORT";
  return `SET (${token.slice(0, 4)}...${token.slice(-4)})`;
}

function maskId(id: string | undefined): string | null {
  if (!id) return null;
  if (id.length < 8) return "(short)";
  return `${id.slice(0, 4)}...${id.slice(-4)}`;
}
