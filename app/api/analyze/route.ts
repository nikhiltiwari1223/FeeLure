import { NextResponse } from "next/server";
import { buildAnalysisPrompt, GEMINI_MODEL, parseGeminiJson } from "@/lib/gemini";
import { MAX_UPLOAD_BYTES } from "@/lib/format";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;

  try {
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "AI analysis is not configured on this server. You can still publish your report manually — screenshots and descriptions are fully supported.",
        },
        { status: 503 }
      );
    }

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Send the screenshot as a multipart form upload." },
        { status: 400 }
      );
    }

    const form = await request.formData();
    const fileEntry = form.get("screenshot");

    if (!(fileEntry instanceof File) || fileEntry.size === 0) {
      return NextResponse.json(
        { error: "Attach a screenshot to analyze." },
        { status: 400 }
      );
    }

    const ext = ALLOWED_IMAGE_TYPES[fileEntry.type];
    if (!ext) {
      return NextResponse.json(
        { error: "Screenshots must be a PNG, JPG, or WebP image." },
        { status: 400 }
      );
    }
    if (fileEntry.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "Screenshot must be 5 MB or smaller." },
        { status: 400 }
      );
    }

    const bytes = Buffer.from(await fileEntry.arrayBuffer());

    // Google Gemini API — REST call over generateContent with inline image.
    // 429/503 are usually transient spikes: retry once after a short pause.
    let response: Response | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: buildAnalysisPrompt() },
                  {
                    inlineData: {
                      mimeType: fileEntry.type,
                      data: bytes.toString("base64"),
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 2048,
              responseMimeType: "application/json",
            },
          }),
          signal: AbortSignal.timeout(50_000),
        }
      );
      if (response.status !== 429 && response.status !== 503) break;
      if (attempt === 0) await new Promise((r) => setTimeout(r, 2500));
    }
    if (!response) throw new Error("Gemini request never executed");

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error(
        `Gemini API error ${response.status}:`,
        detail.slice(0, 500)
      );
      const message =
        response.status === 429
          ? "The AI analysis quota is exhausted right now. You can publish your report manually."
          : response.status === 400
            ? "The AI service rejected this screenshot. Try a different image, or publish manually."
            : "The AI analysis service is unavailable. You can publish your report manually.";
      return NextResponse.json({ error: message }, { status: 502 });
    }

    const payload = (await response.json().catch(() => null)) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    } | null;

    const text =
      payload?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text ?? "")
        .join("") ?? "";

    if (!text) {
      return NextResponse.json(
        {
          error:
            "The AI returned an empty analysis. You can publish your report manually.",
        },
        { status: 502 }
      );
    }

    const result = parseGeminiJson(text);
    return NextResponse.json({ analysis: result });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return NextResponse.json(
        {
          error:
            "The AI analysis timed out. Try a smaller screenshot, or publish manually.",
        },
        { status: 504 }
      );
    }
    console.error("POST /api/analyze failed:", error);
    return NextResponse.json(
      {
        error:
          "AI analysis failed unexpectedly. You can publish your report manually.",
      },
      { status: 500 }
    );
  }
}
