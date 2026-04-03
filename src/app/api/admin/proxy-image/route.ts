import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

const ALLOWED_DOMAINS = [
  "a.espncdn.com",
  "media.api-sports.io",
  "crests.football-data.org",
  "upload.wikimedia.org",
];

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    const parsed = new URL(url);
    if (!ALLOWED_DOMAINS.some((d) => parsed.hostname === d || parsed.hostname.endsWith(`.${d}`))) {
      return NextResponse.json({ error: "Domain not allowed" }, { status: 403 });
    }

    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json({ error: "Upstream fetch failed" }, { status: 502 });
    }

    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "image/png";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=604800",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch image" }, { status: 500 });
  }
}
