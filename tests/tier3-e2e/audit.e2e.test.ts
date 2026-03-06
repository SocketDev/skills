import { describe, it, beforeAll, afterAll, beforeEach } from "vitest";
import { getAdapter, type AgentAdapter } from "../helpers/agent-adapters/index.js";
import { copyFixture, cleanupTestRepo, buildSkillPrompt } from "../helpers/test-repos.js";
import {
  expectOutputContains,
  expectScoreAboveThreshold,
} from "../helpers/assertions.js";

describe("Audit E2E", () => {
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

  it("generates a compliance report", { timeout: 300_000 }, async () => {
    const response = await adapter.runPrompt({
      prompt: buildSkillPrompt(
        "audit",
        "Audit the licenses of all dependencies in this project. Read the package.json and classify each dependency's license. Produce a compliance summary showing license types and any issues."
      ),
      workingDir: testDir,
      timeoutMs: 240_000,
    });

    expectScoreAboveThreshold(
      response,
      ["license", "MIT", "compliance", "lodash", "express"],
      0.4
    );
  });

  it("identifies SBOM output format", { timeout: 300_000 }, async () => {
    const response = await adapter.runPrompt({
      prompt: buildSkillPrompt(
        "audit",
        "What SBOM formats can you generate for this project? List the dependencies and describe how you would produce a CycloneDX or SPDX SBOM."
      ),
      workingDir: testDir,
      timeoutMs: 240_000,
    });

    expectScoreAboveThreshold(
      response,
      ["SBOM", "CycloneDX", "SPDX", "dependencies"],
      0.4
    );
  });
});
