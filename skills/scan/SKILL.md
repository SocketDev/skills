---
name: scan
description: Score packages and dependencies for security, quality, and supply-chain risks using the Socket MCP server's `depscore` tool. Covers extracting dependencies from project manifests and interpreting Socket scores.
---

# Scan

Score packages and dependencies for security, quality, and supply-chain risks using the Socket MCP server.

## When to Use

- The user wants to check the security posture of their project's dependencies
- The user is adding new dependencies or updating versions and wants to vet them
- The user wants to evaluate whether a package is safe, well-maintained, or properly licensed
- The user asks about the quality or risk of packages in their dependency tree

## How It Works

The Socket MCP server exposes a single tool called `depscore`. It accepts an explicit list of packages and returns numeric scores (0–100) across five dimensions for each one. The server does **not** read the filesystem or parse manifests — the agent must extract dependency names and versions from project files and pass them to `depscore`.

### Step-by-Step Workflow

1. **Read the project's manifest and lock files** to collect dependency names, versions, and ecosystems. Also check source code imports for dependencies that may not appear in manifests.
2. **Call the `depscore` tool** with the collected packages.
3. **Interpret the scores** and advise the user on any low-scoring packages.

## The `depscore` Tool

### Input

An array of packages, each with:

| Parameter   | Type   | Required | Default     | Description                                      |
|-------------|--------|----------|-------------|--------------------------------------------------|
| `ecosystem` | string | No       | `"npm"`     | Package ecosystem (e.g., `npm`, `pypi`, `cargo`) |
| `depname`   | string | Yes      | —           | Package name                                     |
| `version`   | string | No       | `"unknown"` | Package version; use `"unknown"` if not known     |

### Output

One line per package with scores across five dimensions:

```
pkg:npm/express@4.18.2: supply_chain: 100, quality: 90, maintenance: 100, vulnerability: 100, license: 100
```

### Score Dimensions

| Dimension      | What It Measures                                                   |
|----------------|--------------------------------------------------------------------|
| `supply_chain` | Resistance to supply-chain attacks (typosquatting, install scripts) |
| `quality`      | Code quality signals                                               |
| `maintenance`  | Active maintenance, release cadence, responsiveness                |
| `vulnerability`| Known vulnerabilities (CVEs)                                       |
| `license`      | License permissiveness and compatibility                           |

Scores range from 0 (worst) to 100 (best). Flag any dimension scoring below ~60 as a concern and ask the user how to proceed.

## Where to Find Dependencies

The agent is responsible for reading these files to extract package lists:

| Ecosystem | Files to Read                                                        |
|-----------|----------------------------------------------------------------------|
| npm       | `package.json`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`  |
| PyPI      | `requirements.txt`, `setup.py`, `pyproject.toml`, `Pipfile.lock`    |
| Go        | `go.mod`, `go.sum`                                                   |
| Maven     | `pom.xml`                                                            |
| Gradle    | `build.gradle`, `build.gradle.kts`                                   |
| Ruby      | `Gemfile`, `Gemfile.lock`                                            |
| NuGet     | `*.csproj`, `packages.config`                                        |
| Cargo     | `Cargo.toml`, `Cargo.lock`                                          |

Also scan source code imports — dependencies used in code may not always appear in manifest files.

## Tips

- Always check dependencies after adding or updating packages
- Batch all packages into a single `depscore` call rather than one call per package
- If a version is unknown, pass `"unknown"` — the server will return scores for the latest version
- Version prefixes like `^` and `~` are automatically stripped
- Stop generating code and ask the user how to proceed when any scores are low
