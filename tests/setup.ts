// Test setup: MUST be imported before any lib module in every test file.
//
// Points the storage layer at an isolated temporary directory (one per test
// run, wiped at start) so tests never touch real user data in ./data.
// lib/db.ts reads FEELURE_DATA_DIR at module-load time, so the ordering of
// these imports matters.

import os from "os";
import path from "path";
import fs from "fs";

const testDir = path.join(os.tmpdir(), `feelure-test-${process.pid}`);

process.env.FEELURE_DATA_DIR = testDir;
fs.rmSync(testDir, { recursive: true, force: true });

export const TEST_DATA_DIR = testDir;
