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

## Patch Setup

For detailed patching instructions — including installing `socket-patch`, applying binary-level patches, setting up postinstall hooks, and configuring patching in CI/CD pipelines — use the `/patch` skill.

The `/patch` skill covers GitHub Actions, GitLab CI, Bitbucket Pipelines, and generic CI/CD systems. No API key is required for `socket-patch apply`.

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
- After setup, use the `/scan` skill for a first audit and the `/review` skill for package inspection.
- For GitHub repos, consider also installing the Socket Security GitHub App
  for automatic PR scanning.
