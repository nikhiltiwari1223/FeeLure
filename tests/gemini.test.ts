// Gemini integration tests — NO network calls and NO API key involved.
// The analysis route is exercised through its pure pieces: the prompt
// contract and the defensive JSON parser that processes the model response.
// The real Gemini HTTP call is never made in tests (and needs no key here).

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  buildAnalysisPrompt,
  parseGeminiJson,
  GEMINI_MODEL,
} from "../lib/gemini";

describe("analysis prompt contract", () => {
  test("pins the model to a flash-tier Gemini model", () => {
    assert.match(GEMINI_MODEL, /^gemini-.+-flash$/);
  });

  test("forbids invention and live-site claims", () => {
    const prompt = buildAnalysisPrompt();
    assert.match(prompt, /ONLY/i);
    assert.match(prompt, /NEVER invent/i);
    assert.match(prompt, /Do not speculate about pages not shown/);
    assert.match(prompt, /potential concerns, NOT confirmed deception/i);
  });

  test("constrains the model to FeeLure categories", () => {
    const prompt = buildAnalysisPrompt();
    assert.match(prompt, /Hidden Fees/);
    assert.match(prompt, /Pre-checked Add-ons/);
  });
});

describe("response parser (mocked model output)", () => {
  test("parses a well-formed finding", () => {
    const result = parseGeminiJson(
      JSON.stringify({
        issuesFound: true,
        summary: "A pre-ticked add-on and a late fee are visible.",
        findings: [
          {
            category: "Pre-checked Add-ons",
            finding: "Protection plan is pre-selected.",
            evidence: "[x] Damage Protection Plan",
            amount: "Rs 149",
            limitations: "User may untick it.",
          },
        ],
      })
    );
    assert.equal(result.issuesFound, true);
    assert.equal(result.findings.length, 1);
    assert.equal(result.findings[0].amount, "Rs 149");
  });

  test("strips markdown fences models sometimes add", () => {
    const wrapped = "```json\n" + JSON.stringify({ issuesFound: false, summary: "Nothing concerning.", findings: [] }) + "\n```";
    const result = parseGeminiJson(wrapped);
    assert.equal(result.issuesFound, false);
    assert.deepEqual(result.findings, []);
  });

  test("derives issuesFound from findings rather than trusting the flag", () => {
    const result = parseGeminiJson(
      JSON.stringify({
        issuesFound: false,
        summary: "…",
        findings: [{ category: "Hidden Fees", finding: "Fee visible", evidence: "Fee: Rs 99", amount: null, limitations: "" }],
      })
    );
    assert.equal(result.issuesFound, true);
  });

  test("keeps unknown-category findings as unassigned for human review", () => {
    const result = parseGeminiJson(
      JSON.stringify({
        findings: [
          { category: "Totally Made Up", finding: "x", evidence: "y", amount: null, limitations: "" },
          { category: "Other", finding: "kept", evidence: "y", amount: null, limitations: "" },
        ],
      })
    );
    // Unknown categories are preserved but nulled out — the reviewer assigns
    // one in the edit panel rather than the parser discarding evidence.
    assert.equal(result.findings.length, 2);
    assert.equal(result.findings[0].category, null);
    assert.equal(result.findings[1].category, "Other");
  });

  test("throws a clear error when no JSON is present", () => {
    assert.throws(() => parseGeminiJson("no json here at all"), /JSON/);
  });

  test("truncates oversized model output defensively", () => {
    const result = parseGeminiJson(
      JSON.stringify({
        findings: Array.from({ length: 20 }, (_, i) => ({
          category: "Other",
          finding: "f".repeat(1000) + i,
          evidence: "e".repeat(2000),
          amount: null,
          limitations: "l".repeat(2000),
        })),
      })
    );
    assert.ok(result.findings.length <= 6);
    for (const f of result.findings) {
      assert.ok(f.finding.length <= 300);
      assert.ok(f.evidence.length <= 600);
    }
  });
});
