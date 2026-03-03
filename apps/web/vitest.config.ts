import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["__tests__/**/*.test.ts"],
    testTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@walletkit/db": path.resolve(__dirname, "../../packages/db"),
      "@walletkit/js": path.resolve(__dirname, "../../packages/sdk"),
    },
  },
});
