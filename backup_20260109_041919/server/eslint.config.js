import typescriptParser from "@typescript-eslint/parser";

export default [
  {
    ignores: ["dist/**"]
  },
  {
    files: ["src/**/*.{js,ts}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parser: typescriptParser,
    },
    rules: {
      "no-unused-vars": "error",
      "no-console": "warn",
      "prefer-const": "error",
    }
  }
]