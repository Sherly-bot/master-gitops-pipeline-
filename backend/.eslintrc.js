module.exports = {
  env: {
    node: true,
    es2022: true,
    jest: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "commonjs",
  },
  rules: {
    // Errors
    "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "no-undef": "error",
    "no-console": ["warn", { allow: ["warn", "error", "info"] }],

    // Best practices
    eqeqeq: ["error", "always"],
    "no-var": "error",
    "prefer-const": "error",
    "no-duplicate-imports": "error",

    // Security
    "no-eval": "error",
    "no-implied-eval": "error",
    "no-new-func": "error",
  },
  ignorePatterns: ["node_modules/", "coverage/", "dist/", "reports/"],
};
