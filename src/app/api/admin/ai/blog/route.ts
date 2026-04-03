import { NextResponse } from "next/server";

// Blog generation moved to /admin/blog. This route is deprecated.
export async function POST() {
  return NextResponse.json(
    { error: "Blog generation has been moved to /admin/blog" },
    { status: 410 }
  );
}
