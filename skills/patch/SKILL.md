---
name: patch
description: Patch one or more security vulnerabilities and set up patching infrastructure within a repository. Find safe upgrade paths, apply fixes, and configure automated patching workflows.
---

# Patch

Patch one or more security vulnerabilities and set up patching infrastructure within a repository. Finds safe upgrade paths, applies fixes, and configures automated patching workflows.

## When to Use

- The user wants to fix vulnerabilities found by a scan
- The user needs to upgrade a dependency to resolve a CVE
- The user wants to set up automated security patching (e.g., Socket Pull Requests)
- The user asks how to remediate specific security findings

## Patching Workflow

### 1. Identify Vulnerabilities

Start by reviewing scan results or specific CVE IDs. For each vulnerability, determine:
- Which package and version is affected
- What the fix version is (if available)
- Whether the fix introduces breaking changes

### 2. Find Safe Upgrade Paths

Use the Socket API to determine the safest upgrade path:
- **Patch version bump** (e.g., 1.2.3 → 1.2.4): Lowest risk, fixes only
- **Minor version bump** (e.g., 1.2.3 → 1.3.0): Low risk, may add features
- **Major version bump** (e.g., 1.2.3 → 2.0.0): Higher risk, may have breaking changes

Always prefer the smallest version bump that resolves the vulnerability.

### 3. Apply Fixes

For each package manager:
- **npm**: `npm install package@version`, then verify with `npm audit`
- **pip**: Update version pin in `requirements.txt` or `pyproject.toml`, then `pip install`
- **Go**: `go get package@version`, then `go mod tidy`
- **Maven/Gradle**: Update version in `pom.xml` or `build.gradle`

### 4. Verify

After patching:
1. Run the project's test suite to catch regressions
2. Re-scan with the `scan` skill to confirm the vulnerability is resolved
3. Review any new transitive dependencies introduced by the upgrade

## Automated Patching

### Socket Pull Requests

Configure Socket to automatically open PRs for security fixes:
1. Install the Socket GitHub App on the repository
2. Enable automated PRs in the Socket dashboard
3. Set severity thresholds (e.g., auto-PR for critical/high, notify for medium)

### Configuration

Socket patching respects existing version constraints. Configure override behavior in `socket.yml`:
```yaml
issues:
  - package: "*"
    severity: critical
    action: error
  - package: "*"
    severity: high
    action: warn
```

## Tips

- Always run tests after patching — even patch-level bumps can introduce regressions
- When a direct fix isn't available, consider using `npm overrides`, `pip` constraints, or Go `replace` directives as temporary mitigations
- Combine with the `scan` skill to verify the vulnerability is fully resolved after patching
