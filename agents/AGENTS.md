# Socket Security Skills Reference

You have additional SKILLs documented in directories containing a "SKILL.md" file.

## Available Skills

| Skill | Description |
|-------|-------------|
| cleanup | Find and remove unused dependencies from your project. Scans the codebase |
| patch | Patch one or more security vulnerabilities and set up patching infrastructure within a repository. Find safe upgrade paths, apply fixes, and configure automated patching workflows. |
| review | Research a package before you depend on it — pull every signal from Socket (scores, alerts, malware verdicts, CVEs, supply-chain risk), check the socket.dev package page, evaluate alternatives, and surface available Socket patches. |
| scan | Run a full dependency scan using the Socket CLI. Creates a scan in the |
| setup | Set up Socket — prompt for API key, install the CLI, authenticate, |
| update | Use socket fix to find and update vulnerable dependencies, then fix any breaking changes in the codebase. Security-audited upgrades with automated code migration. |

## Usage

**IMPORTANT:** You MUST read the SKILL.md file whenever the description of the skills matches the user intent, or may help accomplish their task.

## Skill Paths

Paths referenced within SKILL folders are relative to that SKILL. For example the scan `scripts/example.sh` would be referenced as `scan/scripts/example.sh`.

## Skill Files

The skills are located in:
- `skills/cleanup/SKILL.md`
- `skills/patch/SKILL.md`
- `skills/review/SKILL.md`
- `skills/scan/SKILL.md`
- `skills/setup/SKILL.md`
- `skills/update/SKILL.md`
