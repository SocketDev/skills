---
name: update
description: Use socket fix to find and update vulnerable dependencies, then fix any breaking changes in the codebase. Security-audited upgrades with automated code migration.
---

# Update

Use the `socket fix` command to discover vulnerable dependencies, compute safe upgrade paths, and apply version updates — then fix any breaking changes in the codebase so everything builds and passes tests.

## When to Use

- The user wants to fix known CVEs or security vulnerabilities in their dependencies
- The user asks to bring dependencies up to date with security fixes
- The user wants to update a specific vulnerable dependency (by GHSA, CVE, or PURL)
- The user needs to migrate code after a security-driven version bump
- The user asks to find and fix all fixable vulnerabilities in the project

## Prerequisites

The Socket CLI must be installed and authenticated. Verify readiness:

```
socket --version
```

If `socket` is not installed globally, use `npx` to run it without installing:

```
npx socket fix --all --no-apply-fixes --json
```

All `socket fix` commands in this skill can be prefixed with `npx` as a drop-in replacement. If you need a permanent installation, use the `setup` skill.

## Update Workflow

### 1. Discover Vulnerable Dependencies

Use `socket fix` to identify dependencies with known vulnerabilities and compute upgrade paths.

**Fix all discoverable vulnerabilities (recommended starting point):**

```
socket fix --all --no-apply-fixes --json
```

This performs a dry run: it uploads project manifests to the Socket API, discovers all fixable GHSAs via Coana analysis, computes upgrade paths, and reports what would change — without modifying any files.

**Target specific vulnerabilities by ID:**

```
socket fix --id GHSA-xxxx-xxxx-xxxx --no-apply-fixes --json
socket fix --id CVE-2024-12345 --no-apply-fixes --json
socket fix --id pkg:npm/lodash@4.17.20 --no-apply-fixes --json
```

CVE IDs and PURLs are automatically converted to GHSA IDs.

Review the dry-run output to understand which packages will be upgraded and to what versions.

### 2. Apply the Fixes

Once you understand what will change, apply the upgrades:

**Apply all fixes (conservative — no major version bumps):**

```
socket fix --all --no-major-updates
```

**Apply all fixes (including major version bumps):**

```
socket fix --all
```

**Apply a targeted fix:**

```
socket fix --id GHSA-xxxx-xxxx-xxxx
```

**Useful flags:**

| Flag | Purpose |
|---|---|
| `--no-major-updates` | Skip fixes that require major version bumps (safer, fewer breaking changes) |
| `--range-style pin` | Pin to exact versions instead of preserving range style |
| `--minimum-release-age 2d` | Only suggest versions published at least 2 days ago |
| `--output-file fixes.json` | Save computed upgrades to a JSON file for inspection |
| `--ecosystems npm,pypi` | Limit to specific ecosystems |
| `--include "packages/*"` | Only fix matching workspaces |
| `--exclude "packages/legacy"` | Skip matching workspaces |

After `socket fix` completes, review the changes it made to manifest and lock files (e.g. `package.json`, `package-lock.json`, `requirements.txt`, `go.mod`).

### 3. Identify Breaking Changes

After applying fixes, determine what may have broken:

1. **Check what changed**: Review the diff of manifest/lock files to see which packages were upgraded and by how many major/minor/patch versions
2. **For major version bumps**: Look up the CHANGELOG or migration guide for each upgraded package
3. **For minor/patch bumps**: These are usually backwards-compatible, but still check release notes for deprecation warnings
4. **Identify affected code**: Search the codebase for imports and usage of each upgraded package

### 4. Fix Breaking Changes

Address any breaking changes introduced by the upgrades:

- **Renamed or removed APIs**: Search for usage of deprecated or removed functions, classes, or methods and update them
- **Changed imports**: Update import paths if the package restructured its module exports
- **Configuration changes**: Adjust configuration objects, option names, or default values
- **Type changes**: Update TypeScript type annotations or interfaces if type definitions changed
- **New peer dependencies**: Install any newly required peer dependencies
- **Behavioral changes**: Adjust code that relies on changed default behaviors or return values

### 5. Verify

Iterate until everything passes:

1. **Build the project** to check for compile/type errors
2. **Run the full test suite** and fix any failing tests
3. **Run the `scan` skill** to confirm no new vulnerabilities were introduced by the upgrades
4. **Re-run `socket fix --all --no-apply-fixes --json`** to verify no fixable vulnerabilities remain

If tests fail after fixing, investigate each failure:
- Determine whether the failure is caused by a breaking API change or a pre-existing issue
- Apply targeted code fixes, re-run tests, and repeat until green

## Example

Fixing all vulnerabilities in a Node.js project:

1. Dry run to discover issues: `socket fix --all --no-apply-fixes --json`
2. Review output — 3 GHSAs found affecting `lodash`, `express`, and `semver`
3. Apply conservative fixes: `socket fix --all --no-major-updates`
4. `lodash` and `semver` patched (minor bumps), `express` skipped (requires major bump)
5. Run tests — all pass. No breaking changes from minor bumps.
6. Apply remaining fix: `socket fix --id GHSA-xxxx-xxxx-xxxx` (the `express` major bump)
7. Check Express migration guide for breaking changes
8. Update middleware signatures and route syntax in application code
9. Run tests — 2 failures in route tests
10. Fix route handler code to match new Express API
11. Run tests — all pass
12. Run `scan` skill — no new vulnerabilities

## Tips

- Start with `--no-apply-fixes --json` to preview changes before modifying files
- Use `--no-major-updates` first to apply safe patches, then handle major bumps separately
- Apply fixes one vulnerability at a time for easier debugging when breaking changes occur
- Use `--minimum-release-age 2d` to avoid upgrading to freshly-published versions
- Combine with the `review` skill to compare security profiles before and after upgrades
- After all fixes are applied, run the `scan` skill to verify no new risks were introduced
- For monorepos, use `--include` and `--exclude` to target specific workspaces
