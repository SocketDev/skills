import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { parseFrontmatter } from "../../scripts/lib/frontmatter";

const ROOT = path.resolve(__dirname, "../..");
const SKILLS_DIR = path.join(ROOT, "skills");

const EXPECTED_SKILLS = ["audit", "cleanup", "inspect", "investigate", "patch", "scan", "setup", "upgrade"];

function getSkillDirs(): string[] {
  return fs
    .readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("_"))
    .map((e) => e.name)
    .sort();
}

describe("Skill Discovery", () => {
  it("skills directory exists", () => {
    expect(fs.existsSync(SKILLS_DIR)).toBe(true);
  });

  it("every expected skill directory exists", () => {
    const dirs = getSkillDirs();
    for (const skill of EXPECTED_SKILLS) {
      expect(dirs, `missing skill directory: ${skill}`).toContain(skill);
    }
  });

  it("every skill directory contains a SKILL.md", () => {
    for (const dir of getSkillDirs()) {
      const skillMd = path.join(SKILLS_DIR, dir, "SKILL.md");
      expect(
        fs.existsSync(skillMd),
        `${dir}/SKILL.md does not exist`
      ).toBe(true);
    }
  });

  it("every SKILL.md has valid YAML frontmatter with name and description", () => {
    for (const dir of getSkillDirs()) {
      const skillMd = path.join(SKILLS_DIR, dir, "SKILL.md");
      const content = fs.readFileSync(skillMd, "utf-8");
      const meta = parseFrontmatter(content);

      expect(meta.name, `${dir}/SKILL.md missing 'name' in frontmatter`).toBeTruthy();
      expect(
        meta.description,
        `${dir}/SKILL.md missing 'description' in frontmatter`
      ).toBeTruthy();
    }
  });

  it("frontmatter name matches the directory name", () => {
    for (const dir of getSkillDirs()) {
      const skillMd = path.join(SKILLS_DIR, dir, "SKILL.md");
      const content = fs.readFileSync(skillMd, "utf-8");
      const meta = parseFrontmatter(content);

      expect(
        meta.name,
        `${dir}/SKILL.md: frontmatter name '${meta.name}' does not match directory '${dir}'`
      ).toBe(dir);
    }
  });

  it("no orphan skill directories (dirs without SKILL.md)", () => {
    const orphans = getSkillDirs().filter(
      (dir) => !fs.existsSync(path.join(SKILLS_DIR, dir, "SKILL.md"))
    );
    expect(orphans, `orphan directories: ${orphans.join(", ")}`).toEqual([]);
  });

  it("no unexpected skill directories", () => {
    const dirs = getSkillDirs();
    const unexpected = dirs.filter((d) => !EXPECTED_SKILLS.includes(d));
    expect(
      unexpected,
      `Unexpected skill directories: ${unexpected.join(", ")}. ` +
        `Update EXPECTED_SKILLS in this test if intentional.`
    ).toEqual([]);
  });
});
