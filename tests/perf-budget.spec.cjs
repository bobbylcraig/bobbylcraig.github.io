const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { test, expect } = require("@playwright/test");
const budgets = require("./perf-budgets.json");

test("published assets stay within their compressed delivery budgets", () => {
  for (const [asset, budget] of Object.entries(budgets)) {
    const bytes = zlib.gzipSync(fs.readFileSync(path.resolve(asset))).length;
    expect(bytes, `${asset}: ${bytes} bytes exceeds ${budget}`).toBeLessThanOrEqual(budget);
  }
});
