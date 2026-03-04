import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "../..");
const SKILLS_DIR = path.join(ROOT, "skills");

interface MarketplacePlugin {
  name: string;
  source: string;
  skills: string;
  description: string;
}

interface Marketplace {
  name: string;
  owner: { name: string };
  metadata: { description: string; version: string };
  plugins: MarketplacePlugin[];
}

function loadJSON(relPath: string): unknown {
  const fullPath = path.join(ROOT, relPath);
  return JSON.parse(fs.readFileSync(fullPath, "utf-8"));
}

function getSkillDirs(): string[] {
  return fs
    .readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

describe("Manifest Consistency", () => {
  const marketplace = loadJSON(
    ".claude-plugin/marketplace.json"
  ) as Marketplace;
  const packageJson = loadJSON("package.json") as {
    version: string;
  };
  const mcpJson = loadJSON(".mcp.json") as {
    mcpServers: Record<string, { url: string }>;
  };
  const geminiJson = loadJSON("gemini-extension.json") as {
    version: string;
    mcpServers: Record<string, { httpUrl: string }>;
  };
  const agentsMd = fs.readFileSync(
    path.join(ROOT, "agents", "AGENTS.md"),
    "utf-8"
  );

  describe("marketplace.json", () => {
    it("lists all discovered skill directories", () => {
      const dirs = getSkillDirs();
      const pluginNames = marketplace.plugins.map((p) => p.name).sort();
      expect(pluginNames).toEqual(dirs);
    });

    it("every plugin source path resolves to a real SKILL.md", () => {
      for (const plugin of marketplace.plugins) {
        const skillMd = path.join(ROOT, plugin.source, "SKILL.md");
        expect(
          fs.existsSync(skillMd),
          `plugin '${plugin.name}' source '${plugin.source}' has no SKILL.md`
        ).toBe(true);
      }
    });

    it("has no duplicate plugin names", () => {
      const names = marketplace.plugins.map((p) => p.name);
      expect(names).toEqual([...new Set(names)]);
    });

    it("has no duplicate plugin sources", () => {
      const sources = marketplace.plugins.map((p) => p.source);
      expect(sources).toEqual([...new Set(sources)]);
    });
  });

  describe("AGENTS.md", () => {
    it("references all skill paths", () => {
      for (const dir of getSkillDirs()) {
        expect(
          agentsMd,
          `AGENTS.md does not reference skills/${dir}/SKILL.md`
        ).toContain(`skills/${dir}/SKILL.md`);
      }
    });

    it("lists all skill names in the table", () => {
      for (const dir of getSkillDirs()) {
        expect(
          agentsMd,
          `AGENTS.md table does not list skill '${dir}'`
        ).toContain(`| ${dir} |`);
      }
    });
  });

  describe("MCP server URL consistency", () => {
    it(".mcp.json has a socket-skills server entry", () => {
      expect(mcpJson.mcpServers["socket-skills"]).toBeDefined();
      expect(mcpJson.mcpServers["socket-skills"].url).toBeTruthy();
    });

    it("gemini-extension.json has a socket-skills server entry", () => {
      expect(geminiJson.mcpServers["socket-skills"]).toBeDefined();
      expect(geminiJson.mcpServers["socket-skills"].httpUrl).toBeTruthy();
    });

    it(".mcp.json and gemini-extension.json agree on MCP server URL", () => {
      const mcpUrl = mcpJson.mcpServers["socket-skills"].url;
      const geminiUrl = geminiJson.mcpServers["socket-skills"].httpUrl;
      expect(mcpUrl).toBe(geminiUrl);
    });
  });

  describe("Version consistency", () => {
    it("marketplace.json version matches package.json", () => {
      expect(marketplace.metadata.version).toBe(packageJson.version);
    });

    it("gemini-extension.json version matches package.json", () => {
      expect(geminiJson.version).toBe(packageJson.version);
    });

    it("all manifest versions are in sync", () => {
      const pluginJson = loadJSON(".claude-plugin/plugin.json") as {
        version: string;
      };
      const cursorJson = loadJSON(".cursor-plugin/plugin.json") as {
        version: string;
      };

      const versions = {
        "package.json": packageJson.version,
        "marketplace.json": marketplace.metadata.version,
        "gemini-extension.json": geminiJson.version,
        "plugin.json": pluginJson.version,
        "cursor plugin.json": cursorJson.version,
      };

      const uniqueVersions = [...new Set(Object.values(versions))];
      expect(
        uniqueVersions,
        `Version mismatch across manifests: ${JSON.stringify(versions)}`
      ).toHaveLength(1);
    });
  });
});
