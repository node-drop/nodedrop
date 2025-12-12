import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",

  // Test file patterns
  testMatch: [
    "**/__tests__/**/*.test.ts",
    "**/__tests__/**/*.integration.test.ts",
    "**/__tests__/**/*.performance.test.ts",
  ],

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  // Files to collect coverage from
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/**/*.test.ts",
    "!src/**/*.spec.ts",
    "!src/__tests__/**/*",
    "!src/index.ts", // Entry point typically excluded
    "!src/cli/**/*", // CLI scripts excluded
    "!src/scripts/**/*", // Utility scripts excluded
  ],

  // Setup files
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/setup.ts"],

  // Module path mapping
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@services/(.*)$": "<rootDir>/src/services/$1",
    "^@utils/(.*)$": "<rootDir>/src/utils/$1",
    "^@types/(.*)$": "<rootDir>/src/types/$1",
    // Map @nodedrop packages to their TypeScript source files for Jest
    "^@nodedrop/utils$": "<rootDir>/../packages/utils/src/index.ts",
    "^@nodedrop/types$": "<rootDir>/../packages/types/src/index.ts",
    // Mock better-auth modules to avoid ESM issues in tests
    "^better-auth$": "<rootDir>/src/__tests__/__mocks__/better-auth.ts",
    "^better-auth/node$": "<rootDir>/src/__tests__/__mocks__/better-auth-node.ts",
    "^better-auth/adapters/prisma$": "<rootDir>/src/__tests__/__mocks__/better-auth-prisma.ts",
    "^better-auth/react$": "<rootDir>/src/__tests__/__mocks__/better-auth-react.ts",
  },

  // Transform configuration
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
      },
    ],
  },

  // Test timeout
  testTimeout: 30000, // 30 seconds for integration tests

  // Globals
  globals: {
    "ts-jest": {
      isolatedModules: true,
    },
  },



  // Module resolution
  moduleFileExtensions: ["ts", "js", "json"],

  // Ignore patterns
  testPathIgnorePatterns: ["/node_modules/", "/dist/", "/coverage/"],

  // Transform ESM modules from better-auth and @nodedrop packages
  transformIgnorePatterns: [
    "/node_modules/(?!(better-auth|@nodedrop)/)"
  ],





  // Cache configuration
  cacheDirectory: "<rootDir>/.jest-cache",

  // Error handling
  errorOnDeprecated: true,
  verbose: true,

  // Parallel execution
  maxWorkers: "50%", // Use 50% of available CPU cores

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,

  // Force exit after tests complete
  forceExit: true,

  // Detect open handles
  detectOpenHandles: true,

  // Detect leaked timers
  detectLeaks: false,
};

export default config;
