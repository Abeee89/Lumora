import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [".next/**", "node_modules/**", "coverage/**", "tests/fixtures/**", "next-env.d.ts"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/consistent-type-imports": "error",
      eqeqeq: ["error", "smart"],
      // Types cover globals; `no-undef` only produces false positives in TypeScript files.
      "no-undef": "off",
    },
  },
  {
    files: ["scripts/**/*.ts", "tools/**/*.ts", "src/worker/**/*.ts"],
    rules: { "no-console": "off" },
  },
);