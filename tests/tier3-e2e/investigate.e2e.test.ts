import { describe, it, beforeAll, afterAll, beforeEach } from "vitest";
import { getAdapter, type AgentAdapter } from "../helpers/agent-adapters/index.js";
import { copyFixture, cleanupTestRepo, buildSkillPrompt } from "../helpers/test-repos.js";
import {
  expectOutputContains,
  expectScoreAboveThreshold,
} from "../helpers/assertions.js";

describe("Investigate E2E", () => {
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
    testDir = copyFixture("test-project");
  });

  afterAll(() => {
    if (testDir) cleanupTestRepo(testDir);
  });

  it("investigates a known CVE affecting lodash", { timeout: 300_000 }, async () => {
    const response = await adapter.runPrompt({
      prompt: buildSkillPrompt(
        "investigate",
        "Investigate whether this project is affected by CVE-2021-23337 (lodash command injection). Check the package.json for the installed version and determine exposure. Produce an incident report."
      ),
      workingDir: testDir,
      timeoutMs: 240_000,
    });

    expectOutputContains(response, ["lodash"]);
    expectScoreAboveThreshold(
      response,
      ["lodash", "CVE", "vulnerab", "version", "affected", "remediation"],
      0.4
    );
  });

  it("assesses blast radius of a vulnerability", { timeout: 300_000 }, async () => {
    const response = await adapter.runPrompt({
      prompt: buildSkillPrompt(
        "investigate",
        "The lodash package in this project has known vulnerabilities. Assess the blast radius: which files use lodash? Is it in production code? What is the recommended remediation?"
      ),
      workingDir: testDir,
      timeoutMs: 240_000,
    });

    expectScoreAboveThreshold(
      response,
      ["lodash", "import", "require", "production", "upgrade", "fix"],
      0.4
    );
  });
});
