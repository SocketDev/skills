---
name: research-scan
description: Run a full dependency scan using the Socket CLI. Creates a scan in the
  Socket dashboard, checks all dependencies for vulnerabilities and supply-chain risks,
  performs Tier 1 reachability analysis for enterprise customers, and provides license
  compliance auditing with SBOM generation.
---

# Research Scan

Run a full dependency scan using the Socket CLI. Automatically discovers all project dependencies, checks them for vulnerabilities and supply-chain risks, creates a scan visible in the Socket dashboard, performs Tier 1 reachability analysis for enterprise customers, and provides license compliance auditing with SBOM generation.

## When to Use

- The user wants to scan their project's dependencies for vulnerabilities or supply-chain risks
- The user wants to create a scan visible in the Socket dashboard
- The user wants reachability analysis to determine if vulnerabilities are actually exploitable in their code
- The user is adding or updating dependencies and wants to verify security posture
- The user asks for a full security audit of their dependency tree
- The user wants to check for malware in their dependencies
- The user needs an SBOM (Software Bill of Materials) for compliance
- The user wants to audit licenses across all dependencies
- The user needs to check for GPL, SSPL, or other restrictive licenses in a commercial project
- The user wants a compliance report for a security review or procurement process
- The user asks about license compatibility across their dependency tree

## Prerequisites

The Socket CLI must be installed and authenticated. Verify readiness:

```
socket --version
```

If `socket` is not installed globally, use `npx` to run it without installing:

```
npx socket scan create --repo . --json
```

All `socket` commands in this skill can be prefixed with `npx` as a drop-in replacement. If you need a permanent installation, use the `setup` skill.

For enterprise features (reachability analysis), authentication is required via `socket login` or the `SOCKET_CLI_API_TOKEN` environment variable. Verify with:

```
socket organization list
```

## Scan Workflow

### 1. Create a Full Scan

Run a full dependency scan on the current repository:

```
socket scan create --repo . --json
```

The CLI automatically discovers and parses all manifest and lock files in the repository — no need to manually extract dependencies. The scan is uploaded to the Socket dashboard where results can be viewed and shared.

**For enterprise customers**, specify the organization to associate the scan:

```
socket scan create --repo . --org <org-slug> --json
```

**Flags:**

| Flag | Purpose |
|---|---|
| `--repo <path>` | Path to the repository to scan (use `.` for current directory) |
| `--org <org-slug>` | Organization slug for enterprise scans |
| `--json` | Output results as JSON for easier parsing |
| `--branch <name>` | Associate the scan with a specific branch |
| `--commit <sha>` | Associate the scan with a specific commit |

### 2. Interpret Results

When using `--json`, the output is a JSON object with these top-level keys:

```json
{
  "id": "scan-id-string",
  "url": "https://socket.dev/dashboard/org/.../scan/...",
  "packages": [
    {
      "name": "lodash",
      "version": "4.17.20",
      "ecosystem": "npm",
      "score": { "overall": 85, "security": 90, "quality": 80, "maintenance": 75, "license": 95 },
      "alerts": [ { "type": "criticalCVE", "severity": "critical", "title": "...", "description": "..." } ],
      "vulnerabilities": [ { "id": "GHSA-...", "severity": "high", "fixedIn": "4.17.21" } ]
    }
  ],
  "summary": { "total": 150, "critical": 1, "high": 3, "medium": 12, "low": 25, "malware": 0 }
}
```

Use these keys to programmatically filter and prioritize findings.

Triage alerts by severity:

- **Critical / High severity**: Stop and report these to the user immediately. These represent known vulnerabilities with available exploits or severe supply-chain risks that require urgent attention.
- **Malware**: If any package is flagged as malware, display a prominent warning. Malware findings should be treated as the highest priority — advise the user to remove the package immediately.
- **Medium / Low severity**: Summarize these for the user. Group by category (vulnerability, quality, maintenance, license) and provide a brief overview rather than listing each one individually.

### 3. Reachability Analysis (Enterprise Only)

For enterprise customers, run Tier 1 reachability analysis to determine whether vulnerabilities are actually reachable in the project's code:

```
socket scan reach --org <org-slug> .
```

This analyzes the project's dependency graph and source code to classify each vulnerability by reachability:

| Reachability | Meaning | Effective Priority |
|---|---|---|
| `reachable` | Vulnerable code path is exercised by the project | Critical — fix immediately |
| `unreachable` | Vulnerable code path is not used | Low — deprioritize |
| `unknown` | Reachability could not be determined | High — treat as potentially reachable |
| `not_applicable` | Vulnerability does not apply to this context | Filter out |

Reachability analysis generates a `.socket.facts.json` file in the project root with detailed findings. This helps prioritize which vulnerabilities to fix first — focus effort on `reachable` issues rather than wasting time on `unreachable` ones.

**Skip this step entirely for free-tier users** — reachability analysis requires an enterprise subscription with an authenticated organization.

### 4. Act on Findings

Based on scan results, cross-reference other skills to resolve issues:

- **Vulnerabilities with available fixes** — use the `/dep-upgrade` skill to apply safe upgrades
- **Packages needing deeper investigation** — use the `/research-inspect` skill to research specific packages
- **Packages with Socket patches available** — use the `/dep-patch` skill to apply security patches
- **Unused dependencies** — use the `/dep-cleanup` skill to remove packages that are no longer needed

### 5. License & Compliance Audit

For each dependency in the scan results, collect license information using the Socket Batch PURL API:

```
curl -X POST https://api.socket.dev/v0/purl \
  -H "Authorization: Bearer $SOCKET_SECURITY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"purls": ["pkg:<ecosystem>/<name>@<version>", ...]}'
```

