---
name: investigate
description: Investigate a security incident — given a CVE, advisory, or compromised
  package, determine exposure, assess blast radius, check for indicators of compromise,
  and recommend remediation.
---

# Investigate

Investigate a security incident for your project. Given a CVE, advisory, or known-compromised package, this skill determines whether your project is affected, assesses the blast radius, checks for indicators of compromise, and recommends remediation steps.

## When to Use

- A new CVE or security advisory has been announced and the user needs to check exposure
- A package has been reported as compromised or containing malware
- The user wants to know if a specific vulnerability is reachable in their code
- The user needs a structured incident-response report
- The user asks "am I affected by [CVE/advisory/package]?"

## Step 1: Identify the Threat

Gather details about the security incident. The user may provide any of:

- **CVE ID** (e.g., `CVE-2021-44228`)
- **GHSA ID** (e.g., `GHSA-jfh8-c2jp-5v3q`)
- **Package name and version** (e.g., `log4j-core@2.14.1`)
- **Advisory URL** (e.g., a GitHub advisory or NVD link)
- **Description** of the incident (e.g., "the colors npm package was compromised")

If the user provides a description rather than specific identifiers, search for the relevant CVE/GHSA/package using:
1. The Socket Batch PURL API to look up the package (see below)
2. WebSearch to find the relevant advisory and CVE details

**Socket Batch PURL API call:**

```
curl -X POST https://api.socket.dev/v0/purl \
  -H "Authorization: Bearer $SOCKET_SECURITY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"purls": ["pkg:<ecosystem>/<name>@<version>"]}'
```

If `SOCKET_SECURITY_API_KEY` is not set, try `npx socket <ecosystem>/<name>` as a fallback.

Record:
- **Affected package**: name, ecosystem, affected version range
- **Vulnerability type**: RCE, XSS, SSRF, supply-chain compromise, malware, etc.
- **Severity**: CVSS score and severity level (critical/high/medium/low)
- **Fix version**: the version that resolves the issue (if available)
- **Date disclosed**: when the vulnerability was publicly disclosed

## Step 2: Check Exposure

Determine whether the project uses the affected package:

### 2a. Direct Dependency Check

Search manifest files for the affected package:

```
# npm
grep -r "affected-package" package.json package-lock.json
# pip
grep -r "affected-package" requirements*.txt pyproject.toml Pipfile
# Go
grep -r "affected-package" go.mod go.sum
# Cargo
grep -r "affected-package" Cargo.toml Cargo.lock
```

### 2b. Transitive Dependency Check

The package may be a transitive dependency. Run a full scan:

```
socket scan create --repo . --json
```

Search the scan results for the affected package. If found as a transitive dependency, identify the dependency chain (which direct dependency pulls it in).

### 2c. Version Check

If the package is found, check whether the installed version falls within the affected version range. Compare:
- Installed version (from lock file)
- Affected version range (from the advisory)
- Fixed version (from the advisory)

**If the installed version is NOT in the affected range**, report that the project is not vulnerable and stop.

### 2d. Reachability Analysis (Enterprise)

For enterprise users, run reachability analysis to determine if the vulnerable code path is actually exercised:

```
socket scan reach --org <org-slug> .
```

Check the `.socket.facts.json` output for the affected package's reachability status:
- `reachable` — the vulnerability is likely exploitable; treat as high priority
- `unreachable` — the vulnerability exists but the code path is not used; lower priority
- `unknown` — treat as potentially reachable

## Step 3: Assess Blast Radius

If the project is exposed, determine the scope of impact:

1. **Where is the package used?** Search the codebase for imports/requires of the affected package. List every file that directly uses it.
2. **What functionality does it provide?** Identify what the affected package does in the project (e.g., logging, HTTP parsing, serialization).
3. **Is it in production code or dev/test only?** Check whether the dependency is in `dependencies` vs `devDependencies` (or equivalent). Dev-only exposure is lower risk.
4. **Is it exposed to external input?** Determine if the vulnerable code path processes user-supplied data, network input, or untrusted content. This affects exploitability.
5. **Monorepo scope**: If the project is a monorepo, identify which workspaces/packages are affected.

## Step 4: Check for Indicators of Compromise

For supply-chain compromises and malware incidents, check whether the project may have already been affected:

