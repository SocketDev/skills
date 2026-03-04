---
name: review
description: Research a package before you depend on it — pull every signal from Socket (scores, alerts, malware verdicts, CVEs, supply-chain risk), check the socket.dev package page, evaluate alternatives, and surface available Socket patches.
---

# Review

Research a package before you depend on it. This skill pulls every available signal from Socket — scores, alerts, malware verdicts, CVEs, and supply-chain risk indicators — checks the socket.dev package page for additional context, evaluates alternatives when warranted, and surfaces available Socket patches. Use it to make an informed decision before adding, keeping, or replacing any dependency.

## When to Use

- Evaluate a package before installing it
- Investigate a flagged dependency from a scan
- Check the security, quality, or maintenance status of a package
- Compare alternatives for a dependency choice
- Check if a package is malware
- Check if Socket has patches available for a vulnerable package
- Get a comprehensive supply-chain risk report

## Step 1 — Call the Socket MCP Review Tool

Use the Socket MCP server `review` tool with the package name, ecosystem, and optionally a version.

**Supported ecosystems:** npm, pypi, go, maven, nuget, rubygems, cargo

Extract **all** returned data:
- Overall score and category scores (security, quality, maintenance, license)
- Alerts (every alert, grouped by category)
- Known vulnerabilities (CVEs) with severity and fix versions
- Dependency counts (direct and transitive)
- Maintainer and author information
- License identifier

### Example Calls

- "Review the npm package `lodash`"
- "What's the security score for `requests` on PyPI?"
- "Check if `left-pad@1.3.0` has any known vulnerabilities"
- "Compare security profiles of `express` vs `fastify`"

## Step 2 — Check the socket.dev Package Page

Construct the package URL:

```
https://socket.dev/{ecosystem}/package/{name}/overview
```

For scoped npm packages (e.g. `@scope/name`), encode the scope:

```
https://socket.dev/npm/package/@scope/name/overview
```

Use `WebFetch` to visit the page and extract:
- Score breakdown across all categories
- Full alert list with descriptions
- Dependency graph summary
- Any additional context not present in the MCP response

If `WebFetch` is unavailable or fails, note that the report is based on MCP data only and include the URL so the user can check manually.

## Step 3 — Evaluate Supply Chain Risk

Analyze the package across five dimensions. **Always check malware first.**

### 3a. Malware (CHECK FIRST)

If the package is flagged as malware, **STOP** and report immediately with a prominent warning. Do not continue to other dimensions until the malware finding is clearly communicated.

Check for:
- Explicit malware flags in Socket alerts
- Suspicious install scripts (`preinstall`, `postinstall`)
- Obfuscated or minified source code with no readable original
- Unexpected network access, filesystem access, or shell execution
- Data exfiltration patterns

If malware is detected, the warning **MUST** be the first thing in the output.

### 3b. Vulnerabilities

- List all known CVEs with severity, affected version ranges, and whether a fix is available
- Count by severity: critical, high, medium, low
- Highlight any unpatched (no fix available) vulnerabilities
- Note if vulnerabilities exist in transitive dependencies

### 3c. Dependency Tree

- Report direct and transitive dependency counts
- Flag if the package has more than 100 transitive dependencies
- Flag unusual tree depth
- Note any flagged or problematic transitive dependencies
- Consider whether the dependency footprint is proportional to the package's functionality

### 3d. Maintenance Health

- Last publish date and release cadence
- Commit frequency and recent activity
- Open issues and pull requests (ratio of open to closed)
- Number of contributors and maintainers
- Flag as potentially unmaintained if no publish in the last 12 months
- Flag as potentially abandoned if no commits in the last 24 months

### 3e. Author & Maintainer Trust

- Number of maintainers (flag if single maintainer for a widely-used package)
- Recent ownership or maintainer changes
- Typosquatting signals (name similarity to popular packages)
- Whether maintainers publish other well-known packages

## Step 4 — Research Alternatives

Research alternatives when any of the following conditions are met:
- Malware detected
- Critical unpatched CVEs
- Package is unmaintained (>12 months since last publish)
- Socket score below 40
- Excessive transitive dependencies relative to functionality
- User explicitly asks for alternatives

To research alternatives:
1. Identify the package's core functionality
2. Search for well-known alternatives providing similar functionality
3. Run the Socket MCP `review` tool on the top 3-5 alternatives
4. Present a comparison table:

| Package | Socket Score | Vulnerabilities | Dependencies | Last Published |
|---------|-------------|-----------------|--------------|----------------|
| original | ... | ... | ... | ... |
| alt-1 | ... | ... | ... | ... |
| alt-2 | ... | ... | ... | ... |

## Step 5 — Check for Socket Patches

- Check the review data for available Socket patches or overrides
- If patches are available, mention the patched version and link to the socket.dev page
- Cross-reference the `patch` and `update` skills — remind the user they can apply patches with `/patch` or run a security-audited upgrade with `/update`

## Output Format

### If Malware Is Detected

When malware is detected, the output **MUST** begin with this warning before any other content:

> **MALWARE DETECTED — do NOT install this package.**
>
> **Package:** `{name}` ({ecosystem})
> **Malware type:** {description of malware behavior}
>
> **Recommended action:** Remove this package immediately if already installed. Check for alternatives below.

Then continue with the standard report sections.

### Standard Report

Structure the report as follows:

**{name}** v{version} ({ecosystem})

**Socket Score:** {score}/100

**Alerts**
List all Socket alerts grouped by category (security, quality, maintenance, license, miscellaneous).

**Vulnerabilities**

| CVE | Severity | Affected Versions | Fixed In |
|-----|----------|-------------------|----------|
| ... | ... | ... | ... |

**Supply Chain Risk Assessment**
Summarize findings across the five dimensions (malware, vulnerabilities, dependency tree, maintenance health, author trust). Call out anything that warrants concern.

**Socket Patches**
State whether Socket patches are available. If yes, mention the patched version and how to apply via `/patch`.

**Alternatives** (if applicable)
Include the comparison table from Step 4.

**Recommendation**
A clear, actionable recommendation: safe to use, use with caution (with reasons), or avoid (with reasons and alternatives).

**Source:** [socket.dev/{ecosystem}/package/{name}](https://socket.dev/{ecosystem}/package/{name}/overview)

## Tips

- Always review unfamiliar packages before adding them as dependencies
- Single-maintainer packages carry higher supply-chain risk
- Large transitive dependency trees increase attack surface
- If a package is flagged as malware, do NOT install it — recommend immediate removal if already present
- Use review results to inform decisions with the `update`, `patch`, and `scan` skills
- Weigh Socket score and maintenance health over download count alone
- Re-review periodically — a package's security posture changes over time
- Prefer Socket patches over manual version pinning when available
