---
name: cleanup
description: Find and remove unused dependencies from your project. Scans the codebase
  for import and usage patterns across npm, PyPI, Cargo, Bundler, Maven, NuGet, Go,
  pnpm, and Yarn to identify dependencies that are no longer referenced.
---

# Cleanup

Find and remove unused dependencies from your project by scanning the codebase for import and usage patterns.

## When to Use

- The user wants to find unused or stale dependencies in their project
- The user is cleaning up a project after removing features or refactoring
- The user wants to reduce install size or build time by trimming unnecessary packages
- The user asks about which dependencies are actually used

## Step 1: Detect Ecosystems

Run the ecosystem detection helper to identify project ecosystems:

```
npx tsx scripts/helpers/detect-ecosystems.ts
```

Or manually scan the project root for manifest and lock files to determine which ecosystems are in use:

| Ecosystem | Manifest Files |
|-----------|---------------|
| npm | `package.json` + `package-lock.json` |
| pnpm | `package.json` + `pnpm-lock.yaml` |
| yarn | `package.json` + `yarn.lock` |
| PyPI | `requirements.txt`, `pyproject.toml`, `setup.py`, `setup.cfg`, `Pipfile` |
| Cargo | `Cargo.toml` |
| Bundler | `Gemfile` |
| Maven | `pom.xml` |
| NuGet | `*.csproj`, `packages.config` |
| Go | `go.mod` |

For npm, pnpm, and yarn: differentiate by which lock file is present (`package-lock.json`, `pnpm-lock.yaml`, or `yarn.lock`). If multiple ecosystems exist in the same project, process each one independently.

## Step 2: Collect Dependencies

Run the dependency parser helper to extract all declared dependencies:

```
npx tsx scripts/helpers/parse-dependencies.ts
```

Or read all manifest files manually and extract every declared dependency name. Separate production and dev dependencies where the ecosystem supports it:

- **npm/pnpm/yarn**: `dependencies` vs `devDependencies` (also `peerDependencies`, `optionalDependencies`)
- **PyPI**: main vs extras/dev in `pyproject.toml`; separate `requirements-dev.txt` files
- **Cargo**: `[dependencies]` vs `[dev-dependencies]`
- **Bundler**: default group vs `:development`, `:test` groups
- **Maven**: `<scope>compile</scope>` vs `<scope>test</scope>`
- **NuGet**: all `<PackageReference>` entries
- **Go**: `require` directives in `go.mod`

## Step 3: Search for Usage

For each dependency, search for usage with the helper script:

```
npx tsx scripts/helpers/search-usage.ts --package <name> --ecosystem <eco>
```

Or manually search the codebase for import, require, or usage patterns. Mark a dependency as "used" if any pattern matches.

### Search Patterns by Ecosystem

| Ecosystem | Patterns to Search |
|-----------|-------------------|
| npm/pnpm/yarn | `require('pkg')`, `require("pkg")`, `import ... from 'pkg'`, `import ... from "pkg"`, `import 'pkg'`, `import "pkg"`, `import('pkg')`, `import("pkg")`. Also check for subpath imports like `pkg/sub`. |
| PyPI | `import pkg`, `from pkg import ...`. **Note:** the package name on PyPI often differs from the import name (e.g. `Pillow` → `PIL`, `beautifulsoup4` → `bs4`, `python-dotenv` → `dotenv`, `scikit-learn` → `sklearn`, `PyYAML` → `yaml`). Check both the package name and common import aliases. **Tip:** run `pip show <package-name>` — the output includes a `Location` field and the actual top-level package names are the directories at that location matching the package. Alternatively, check `top_level.txt` in the package's `.dist-info` directory. |
| Cargo | `use crate_name::`, `extern crate crate_name`, references in proc-macro attributes. **Note:** hyphens in crate names become underscores in Rust code (e.g. `serde-json` → `serde_json`). |
| Bundler | `require 'gem_name'`, `require "gem_name"`, autoload references. |
| Maven | `import groupId.artifactId.` or subpackage patterns in `.java` and `.kt` files. Match on the groupId prefix. |
| NuGet | `using Namespace;` and `using static Namespace.` in `.cs` files. Match on the package's root namespace. |
| Go | Import paths in `.go` files matching the module path from `go.mod` `require` entries. |

### Indirect Usage Detection

Some dependencies are used indirectly and will not appear in import statements. **Flag these as "possibly unused" rather than "definitely unused"**, and explain the suspected indirect usage:

