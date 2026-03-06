import { describe, it, beforeAll, afterAll, beforeEach } from "vitest";
import { getAdapter, type AgentAdapter } from "../helpers/agent-adapters/index.js";
import { copyFixture, cleanupTestRepo, buildSkillPrompt } from "../helpers/test-repos.js";
import { expectScoreAboveThreshold } from "../helpers/assertions.js";

describe("Cleanup E2E", () => {
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

  it("identifies unused deps", { timeout: 300_000 }, async () => {
    const response = await adapter.runPrompt({
      prompt: buildSkillPrompt(
        "cleanup",
        "Find unused dependencies in this project. Do not remove anything, just report what is unused."
      ),
      workingDir: testDir,
      timeoutMs: 240_000,
    });

    const lower = response.output.toLowerCase();
    const hasUnusedPkg = lower.includes("is-odd") || lower.includes("left-pad");

    expectScoreAboveThreshold(
      response,
      ["unused", "dependencies"],
      0.4
    );

    if (!hasUnusedPkg) {
      throw new Error(
        "Expected output to mention 'is-odd' or 'left-pad' as unused.\n\n" +
          `Output:\n${response.output.slice(0, 500)}`
      );
    }
  });

  it("differentiates used vs unused", { timeout: 300_000 }, async () => {
    const response = await adapter.runPrompt({
      prompt: buildSkillPrompt(
        "cleanup",
        "Which dependencies are actually imported in the source code and which are unused?"
      ),
      workingDir: testDir,
      timeoutMs: 240_000,
    });

    expectScoreAboveThreshold(
      response,
      ["lodash", "express", "used", "unused"],
      0.4
    );
  });
});
