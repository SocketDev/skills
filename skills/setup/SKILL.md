---
name: setup
description: Set up Socket from scratch — install the CLI (`socket`), authenticate with `socket login`, optionally install the GitHub App, and configure Socket Firewall (free or enterprise).
---

# Setup

Set up Socket from scratch by installing the CLI, authenticating, connecting to GitHub, and configuring Socket Firewall.

## When to Use

- The user wants to get started with Socket in a new project
- The user needs to install or configure the Socket CLI
- The user wants to authenticate with Socket
- The user asks how to connect their project to the Socket dashboard
- The user wants to set up Socket Firewall for dependency protection
- The user is having trouble authenticating with Socket

## Step 1: Install the CLI

### Prerequisites

- Node.js 18+ installed

### Install

```bash
npm install -g socket
```

### Verify Installation

```bash
socket --version
```

If `socket` is not found, ensure the npm global bin directory is on your PATH:

```bash
npm bin -g
```

## Step 2: Authenticate

### Interactive Login (Recommended)

Run `socket login` to authenticate interactively. This handles token input, org selection, and persists credentials to your local config:

```bash
socket login
```

### Manual Token Setup

If interactive login is not available (e.g. headless environments):

1. Sign in at [socket.dev/auth/login](https://socket.dev/auth/login)
2. Navigate to your org's API token page: `https://socket.dev/dashboard/org/{ORG}/settings/integrations/api-tokens`
3. Generate a new token

### CI Environments

Set the `SOCKET_CLI_API_TOKEN` environment variable:

```bash
export SOCKET_CLI_API_TOKEN="your-token-here"
```

For GitHub Actions:

```yaml
env:
  SOCKET_CLI_API_TOKEN: ${{ secrets.SOCKET_CLI_API_TOKEN }}
```

### Verify Authentication

```bash
socket organization list
```

This should display your organizations and confirm credentials are valid.

## Step 3: GitHub App (Optional)

Check if the current project uses GitHub as its remote:

```bash
git remote -v
```

If the remote points to GitHub, ask the user whether they want to install the Socket Security GitHub App. The app automatically scans pull requests for dependency risks.

Install at: [github.com/apps/socket-security](https://github.com/apps/socket-security)

Skip this step if the project is not hosted on GitHub or the user declines.

## Step 4: Socket Firewall

Ask the user whether they want to set up the **free** or **enterprise** Socket Firewall.

### Free (`sfw`)

A zero-config firewall that blocks malicious and risky packages at install time. No Socket account required.

#### Install

```bash
npm install -g sfw
```

Or download a standalone binary from [github.com/SocketDev/sfw-free/releases](https://github.com/SocketDev/sfw-free/releases).

#### Usage

Prefix `sfw` before any package manager command:

```bash
sfw npm install
sfw yarn add express
sfw pnpm install
sfw pip install requests
sfw uv pip install flask
sfw cargo add serde
```

Supported package managers: npm, yarn, pnpm, pip, uv, cargo.

#### CI Integration

Use the `socketdev/action@v1` GitHub Action with `mode: firewall`:

```yaml
- uses: socketdev/action@v1
  with:
    mode: firewall
```

### Enterprise

Enterprise Firewall requires authentication from Step 2 and provides advanced protections.

Additional capabilities beyond the free tier:

- **More ecosystems**: Go, Java, Ruby, .NET in addition to npm/yarn/pnpm/pip/uv/cargo
- **Service mode**: Persistent proxy that protects all package installs system-wide
- **Configurable policies**: Customize which risk categories to block or warn on
- **Private registry support**: Works with private npm registries, Artifactory, etc.
- **Allow-listing**: Approve specific packages that trigger policy rules
- **Dashboard integration**: View blocked installs and policy events in the Socket dashboard
- **Offline operation**: Cache policies for air-gapped environments

Refer to the Socket documentation for enterprise setup instructions.

## Tips

- Never commit API tokens to the repository. Use `socket login` for local development and `SOCKET_CLI_API_TOKEN` as a CI secret.
- After setup, use the `scan` skill to run your first security audit and the `review` skill to inspect individual packages.
- If `socket login` fails, check your network connection and ensure you can reach `https://socket.dev`. Try `socket login --help` for additional options.
