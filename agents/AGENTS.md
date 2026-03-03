# Socket Security Skills Reference

You have additional SKILLs documented in directories containing a "SKILL.md" file.

## Available Skills

| Skill | Description |
|-------|-------------|
| patch | Patch one or more security vulnerabilities and set up patching infrastructure within a repository. Find safe upgrade paths, apply fixes, and configure automated patching workflows. |
| review | Get detailed security information about a single package. Deep-dive into a specific dependency: vulnerability history, maintainer info, permissions, quality score, license, and transitive deps. |
| scan | Scan all packages and dependencies within a repository for vulnerabilities, malware, and supply-chain risks. Covers full project scans across ecosystems (npm, PyPI, Go, Maven, etc.), output interpretation, and CI integration. |
| setup | Configure Socket for a project: install the CLI, set up API keys, connect to the Socket dashboard, and verify the integration is working. |
| update | Update a dependency and propose local code fixes for any breaking changes. Security-audited upgrades with automated code migration suggestions. |

## Usage

**IMPORTANT:** You MUST read the SKILL.md file whenever the description of the skills matches the user intent, or may help accomplish their task.

## Skill Paths

Paths referenced within SKILL folders are relative to that SKILL. For example the scan `scripts/example.sh` would be referenced as `scan/scripts/example.sh`.

## Skill Files

The skills are located in:
- `skills/patch/SKILL.md`
- `skills/review/SKILL.md`
- `skills/scan/SKILL.md`
- `skills/setup/SKILL.md`
- `skills/update/SKILL.md`
