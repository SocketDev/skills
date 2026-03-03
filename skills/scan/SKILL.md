---
name: scan
description: Scan all packages and dependencies within a repository for vulnerabilities, malware, and supply-chain risks. Covers full project scans across ecosystems (npm, PyPI, Go, Maven, etc.), output interpretation, and CI integration.
---

# Scan

Scan all packages and dependencies within a single repository for vulnerabilities, malware, and supply-chain risks using the Socket API.

## When to Use

- The user wants to audit the security posture of an entire project
- The user needs to identify vulnerable, malicious, or risky dependencies
- The user wants to integrate dependency scanning into CI/CD pipelines
- The user asks about known vulnerabilities in their dependency tree

## How It Works

Socket analyzes package manifests and lock files to identify:
- **Known vulnerabilities** (CVEs) across all dependency levels
- **Malware** detected through static and dynamic analysis
- **Supply-chain risks** such as typosquatting, install scripts, obfuscated code, and protestware
- **Quality issues** like unmaintained packages, deprecated dependencies, and license risks

## Supported Ecosystems

| Ecosystem | Manifest Files |
|-----------|---------------|
| npm | `package.json`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml` |
| PyPI | `requirements.txt`, `setup.py`, `pyproject.toml`, `Pipfile.lock` |
| Go | `go.mod`, `go.sum` |
| Maven | `pom.xml` |
| Gradle | `build.gradle`, `build.gradle.kts` |
| Ruby | `Gemfile`, `Gemfile.lock` |
| NuGet | `*.csproj`, `packages.config` |

## Usage

### Full Repository Scan

Use the Socket MCP server `scan` tool to scan the current repository. Provide the repository path and optionally filter by ecosystem.

### Interpreting Results

Scan results include:
- **Critical**: Malware, critical CVEs — must be addressed immediately
- **High**: High-severity CVEs, dangerous install scripts — address before deployment
- **Medium**: Quality warnings, maintainability concerns — plan remediation
- **Low**: Informational findings, minor license issues — review at convenience

### CI Integration

To add Socket scanning to CI pipelines:
1. Add the Socket GitHub App to the repository, or
2. Use the `socket` CLI in CI scripts with `SOCKET_SECURITY_API_KEY` set
3. Configure severity thresholds to fail builds on critical/high findings

## Tips

- Always scan after adding new dependencies or updating lock files
- Use `--json` output for programmatic processing of results
- Combine with the `review` skill to deep-dive into specific flagged packages
- Combine with the `patch` skill to remediate findings
