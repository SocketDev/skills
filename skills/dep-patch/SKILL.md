---
name: dep-patch
description: Apply Socket's binary-level security patches without changing dependency
  versions. Uses socket-patch apply to fix vulnerabilities in-place. For CI/CD and
  infrastructure setup, use the /setup skill.
---

# Dep Patch

Apply Socket's binary-level security patches to vulnerable dependencies **without changing their version numbers**. This skill uses `socket-patch apply` to fix known vulnerabilities in-place. Patches are applied in bulk — `socket-patch apply` patches all available packages at once.

For setting up automated patching infrastructure (postinstall hooks, CI integration, GitHub Actions), use the `/setup` skill.

## How This Differs from `/dep-upgrade`

| | `/dep-patch` (this skill) | `/dep-upgrade` |
|---|---|---|
| **Primary tool** | `socket-patch apply` | `socket fix` |
| **What it does** | Applies binary-level patches without changing versions | Upgrades dependency versions to fix CVEs |
| **Version changes?** | No | Yes |
| **Code changes needed?** | No | Possibly (API migration for major bumps) |
| **Scope** | All patchable packages at once | One dependency at a time |
| **When to use** | You need fixes without version churn, or the upstream fix doesn't exist yet | You want to bring dependencies up to date |

Use `/dep-patch` when you want to fix vulnerabilities without risking breaking changes from version upgrades. Use `/dep-upgrade` when you want full version upgrades with automated code migration.

## When to Use

- The user wants to fix vulnerabilities without changing dependency versions
- The user wants to apply Socket's binary patches to their project
- A vulnerability has no upstream fix yet but Socket provides a patch
- The user wants a quick, low-risk security fix across all dependencies

## Prerequisites

No API key is required for `socket-patch apply`. It works on the free tier.

## Step 1: Install socket-patch

Choose the installation method for your ecosystem:

| Method | Command |
|--------|---------|
| npm (one-off) | `npx @socketsecurity/socket-patch apply` |
| npm (global) | `npm install -g @socketsecurity/socket-patch` |
| pip | `pip install socket-patch` |
| cargo | `cargo install socket-patch-cli` |
| Standalone (macOS/Linux) | `curl -fsSL https://raw.githubusercontent.com/nicolo-ribaudo/socket-patch-cli/main/install.sh \| sh` |

Verify installation:

```
socket-patch --version
```

## Step 2: Scan for Patchable Vulnerabilities

Before applying patches, do a dry run to see what would be patched:

```
socket-patch apply --dry-run
```

This shows which packages have Socket patches available without modifying anything.

## Step 3: Apply Patches

Apply all available patches:

```
socket-patch apply
```

This modifies vulnerable packages in-place within `node_modules/` (or the equivalent for other ecosystems) by applying binary-level fixes. No version numbers change in your manifest or lock files.

After patching, verify the project still works:

1. Build the project
2. Run the full test suite
3. Check `.socket/manifest.json` for a summary of applied patches

## Step 4: Verify

1. Run `socket-patch apply --dry-run` to confirm all available patches were applied
2. Run the build to ensure nothing breaks
3. Commit `.socket/manifest.json` to version control to track which patches are applied

## Setting Up Automated Patching

To keep patches applied automatically in CI/CD or via postinstall hooks, use the `/setup` skill. It covers:
- GitHub Actions (`SocketDev/action@v1` with `mode: patch`)
- GitLab CI / Bitbucket Pipelines / generic CI `socket-patch apply` steps
- Local dev postinstall hooks (`socket-patch setup`)
- Dockerfile / Makefile patterns

## Error Handling

- **`socket-patch` not found**: Install it using one of the methods in Step 1. For CI, ensure the install step runs before `socket-patch apply`.
- **No patches available**: This means Socket doesn't have binary patches for the current vulnerabilities. Consider using the `/dep-upgrade` skill to upgrade versions instead.
- **Build fails after patching**: Run `socket-patch apply --dry-run` to identify which patch caused the issue. Report the failing patch so the user can decide whether to skip it.
- **Permission errors**: Ensure write access to `node_modules/` or the equivalent dependency directory.

## Tips

- `socket-patch apply` does not require an API key — it works on the free tier
- Use `SocketDev/action@v1` (correct casing) in GitHub workflow files
- For monorepos, use `patch-cwd` to target specific directories
- Commit `.socket/manifest.json` to track which patches are applied
- After patching, use the `/scan` skill to verify no residual vulnerabilities remain
- Combine with the `/dep-upgrade` skill for vulnerabilities that don't have binary patches available
