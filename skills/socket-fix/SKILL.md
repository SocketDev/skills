---
name: socket-fix
description: Holistic dependency repair — orchestrates cleanup, replacement, patching,
  and upgrades in a single workflow with three aggressiveness levels (conservative,
  cautious, full). Delegates to /socket-dep-cleanup, /socket-dep-replace, /socket-dep-patch, and /socket-dep-upgrade
  as subroutines.
---

# Fix

Holistic dependency repair — orchestrate `/socket-dep-cleanup`, `/socket-dep-replace`, `/socket-dep-patch`, and `/socket-dep-upgrade` into a single phased workflow. Choose from three aggressiveness levels (conservative, cautious, full) to control how far the repair goes.

This skill is an **orchestrator**. It does not have its own tools — it delegates every concrete action to the dep-* skills.

## When to Use

- The user wants a one-shot "fix everything" for their dependencies
- The user wants to clean up, patch, and upgrade in a single coordinated pass
- The user asks for a safe or conservative dependency repair
- The user wants to progressively increase aggressiveness (start safe, escalate if needed)

## Prerequisites

This orchestrator delegates to sub-skills with mixed authentication requirements:

- `/socket-dep-cleanup` — **NO** account required
- `/socket-dep-patch` (`socket-patch apply`) — **NO** account required
- `/socket-dep-upgrade` (`socket fix`, `socket scan create`) — **account REQUIRED**
- `/socket-dep-replace` (`socket fix`, `socket scan create`) — **account REQUIRED**

**Without a Socket account**, only Level 1 (Conservative) is fully available, as it uses only cleanup and patches. Levels 2 and 3 use `socket fix` for vulnerability discovery and upgrades, which requires authentication.

If the user does not have a Socket account and requests Level 2 or 3, explain the limitation and either:
- Help them create an account at https://socket.dev, then proceed
- Fall back to Level 1 (cleanup + patches only)

## Step 1: Detect Environment

Before any repair work, identify the project's ecosystem and dependency landscape.

1. **Detect ecosystems** — check for manifest and lock files (`package.json`, `requirements.txt`, `go.mod`, `Cargo.toml`, etc.) to determine which package managers are in use
2. **Parse dependencies** — read manifest files to build a list of all direct dependencies (production and dev)
3. **Detect CI** — check for CI/CD configuration (`.github/workflows/`, `.gitlab-ci.yml`, `bitbucket-pipelines.yml`, etc.) to understand the project's build and test infrastructure
4. **Ensure dependencies are installed** — check for the presence of the dependency directory (`node_modules/`, `vendor/`, etc.). If dependencies are not installed, run the project's install command using the detected package manager (e.g. `npm install`, `pnpm install`, `bun install`). This is required for both patching (Phase 1b) and accurate unused dependency detection (Phase 1a).

Report a brief summary:

```
Environment detected:
  Ecosystem: npm (package-lock.json)
  Dependencies: 42 production, 18 dev
  CI: GitHub Actions (Node 18/20 matrix)
  Build command: npm run build
  Test command: npm test
  Dependencies installed: yes (node_modules/ present)
```

## Step 2: Select Aggressiveness Level

Ask the user which level they want, or auto-detect from their prompt:

| Level | Name | What It Does |
|-------|------|-------------|
| 1 | **Conservative** | Only non-breaking changes: remove trivially unused deps + apply binary patches |
| 2 | **Cautious** | Everything in Level 1, plus propose ONE risky change for user approval |
| 3 | **Full** | Safe upgrades, aggressive cleanup, patching, and risky major upgrades — skip and continue on failure |

If the user says "fix everything", "full repair", or "aggressive" → Level 3.
If the user says "safe", "conservative", or "don't break anything" → Level 1.
If the user says "careful", "cautious", or "one step at a time" → Level 2.
If unclear, default to Level 1 and offer to escalate.

---

## Level 1 — Conservative

Only non-breaking changes. Nothing here should break the build.

### Phase 1a: Remove Trivially Unused Dependencies

For each dependency in the project:

1. Search the entire codebase for usages (imports, requires, config refs, scripts, type packages, indirect usage)
2. Collect packages where no usage is found
3. **Exclude ambiguous cases** from automatic removal:
   - `@types/*` packages (may support type-checking for indirect usage)
   - Peer dependencies required by other installed packages
   - CLI tools referenced in `package.json` scripts
   - Build plugins (webpack, babel, eslint, jest, etc.)
   - Packages with ambiguous import names (PyPI packages where import name differs from package name)
4. For each clearly unused package, execute the `/socket-dep-cleanup` skill workflow
5. **Commit after each removal** so progress is preserved

### Phase 1b: Apply Binary Patches

Execute the `/socket-dep-patch` workflow:

1. Ensure dependencies are installed (should have been verified in Step 1)
2. Run `socket-patch scan` to discover available patches
3. Apply all patches with `socket-patch apply`
3. Build and test to verify nothing broke
4. Commit the patch manifest (`.socket/manifest.json`)

---

## Level 2 — Cautious

Run the full Level 1 workflow first, then propose one risky change.

### Phase 2a: Run Full Level 1

Execute Phase 1a (unused dep removal) and Phase 1b (binary patches) as described above.

### Phase 2b: Identify ONE Highest-Value Risky Change

After Level 1 completes, identify the single highest-value change that carries some risk. Prioritize in this order:

