import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { getAdapter, type AgentAdapter } from "../helpers/agent-adapters/index.js";
import { copyFixture, cleanupTestRepo } from "../helpers/test-repos.js";
import {
  expectOutputContains,
  expectScoreAboveThreshold,
} from "../helpers/assertions.js";

describe("Scan E2E", () => {
  let adapter: AgentAdapter;
  let testDir: string;

  beforeAll(async () => {
    adapter = getAdapter();
    const available = await adapter.isAvailable();
    if (!available) {
      throw new Error(
        `Agent '${adapter.name}' is not available. Install it or set TEST_AGENT to a different agent.`
      );
    }
  });

  beforeEach(() => {
    testDir = copyFixture("test-repo-npm");
  });

  afterAll(() => {
    if (testDir) cleanupTestRepo(testDir);
  });

  it(
    "scans a project with known vulnerabilities and reports findings",
    async () => {
      const response = await adapter.runPrompt({
        prompt:
          "Use the scan skill to scan this project for security vulnerabilities. " +
          "Report any findings including package names and severity levels.",
        workingDir: testDir,
        timeoutMs: 180_000,
      });

      // The output should mention the vulnerable package and some security-related terms
      expectScoreAboveThreshold(
        response,
        [
          "lodash",
          "vulnerab",
          "security",
          "scan",
          "risk",
          "cve",
          "upgrade",
          "fix",
        ],
        0.5 // At least 50% of criteria should match
      );
    },
    { timeout: 200_000 }
  );

  it(
    "identifies lodash as a dependency with known issues",
    async () => {
      const response = await adapter.runPrompt({
        prompt:
          "Scan this project's dependencies for security issues. " +
          "Focus on lodash and any known CVEs or vulnerabilities.",
        workingDir: testDir,
        timeoutMs: 180_000,
      });

      expectOutputContains(response, ["lodash"]);
    },
    { timeout: 200_000 }
  );
});
