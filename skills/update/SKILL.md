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

## Update Strategy

**Update dependencies one at a time, not in bulk.** When multiple CVEs or vulnerable packages are discovered, apply each fix individually and verify it before moving on. This makes it easy to isolate which upgrade caused a failure and minimizes risk.

- **One dependency per subagent**: Each individual package update (apply, test, fix breakage, commit) **must** run in its own subagent. Updating dependencies produces large diffs, lengthy build output, and verbose test results — doing this in the main context will quickly exhaust the context window. The main agent should only loop over the list of vulnerabilities, dispatch a subagent for each one, and check the result.
- **Incremental and conservative**: Prefer the smallest version bump that resolves the vulnerability. Start with `--no-major-updates`. Only escalate to a major bump for a specific package if no minor/patch fix exists.
- **Test after every single update**: After each dependency is updated, the subagent must build the project and run the full test suite before reporting back. Never batch multiple updates without testing in between.
- **Retry before bailing out**: If an update breaks the build or tests and the breakage cannot be easily fixed, the subagent should revert the change and retry with a different version (e.g., drop `--no-major-updates`, or pin to a specific intermediate version). If no version resolves the issue cleanly, the subagent reports failure.
- **Bail out on failure**: If a subagent reports that it could not successfully update a dependency after retries, **stop the entire update process**. Do not continue to the next vulnerability. Report which dependency failed, what was tried, and why it failed so the user can intervene. Partially-applied updates that leave the project in a broken state are worse than no update at all.
- **Commit on success**: After each individual update passes all tests, the subagent commits the change so that progress is preserved and any future failure can be cleanly reverted without losing prior work.

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

### 2. Apply Fixes One at a Time

Once you understand what will change from the dry run, apply upgrades **one vulnerability at a time**. The main agent loops over the vulnerability list and dispatches a subagent for each one. This is critical — each update produces large diffs, build logs, and test output that would rapidly exhaust the main context window.

**For each vulnerability from the dry-run output, the main agent spawns a subagent that:**

1. Applies the single targeted fix:
   ```
   socket fix --id GHSA-xxxx-xxxx-xxxx --no-major-updates
   ```
2. Builds the project and runs the full test suite
3. If tests pass, commits the change and reports success back to the main agent
4. If tests fail:
   - Attempts to fix breaking changes in code
   - If the breakage is not easily fixable, reverts the update and retries with an alternative version (e.g., drop `--no-major-updates`, or pin to a specific intermediate version with `--range-style pin`)
   - If no version resolves the issue cleanly, reverts all changes and reports failure back to the main agent

**When a subagent reports failure, the main agent must stop.** Do not continue to the next vulnerability. Report the failure to the user with details on what was tried and why it failed.

**Do NOT use `socket fix --all` to apply everything at once.** Always target individual vulnerabilities so each change can be independently verified.

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

Fixing all vulnerabilities in a Node.js project (success case):

1. Dry run to discover issues: `socket fix --all --no-apply-fixes --json`
2. Review output — 3 GHSAs found affecting `lodash`, `express`, and `semver`
3. **Subagent 1 — lodash**: `socket fix --id GHSA-aaaa-aaaa-aaaa --no-major-updates` → minor bump applied → tests pass → commit → reports success
4. **Subagent 2 — semver**: `socket fix --id GHSA-bbbb-bbbb-bbbb --no-major-updates` → patch applied → tests pass → commit → reports success
5. **Subagent 3 — express**: `socket fix --id GHSA-cccc-cccc-cccc --no-major-updates` → no fix available without major bump
   - Retry: `socket fix --id GHSA-cccc-cccc-cccc` (allow major bump)
   - Major bump applied → 2 test failures in route tests
   - Fix route handler code to match new Express API
   - Tests pass → commit → reports success
6. All subagents succeeded → run `scan` skill → no new vulnerabilities

Failure case — main agent stops on first failure:

1. Dry run: 3 GHSAs found affecting `lodash`, `ws`, and `semver`
2. **Subagent 1 — lodash**: patch applied → tests pass → commit → reports success
3. **Subagent 2 — ws**: tried `--no-major-updates` (no fix), tried major bump (tests fail, code migration too complex), reverted → reports failure
4. **Main agent stops.** Reports to user: "ws (GHSA-yyyy-yyyy-yyyy) could not be updated. Tried minor/patch (no fix available) and major bump v7→v8 (broke WebSocket handshake tests, migration not straightforward). lodash was successfully updated. semver was not attempted."

## Tips

- Start with `--no-apply-fixes --json` to preview changes before modifying files
- Use `--no-major-updates` first for each fix, then escalate to major bumps only if needed
- **Always apply fixes one vulnerability at a time** — never batch updates without testing between them
- **Run each update pass as a subagent** — this is mandatory to prevent context window exhaustion from build output, diffs, and test results
- **If an update breaks tests**, the subagent should try alternative versions (revert, try a different minor/patch, try with/without `--no-major-updates`) before reporting failure
- **Stop on failure** — if any single update cannot be completed, halt the entire process and report to the user rather than continuing with a broken state
- Commit after each successful update so progress is saved and failures can be cleanly reverted
- Use `--minimum-release-age 2d` to avoid upgrading to freshly-published versions
- Combine with the `review` skill to compare security profiles before and after upgrades
- After all fixes are applied, run the `scan` skill to verify no new risks were introduced
- For monorepos, use `--include` and `--exclude` to target specific workspaces
