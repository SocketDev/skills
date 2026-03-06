/**
 * Lightweight MCP client for testing Socket's MCP server over HTTP.
 *
 * Speaks the Model Context Protocol (streamable HTTP transport) against
 * https://socket.dev/mcp using JSON-RPC 2.0 messages.
 */

export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface McpToolResult {
  content: Array<{ type: string; text?: string; [key: string]: unknown }>;
  isError?: boolean;
}

export interface McpClientOptions {
  baseUrl?: string;
  apiKey: string;
}

export class McpClient {
  private baseUrl: string;
  private apiKey: string;
  private sessionId: string | null = null;
  private requestId = 0;

  constructor(opts: McpClientOptions) {
    this.baseUrl = opts.baseUrl ?? "https://socket.dev/mcp";
    this.apiKey = opts.apiKey;
  }

  private nextId(): number {
    return ++this.requestId;
  }

  private async sendRequest(
    method: string,
    params?: Record<string, unknown>
  ): Promise<unknown> {
    const body = {
      jsonrpc: "2.0",
      id: this.nextId(),
      method,
      ...(params !== undefined ? { params } : {}),
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "User-Agent": "socket-skills-test/1.0.0",
      Authorization: `Bearer ${this.apiKey}`,
    };

    if (this.sessionId) {
      headers["Mcp-Session-Id"] = this.sessionId;
    }

    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    // Capture session ID from response headers
    const sessionHeader = response.headers.get("mcp-session-id");
    if (sessionHeader) {
      this.sessionId = sessionHeader;
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `MCP request failed: ${response.status} ${response.statusText}: ${text}`
      );
    }

    const contentType = response.headers.get("content-type") ?? "";

    // Handle SSE responses
    if (contentType.includes("text/event-stream")) {
      return this.parseSSE(response);
    }

    const result = (await response.json()) as {
      result?: unknown;
      error?: { code: number; message: string };
    };
    if (result.error) {
      throw new Error(
        `MCP error ${result.error.code}: ${result.error.message}`
      );
    }
    return result.result;
  }

  private async parseSSE(response: Response): Promise<unknown> {
    const text = await response.text();
    const lines = text.split("\n");
    let lastData: unknown = undefined;

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = JSON.parse(line.slice(6)) as {
          result?: unknown;
          error?: { code: number; message: string };
        };
        if (data.error) {
          throw new Error(
            `MCP error ${data.error.code}: ${data.error.message}`
          );
        }
        if (data.result !== undefined) {
          lastData = data.result;
        }
      }
    }

    return lastData;
  }

  async initialize(): Promise<Record<string, unknown>> {
    const result = await this.sendRequest("initialize", {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "socket-skills-test", version: "1.0.0" },
    });

    // Send initialized notification
    await this.sendNotification("notifications/initialized");

    return result as Record<string, unknown>;
  }

  private async sendNotification(
    method: string,
    params?: Record<string, unknown>
  ): Promise<void> {
    const body = {
      jsonrpc: "2.0",
      method,
      ...(params !== undefined ? { params } : {}),
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "User-Agent": "socket-skills-test/1.0.0",
      Authorization: `Bearer ${this.apiKey}`,
    };

    if (this.sessionId) {
      headers["Mcp-Session-Id"] = this.sessionId;
    }

    await fetch(this.baseUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  }

  async listTools(): Promise<McpTool[]> {
    const result = (await this.sendRequest("tools/list")) as {
      tools: McpTool[];
    };
    return result.tools;
  }

  async callTool(
    name: string,
    args: Record<string, unknown> = {}
  ): Promise<McpToolResult> {
    const result = await this.sendRequest("tools/call", {
      name,
      arguments: args,
    });
    return result as McpToolResult;
  }

  async close(): Promise<void> {
    this.sessionId = null;
  }
}
