// Shared types + prompt contract for Gemini screenshot analysis (Stage 3).
// The AI is explicitly instructed to report ONLY what is visible in the
// screenshot and to express uncertainty — findings are always potential
// concerns, never verdicts, and the user reviews/edits them before publishing.

import { CATEGORIES } from "./format";

export interface GeminiFinding {
  /** One of the FeeLure categories, or null when unclear. */
  category: string | null;
  /** One-sentence summary of the suspected pattern. */
  finding: string;
  /** Exact visible text / element the observation is based on. */
  evidence: string;
  /** Visible amount + currency, when actually shown in the screenshot. */
  amount: string | null;
  /** Uncertainty, missing context, or why this may be benign. */
  limitations: string;
}

export interface GeminiAnalysisResult {
  /** True when the model found at least one potential concern. */
  issuesFound: boolean;
  findings: GeminiFinding[];
  /** Model's one-paragraph plain-language summary, kept verbatim. */
  summary: string;
}

export const GEMINI_MODEL = "gemini-3.6-flash";

export function buildAnalysisPrompt(): string {
  return `You are assisting FeeLure, a consumer-protection community index that documents suspected dark patterns in online checkout and subscription screens.

Analyze the attached screenshot of ONE web page. Report ONLY potential dark patterns, hidden or late-disclosed fees, pre-checked add-ons, recurring-payment disclosures, or misleading wording that are VISIBLE in the image itself.

Strict rules:
- Base every finding on visible text/UI elements only. Quote the exact visible wording or describe the exact visible element.
- NEVER invent charges, amounts, subscription terms, or text that is not visible. If an amount is visible, copy it exactly; otherwise use null.
- These are potential concerns, NOT confirmed deception. Note in "limitations" what could be a legitimate practice or what context is missing.
- If nothing concerning is visible, return issuesFound=false with an empty findings array and say so plainly in the summary.
- Write in plain, calm language a non-technical shopper understands. Never state or imply that a company is acting illegally.
- You cannot browse: the screenshot is the only evidence. Do not speculate about pages not shown.

Respond with ONLY a JSON object (no markdown fences, no commentary) shaped exactly like:
{
  "issuesFound": true,
  "summary": "one short paragraph in plain language",
  "findings": [
    {
      "category": "one of: ${CATEGORIES.join(" | ")}",
      "finding": "one sentence naming the suspected pattern",
      "evidence": "the exact visible text or element it is based on",
      "amount": "visible amount with currency symbol, or null",
      "limitations": "what is uncertain or could be legitimate"
    }
  ]
}`;
}

/** Defensive parsing of the model response into our shape. */
export function parseGeminiJson(text: string): GeminiAnalysisResult {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("Model response did not contain JSON.");
  }

  const raw = JSON.parse(cleaned.slice(start, end + 1)) as Record<
    string,
    unknown
  >;

  const findingsRaw = Array.isArray(raw.findings) ? raw.findings : [];
  const findings: GeminiFinding[] = findingsRaw
    .slice(0, 6)
    .map((f) => {
      const item = (f ?? {}) as Record<string, unknown>;
      const category =
        typeof item.category === "string" &&
        (CATEGORIES as readonly string[]).includes(item.category)
          ? item.category
          : null;
      return {
        category,
        finding: String(item.finding ?? "").slice(0, 300),
        evidence: String(item.evidence ?? "").slice(0, 600),
        amount:
          typeof item.amount === "string" && item.amount.trim()
            ? item.amount.slice(0, 40)
            : null,
        limitations: String(item.limitations ?? "").slice(0, 600),
      };
    })
    .filter((f) => f.finding.length > 0);

  return {
    issuesFound: findings.length > 0,
    findings,
    summary: String(raw.summary ?? "").slice(0, 900),
  };
}
