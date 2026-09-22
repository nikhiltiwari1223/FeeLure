// Critical data-layer tests: validation, creation, persistence, listing, and
// voting. Runs against an isolated temporary database (see tests/setup.ts) —
// never the real ./data directory. Uses Node's built-in test runner; no
// external dependencies and no network access.

import "./setup"; // must come first: sets FEELURE_DATA_DIR before lib imports
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  validateReportInput,
  createReport,
  getReport,
  listReports,
  voteOnReport,
  setReportImage,
  type Report,
} from "../lib/reports";

const VALID_INPUT = {
  title: "Extra insurance added at checkout",
  url: "https://example-shop.test/checkout",
  category: "Hidden Fees",
  description: "A protection plan was pre-ticked and a handling fee appeared only at the final step.",
};

describe("report validation", () => {
  test("accepts a valid report", () => {
    const errors = validateReportInput(VALID_INPUT);
    assert.deepEqual(errors, {});
  });

  test("rejects an empty submission with a message per field", () => {
    const errors = validateReportInput({});
    assert.ok(errors.title);
    assert.ok(errors.url);
    assert.ok(errors.category);
    assert.ok(errors.description);
  });

  test("rejects URLs without http(s)", () => {
    const errors = validateReportInput({ ...VALID_INPUT, url: "example-shop.test" });
    assert.match(errors.url ?? "", /http/);
  });

  test("rejects implausible hostnames", () => {
    const errors = validateReportInput({ ...VALID_INPUT, url: "https://not-a-domain" });
    assert.ok(errors.url);
  });

  test("rejects unknown categories", () => {
    const errors = validateReportInput({ ...VALID_INPUT, category: "Free Money" });
    assert.ok(errors.category);
  });

  test("enforces description length bounds", () => {
    const short = validateReportInput({ ...VALID_INPUT, description: "too short" });
    assert.ok(short.description);
    const long = validateReportInput({ ...VALID_INPUT, description: "x".repeat(2001) });
    assert.ok(long.description);
  });
});

describe("report creation and retrieval", () => {
  test("creates a report with derived domain and zero votes", () => {
    const result = createReport(VALID_INPUT);
    assert.ok(result.ok);
    if (!result.ok) return;
    assert.equal(result.report.domain, "example-shop.test");
    assert.equal(result.report.voteCount, 0);
    assert.equal(result.report.imageUrl, null);
  });

  test("persists and retrieves by id", () => {
    const created = createReport(VALID_INPUT);
    assert.ok(created.ok);
    if (!created.ok) return;
    const fetched = getReport(created.report.id);
    assert.ok(fetched);
    assert.equal(fetched?.title, VALID_INPUT.title);
    assert.equal(fetched?.createdAt, created.report.createdAt);
  });

  test("returns undefined for unknown ids", () => {
    assert.equal(getReport("no-such-id"), undefined);
  });

  test("attaches screenshot metadata and public image URL", () => {
    const created = createReport(VALID_INPUT);
    assert.ok(created.ok);
    if (!created.ok) return;
    const updated = setReportImage(created.report.id, "file.png", "shot.png");
    assert.equal(updated?.imageFile, "file.png");
    assert.equal(updated?.imageUrl, `/api/reports/${created.report.id}/image`);
  });
});

describe("listing, filtering and sorting", () => {
  test("newest first by default", () => {
    const a = createReport({ ...VALID_INPUT, title: "Older report" });
    const b = createReport({ ...VALID_INPUT, title: "Newer report" });
    assert.ok(a.ok && b.ok);
    const list = listReports();
    const olderIndex = list.findIndex((r: Report) => r.title === "Older report");
    const newerIndex = list.findIndex((r: Report) => r.title === "Newer report");
    assert.ok(olderIndex !== -1 && newerIndex !== -1);
    assert.ok(newerIndex < olderIndex);
  });

  test("sorts by most votes with newest as tiebreaker", () => {
    const low = createReport({ ...VALID_INPUT, title: "Low votes" });
    const high = createReport({ ...VALID_INPUT, title: "High votes" });
    assert.ok(low.ok && high.ok);
    if (!low.ok || !high.ok) return;
    voteOnReport(high.report.id, "sort-tester");
    voteOnReport(high.report.id, `sort-tester-${Date.now()}`);
    const list = listReports({ sort: "mostVotes" });
    assert.equal(list[0].title, "High votes");
  });

  test("filters by category and free-text query", () => {
    createReport({ ...VALID_INPUT, title: "Sneaky cancellation flow", category: "Difficult Cancellation" });
    const byCategory = listReports({ category: "Difficult Cancellation" });
    assert.ok(byCategory.some((r: Report) => r.title === "Sneaky cancellation flow"));
    const byQuery = listReports({ q: "sneaky" });
    assert.ok(byQuery.some((r: Report) => r.title === "Sneaky cancellation flow"));
    assert.ok(listReports({ q: "zzz-no-match-zzz" }).every((r: Report) => r.title !== "Sneaky cancellation flow"));
  });
});

describe("voting", () => {
  test("increments vote count and returns it", () => {
    const created = createReport(VALID_INPUT);
    assert.ok(created.ok);
    if (!created.ok) return;
    const first = voteOnReport(created.report.id, "voter-A");
    assert.equal(first.ok, true);
    assert.equal(first.voteCount, 1);
    // a different cooldown bucket also succeeds
    const second = voteOnReport(created.report.id, "voter-B");
    assert.equal(second.ok, true);
    assert.equal(second.voteCount, 2);
  });

  test("enforces the per-client cooldown", async (t) => {
    const created = createReport(VALID_INPUT);
    assert.ok(created.ok);
    if (!created.ok) return;
    const key = `cooldown-test-${Math.random()}`;
    assert.equal(voteOnReport(created.report.id, key).ok, true);
    const rushed = voteOnReport(created.report.id, key);
    assert.equal(rushed.ok, false);
    assert.match(rushed.error ?? "", /quickly/i);
  });

  test("rejects votes for unknown reports", () => {
    const result = voteOnReport("no-such-report", "voter-X");
    assert.equal(result.ok, false);
    assert.match(result.error ?? "", /not found/i);
  });

  test("cooldowns survive a fresh process against the same database", async (t) => {
    // Simulates the restart-persistence property at the data layer: write via
    // this process, then re-open the DB through a child process and verify.
    const { execFileSync } = await import("child_process");
    const created = createReport(VALID_INPUT);
    assert.ok(created.ok);
    if (!created.ok) return;
    const key = `persist-${Math.random()}`;
    assert.equal(voteOnReport(created.report.id, key).ok, true);

    const script = `
      const assert = require("node:assert/strict");
      const { getReport, voteOnReport } = require("./.test-build/lib/reports.js");
      const report = getReport(${JSON.stringify(created.report.id)});
      assert.ok(report, "report should survive restart");
      assert.equal(report.voteCount, 1, "vote count should survive restart");
      const rushed = voteOnReport(report.id, ${JSON.stringify(key)});
      assert.equal(rushed.ok, false, "cooldown should survive restart");
      console.log("PERSISTENCE_OK");
    `;
    fsWrite(".persistence-check.cjs", script);
    const out = execFileSync(process.execPath, [".persistence-check.cjs"], {
      cwd: process.cwd(),
      env: { ...process.env, FEELURE_DATA_DIR: process.env.FEELURE_DATA_DIR },
    }).toString();
    fs.unlinkSync(".persistence-check.cjs");
    assert.match(out, /PERSISTENCE_OK/);
  });
});

import fs from "fs";
function fsWrite(name: string, content: string) {
  fs.writeFileSync(name, content);
}
