// Sorry, I Heard That Wrong — make.fun entry program
// Deterministic, no dependencies, no network, no model calls.
// Writes the one-line entry to $MAKEFUN_OUTPUT_DIR/entry.txt and
// /output/entry.txt, verifies both byte-for-byte, then prints the text.

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const ENTRY =
  "I am sorry I called your mother-in-law instead of your mom when you said call Mom — to be fair, they sound equally disappointed in me.";

function fail(message: string): never {
  throw new Error(message);
}

function validateEntry(text: string): void {
  const lines = text.split("\n");
  if (lines.length !== 1) {
    fail(`expected exactly 1 line, got ${lines.length}`);
  }
  const line = lines[0];
  if (line.length === 0) fail("entry is empty");
  if (line.length > 140) {
    fail(`entry is ${line.length} characters, over the 140 limit`);
  }
  if (line !== line.trim()) {
    fail("entry has leading or trailing whitespace");
  }
  if (/  /.test(line)) fail("entry contains a double space");
  if (!/[.!?]$/.test(line)) {
    fail("entry must end with a sentence-ending mark");
  }
}

function writeAndVerify(filePath: string, expected: Buffer): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, expected);
  const actual = readFileSync(filePath);
  if (!actual.equals(expected)) {
    fail(`verification failed: ${filePath} differs from the expected entry bytes`);
  }
  // Second pass: validate the bytes actually on disk, not just the constant.
  const onDisk = actual.toString("utf8");
  if (onDisk.endsWith("\n")) {
    fail(`verification failed: ${filePath} has a trailing newline`);
  }
  validateEntry(onDisk);
}

function sha256Hex(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

// Best-effort mirror: /output may not exist or be writable in every
// environment, so a failure there warns instead of failing the run.
// The primary $MAKEFUN_OUTPUT_DIR target is always strict.
function tryMirror(filePath: string, expected: Buffer): void {
  try {
    writeAndVerify(filePath, expected);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    process.stderr.write(`warning: could not write ${filePath}: ${reason}\n`);
  }
}

function main(): void {
  validateEntry(ENTRY);
  const bytes = Buffer.from(ENTRY, "utf8");

  const outputDir = process.env.MAKEFUN_OUTPUT_DIR;
  if (!outputDir) fail("MAKEFUN_OUTPUT_DIR is not set");
  const primary = resolve(outputDir, "entry.txt");
  writeAndVerify(primary, bytes);

  const mirror = resolve("/output/entry.txt");
  if (mirror !== primary) tryMirror(mirror, bytes);

  process.stderr.write(`sha256(entry.txt): ${sha256Hex(bytes)}\n`);
  process.stdout.write(ENTRY + "\n");
}

main();
