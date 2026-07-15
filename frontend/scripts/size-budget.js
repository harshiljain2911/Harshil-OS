#!/usr/bin/env node
/* eslint-disable */
/**
 * Bundle-size budget (charter §Phase 1 revision):
 *   Home-route initial JS ≤ 150KB gzipped.
 * Runs post-build. Fails with non-zero exit if the total gzipped size of the
 * main + runtime chunks exceeds the budget.
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const BUILD_DIR = path.join(__dirname, "..", "build");
const BUDGET_KB = Number(process.env.BUNDLE_BUDGET_KB || 150);

function gzippedSize(file) {
  const bytes = fs.readFileSync(file);
  return zlib.gzipSync(bytes, { level: 9 }).length;
}

function findChunks() {
  const jsDir = path.join(BUILD_DIR, "static", "js");
  if (!fs.existsSync(jsDir)) {
    console.error("size-budget: build/static/js not found — run `yarn build` first.");
    process.exit(2);
  }
  const files = fs.readdirSync(jsDir).filter((f) => f.endsWith(".js") && !f.endsWith(".map"));
  const main = files.filter((f) => f.startsWith("main."));
  const runtime = files.filter((f) => f.startsWith("runtime-"));
  return [...main, ...runtime].map((f) => path.join(jsDir, f));
}

function main() {
  const chunks = findChunks();
  let total = 0;
  const rows = chunks.map((f) => {
    const size = gzippedSize(f);
    total += size;
    return { file: path.basename(f), kb: (size / 1024).toFixed(1) };
  });
  const totalKb = total / 1024;

  console.log("Bundle size (gzip):");
  rows.forEach((r) => console.log(`  ${r.file.padEnd(48)} ${r.kb} KB`));
  console.log(`  ${"total".padEnd(48)} ${totalKb.toFixed(1)} KB   [budget: ${BUDGET_KB} KB]`);

  if (totalKb > BUDGET_KB) {
    console.error(`\n✗ Budget exceeded by ${(totalKb - BUDGET_KB).toFixed(1)} KB`);
    process.exit(1);
  }
  console.log(`\n✓ Within budget (${(BUDGET_KB - totalKb).toFixed(1)} KB headroom)`);
}

main();
