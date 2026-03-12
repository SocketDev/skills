#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

GENERATED_FILES=(
  "agents/AGENTS.md"
  "README.md"
  ".cursor-plugin/plugin.json"
  ".mcp.json"
  ".claude-plugin/plugin.json"
  ".claude-plugin/marketplace.json"
  "gemini-extension.json"
)

file_sig() {
  local path="$1"
  if [[ -f "$path" ]]; then
    shasum -a 256 "$path" | awk '{print $1}'
  else
    echo "__MISSING__"
  fi
}

run_generate() {
  npx tsx scripts/inline-shared.ts
  npx tsx scripts/sync-versions.ts
  npx tsx scripts/generate-agents.ts
  npx tsx scripts/generate-cursor-plugin.ts
}

run_check() {
  local before_sigs=""
  local changed=()

  for p in "${GENERATED_FILES[@]}"; do
    before_sigs="${before_sigs}${p}=$(file_sig "$p")"$'\n'
  done

  run_generate

  for p in "${GENERATED_FILES[@]}"; do
    local before_sig
    before_sig="$(echo "$before_sigs" | grep "^${p}=" | cut -d= -f2)"
    local after_sig
    after_sig="$(file_sig "$p")"
    if [[ "$before_sig" != "$after_sig" ]]; then
      changed+=("$p")
    fi
  done

  if [[ ${#changed[@]} -gt 0 ]]; then
    echo "Generated artifacts are outdated."
    echo "Run: ./scripts/publish.sh"
    echo
    echo "Changed files:"
    for p in "${changed[@]}"; do
      echo "$p"
    done
    exit 1
  fi

  # Extra explicit check for cursor-only artifacts
  npx tsx scripts/generate-cursor-plugin.ts --check

  # Check shared sections are inlined
  npx tsx scripts/inline-shared.ts --check

  echo "All generated artifacts are up to date."
}

case "${1:-}" in
  "")
    run_generate
    echo "Publish artifacts generated successfully."
    ;;
  "--check")
    run_check
    ;;
  "-h"|"--help")
    cat <<'EOF'
Usage:
  ./scripts/publish.sh         Generate all publish artifacts
  ./scripts/publish.sh --check Verify generated artifacts are up to date

This script regenerates:
  - agents/AGENTS.md
  - README.md (skills table section)
  - .cursor-plugin/plugin.json
  - .mcp.json
EOF
    ;;
  *)
    echo "Unknown option: $1" >&2
    echo "Use --help for usage." >&2
    exit 2
    ;;
esac
