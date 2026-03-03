#!/usr/bin/env npx tsx
/**
 * Generate Cursor plugin artifacts (.cursor-plugin/plugin.json, .mcp.json)
 * from .claude-plugin/plugin.json and gemini-extension.json.
 */

import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
const CLAUDE_PLUGIN_MANIFEST = path.join(ROOT, ".claude-plugin", "plugin.json");
const GEMINI_EXTENSION = path.join(ROOT, "gemini-extension.json");
const CURSOR_PLUGIN_DIR = path.join(ROOT, ".cursor-plugin");
const CURSOR_PLUGIN_MANIFEST = path.join(CURSOR_PLUGIN_DIR, "plugin.json");
const CURSOR_MCP_CONFIG = path.join(ROOT, ".mcp.json");

const DEFAULT_MCP_SERVER_NAME = "socket-skills";
const DEFAULT_MCP_URL = "https://socket.dev/mcp";

const PLUGIN_NAME_RE = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;

function loadJson(filePath: string): Record<string, unknown> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required file: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function parseFrontmatter(text: string): Record<string, string> {
  const match = text.match(/^---\s*\n([\s\S]*?)\n---\s*/);
  if (!match) return {};
  const data: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    if (!line.includes(":")) continue;
    const idx = line.indexOf(":");
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key && value) data[key] = value;
  }
  return data;
}

function collectSkillNames(): string[] {
  const skillsDir = path.join(ROOT, "skills");
  if (!fs.existsSync(skillsDir)) return [];

  const names: string[] = [];
  for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name)
  )) {
    if (!entry.isDirectory()) continue;
    const skillMd = path.join(skillsDir, entry.name, "SKILL.md");
    if (!fs.existsSync(skillMd)) continue;

    const meta = parseFrontmatter(fs.readFileSync(skillMd, "utf-8"));
    const name = meta.name?.trim();
    if (name) names.push(name);
  }

  return names;
}

function validatePluginName(name: string): void {
  if (!PLUGIN_NAME_RE.test(name)) {
    throw new Error(
      `Invalid plugin name in .claude-plugin/plugin.json: '${name}'. ` +
        `Must be lowercase and match ${PLUGIN_NAME_RE.source}`
    );
  }
}

function buildCursorPluginManifest(): Record<string, unknown> {
  const src = loadJson(CLAUDE_PLUGIN_MANIFEST);

  const name = src.name;
  if (typeof name !== "string" || !name) {
    throw new Error(".claude-plugin/plugin.json must define a non-empty 'name'");
  }
  validatePluginName(name);

  const skills = collectSkillNames();
  if (skills.length === 0) {
    throw new Error("No skills discovered under skills/*/SKILL.md");
  }

  const manifest: Record<string, unknown> = {
    name,
    skills: "skills",
    mcpServers: ".mcp.json",
  };

  for (const key of [
    "description",
    "version",
    "author",
    "homepage",
    "repository",
    "license",
    "keywords",
    "logo",
  ]) {
    if (key in src) {
      manifest[key] = src[key];
    }
  }

  return manifest;
}

function extractMcpFromGemini(): [string, string] {
  if (!fs.existsSync(GEMINI_EXTENSION)) {
    return [DEFAULT_MCP_SERVER_NAME, DEFAULT_MCP_URL];
  }

  const data = loadJson(GEMINI_EXTENSION);
  const servers = data.mcpServers;
  if (typeof servers !== "object" || servers === null || Array.isArray(servers)) {
    return [DEFAULT_MCP_SERVER_NAME, DEFAULT_MCP_URL];
  }

  const serverEntries = servers as Record<string, unknown>;
  const serverName = Object.keys(serverEntries)[0];
  if (!serverName) return [DEFAULT_MCP_SERVER_NAME, DEFAULT_MCP_URL];

  const serverCfg = serverEntries[serverName];
  if (typeof serverCfg !== "object" || serverCfg === null) {
    return [DEFAULT_MCP_SERVER_NAME, DEFAULT_MCP_URL];
  }

  const cfg = serverCfg as Record<string, unknown>;
  let url = (cfg.url as string) || (cfg.httpUrl as string) || DEFAULT_MCP_URL;
  if (typeof url !== "string" || !url.trim()) {
    url = DEFAULT_MCP_URL;
  }

  return [serverName, url];
}

function buildMcpConfig(): Record<string, unknown> {
  const [serverName, url] = extractMcpFromGemini();
  return {
    mcpServers: {
      [serverName]: {
        url,
      },
    },
  };
}

function renderJson(data: Record<string, unknown>): string {
  return JSON.stringify(data, null, 2) + "\n";
}

function writeOrCheck(filePath: string, content: string, check: boolean): boolean {
  let current: string | null = null;
  if (fs.existsSync(filePath)) {
    current = fs.readFileSync(filePath, "utf-8");
  }

  if (current === content) return true;

  if (check) return false;

  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content, "utf-8");
  return true;
}

function main(): void {
  const checkMode = process.argv.includes("--check");

  const pluginManifest = renderJson(buildCursorPluginManifest());
  const mcpConfig = renderJson(buildMcpConfig());

  const okPlugin = writeOrCheck(CURSOR_PLUGIN_MANIFEST, pluginManifest, checkMode);
  const okMcp = writeOrCheck(CURSOR_MCP_CONFIG, mcpConfig, checkMode);

  if (checkMode) {
    const outdated: string[] = [];
    if (!okPlugin) outdated.push(path.relative(ROOT, CURSOR_PLUGIN_MANIFEST));
    if (!okMcp) outdated.push(path.relative(ROOT, CURSOR_MCP_CONFIG));

    if (outdated.length > 0) {
      console.error("Generated Cursor artifacts are out of date:");
      for (const item of outdated) {
        console.error(`  - ${item}`);
      }
      console.error("Run: npx tsx scripts/generate-cursor-plugin.ts");
      process.exit(1);
    }

    console.log("Cursor plugin artifacts are up to date.");
    return;
  }

  console.log(`Wrote ${path.relative(ROOT, CURSOR_PLUGIN_MANIFEST)}`);
  console.log(`Wrote ${path.relative(ROOT, CURSOR_MCP_CONFIG)}`);
}

main();
