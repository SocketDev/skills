---
name: setup
description: Set up Socket — prompt for API key, install the CLI, authenticate,
  configure CI/CD for firewall or patch modes across GitHub, GitLab, Bitbucket,
  and other systems.
---

# Setup

## When to Use
- User wants to get started with Socket
- User needs to install/configure the Socket CLI
- User wants to authenticate with Socket
- User wants to set up Socket Firewall
- User wants to set up socket-patch for automated patching
- User wants to add Socket to CI/CD pipelines
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
- Ask the user: do you want to set up **Firewall**, **Patches**, or **both**?
- Route to the appropriate section(s) below

## Step 5: Detect SCM and CI System
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
- Add a before_script or dedicated stage to install sfw
- Install: curl standalone binary or npm install -g sfw
- Prefix install commands with sfw
- Enterprise: set SOCKET_CLI_API_TOKEN as CI/CD variable in GitLab settings

### Bitbucket Pipelines
- Add pipe step to install sfw binary
- Prefix install commands with sfw
- Enterprise: set SOCKET_CLI_API_TOKEN as repository variable

### Generic CI/CD
- Download sfw binary via curl/wget
- Prefix install commands with sfw
- Set SOCKET_CLI_API_TOKEN as env var for enterprise

### Local Development
- npm install -g sfw (or standalone binary)
- Usage: sfw npm install, sfw pip install, etc.

## Sub-Skill: Patch Setup

### When to Use (Patch Sub-Skill)
- User wants to set up socket-patch
- User wants to apply security patches in CI
- User wants postinstall hooks for automatic patching

### P1: Install socket-patch
- npm: npx @socketsecurity/socket-patch (one-off) or npm install -g @socketsecurity/socket-patch
- pip: pip install socket-patch
- cargo: cargo install socket-patch-cli
- Standalone: curl installer from socket-patch repo
- No API key required for socket-patch apply

### P2: Generic Agent — Scan Codebase for Install/Build Locations
The agent must comprehensively scan the project to find ALL places where
dependencies are installed and builds happen:

| Location | What to Look For |
|----------|-----------------|
| package.json scripts | install, postinstall, build, prebuild |
| CI configs (all formats) | install steps, build steps |
| Makefile / Justfile | install and build targets |
| Dockerfile / docker-compose | RUN install, RUN build layers |
| Shell scripts (*.sh) | install/build commands |
| pyproject.toml / setup.py | build system config |
| Cargo.toml | build scripts |

For each location, record:
- File path
- The install command/step
- The build command/step
- Where to insert socket-patch apply (after install, before build)

Present findings to user before making changes.

### P3: GitHub Actions (Preferred for GitHub repos)
- Use SocketDev/action@v1 with mode: patch
  ```yaml
  - uses: SocketDev/action@v1
    with:
      mode: patch
      # patch-ecosystems: npm,pypi  (optional)
      # patch-dry-run: false        (optional)
  ```
- Place after checkout, before install
  (binary is available when npm postinstall hooks run)
- No socket-token needed for patch mode

### P4: GitLab CI
- Add stage/step to install socket-patch binary
- Add socket-patch apply step after install, before build
- Example .gitlab-ci.yml snippet

### P5: Bitbucket Pipelines
- Add step to install socket-patch binary
- Add socket-patch apply step after install, before build
- Example bitbucket-pipelines.yml snippet

### P6: Other CI/CD Systems (Jenkins, CircleCI, Travis, Azure, etc.)
- Install socket-patch binary via curl/npm
- Add socket-patch apply step after install, before build
- Generic pattern applicable to any CI system

### P7: Local Development / npm Projects
- Run socket-patch setup to add postinstall hook to package.json
- This auto-adds "postinstall": "socket-patch apply"
- Works for any npm project regardless of CI system

### P8: Generic Fallback
If the agent cannot determine the CI/CD system or the project uses
an unusual build system:
- Identify the project's install and build commands by reading all
  config files, scripts, and documentation
- Insert socket-patch apply at the appropriate point
- For interpreted projects (Python, Ruby): add after pip install / bundle install
- For compiled projects (Rust, Go, Java): add after dependency fetch, before compile
- For containers: add RUN socket-patch apply layer after install layer

### P9: Verify
- socket-patch apply --dry-run
- Run the build
- Check .socket/manifest.json is committed

## Tips
- Never commit API tokens. Use socket login locally, env vars in CI.
- socket-patch apply does not require an API key.
- Use SocketDev/action@v1 (correct casing) in GitHub workflow files.
- For monorepos, use patch-cwd to target specific directories.
- After setup, use scan skill for first audit, review skill for package inspection.
- For GitHub repos, consider also installing the Socket Security GitHub App
  for automatic PR scanning.
