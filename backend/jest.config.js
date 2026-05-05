// jest.config.js — Backend
/** @type {import('jest').Config} */
module.exports = {
  // Test environment
  testEnvironment: "node",

  // Where to find tests
  testMatch: [
    "<rootDir>/tests/**/*.test.js",
    "<rootDir>/tests/**/*.spec.js",
  ],

  // Coverage settings
  collectCoverage: true,
  collectCoverageFrom: [
    "src/**/*.js",
    "!src/server.js",          // Entry point — skip
    "!src/config/db.js",       // DB connection — skip (tested via integration)
    "!**/node_modules/**",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html", "json-summary"],

  // Fail if coverage drops below these thresholds
  coverageThreshold: {
    global: {
      lines: 60,
      functions: 60,
      branches: 50,
      statements: 60,
    },
  },

  // Show verbose output so failures include file + line
  verbose: true,

  // Timeout for async tests (ms)
  testTimeout: 15000,

  // Setup files (uncomment and create if you need global setup)
  // globalSetup: "<rootDir>/tests/setup/globalSetup.js",
  // globalTeardown: "<rootDir>/tests/setup/globalTeardown.js",
  // setupFilesAfterFramework: ["<rootDir>/tests/setup/jest.setup.js"],

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,

  // Reporter
  // In CI, jest-junit is added via JEST_JUNIT env vars in the workflow.
  // Locally, just use the default reporter.
  reporters: ["default"],

  // Module name mapper (add aliases if you use them)
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },

  // Transform (not needed for plain JS, but ready for TypeScript)
  // transform: {
  //   "^.+\\.tsx?$": "ts-jest",
  // },

  // Don't transform these
  transformIgnorePatterns: ["node_modules/"],

  // Detect open handles (helps with hanging tests)
  detectOpenHandles: true,
  forceExit: true,
};