1. **Critical/high CVE upgrade** — a dependency with a known critical or high severity vulnerability that requires a version bump (use `socket fix --all --no-apply-fixes --json` to discover)
2. **Replacement of a flagged dependency** — a dependency with a low Socket score or known maintenance issues that should be swapped for a better alternative (use `/socket-dep-replace`)
3. **Ambiguous unused dependency** — a package that is *probably* unused but was excluded from Phase 1a due to ambiguity (e.g., a `@types/*` package whose base package is not used, or a build plugin that may no longer be needed)
4. **Safe minor version bump** — a dependency with a minor/patch update available that fixes a medium-severity issue

Present the proposed change to the user with full context:

```
Proposed risky change (Level 2):

  Package: lodash (4.17.20 → 4.17.21)
  Reason: Fixes GHSA-xxxx-xxxx-xxxx (high severity prototype pollution)
  Risk: Minor version bump — low risk of breaking changes
  Affected files: src/utils/helper.ts, src/api/handler.ts (2 import locations)

  Approve this change? [yes/no]
```

### Phase 2c: Execute If Approved

- If the user approves, execute via `/socket-dep-upgrade` (for version bumps) or `/socket-dep-cleanup` (for removals)
- Build and test after applying
- **Revert on failure** — if the change breaks the build or tests, revert immediately and report what happened
- If the user declines, skip and report Level 2 complete

---

## Level 3 — Full

Aggressive repair. Apply everything possible, skip and continue on individual failures.

### Phase 3a: Safe Upgrades

1. Run `socket fix --all --no-apply-fixes --json` to discover all fixable vulnerabilities
2. Filter to **minor and patch bumps only** (`--no-major-updates`)
3. For each vulnerability, dispatch `/socket-dep-upgrade` to apply the fix
4. **Skip and continue on failure** — if a single upgrade fails after retries, log the failure and move on to the next one (this diverges from `/socket-dep-upgrade`'s default "bail on failure" behavior — intentional for Level 3's aggressive posture)
5. Commit after each successful upgrade

### Phase 3b: Aggressive Cleanup

1. Re-scan all dependencies for usage (the dependency list may have changed after Phase 3a upgrades)
2. Run `/socket-dep-cleanup` for **both** clearly unused AND ambiguous packages
3. After each removal, build and test
4. **Revert removals that break the build** — if removing a package causes failures, re-add it and mark it as "still needed"
5. Commit after each successful removal

### Phase 3b2: Replace Flagged Dependencies

1. Review scan results for dependencies with low Socket scores, unmaintained status, or known supply-chain risks
2. For each flagged dependency, run `/socket-dep-replace` to find and execute a replacement
3. **Skip and continue on failure** — if a replacement cannot be completed (no suitable alternative, migration too complex, tests fail), log it and move on
4. Commit after each successful replacement

### Phase 3c: Patch Everything Remaining

1. Run `socket-patch scan` to discover patches for remaining dependencies
2. Run `socket-patch apply` to apply all discovered patches
2. Build and test
3. Commit patch manifest

### Phase 3d: Risky Major Upgrades

1. Re-run `socket fix --all --no-apply-fixes --json` to find remaining vulnerabilities
2. Attempt **major version bumps** via `/socket-dep-upgrade` with code migration
3. **Skip and continue on failure** — if a major upgrade cannot be completed (migration too complex, tests fail), log it and move on
4. Commit after each successful upgrade

---

## Step 3: Post-Repair Verification

After all phases complete (regardless of level):

1. Run `/socket-scan` to get a fresh security scan
2. Compare findings against the pre-repair state
3. Report a summary:

```
Repair Complete (Level 2 — Cautious)

  Removed: 3 unused dependencies (is-odd, left-pad, unused-util)
  Patched: 5 packages via socket-patch
  Upgraded: 1 package (lodash 4.17.20 → 4.17.21)
  Skipped: 0 failures

  Security delta:
    Before: 4 critical, 8 high, 12 medium
    After:  1 critical, 3 high, 10 medium

  Remaining issues:
    - express@4.17.1: GHSA-yyyy-yyyy-yyyy (critical) — requires major bump to v5, not attempted at Level 2
```

## Error Handling

- **No dependencies found**: The project may not have manifest files in the expected locations. Check for monorepo structures or non-standard layouts.
- **Build/test command unknown**: Ask the user for the correct build and test commands before starting repair.
- **Socket CLI not available**: Binary patches and `socket fix` require the Socket CLI. Suggest running `/socket-setup` first, or fall back to cleanup-only mode (Phase 1a only).
- **All upgrades fail in Level 3**: If every upgrade attempt fails, report what was tried and suggest the user investigate manually. The cleanup and patch phases may still have succeeded.
- **Authentication required**: Levels 2 and 3 use `socket fix` which requires a Socket account and API token. If the user is not authenticated, fall back to Level 1 (cleanup + patches only). To authenticate, run `socket login` or set `SOCKET_CLI_API_TOKEN`. To create an account, visit https://socket.dev.
- **Network errors**: `socket fix` and `socket-patch` require network access. Check connectivity and retry once before skipping.

## Tips

- Start with Level 1 if you're unsure — it's designed to be completely safe
- Level 2 is ideal for regular maintenance: safe changes plus one carefully reviewed improvement
- Level 3 is best for major cleanup efforts where you're prepared to review and test extensively
- Each level builds on the previous one, so you can start conservative and escalate
- All changes are committed individually, making it easy to revert any single change
- Run `/socket-scan` before and after repair to measure improvement
- For monorepos, consider running repair on each workspace individually
- Combine with `/socket-setup` to ensure the Socket CLI is properly configured before starting
