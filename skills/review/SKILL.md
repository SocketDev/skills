---
name: review
description: Get detailed security information about a single package. Deep-dive into a specific dependency: vulnerability history, maintainer info, permissions, quality score, license, and transitive deps.
---

# Review

Get detailed security information about a single package using the Socket API. Perform a deep-dive into any dependency to understand its risk profile before adding it to your project.

## When to Use

- The user wants to evaluate a specific package before installing it
- The user needs details on a flagged dependency from a scan
- The user asks about the security, quality, or maintenance status of a package
- The user wants to compare alternatives for a dependency choice

## What You Get

### Security Assessment
- **Vulnerability history**: All known CVEs, their severity, affected versions, and fix availability
- **Malware indicators**: Results of Socket's static and dynamic analysis
- **Supply-chain signals**: Install scripts, obfuscated code, network access, filesystem access, shell access

### Package Health
- **Overall score**: Socket's composite quality/security score (0-100)
- **Maintenance status**: Last publish date, commit activity, open issues/PRs
- **Maintainer info**: Number of maintainers, ownership changes, publish permissions
- **License**: SPDX license identifier, license compatibility notes

### Dependency Analysis
- **Direct dependencies**: Immediate dependencies with their own scores
- **Transitive dependency count**: Total size of the dependency tree
- **Dependency risks**: Flagged transitive dependencies that inherit risk

## Usage

Use the Socket MCP server `review` tool with the package name and ecosystem (e.g., `npm`, `pypi`, `go`). Optionally specify a version.

### Example Queries

- "Review the npm package `lodash`"
- "What's the security score for `requests` on PyPI?"
- "Check if `left-pad@1.3.0` has any known vulnerabilities"
- "Compare security profiles of `express` vs `fastify`"

## Tips

- Always review unfamiliar packages before adding them as dependencies
- Pay attention to the number of maintainers — single-maintainer packages carry higher supply-chain risk
- Check the transitive dependency count — large trees increase attack surface
- Use review results to inform decisions in the `update` and `patch` skills
