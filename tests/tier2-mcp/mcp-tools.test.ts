import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { McpClient } from "../helpers/mcp-client.js";

const API_KEY = process.env.SOCKET_SECURITY_API_KEY;

describe("MCP Tools", () => {
  let client: McpClient;

  beforeAll(async () => {
    if (!API_KEY) {
      throw new Error(
        "SOCKET_SECURITY_API_KEY is required for MCP tests. " +
          "Set it in your environment to run Tier 2 tests."
      );
    }
    client = new McpClient({ apiKey: API_KEY });
    await client.initialize();
  });

  afterAll(async () => {
    await client?.close();
  });

  describe("review tool", () => {
    it("returns meaningful data for a known package (lodash on npm)", async () => {
      const result = await client.callTool("review", {
        package: "lodash",
        ecosystem: "npm",
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);

      // Should have text content with package info
      const textContent = result.content
        .filter((c) => c.type === "text" && c.text)
        .map((c) => c.text!)
        .join("\n");

      expect(textContent.length).toBeGreaterThan(0);
      // The response should mention the package name
      expect(textContent.toLowerCase()).toContain("lodash");
    });

    it("handles non-existent packages gracefully", async () => {
      const result = await client.callTool("review", {
        package: "this-package-definitely-does-not-exist-xyz-12345",
        ecosystem: "npm",
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      // Should either return an error indication or empty results, not crash
      expect(Array.isArray(result.content)).toBe(true);
    });
  });

  describe("scan tool", () => {
    it("accepts a repo path or manifest and returns structured results", async () => {
      // Use a minimal package.json content for scanning
      const result = await client.callTool("scan", {
        repo: "https://github.com/lodash/lodash",
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
    });
  });
});
