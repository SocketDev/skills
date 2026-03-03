---
name: update
description: Update a dependency and propose local code fixes for any breaking changes. Security-audited upgrades with automated code migration suggestions.
---

# Update

Update a dependency to a newer version while ensuring the upgrade is security-audited and proposing code fixes for any breaking changes.

## When to Use

- The user wants to update a specific dependency to a new version
- The user needs to migrate code after a major version bump
- The user wants a security-aware upgrade that checks for new vulnerabilities
- The user asks to bring dependencies up to date

## Update Workflow

### 1. Pre-Update Security Check

Before upgrading, review the target version with the Socket API:
- Verify the new version has no known vulnerabilities
- Check that the new version's Socket score is acceptable
- Compare maintainer info between current and target versions
- Review any new transitive dependencies

### 2. Determine Breaking Changes

For major version bumps:
- Check the package's CHANGELOG or release notes
- Identify deprecated APIs that were removed
- Note any changed default behaviors
- List new peer dependency requirements

### 3. Apply the Update

Update the dependency in the appropriate manifest:
- **npm**: `npm install package@version`
- **pip**: Update `requirements.txt` or `pyproject.toml`, run `pip install`
- **Go**: `go get package@version && go mod tidy`
- **Maven**: Update version in `pom.xml`

### 4. Fix Breaking Changes

After updating, address breaking changes in the codebase:
- Search for usage of removed or renamed APIs
- Update import paths if the package restructured its exports
- Adjust configuration to match new option names or formats
- Update type annotations if TypeScript/type definitions changed

### 5. Verify

1. Run the full test suite
2. Run the `scan` skill to ensure no new vulnerabilities were introduced
3. Manually test critical paths affected by the updated dependency

## Example

Updating `express` from v4 to v5:
1. Review `express@5` security profile via Socket
2. Check Express 5 migration guide for breaking changes
3. Run `npm install express@5`
4. Update middleware signatures (`(err, req, res, next)` → updated patterns)
5. Update path route syntax (regexp changes)
6. Run tests, fix failures, re-scan

## Tips

- Always update one dependency at a time for easier debugging
- For major version bumps, create a separate branch and PR
- Use `npm outdated` / `pip list --outdated` to identify available updates
- Combine with the `review` skill to compare current vs target version security profiles
- After updating, use the `scan` skill to verify no new risks were introduced
