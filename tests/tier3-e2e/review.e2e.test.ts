import { describe, it, expect, beforeAll } from "vitest";
import { getAdapter, type AgentAdapter } from "../helpers/agent-adapters/index.js";
import {
  expectOutputContains,
  expectScoreAboveThreshold,
  expectNoHallucinatedTools,
} from "../helpers/assertions.js";

describe("Review E2E", () => {
  let adapter: AgentAdapter;

  beforeAll(async () => {
    adapter = getAdapter();
    const available = await adapter.isAvailable();
    if (!available) {
      throw new Error(
        `Agent '${adapter.name}' is not available. Install it or set TEST_AGENT to a different agent.`
      );
    }
  });

  it(
    "reviews a specific npm package and returns security information",
    async () => {
      const response = await adapter.runPrompt({
        prompt:
          "Use the review skill to review the npm package 'lodash'. " +
          "Tell me about its security posture, known vulnerabilities, and maintainer info.",
        workingDir: process.cwd(),
        timeoutMs: 180_000,
      });

      expectScoreAboveThreshold(
        response,
        [
          "lodash",
          "npm",
          "vulnerab",
          "security",
          "maintainer",
          "score",
          "license",
          "version",
        ],
        0.5
      );
    },
    { timeout: 200_000 }
  );

  it(
    "provides package health information",
    async () => {
      const response = await adapter.runPrompt({
        prompt:
          "Review the npm package 'express' using the review skill. " +
          "What is its overall security score and quality assessment?",
        workingDir: process.cwd(),
        timeoutMs: 180_000,
      });

      expectOutputContains(response, ["express"]);
      expectScoreAboveThreshold(
        response,
        ["express", "security", "score", "quality", "dependencies", "npm"],
        0.4
      );
    },
    { timeout: 200_000 }
  );
});
