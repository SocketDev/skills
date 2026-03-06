---
name: setup
description: Set up Socket — prompt for API key, install the CLI, authenticate,
  configure policies and tokens, set up CI/CD for firewall or patch modes across
  GitHub, GitLab, Bitbucket, and other systems.
---

# Setup

## When to Use
- User wants to get started with Socket
- User needs to install/configure the Socket CLI
- User wants to authenticate with Socket
- User wants to set up Socket Firewall
- User wants to set up socket-patch for automated patching
- User wants to add Socket to CI/CD pipelines
- User wants to configure Socket policies (`socket.yml`)
- User wants to set up API tokens for CI or local development
- User is having trouble authenticating

## Step 1: Prompt for API Key
- Ask: do you want the **free** tier or **enterprise** tier?
- Free: no API key needed (free firewall, socket-patch apply)
- Enterprise: collect API key or guide to socket.dev to create one
  - Sign in: https://socket.dev/auth/login
  - Token page: https://socket.dev/dashboard/org/{ORG}/settings/integrations/api-tokens
- Store the tier choice for subsequent steps

## Step 2: Install the CLI
- Prerequisites: Node.js 18+
- npm install -g socket
- Verify: socket --version
- PATH troubleshooting

## Step 3: Authenticate (Enterprise only)
- Interactive: socket login
- Manual token: SOCKET_CLI_API_TOKEN env var
- Verify: socket organization list
- Skip entirely for free tier

## Step 4: Ask What to Set Up
- Ask the user: do you want to set up **Firewall**, **Patches**, **Policies**, or a combination?
- Route to the appropriate section(s) below

## Step 5: Detect SCM and CI System

Run the CI detection helper for automated detection:

```
npx tsx scripts/helpers/detect-ci.ts
```

Or manually detect:
- Run `git remote -v` to detect the SCM:
  - github.com → GitHub
  - gitlab.com or self-hosted GitLab → GitLab
  - bitbucket.org → Bitbucket
  - Other / not a git repo → Generic
- Based on SCM, infer the likely CI system, but also check for:
  - .github/workflows/ → GitHub Actions
  - .gitlab-ci.yml → GitLab CI
  - bitbucket-pipelines.yml → Bitbucket Pipelines
  - Jenkinsfile → Jenkins
  - .circleci/config.yml → CircleCI
  - .travis.yml → Travis CI
  - azure-pipelines.yml → Azure Pipelines
  - None found → Generic / manual

## Firewall Setup

### GitHub Actions
- Use SocketDev/action@v1
- Free tier: mode: firewall-free (no socket-token needed)
- Enterprise: mode: firewall, socket-token: ${{ secrets.SOCKET_API_KEY }}
- Insert after actions/checkout, before install steps
- Prefix install commands with sfw (sfw npm install, sfw pip install, etc.)
- Guide user to set up GitHub secret if enterprise
- If GitHub: also offer to install the Socket Security GitHub App
  (github.com/apps/socket-security) for automatic PR scanning

### GitLab CI
- Add a `before_script` or dedicated stage to install `sfw`
- Install via npm: `npm install -g @anthropic-ai/sfw`
- Or install standalone binary:
  ```bash
  curl -fsSL https://socket.dev/download/sfw/latest/linux-x64 -o /usr/local/bin/sfw && chmod +x /usr/local/bin/sfw
  ```
- Prefix install commands with sfw (`sfw npm install`, `sfw pip install`, etc.)
- Enterprise: set `SOCKET_CLI_API_TOKEN` as CI/CD variable in GitLab settings

### Bitbucket Pipelines
- Add pipe step to install `sfw` binary:
  ```bash
  curl -fsSL https://socket.dev/download/sfw/latest/linux-x64 -o /usr/local/bin/sfw && chmod +x /usr/local/bin/sfw
  ```
- Prefix install commands with sfw
- Enterprise: set `SOCKET_CLI_API_TOKEN` as repository variable

### Generic CI/CD
- Download `sfw` binary:
  ```bash
  # Linux x64
  curl -fsSL https://socket.dev/download/sfw/latest/linux-x64 -o /usr/local/bin/sfw && chmod +x /usr/local/bin/sfw
  # macOS arm64
  curl -fsSL https://socket.dev/download/sfw/latest/darwin-arm64 -o /usr/local/bin/sfw && chmod +x /usr/local/bin/sfw
  ```
- Or install via npm: `npm install -g @anthropic-ai/sfw`
- Prefix install commands with sfw
- Set `SOCKET_CLI_API_TOKEN` as env var for enterprise

### Local Development
- `npm install -g @anthropic-ai/sfw` (or standalone binary as above)
- Usage: `sfw npm install`, `sfw pip install`, etc.

## Socket Policy Configuration

Configure Socket policies to control which issues are flagged during scans and CI checks.

### Repository-Level Policy (`socket.yml`)

Create or edit `socket.yml` in the repository root:

