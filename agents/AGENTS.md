# Socket Security Skills Reference

You have additional SKILLs documented in directories containing a "SKILL.md" file.

## Available Skills

| Skill | Description |
|-------|-------------|
| audit | Generate compliance reports, SBOMs, and license audits for your project. Produces CycloneDX/SPDX output, aggregates license usage, flags problematic licenses, and creates a compliance summary using Socket data. |
| cleanup | Find and remove unused dependencies from your project. Scans the codebase for import and usage patterns across npm, PyPI, Cargo, Bundler, Maven, NuGet, Go, pnpm, and Yarn to identify dependencies that are no longer referenced. |
| inspect | Research a package before you depend on it — pull every signal from Socket (scores, alerts, malware verdicts, CVEs, supply-chain risk), check the socket.dev package page, evaluate alternatives, and surface available Socket patches. |
| investigate | Investigate a security incident — given a CVE, advisory, or compromised package, determine exposure, assess blast radius, check for indicators of compromise, and recommend remediation. |
| patch | Apply Socket's binary-level security patches without changing dependency versions, and set up automated patching infrastructure. Uses socket-patch apply to fix vulnerabilities in-place across CI/CD and local development. |
| scan | Run a full dependency scan using the Socket CLI. Creates a scan in the Socket dashboard, checks all dependencies for vulnerabilities and supply-chain risks, and performs Tier 1 reachability analysis for enterprise customers. |
| setup | Set up Socket — prompt for API key, install the CLI, authenticate, configure CI/CD for firewall or patch modes across GitHub, GitLab, Bitbucket, and other systems. |
| upgrade | Use socket fix to find and update vulnerable dependencies, then fix any breaking changes in the codebase. Security-audited upgrades with automated code migration. |

## Usage

**IMPORTANT:** You MUST read the SKILL.md file whenever the description of the skills matches the user intent, or may help accomplish their task.

## Skill Paths

Paths referenced within SKILL folders are relative to that SKILL. For example the scan `scripts/example.sh` would be referenced as `scan/scripts/example.sh`.

## Skill Files

The skills are located in:
- `skills/audit/SKILL.md`
- `skills/cleanup/SKILL.md`
- `skills/inspect/SKILL.md`
- `skills/investigate/SKILL.md`
- `skills/patch/SKILL.md`
- `skills/scan/SKILL.md`
- `skills/setup/SKILL.md`
- `skills/upgrade/SKILL.md`
