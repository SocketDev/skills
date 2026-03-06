---
name: socket-dep-patch
description: Apply Socket's binary-level security patches without changing dependency
  versions. Uses socket-patch apply to fix vulnerabilities in-place. For CI/CD and
  infrastructure setup, use the /socket-setup skill.
---

# Dep Patch

Apply Socket's binary-level security patches to vulnerable dependencies **without changing their version numbers**. This skill uses `socket-patch apply` to fix known vulnerabilities in-place. Patches are applied in bulk — `socket-patch apply` patches all available packages at once.

For setting up automated patching infrastructure (postinstall hooks, CI integration, GitHub Actions), use the `/socket-setup` skill.

## How This Differs from `/socket-dep-upgrade`

| | `/socket-dep-patch` (this skill) | `/socket-dep-upgrade` |
|---|---|---|
| **Primary tool** | `socket-patch apply` | `socket fix` |
| **What it does** | Applies binary-level patches without changing versions | Upgrades dependency versions to fix CVEs |
| **Version changes?** | No | Yes |
| **Code changes needed?** | No | Possibly (API migration for major bumps) |
| **Scope** | All patchable packages at once | One dependency at a time |
| **When to use** | You need fixes without version churn, or the upstream fix doesn't exist yet | You want to bring dependencies up to date |

Use `/socket-dep-patch` when you want to fix vulnerabilities without risking breaking changes from version upgrades. Use `/socket-dep-upgrade` when you want full version upgrades with automated code migration.

## When to Use

- The user wants to fix vulnerabilities without changing dependency versions
- The user wants to apply Socket's binary patches to their project
- A vulnerability has no upstream fix yet but Socket provides a patch
- The user wants a quick, low-risk security fix across all dependencies

## Prerequisites

- No API key is required for `socket-patch`. It works on the free tier.
- **Dependencies must be installed before patching.** `socket-patch` operates on installed packages (e.g. `node_modules/`). If dependencies are not yet installed, run the project's install command first (e.g. `npm install`, `pnpm install`, `bun install`, `pip install -r requirements.txt`).

## Step 1: Install socket-patch

Choose the installation method for your ecosystem:

| Method | Command |
|--------|---------|
| npm (one-off) | `npx @socketsecurity/socket-patch apply` |
| npm (global) | `npm install -g @socketsecurity/socket-patch` |
| pip | `pip install socket-patch` |
| cargo | `cargo install socket-patch-cli` |
| Standalone (macOS/Linux) | `curl -fsSL https://raw.githubusercontent.com/SocketDev/socket-patch/main/install.sh \| sh` |

Verify installation:

```
socket-patch --version
```

## Step 2: Scan for Available Patches

Run `socket-patch scan` to discover which installed packages have Socket patches available. This downloads patch metadata to the `.socket/` folder without modifying any packages.

```
socket-patch scan
```

Review the output to see which packages have patches available and what vulnerabilities they address.

## Step 3: Apply Patches

Apply all patches discovered by `socket-patch scan`:

```
socket-patch apply
```

This applies patches from the `.socket/` folder to installed packages (e.g. within `node_modules/`). No version numbers change in your manifest or lock files.

After patching, verify the project still works:

1. Build the project
2. Run the full test suite
3. Check `.socket/manifest.json` for a summary of applied patches

## Step 4: Verify

1. Run `socket-patch scan` to confirm all available patches were applied
2. Run the build to ensure nothing breaks
3. Commit `.socket/manifest.json` to version control to track which patches are applied

## Setting Up Automated Patching

To keep patches applied automatically in CI/CD or via postinstall hooks, use the `/socket-setup` skill. It covers:
- GitHub Actions (`SocketDev/action@v1` with `mode: patch`)
- GitLab CI / Bitbucket Pipelines / generic CI `socket-patch apply` steps
- Local dev postinstall hooks (`socket-patch setup`)
- Dockerfile / Makefile patterns

## Error Handling

- **`socket-patch` not found**: Install it using one of the methods in Step 1. For CI, ensure the install step runs before `socket-patch apply`.
- **"No .socket folder found, skipping patch application"**: Dependencies may not be installed, or `socket-patch scan` was not run first. Ensure dependencies are installed (e.g. `npm install`), then run `socket-patch scan` before `socket-patch apply`.
- **No patches available**: Run `socket-patch scan` first to check. If scan finds nothing, Socket doesn't have binary patches for the current vulnerabilities. Consider using the `/socket-dep-upgrade` skill to upgrade versions instead.
- **Build fails after patching**: Run `socket-patch scan` to identify which patches are available, then apply selectively. Report the failing patch so the user can decide whether to skip it.
- **Permission errors**: Ensure write access to `node_modules/` or the equivalent dependency directory.

## Tips

- `socket-patch apply` does not require an API key — it works on the free tier
- Use `SocketDev/action@v1` (correct casing) in GitHub workflow files
- For monorepos, use `patch-cwd` to target specific directories
- Commit `.socket/manifest.json` to track which patches are applied
- After patching, use the `/socket-scan` skill to verify no residual vulnerabilities remain
- Combine with the `/socket-dep-upgrade` skill for vulnerabilities that don't have binary patches available
