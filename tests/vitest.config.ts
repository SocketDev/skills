import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    root: "tests",
    include: [
      // Tier 1: Always run
      "tier1-structural/**/*.test.ts",
      // Tier 2: Only when SOCKET_SECURITY_API_KEY is set
      ...(process.env.SOCKET_SECURITY_API_KEY
        ? ["tier2-mcp/**/*.test.ts"]
        : []),
      // Tier 3: Only when RUN_E2E=1
      ...(process.env.RUN_E2E === "1" ? ["tier3-e2e/**/*.e2e.test.ts"] : []),
    ],
    testTimeout: 30_000,
  },
});
