# check-new-deps Hook

A Claude Code pre-tool hook that checks new dependencies against [Socket.dev](https://socket.dev) before they're added to the project. It runs automatically every time Claude tries to edit or create a dependency manifest file.

## What it does

When Claude edits a dependency manifest file, this hook:

1. **Detects the file type** and extracts dependency names from the content
2. **Diffs against the old content** (for edits) so only *newly added* deps are checked
3. **Queries the Socket.dev malware API**
4. **Blocks the edit** (exit code 2) if malware is detected
5. **Allows** (exit code 0) if everything is clean or the file isn't a manifest

## How it works

```
Claude wants to edit package.json
        │
        ▼
Hook receives the edit via stdin (JSON)
        │
        ▼
Extract new deps from new_string
Diff against old_string (if Edit)
        │
        ▼
Build Package URLs (PURLs) for each dep
        │
        ▼
Call sdk.checkMalware(components)
        │
        ├── Malware detected → EXIT 2 (blocked)
        └── Clean → EXIT 0 (allowed)
```

## Supported manifest formats

| File | Ecosystem |
|------|-----------|
| `package.json`, `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock` | npm |
| `requirements.txt`, `pyproject.toml`, `setup.py`, `Pipfile.lock`, `poetry.lock` | PyPI |
| `Cargo.toml`, `Cargo.lock` | Cargo (Rust) |
| `go.mod`, `go.sum` | Go |
| `pom.xml`, `build.gradle`, `build.gradle.kts` | Maven (Java) |
| `Gemfile`, `Gemfile.lock` | RubyGems |
| `.csproj` | NuGet (.NET) |
| `composer.json`, `composer.lock` | Composer (PHP) |

## Configuration

The hook is registered in `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/check-new-deps/index.mts"
          }
        ]
      }
    ]
  }
}
```

## Dependencies

- `@socketsecurity/sdk` — Socket.dev SDK with `checkMalware()` API
- `@socketsecurity/lib` — shared constants and path utilities
- `@socketregistry/packageurl-js` — Package URL (PURL) parsing and stringification

## Exit codes

| Code | Meaning | Claude behavior |
|------|---------|----------------|
| 0 | Allow | Edit/Write proceeds normally |
| 2 | Block | Edit/Write is rejected, Claude sees the error message |
