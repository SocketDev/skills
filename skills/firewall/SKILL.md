---
name: firewall
description: Set up Socket firewall and configure local environment to block malicious packages. Install and configure socket-firewall, manage allow/deny rules, and enforce org policies.
---

# Firewall

Set up and configure the Socket firewall to block malicious, vulnerable, or risky packages from being installed in your environment.

## When to Use

- The user wants to prevent malicious packages from being installed
- The user needs to enforce organization-wide dependency policies
- The user wants to set up `socket-firewall` for local development or CI
- The user asks about blocking specific packages or risk categories

## How It Works

The Socket firewall wraps your package manager (npm, yarn, pnpm) and intercepts install operations. Before any package is installed, it checks Socket's real-time threat intelligence to:

- **Block malware** before it reaches `node_modules`
- **Warn on risky packages** with install scripts, obfuscated code, or other signals
- **Enforce policies** defined at the organization level

## Installation

### Local Setup

```bash
npm install -g @socketsecurity/cli
```

Once installed, `socket-firewall` automatically wraps npm/yarn/pnpm commands.

### Verify Installation

```bash
socket --version
socket info
```

## Configuration

### Organization Policies

Organization-wide rules are managed through the Socket dashboard. Common policies:
- Block all packages with known malware
- Warn on packages with install scripts
- Block packages with critical CVEs
- Require minimum maintainer count

### Local Overrides

Create a `socket.yml` in the repository root for project-specific rules:

```yaml
issues:
  - package: "example-pkg"
    action: allow      # Override org block for this package
  - package: "*"
    severity: critical
    action: error      # Block critical issues
  - package: "*"
    severity: high
    action: warn       # Warn on high issues
```

### Allow/Deny Lists

Manage explicit package lists:
- **Allow list**: Packages pre-approved for use regardless of risk signals
- **Deny list**: Packages explicitly blocked regardless of score

## CI Integration

Add the firewall to CI pipelines to enforce policies on every install:

```yaml
- name: Install Socket CLI
  run: npm install -g @socketsecurity/cli

- name: Install dependencies (with firewall)
  run: socket npm install
  env:
    SOCKET_SECURITY_API_KEY: ${{ secrets.SOCKET_SECURITY_API_KEY }}
```

## Tips

- Start with `warn` mode to understand your exposure before switching to `error` (block) mode
- Use organization policies for baseline rules; use `socket.yml` for project-specific exceptions
- The firewall adds minimal latency — Socket responses are cached and pre-fetched
- Combine with the `scan` skill to audit existing dependencies before enabling strict mode
