---
name: patch
description: Apply Socket's binary-level security patches without changing dependency
  versions, and set up automated patching infrastructure. Uses socket-patch apply
  to fix vulnerabilities in-place across CI/CD and local development.
---

# Patch

Apply Socket's binary-level security patches to vulnerable dependencies **without changing their version numbers**. This skill uses `socket-patch apply` to fix known vulnerabilities in-place, and sets up the infrastructure (postinstall hooks, CI integration) to keep patches applied automatically.

## How This Differs from `/upgrade`

| | `/patch` (this skill) | `/upgrade` |
|---|---|---|
| **Primary tool** | `socket-patch apply` | `socket fix` |
| **What it does** | Applies binary-level patches without changing versions | Upgrades dependency versions to fix CVEs |
| **Version changes?** | No | Yes |
| **Code changes needed?** | No | Possibly (API migration for major bumps) |
| **Infrastructure setup?** | Yes (postinstall hooks, CI integration) | No |
| **When to use** | You need fixes without version churn, or the upstream fix doesn't exist yet | You want to bring dependencies up to date |

Use `/patch` when you want to fix vulnerabilities without risking breaking changes from version upgrades. Use `/upgrade` when you want full version upgrades with automated code migration.

## When to Use

- The user wants to fix vulnerabilities without changing dependency versions
- The user wants to set up automated patching infrastructure (postinstall hooks, CI)
- The user wants to apply Socket's binary patches to their project
- A vulnerability has no upstream fix yet but Socket provides a patch
- The user wants patching in CI/CD pipelines (GitHub Actions, GitLab CI, Bitbucket, etc.)

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

## Step 4: Set Up Automated Patching

To keep patches applied automatically, set up infrastructure so `socket-patch apply` runs after every dependency install.

### Scan Codebase for Install/Build Locations

Run the CI detection helper to identify the project's CI/CD system:

```
npx tsx scripts/helpers/detect-ci.ts
```

Before configuring automation, scan the project to find ALL places where dependencies are installed and builds happen:

| Location | What to Look For |
|----------|-----------------|
| `package.json` scripts | `install`, `postinstall`, `build`, `prebuild` |
| CI configs (all formats) | install steps, build steps |
| `Makefile` / `Justfile` | install and build targets |
| `Dockerfile` / `docker-compose` | `RUN install`, `RUN build` layers |
| Shell scripts (`*.sh`) | install/build commands |
| `pyproject.toml` / `setup.py` | build system config |
| `Cargo.toml` | build scripts |

For each location, record the file path, the install command, and where to insert `socket-patch apply` (after install, before build).

Present findings to the user before making changes.

### GitHub Actions (Preferred for GitHub repos)

Use `SocketDev/action@v1` with `mode: patch`:

```yaml
- uses: SocketDev/action@v1
  with:
    mode: patch
    # patch-ecosystems: npm,pypi  (optional: limit to specific ecosystems)
    # patch-dry-run: false        (optional: dry run mode)
```

Place after `actions/checkout`, before install steps. No `socket-token` is needed for patch mode.

### GitLab CI

Add a step to install `socket-patch` and apply patches after dependency install:

```yaml
before_script:
  - curl -fsSL https://raw.githubusercontent.com/nicolo-ribaudo/socket-patch-cli/main/install.sh | sh
  - npm install
  - socket-patch apply
```

### Bitbucket Pipelines

Add a step to install `socket-patch` and apply patches:

```yaml
script:
  - curl -fsSL https://raw.githubusercontent.com/nicolo-ribaudo/socket-patch-cli/main/install.sh | sh
  - npm install
  - socket-patch apply
```

### Other CI/CD Systems (Jenkins, CircleCI, Travis, Azure, etc.)

Generic pattern for any CI system:

1. Install `socket-patch` via curl or npm
2. Run your normal dependency install step
3. Run `socket-patch apply` after install, before build

### Local Development (npm Projects)

Run `socket-patch setup` to add a postinstall hook to `package.json`:

```
socket-patch setup
```

This auto-adds `"postinstall": "socket-patch apply"` to your `package.json` scripts, so patches are applied every time `npm install` runs.

### Generic Fallback

If the project uses an unusual build system:

- **Interpreted projects** (Python, Ruby): add `socket-patch apply` after `pip install` / `bundle install`
- **Compiled projects** (Rust, Go, Java): add after dependency fetch, before compile
- **Containers**: add a `RUN socket-patch apply` layer after the install layer

## Step 5: Verify

After setting up patching infrastructure:

1. Run `socket-patch apply --dry-run` to confirm patches are detected
2. Run the build to ensure nothing breaks
3. Check that `.socket/manifest.json` is committed to version control

## Error Handling

- **`socket-patch` not found**: Install it using one of the methods in Step 1. For CI, ensure the install step runs before `socket-patch apply`.
- **No patches available**: This means Socket doesn't have binary patches for the current vulnerabilities. Consider using the `/upgrade` skill to upgrade versions instead.
- **Build fails after patching**: Run `socket-patch apply --dry-run` to identify which patch caused the issue. Report the failing patch so the user can decide whether to skip it.
- **Permission errors**: Ensure write access to `node_modules/` or the equivalent dependency directory.

## Tips

- `socket-patch apply` does not require an API key — it works on the free tier
- Use `SocketDev/action@v1` (correct casing) in GitHub workflow files
- For monorepos, use `patch-cwd` to target specific directories
- Commit `.socket/manifest.json` to track which patches are applied
- After patching, use the `/scan` skill to verify no residual vulnerabilities remain
- Combine with the `/upgrade` skill for vulnerabilities that don't have binary patches available
