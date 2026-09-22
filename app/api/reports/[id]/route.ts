import { NextResponse } from "next/server";
import { getReport } from "@/lib/reports";
import { StorageUnavailableError } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const report = getReport(id);
    if (!report) {
      return NextResponse.json({ error: "Report not found." }, { status: 404 });
    }
    return NextResponse.json({ report });
  } catch (error) {
    if (error instanceof StorageUnavailableError) {
      console.error("GET /api/reports/[id] storage failure:", error.cause);
      return NextResponse.json(
        {
          error:
            "The report database is temporarily unavailable. Please try again in a moment.",
        },
        { status: 503 }
      );
    }
    console.error("GET /api/reports/[id] failed:", error);
    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}
