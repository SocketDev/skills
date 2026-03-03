<skills>

You have additional SKILLs documented in directories containing a "SKILL.md" file.

These skills are:
 - firewall -> "skills/firewall/SKILL.md"
 - patch -> "skills/patch/SKILL.md"
 - review -> "skills/review/SKILL.md"
 - scan -> "skills/scan/SKILL.md"
 - update -> "skills/update/SKILL.md"

IMPORTANT: You MUST read the SKILL.md file whenever the description of the skills matches the user intent, or may help accomplish their task.

<available_skills>

firewall: `Set up Socket firewall and configure local environment to block malicious packages. Install and configure socket-firewall, manage allow/deny rules, and enforce org policies.`

patch: `Patch one or more security vulnerabilities and set up patching infrastructure within a repository. Find safe upgrade paths, apply fixes, and configure automated patching workflows.`

review: `Get detailed security information about a single package. Deep-dive into a specific dependency: vulnerability history, maintainer info, permissions, quality score, license, and transitive deps.`

scan: `Scan all packages and dependencies within a repository for vulnerabilities, malware, and supply-chain risks. Covers full project scans across ecosystems (npm, PyPI, Go, Maven, etc.), output interpretation, and CI integration.`

update: `Update a dependency and propose local code fixes for any breaking changes. Security-audited upgrades with automated code migration suggestions.`

</available_skills>

Paths referenced within SKILL folders are relative to that SKILL. For example the scan `scripts/example.sh` would be referenced as `scan/scripts/example.sh`.

</skills>
