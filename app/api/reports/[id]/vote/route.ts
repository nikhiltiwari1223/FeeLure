import { NextResponse } from "next/server";
import { voteOnReport } from "@/lib/reports";
import { StorageUnavailableError } from "@/lib/db";

export const dynamic = "force-dynamic";

function clientKeyFor(request: Request): string {
  // Stage 1/2 heuristic: one cooldown bucket per client IP (behind proxies,
  // the forwarded header carries the real client). Stage 3 replaces this with
  // durable, deduplicated per-visitor voting.
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "local";
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const result = voteOnReport(id, clientKeyFor(request));

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        {
          status: result.error === "Report not found." ? 404 : 429,
          headers: result.retryAfterMs
            ? { "Retry-After": String(Math.ceil(result.retryAfterMs / 1000)) }
            : undefined,
        }
      );
    }

    return NextResponse.json({ ok: true, voteCount: result.voteCount });
  } catch (error) {
    if (error instanceof StorageUnavailableError) {
      console.error("POST vote storage failure:", error.cause);
      return NextResponse.json(
        {
          ok: false,
          error:
            "The report database is temporarily unavailable — your vote was not counted. Please try again in a moment.",
        },
        { status: 503 }
      );
    }
    console.error("POST /api/reports/[id]/vote failed:", error);
    return NextResponse.json(
      { ok: false, error: "Unexpected server error." },
      { status: 500 }
    );
  }
}
