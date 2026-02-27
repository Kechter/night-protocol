import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // jsdom environment provides window, document, localStorage etc.
    environment: "jsdom",
    include: ["tests/unit/**/*.test.js"],
    // Show verbose test names
    reporter: "verbose",
    coverage: {
      provider: "v8",
      include: ["src/utils/**", "src/systems/**"],
    },
  },
});