- **`@types/*` packages** — correspond to a base package (e.g. `@types/node` supports Node.js APIs); check if the base package is used
- **Babel/ESLint/Jest/Prettier plugins** — referenced by short name in config files (e.g. `eslint-plugin-react` is listed as `react` in `.eslintrc`); search config files for the short name
- **CLI tools in `scripts`** — packages that provide binaries referenced in `package.json` `scripts` (e.g. `rimraf`, `concurrently`, `cross-env`); check the `scripts` block
- **Peer dependencies** — required by other installed packages; check if any installed package lists it as a peer dependency
- **Build tools and bundler plugins** — `webpack`, `vite`, `rollup`, `esbuild`, `parcel`, `turbopack` and their plugins; check config files
- **PostCSS/Tailwind plugins** — referenced in `postcss.config.*` or `tailwind.config.*`
- **Python entry points and console scripts** — packages providing CLI commands configured in `pyproject.toml` or `setup.cfg`
- **Bundler groups** — gems in `:development` or `:test` groups may only be used in specific contexts
- **Cargo build dependencies** — crates in `[build-dependencies]` are used by `build.rs`
- **Maven plugins** — `<plugin>` entries in `pom.xml` are not imported in code

## Step 4: Present Results

Show a categorized list to the user:

**Definitely unused** — no references found anywhere in the codebase:
```
Production dependencies:
  - package-a
  - package-b

Dev dependencies:
  - package-c
```

**Possibly unused (review recommended)** — indirect usage suspected:
```
  - eslint-plugin-react (may be referenced as "react" in .eslintrc)
  - @types/express (provides types for express, which is used)
  - rimraf (referenced in package.json scripts: "clean": "rimraf dist")
```

If no unused dependencies are found, report that the project is clean and stop.

## Step 5: Ask User

Ask the user which dependencies to remove. The default action is to remove **all definitely unused** dependencies and skip the "possibly unused" ones. The user can:

- Accept the default (remove all definitely unused)
- Choose to keep specific dependencies from the removal list
- Choose to also remove some "possibly unused" dependencies
- Cancel the operation entirely

## Step 6: Remove Dependencies

Execute removal using the appropriate package manager command:

| Ecosystem | Removal Command |
|-----------|----------------|
| npm | `npm uninstall pkg1 pkg2 ...` |
| pnpm | `pnpm remove pkg1 pkg2 ...` |
| yarn | `yarn remove pkg1 pkg2 ...` |
| PyPI | Edit `requirements.txt` / `pyproject.toml` directly to remove the lines, then `pip install -r requirements.txt` or `poetry lock` |
| Cargo | `cargo remove pkg1 pkg2 ...` |
| Bundler | Edit `Gemfile` to remove the entries, then `bundle install` |
| Maven | Edit `pom.xml` to remove `<dependency>` blocks, then `mvn dependency:resolve` |
| NuGet | `dotnet remove package pkg` for each package |
| Go | Edit `go.mod` to remove entries, then `go mod tidy` |

For ecosystems that require manual file editing (PyPI, Bundler, Maven, Go), make the edits carefully and verify the file is still valid before running the follow-up command.

## Step 7: Verify

Follow the standard build & test verification workflow (see `skills/_shared/verify-build.md`):

1. **Build the project** using its standard build command
2. **Run the test suite** to catch any runtime dependency on a removed package
3. If something fails, identify which removed dependency was needed, re-add it using the package manager's install/add command, and move it to the "possibly unused" category for the user to review

## Error Handling

- **Build or tests fail after removal**: Identify which removed dependency caused the failure by checking error messages for missing modules. Re-add it with the package manager's install/add command and move it to the "possibly unused" category.
- **Package manager removal command fails**: The package may already have been removed from the lock file but still referenced in the manifest, or vice versa. Try manually editing the manifest file and re-running the package manager's install command.
- **False positive — package appears unused but is required**: Some packages are loaded dynamically, used as peer dependencies, or referenced only in build/CI scripts. When in doubt, flag as "possibly unused" rather than removing.

## Tips

- Start with `devDependencies` — removing unused dev dependencies is lower risk than production ones
- For large projects, process one ecosystem at a time to keep output manageable
- When in doubt about a dependency, flag it as "possibly unused" rather than "definitely unused"
- Some packages are used only in CI, deployment scripts, or editor configs — search beyond just source code
- For PyPI, consult the package metadata on pypi.org if the import name is unclear
- For monorepos, check usage across all workspaces before marking a root dependency as unused
- After cleanup, use the `scan` skill to verify no security issues remain in the reduced dependency set
