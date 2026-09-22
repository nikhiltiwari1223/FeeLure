import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getReport } from "@/lib/reports";
import { StorageUnavailableError, DATA_DIR } from "@/lib/db";

export const dynamic = "force-dynamic";

const MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const report = getReport(id);
    if (!report || !report.imageFile) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    // imageFile is always a server-generated "<uuid>.<ext>" name, but basename
    // it anyway so nothing path-like can ever reach the filesystem.
    const safeName = path.basename(report.imageFile);
    const ext = safeName.split(".").pop()?.toLowerCase() ?? "";
    const mime = MIME_BY_EXT[ext];
    if (!mime) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const filePath = path.join(DATA_DIR, "uploads", safeName);
    const buffer = await readFile(filePath);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    if (error instanceof StorageUnavailableError) {
      return NextResponse.json(
        { error: "Storage temporarily unavailable." },
        { status: 503 }
      );
    }
    // Missing file / read failure -> the image is simply not available.
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
}
