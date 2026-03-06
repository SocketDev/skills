# Socket Security Skills Reference

You have additional SKILLs documented in directories containing a "SKILL.md" file.

## Available Skills

| Skill | Description |
|-------|-------------|
| socket-dep-cleanup | Evaluate and remove a single unused dependency from your project. Searches the entire codebase for all usages (imports, requires, config refs, scripts, type packages, indirect usage), reports findings, and performs full removal with verification. |
| socket-dep-patch | Apply Socket's binary-level security patches without changing dependency versions. Uses socket-patch apply to fix vulnerabilities in-place. For CI/CD and infrastructure setup, use the /socket-setup skill. |
| socket-dep-replace | Replace a dependency with an alternative package, eliminate it via code rewrite, or use socket-optimize for optimized replacements. |
| socket-dep-upgrade | Use socket fix to find and update vulnerable dependencies, then fix any breaking changes in the codebase. Security-audited upgrades with automated code migration. |
| socket-fix | Holistic dependency repair — orchestrates cleanup, replacement, patching, and upgrades in a single workflow with three aggressiveness levels (conservative, cautious, full). Delegates to /socket-dep-cleanup, /socket-dep-replace, /socket-dep-patch, and /socket-dep-upgrade as subroutines. |
| socket-inspect | Research a package before you depend on it — pull every signal from Socket (scores, alerts, malware verdicts, CVEs, supply-chain risk), check the socket.dev package page, evaluate alternatives, and surface available Socket patches. |
| socket-scan | Run a full dependency scan using the Socket CLI. Creates a scan in the Socket dashboard, checks all dependencies for vulnerabilities and supply-chain risks, performs Tier 1 reachability analysis for enterprise customers, and provides license compliance auditing with SBOM generation. |
| socket-setup | Set up Socket — prompt for API key, install the CLI, authenticate, configure policies and tokens, set up CI/CD for firewall or patch modes across GitHub, GitLab, Bitbucket, and other systems. |

## Usage

**IMPORTANT:** You MUST read the SKILL.md file whenever the description of the skills matches the user intent, or may help accomplish their task.

## Skill Paths

Paths referenced within SKILL folders are relative to that SKILL. For example the scan `scripts/example.sh` would be referenced as `scan/scripts/example.sh`.

## Skill Files

The skills are located in:
- `skills/socket-dep-cleanup/SKILL.md`
- `skills/socket-dep-patch/SKILL.md`
- `skills/socket-dep-replace/SKILL.md`
- `skills/socket-dep-upgrade/SKILL.md`
- `skills/socket-fix/SKILL.md`
- `skills/socket-inspect/SKILL.md`
- `skills/socket-scan/SKILL.md`
- `skills/socket-setup/SKILL.md`
