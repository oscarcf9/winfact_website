import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { generateBlogPost } from "@/lib/ai-assistant";

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const { topic, sport, keywords } = await req.json();
    const result = await generateBlogPost(topic, sport, keywords || []);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Blog generation failed" }, { status: 500 });
  }
}
