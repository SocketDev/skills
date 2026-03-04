/**
 * Utilities for creating and cleaning up test fixture copies.
 *
 * Each test gets its own copy of a fixture directory so tests don't interfere.
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const FIXTURES_DIR = path.resolve(__dirname, "..", "fixtures");

/**
 * Copy a fixture directory to a temp location and return the path.
 * The caller is responsible for cleanup via `cleanupTestRepo()`.
 */
export function copyFixture(fixtureName: string): string {
  const src = path.join(FIXTURES_DIR, fixtureName);
  if (!fs.existsSync(src)) {
    throw new Error(`Fixture '${fixtureName}' not found at ${src}`);
  }

  const tmpDir = fs.mkdtempSync(
    path.join(os.tmpdir(), `socket-skills-test-${fixtureName}-`)
  );

  copyDirSync(src, tmpDir);
  return tmpDir;
}

/**
 * Clean up a test repo directory.
 */
export function cleanupTestRepo(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

function copyDirSync(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
