/**
 * Parse YAML frontmatter from a Markdown file.
 *
 * Handles multi-line values: continuation lines (lines starting with
 * whitespace that follow a key-value pair) are appended to the previous
 * key's value, separated by a single space.
 */
export function parseFrontmatter(text: string): Record<string, string> {
  const match = text.match(/^---\s*\n([\s\S]*?)\n---\s*/);
  if (!match) return {};

  const data: Record<string, string> = {};
  let currentKey: string | null = null;

  for (const line of match[1].split("\n")) {
    // Continuation line: starts with whitespace and follows a key
    if (currentKey && /^\s+/.test(line)) {
      const trimmed = line.trim();
      if (trimmed) {
        data[currentKey] += " " + trimmed;
      }
      continue;
    }

    if (!line.includes(":")) {
      currentKey = null;
      continue;
    }

    const idx = line.indexOf(":");
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key && value) {
      data[key] = value;
      currentKey = key;
    } else {
      currentKey = null;
    }
  }

  return data;
}