- **Check install scripts**: Review `postinstall` and `preinstall` scripts in the affected package for suspicious behavior (network calls, filesystem writes, environment variable exfiltration)
- **Check for unexpected files**: Look for files created by malicious install scripts (common locations: `/tmp`, home directory, `.env` files)
- **Check environment variables**: If the malware is known to exfiltrate env vars, advise the user to rotate any secrets that may have been exposed
- **Check CI/CD logs**: If the affected package was installed in CI, review build logs for unexpected output or network activity
- **Check lock file history**: Use `git log` to determine when the vulnerable version was introduced and whether it was an expected update

**Skip this step** for standard CVEs that are not supply-chain compromises — it only applies to malware and intentionally malicious packages.

## Step 5: Recommend Remediation

Based on the assessment, provide specific remediation steps:

### If Vulnerable and Fix Available

1. **Immediate**: Use the `/upgrade` skill to upgrade to the fix version
   ```
   socket fix --id GHSA-xxxx-xxxx-xxxx --no-major-updates
   ```
2. **If upgrade isn't possible**: Use the `/patch` skill to apply a Socket binary patch (if available)
3. **If no patch available**: Consider temporary mitigations:
   - Add the package to `overrides`/`resolutions` to force a safe version
   - Replace the affected functionality with an alternative package
   - Add input validation or firewall rules to block exploitation

### If Vulnerable and No Fix Available

1. **Check Socket patches**: Use the `/patch` skill — Socket may have a binary patch even when upstream hasn't released a fix
2. **Mitigate**: Reduce exposure by limiting how the vulnerable code path is used
3. **Replace**: Use the `/inspect` skill to evaluate alternative packages
4. **Remove**: Use the `/cleanup` skill if the dependency is unused or can be removed
5. **Monitor**: Set up alerts for when a fix is released

### If Compromised (Malware)

1. **Remove immediately**: Uninstall the affected package
2. **Rotate secrets**: Rotate all API keys, tokens, and credentials that may have been exposed
3. **Audit CI/CD**: Review recent builds for unexpected behavior
4. **Pin versions**: Pin remaining dependencies to exact versions to prevent similar incidents
5. **Report**: Report the compromise to the package registry (npm, PyPI, etc.)

## Step 6: Generate Report

Produce a structured incident report:

**Incident: [CVE/GHSA ID or description]**

**Summary**
- What: brief description of the vulnerability/compromise
- Severity: CVSS score and level
- Affected package: name@version (ecosystem)

**Exposure Assessment**
- Direct dependency: yes/no
- Transitive dependency: yes/no (via which package)
- Installed version: X.Y.Z (affected range: A.B.C - D.E.F)
- Reachability: reachable/unreachable/unknown
- Production code: yes/no

**Blast Radius**
- Files using the package: list
- Exposed to external input: yes/no
- Workspaces affected: list (for monorepos)

**Indicators of Compromise** (if applicable)
- Suspicious scripts found: yes/no
- Unexpected files: list
- Secrets potentially exposed: yes/no

**Remediation**
- Recommended action: upgrade/patch/replace/remove
- Fix version: X.Y.Z
- Commands to run: list

**Status**: Resolved / Mitigated / Monitoring / Action Required

## Error Handling

- **CVE/GHSA not found in Socket**: The advisory may be too new or not yet indexed. Use WebSearch to find details directly from NVD, GitHub Advisories, or the package's issue tracker.
- **Package not in dependency tree**: Report that the project is not affected and no action is needed. Still include the advisory details in case the package is added later.
- **Reachability analysis unavailable**: Skip reachability and treat the vulnerability as potentially reachable. Note this in the report.
- **Cannot determine affected version range**: Flag this uncertainty in the report and recommend upgrading to the latest version as a precaution.

## Tips

- Speed matters during incidents — start with Step 2 (exposure check) to quickly determine if the project is affected before deep-diving
- For high-profile incidents (log4shell, xz backdoor), check all projects/repos the user maintains, not just the current one
- Keep the incident report in the repository (e.g., `SECURITY-INCIDENT-<date>.md`) for future reference
- After remediation, run the `/scan` skill to verify the fix and check for any new issues introduced
- Combine with the `/inspect` skill to evaluate the affected package's overall security posture
- For supply-chain compromises, also check if the user's CI/CD pipelines use the affected package
