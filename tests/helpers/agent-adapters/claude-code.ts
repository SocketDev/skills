import { execFile } from "child_process";
import type { AgentAdapter, RunPromptOptions } from "./types.js";
import type { AgentResponse } from "../assertions.js";

export class ClaudeCodeAdapter implements AgentAdapter {
  name = "claude-code";

  async isAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      execFile("claude", ["--version"], (err) => {
        resolve(!err);
      });
    });
  }

  async runPrompt(opts: RunPromptOptions): Promise<AgentResponse> {
    const timeout = opts.timeoutMs ?? 120_000;

    return new Promise((resolve, reject) => {
      const proc = execFile(
        "claude",
        [
          "--print",
          opts.prompt,
          "--output-format",
          "json",
          "--max-turns",
          "5",
        ],
        {
          cwd: opts.workingDir,
          timeout,
          maxBuffer: 10 * 1024 * 1024,
        },
        (err, stdout, stderr) => {
          if (err && !stdout) {
            reject(
              new Error(`claude --print failed: ${err.message}\n${stderr}`)
            );
            return;
          }

          try {
            const parsed = JSON.parse(stdout) as {
              result?: string;
              tool_calls?: Array<{
                name: string;
                args?: Record<string, unknown>;
              }>;
            };
            resolve({
              output: parsed.result ?? stdout,
              toolCalls: parsed.tool_calls,
              exitCode: err?.code ?? 0,
            });
          } catch {
            // If not JSON, treat as plain text
            resolve({
              output: stdout || stderr,
              exitCode: err?.code ?? 0,
            });
          }
        }
      );

      // Handle timeout cleanup
      proc.on("error", (e) => reject(e));
    });
  }
}
