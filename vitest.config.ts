import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const src = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  resolve: {
    alias: { "@": src },
  },
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**"],
      reporter: ["text"],
      // Milestone floors (DEFINITION-OF-DONE section 2) are set where a milestone has
      // logic: the shared kernel from M01, and each module from the milestone that adds
      // it. Measured by `npm run test:coverage`, which runs both projects.
      thresholds: {
        "src/kernel/**": { lines: 80, functions: 70, branches: 70, statements: 80 },
        "src/modules/exams/**": { lines: 80, functions: 70, branches: 70, statements: 80 },
        "src/modules/plans/**": { lines: 80, functions: 70, branches: 70, statements: 80 },
        "src/modules/timer/**": { lines: 80, functions: 70, branches: 70, statements: 80 },
        "src/modules/goals/**": { lines: 80, functions: 70, branches: 70, statements: 80 },
      },
    },
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
          testTimeout: 120_000,
          hookTimeout: 180_000,
          fileParallelism: false,
        },
      },
    ],
  },
});