import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import {
  createReport,
  deleteReport,
  getReport,
  listReports,
  setReportImage,
  validateReportInput,
} from "@/lib/reports";
import { StorageUnavailableError, DATA_DIR } from "@/lib/db";
import { isSortKey, MAX_UPLOAD_BYTES } from "@/lib/format";

export const dynamic = "force-dynamic";

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sortParam = searchParams.get("sort");

  try {
    const reports = listReports({
      q: searchParams.get("q")?.trim() ?? "",
      category: searchParams.get("category")?.trim() ?? "",
      sort: isSortKey(sortParam) ? sortParam : "newest",
    });
    return NextResponse.json({ reports, count: reports.length });
  } catch (error) {
    if (error instanceof StorageUnavailableError) {
      console.error("GET /api/reports storage failure:", error.cause);
      return NextResponse.json(
        {
          error:
            "The report database is temporarily unavailable. Please try again in a moment.",
        },
        { status: 503 }
      );
    }
    console.error("GET /api/reports failed:", error);
    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    let title: string;
    let url: string;
    let category: string;
    let description: string;
    let screenshot: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      title = String(form.get("title") ?? "");
      url = String(form.get("url") ?? "");
      category = String(form.get("category") ?? "");
      description = String(form.get("description") ?? "");

      const fileEntry = form.get("screenshot");
      if (fileEntry instanceof File && fileEntry.size > 0) {
        screenshot = fileEntry;
      }
    } else {
      // JSON payload (URL-only report). Screenshot uploads come as multipart.
      const body = (await request.json().catch(() => null)) as Record<
        string,
        unknown
      > | null;
      if (!body) {
        return NextResponse.json(
          { error: "Invalid request body." },
          { status: 400 }
        );
      }
      title = String(body.title ?? "");
      url = String(body.url ?? "");
      category = String(body.category ?? "");
      description = String(body.description ?? "");
    }

    // Reject invalid input (including bad screenshots) BEFORE touching storage.
    const preErrors = validateReportInput({ title, url, category, description });
    if (screenshot) {
      if (!ALLOWED_IMAGE_TYPES[screenshot.type]) {
        preErrors.screenshot =
          "Screenshot must be a PNG, JPG, or WebP image.";
      } else if (screenshot.size > MAX_UPLOAD_BYTES) {
        preErrors.screenshot = "Screenshot must be 5 MB or smaller.";
      }
    }
    if (Object.keys(preErrors).length > 0) {
      return NextResponse.json({ errors: preErrors }, { status: 400 });
    }

    const result = createReport({ title, url, category, description });
    if (!result.ok) {
      return NextResponse.json({ errors: result.errors }, { status: 400 });
    }

    const reportId = result.report.id;

    // Save the optional screenshot to data/uploads and link it in the DB.
    if (screenshot) {
      try {
        const uploadsDir = path.join(DATA_DIR, "uploads");
        await mkdir(uploadsDir, { recursive: true });
        const fileName = `${reportId}.${ALLOWED_IMAGE_TYPES[screenshot.type]}`;
        const bytes = Buffer.from(await screenshot.arrayBuffer());
        await writeFile(path.join(uploadsDir, fileName), bytes);
        setReportImage(
          reportId,
          fileName,
          screenshot.name || `screenshot.${ALLOWED_IMAGE_TYPES[screenshot.type]}`
        );
      } catch (saveError) {
        if (saveError instanceof StorageUnavailableError) throw saveError;
        try {
          deleteReport(reportId);
        } catch {
          // storage already failing — nothing more to clean up
        }
        return NextResponse.json(
          {
            error:
              "We could not save your screenshot. Please try again without it or with a smaller image.",
          },
          { status: 500 }
        );
      }
    }

    const stored = getReport(reportId) ?? result.report;
    return NextResponse.json({ report: stored }, { status: 201 });
  } catch (error) {
    if (error instanceof StorageUnavailableError) {
      console.error("POST /api/reports storage failure:", error.cause);
      return NextResponse.json(
        {
          error:
            "The report database is temporarily unavailable — your report was not saved. Please try again in a moment.",
        },
        { status: 503 }
      );
    }
    console.error("POST /api/reports failed:", error);
    return NextResponse.json(
      { error: "Unexpected server error. Please try again." },
      { status: 500 }
    );
  }
}
