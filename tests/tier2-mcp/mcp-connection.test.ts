import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { McpClient } from "../helpers/mcp-client.js";

const API_KEY = process.env.SOCKET_SECURITY_API_KEY;

describe("MCP Connection", () => {
  let client: McpClient;

  beforeAll(() => {
    if (!API_KEY) {
      throw new Error(
        "SOCKET_SECURITY_API_KEY is required for MCP tests. " +
          "Set it in your environment to run Tier 2 tests."
      );
    }
    client = new McpClient({ apiKey: API_KEY });
  });

  afterAll(async () => {
    await client?.close();
  });

  it("successfully connects and initializes", async () => {
    const result = await client.initialize();
    expect(result).toBeDefined();
    expect(result).toHaveProperty("protocolVersion");
    expect(result).toHaveProperty("serverInfo");
  });

  it("lists tools and finds expected ones", async () => {
    const tools = await client.listTools();
    expect(tools).toBeDefined();
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThan(0);

    const toolNames = tools.map((t) => t.name);
    // The MCP server should expose at least scan and review tools
    expect(toolNames.some((n) => n.toLowerCase().includes("scan"))).toBe(true);
    expect(toolNames.some((n) => n.toLowerCase().includes("review"))).toBe(
      true
    );
  });

  it("every tool has a description and input schema", async () => {
    const tools = await client.listTools();

    for (const tool of tools) {
      expect(
        tool.description,
        `tool '${tool.name}' is missing a description`
      ).toBeTruthy();
      expect(
        tool.inputSchema,
        `tool '${tool.name}' is missing an inputSchema`
      ).toBeDefined();
    }
  });
});
