import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.{ts,tsx}", "test/**/*.test.{ts,tsx}", "e2e-desktop/**/*.test.{ts,tsx}"],
    setupFiles: "./test/setup.ts",
  },
});
