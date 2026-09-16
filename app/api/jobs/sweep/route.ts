import { NextResponse, type NextRequest } from "next/server";
import { sweepStuckJobs } from "@/lib/jobs/worker";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST /api/jobs/sweep — picks up jobs that were queued but never started,
 * e.g. because the instance handling the request terminated early.
 *
 * Protected by a shared secret so it can be driven by a scheduler without
 * being publicly invocable. Configure CRON_SECRET and call it on a schedule.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "Job sweeping is not configured." },
      { status: 503 },
    );
  }

  // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.
  const header = request.headers.get("authorization");
  if (header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const processed = await sweepStuckJobs();
  return NextResponse.json({ processed });
}
