---
name: setup
description: Configure Socket for a project: install the CLI, set up API keys, connect to the Socket dashboard, and verify the integration is working.
---

# Setup

Configure Socket for a project by installing the CLI, setting up API keys, and verifying the integration is working.

## When to Use

- The user wants to get started with Socket in a new project
- The user needs to install or configure the Socket CLI
- The user wants to set up their Socket API key
- The user asks how to connect their project to the Socket dashboard
- The user is having trouble authenticating with Socket

## Prerequisites

- A Socket account at [socket.dev](https://socket.dev)
- Node.js 18+ installed (for the CLI)

## Installation

### Install the Socket CLI

```bash
npm install -g @socketsecurity/cli
```

### Verify Installation

```bash
socket --version
```

## API Key Setup

### 1. Get Your API Key

1. Log in to the [Socket dashboard](https://socket.dev/dashboard)
2. Navigate to **Settings → API Keys**
3. Click **Create API Key**
4. Copy the generated key

### 2. Configure the API Key

Set the API key as an environment variable. Add it to your shell profile (`~/.bashrc`, `~/.zshrc`, etc.):

```bash
export SOCKET_SECURITY_API_KEY="your-api-key-here"
```

Then reload your shell:

```bash
source ~/.bashrc  # or ~/.zshrc
```

### 3. Verify Authentication

```bash
socket info
```

This should display your organization details and confirm the key is valid.

## Project Configuration

### Connect a Repository

To enable Socket monitoring for a repository:

1. Install the [Socket GitHub App](https://github.com/apps/socket-security) on your repository
2. The app will automatically scan pull requests for dependency risks

### CI Integration

Add Socket to your CI pipeline by setting the `SOCKET_SECURITY_API_KEY` secret:

**GitHub Actions:**
```yaml
env:
  SOCKET_SECURITY_API_KEY: ${{ secrets.SOCKET_SECURITY_API_KEY }}
```

**Other CI systems:**
Add `SOCKET_SECURITY_API_KEY` as a secret/environment variable in your CI provider's settings.

## Troubleshooting

### "Unauthorized" or "Invalid API Key"
- Verify the key is set: `echo $SOCKET_SECURITY_API_KEY`
- Regenerate the key in the Socket dashboard if it has expired
- Ensure there are no trailing spaces or newlines in the key

### "Command not found: socket"
- Reinstall: `npm install -g @socketsecurity/cli`
- Check your PATH includes the npm global bin directory: `npm bin -g`

### Rate Limiting
- The Socket API has rate limits per organization
- For CI, ensure only necessary jobs call the Socket API
- Cache results where possible to reduce API calls

## Tips

- Store the API key as a CI secret — never commit it to the repository
- Use organization-level API keys for shared projects
- After setup, use the `scan` skill to run your first security audit
- Combine with the `review` skill to check individual packages
