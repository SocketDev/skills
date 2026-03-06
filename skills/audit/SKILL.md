---
name: audit
description: Generate compliance reports, SBOMs, and license audits for your project.
  Produces CycloneDX/SPDX output, aggregates license usage, flags problematic licenses,
  and creates a compliance summary using Socket data.
---

# Audit

Generate compliance reports for your project's dependencies. This skill produces Software Bills of Materials (SBOMs), aggregates license information, flags problematic licenses, and creates a compliance summary — using the Socket CLI and Batch PURL API as the primary data source.

## When to Use

- The user needs an SBOM (Software Bill of Materials) for compliance
- The user wants to audit licenses across all dependencies
- The user needs to check for GPL, SSPL, or other restrictive licenses in a commercial project
- The user wants a compliance report for a security review or procurement process
- The user asks about license compatibility across their dependency tree

## Step 1: Discover Dependencies

Use the Socket CLI to scan the project and discover all dependencies:

```
socket scan create --repo . --json
```

If `socket` is not installed, use `npx`:

```
npx socket scan create --repo . --json
```

This discovers all manifest and lock files and resolves the full dependency tree including transitive dependencies.

## Step 2: Gather License Data

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

## Step 3: Classify Licenses

Categorize all discovered licenses into risk tiers:

| Tier | Licenses | Risk Level |
|------|----------|------------|
| Permissive | MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, 0BSD, Unlicense | Low — safe for commercial use |
| Weak Copyleft | LGPL-2.1, LGPL-3.0, MPL-2.0, EPL-2.0 | Medium — may require disclosure of modifications to the library itself |
| Strong Copyleft | GPL-2.0, GPL-3.0, AGPL-3.0 | High — may require releasing your entire project under the same license |
| Non-Commercial / Restrictive | SSPL, BSL, CC-BY-NC, Elastic License | High — restricts commercial use |
| No License / Unknown | No license file, custom license, NOASSERTION | High — no explicit permission to use |

## Step 4: Flag Issues

Flag the following issues for user attention:

- **Strong copyleft in commercial projects**: GPL/AGPL dependencies in projects not licensed under GPL/AGPL
- **SSPL or non-commercial licenses**: Dependencies that restrict commercial use
- **No license detected**: Dependencies with no license file or an unrecognized license
- **License conflicts**: Dependencies whose licenses are incompatible with each other or with the project's own license
- **Dual-licensed packages**: Note when packages offer multiple license options (e.g., MIT OR Apache-2.0)

## Step 5: Generate SBOM

Generate an SBOM in one of the standard formats:

### CycloneDX Format

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

### SPDX Format

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

## Step 6: Generate Compliance Summary

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
- List each flagged issue from Step 4 with the package name, version, and recommended action

**SBOM Generated**
- Note the filename and format of the generated SBOM

**Recommendation**
- Overall compliance status: Clean / Issues Found / Action Required
- Specific actions for each flagged issue

## Error Handling

- **Socket CLI not installed**: Use `npx socket` as a drop-in replacement, or use the `/setup` skill to install permanently.
- **Batch PURL API rate-limited**: For large dependency trees, batch requests (the API accepts multiple PURLs per call) and add delays between calls. Focus on direct dependencies first.
- **License not recognized**: If Socket returns an unknown or custom license, note it as "Unknown" and flag for manual review. Include the package's repository URL so the user can check the license file directly.
- **SBOM generation fails for mixed ecosystems**: Generate separate SBOMs per ecosystem if a single combined SBOM causes issues.

## Tips

- Run an audit before releasing a new version to catch license issues early
- For enterprise compliance, generate SBOMs in both CycloneDX and SPDX formats
- Combine with the `/scan` skill to get both security and compliance views of your dependencies
- Re-audit after adding or updating dependencies — license information can change between versions
- When flagging GPL dependencies, check if they are dev-only — GPL in devDependencies is generally lower risk for commercial projects
- Use the `/inspect` skill to deep-dive into specific packages flagged during the audit