```yaml
issueRules:
  # CVE severity thresholds
  criticalCVE: error        # Block on critical CVEs
  highCVE: warn              # Warn on high CVEs
  mediumCVE: ignore          # Ignore medium CVEs

  # Supply-chain alerts
  installScripts: error      # Block packages with install scripts
  networkAccess: warn        # Warn on unexpected network access
  shellAccess: warn          # Warn on shell execution
  filesystemAccess: ignore   # Ignore filesystem access alerts
  envVarsAccess: warn        # Warn on environment variable reads
  obfuscatedCode: error      # Block obfuscated code

  # Malware
  malware: error             # Always block malware

  # License compliance
  gplLicense: warn           # Warn on GPL licenses
  noLicense: warn            # Warn on packages with no license
  nonPermissiveLicense: warn # Warn on restrictive licenses

projectIgnorePaths:
  - "test/**"
  - "tests/**"
  - "examples/**"
  - "docs/**"
  - "__fixtures__/**"
```

Issue rule values:
- `error` — fail the check / block the PR
- `warn` — report but don't fail
- `ignore` — suppress entirely

### Dashboard Policy Management (Enterprise)

For enterprise customers, policies can also be managed via the Socket dashboard:

- **Organization-level**: `https://socket.dev/dashboard/org/{ORG}/settings/policies`
- **Repository-level**: `https://socket.dev/dashboard/org/{ORG}/repo/{REPO}/settings/policies`

### Policy Priority Order

When multiple policies exist, they are applied in this order (highest priority first):

1. Repository `socket.yml` in repo root
2. Organization-level dashboard policy
3. Socket defaults

Repository-level settings override organization-level settings, which override defaults.

## API Token Configuration

Different Socket features use different tokens. Set up the appropriate tokens for your use case.

### Token Types

| Token | Environment Variable | Used By | Required For |
|-------|---------------------|---------|--------------|
| CLI API Token | `SOCKET_CLI_API_TOKEN` | Socket CLI (`socket` commands), CI/CD | Enterprise scans, `socket fix`, `socket organization list` |
| Security API Key | `SOCKET_SECURITY_API_KEY` | Batch PURL API (`api.socket.dev`) | Package inspection, license auditing |
| GitHub Action Token | `socket-token` (GitHub secret) | `SocketDev/action@v1` | Enterprise firewall mode in GitHub Actions |

### Creating Tokens

1. Sign in to the Socket dashboard: https://socket.dev/auth/login
2. Navigate to your organization's API tokens page: `https://socket.dev/dashboard/org/{ORG}/settings/integrations/api-tokens`
3. Create a new token with the appropriate scope
4. Copy the token value — it is only shown once

### Setting Tokens per CI System

| CI System | How to Set Secrets |
|-----------|-------------------|
| GitHub Actions | Repository Settings → Secrets and variables → Actions → New repository secret |
| GitLab CI | Settings → CI/CD → Variables → Add variable (masked, protected) |
| Bitbucket Pipelines | Repository settings → Repository variables |
| CircleCI | Project Settings → Environment Variables |
| Jenkins | Credentials → Add Credentials → Secret text |
| Azure Pipelines | Pipelines → Library → Variable groups |

### Local Development

For local development, authenticate using one of:

- **Interactive login**: `socket login` (stores credentials in `~/.socket/`)
- **Environment variable**: Set `SOCKET_CLI_API_TOKEN` in your shell profile or `.env.local`
- **Per-project**: Add `SOCKET_SECURITY_API_KEY` to `.env.local` (ensure `.env.local` is in `.gitignore`)

**Never commit API tokens to version control.** Use `socket login` locally and environment variables / secrets in CI.

## Patch Infrastructure Setup

Set up automated patching so `socket-patch apply` runs after every dependency install. For one-time manual patching, use the `/dep-patch` skill instead.

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

### Dockerfile Patterns

Add a `RUN socket-patch apply` layer after the install layer:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
RUN npx @socketsecurity/socket-patch apply
COPY . .
RUN npm run build
```

### Makefile Patterns

Add a patch target that runs after install:

```makefile
install:
	npm ci
	socket-patch apply

build: install
	npm run build
```

### Generic Fallback

If the project uses an unusual build system:

- **Interpreted projects** (Python, Ruby): add `socket-patch apply` after `pip install` / `bundle install`
- **Compiled projects** (Rust, Go, Java): add after dependency fetch, before compile
- **Containers**: add a `RUN socket-patch apply` layer after the install layer

## Error Handling

- **`socket: command not found`**: Ensure Node.js 18+ is installed, then run `npm install -g socket`. Check that the npm global bin directory is in `PATH` (run `npm bin -g` to find it).
- **`socket login` fails**: Check network connectivity. If behind a proxy, ensure `HTTPS_PROXY` is set. Try setting `SOCKET_CLI_API_TOKEN` directly as an environment variable instead.
- **`socket organization list` returns empty**: The API token may lack organization access. Verify the token at https://socket.dev/dashboard and ensure it has the correct scopes.
- **`sfw` not intercepting installs**: Ensure `sfw` is in `PATH` before the package manager. In CI, verify the install step runs before any dependency install commands.
- **GitHub Action fails with permission errors**: Ensure the `socket-token` secret is set correctly in the repository settings and the workflow has `contents: read` permission.

## Tips
- Never commit API tokens. Use `socket login` locally, env vars in CI.
- `socket-patch apply` does not require an API key.
- Use `SocketDev/action@v1` (correct casing) in GitHub workflow files.
- For monorepos, use `patch-cwd` to target specific directories.
- After setup, use the `/scan` skill for a first audit and the `/inspect` skill for package inspection.
- For GitHub repos, consider also installing the Socket Security GitHub App
  for automatic PR scanning.
