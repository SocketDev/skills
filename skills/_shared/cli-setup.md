### Socket CLI Setup

The Socket CLI must be installed. Verify:

```
socket --version
```

If not installed, install globally:

```
npm install -g socket
```

If `socket` is not installed globally, `npx socket` works as a drop-in prefix for all commands in this skill (e.g., `npx socket scan create ...`).

#### Authentication

**For users without a Socket account:** Run `socket login --public` to activate a built-in public token. This provides limited access to all CLI features (`socket fix`, `socket scan`, `sfw`, `socket-patch`) with rate limits. No account creation is needed for basic usage.

**For users with an account:** Authenticate with one of:

- **Interactive login**: `socket login` (stores credentials in `~/.socket/`)
- **Environment variable**: Set `SOCKET_CLI_API_TOKEN` in your shell profile or CI environment

Verify account authentication:

```
socket organization list
```

If authentication fails or the CLI is not installed, use the `/socket-setup` skill for detailed guidance including Node.js installation, PATH troubleshooting, and CI/CD token configuration.