1. Query the Batch PURL API for each direct dependency to get its license identifier
2. Note the license for each package in the dependency tree
3. Group dependencies by license type

For large dependency trees, prioritize direct dependencies and flag transitive dependencies that use different licenses.

Categorize all discovered licenses into risk tiers:

| Tier | Licenses | Risk Level |
|------|----------|------------|
| Permissive | MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, 0BSD, Unlicense | Low — safe for commercial use |
| Weak Copyleft | LGPL-2.1, LGPL-3.0, MPL-2.0, EPL-2.0 | Medium — may require disclosure of modifications to the library itself |
| Strong Copyleft | GPL-2.0, GPL-3.0, AGPL-3.0 | High — may require releasing your entire project under the same license |
| Non-Commercial / Restrictive | SSPL, BSL, CC-BY-NC, Elastic License | High — restricts commercial use |
| No License / Unknown | No license file, custom license, NOASSERTION | High — no explicit permission to use |

Flag the following issues for user attention:

- **Strong copyleft in commercial projects**: GPL/AGPL dependencies in projects not licensed under GPL/AGPL
- **SSPL or non-commercial licenses**: Dependencies that restrict commercial use
- **No license detected**: Dependencies with no license file or an unrecognized license
- **License conflicts**: Dependencies whose licenses are incompatible with each other or with the project's own license
- **Dual-licensed packages**: Note when packages offer multiple license options (e.g., MIT OR Apache-2.0)

### 6. Generate SBOM

Generate an SBOM in one of the standard formats:

#### CycloneDX Format

Create a `bom.json` (CycloneDX 1.5) with this structure:

```json
{
  "bomFormat": "CycloneDX",
  "specVersion": "1.5",
  "version": 1,
  "metadata": {
    "component": {
      "type": "application",
      "name": "<project-name>",
      "version": "<project-version>"
    }
  },
  "components": [
    {
      "type": "library",
      "name": "<package-name>",
      "version": "<version>",
      "purl": "pkg:<ecosystem>/<name>@<version>",
      "licenses": [{ "license": { "id": "<SPDX-id>" } }]
    }
  ]
}
```

#### SPDX Format

Create an `sbom.spdx.json` (SPDX 2.3) with this structure:

```json
{
  "spdxVersion": "SPDX-2.3",
  "dataLicense": "CC0-1.0",
  "SPDXID": "SPDXRef-DOCUMENT",
  "name": "<project-name>",
  "packages": [
    {
      "SPDXID": "SPDXRef-Package-<name>-<version>",
      "name": "<package-name>",
      "versionInfo": "<version>",
      "downloadLocation": "<registry-url>",
      "licenseConcluded": "<SPDX-id>",
      "externalRefs": [{ "referenceType": "purl", "referenceLocator": "pkg:<ecosystem>/<name>@<version>" }]
    }
  ]
}
```

Ask the user which format they prefer. Default to CycloneDX if not specified.

### 7. Compliance Summary

Produce a human-readable compliance summary:

**License Summary**

| License | Count | Risk |
|---------|-------|------|
| MIT | 120 | Low |
| Apache-2.0 | 30 | Low |
| ISC | 15 | Low |
| GPL-3.0 | 2 | High |
| Unknown | 1 | High |

**Issues Found**
- List each flagged issue from Step 5 with the package name, version, and recommended action

**SBOM Generated**
- Note the filename and format of the generated SBOM

**Recommendation**
- Overall compliance status: Clean / Issues Found / Action Required
- Specific actions for each flagged issue

## Error Handling

- **`socket: command not found`**: Install the Socket CLI with `npm install -g socket` or use `npx socket` as a prefix. If you need a permanent installation, use the `/setup` skill.
- **`socket scan create` fails with authentication error**: Enterprise scans require authentication. Run `socket login` or set the `SOCKET_CLI_API_TOKEN` environment variable. Free-tier users can still run basic scans without authentication.
- **`socket scan reach` returns "not available"**: Reachability analysis requires an enterprise subscription. Skip this step for free-tier users.
- **No manifest/lock files found**: The scan relies on manifest files (`package.json`, `requirements.txt`, `go.mod`, etc.). Ensure the `--repo` path points to a directory containing these files.
- **Scan times out**: Large monorepos with many manifest files may take longer. Try limiting the scan to a specific subdirectory with `--repo ./path/to/subdir`.
- **Batch PURL API rate-limited**: For large dependency trees, batch requests (the API accepts multiple PURLs per call) and add delays between calls. Focus on direct dependencies first.
- **License not recognized**: If Socket returns an unknown or custom license, note it as "Unknown" and flag for manual review. Include the package's repository URL so the user can check the license file directly.
- **SBOM generation fails for mixed ecosystems**: Generate separate SBOMs per ecosystem if a single combined SBOM causes issues.

## Tips

- Always run a scan after adding, updating, or removing dependencies to verify the project's security posture
- Use `--json` for machine-readable output that is easier to parse and summarize
- Combine with the `/research-inspect` skill for deep-dives into specific flagged packages
- Combine with the `/dep-upgrade` skill to fix vulnerabilities discovered during the scan
- Enterprise customers should use reachability analysis to prioritize fixes — focus on `reachable` vulnerabilities first
- Scan results are available in the Socket dashboard for team visibility and historical tracking
- If `socket` is not installed, `npx socket` works as a drop-in replacement for all commands
- Run a compliance audit before releasing a new version to catch license issues early
- For enterprise compliance, generate SBOMs in both CycloneDX and SPDX formats
- Re-audit after adding or updating dependencies — license information can change between versions
- When flagging GPL dependencies, check if they are dev-only — GPL in devDependencies is generally lower risk for commercial projects
- Use the `/research-inspect` skill to deep-dive into specific packages flagged during the audit
