import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

// Load test environment variables
dotenv.config({ path: ".env.test" });

// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = "test";

  // Set up test database connection
  if (!process.env.TEST_DATABASE_URL) {
    console.warn("TEST_DATABASE_URL not set, using default test database");
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/nd_test";
  } else {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  }

  // Global timeout for async operations
  jest.setTimeout(30000);
});

// Global test cleanup
afterAll(async () => {
  // Close any open database connections
  const prisma = new PrismaClient();
  await prisma.$disconnect();
});

// Mock console methods to reduce noise in tests
const originalConsole = console;

beforeEach(() => {
  // Mock console methods but allow warnings and errors
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "info").mockImplementation(() => {});
  jest.spyOn(console, "debug").mockImplementation(() => {});

  // Keep warnings and errors for debugging
  jest.spyOn(console, "warn").mockImplementation((...args) => {
    if (process.env.VERBOSE_TESTS === "true") {
      originalConsole.warn(...args);
    }
  });

  jest.spyOn(console, "error").mockImplementation((...args) => {
    if (process.env.VERBOSE_TESTS === "true") {
      originalConsole.error(...args);
    }
  });
});

afterEach(() => {
  // Restore console methods
  jest.restoreAllMocks();
});

// Global error handler for unhandled promises
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// Global utilities for tests
declare global {
  namespace NodeJS {
    interface Global {
      testUtils: {
        createTestUser: (email?: string) => Promise<string>;
        createTestWorkflow: (name?: string) => Promise<string>;
        cleanupTestData: () => Promise<void>;
        waitFor: (
          condition: () => boolean | Promise<boolean>,
          timeout?: number
        ) => Promise<void>;
      };
    }
  }
}

// Test utilities
(global as any).testUtils = {
  async createTestUser(email = "test@example.com"): Promise<string> {
    // This would be implemented with actual user creation logic
    return "mock-auth-token";
  },

  async createTestWorkflow(name = "Test Workflow"): Promise<string> {
    // This would be implemented with actual workflow creation logic
    return "mock-workflow-id";
  },

  async cleanupTestData(): Promise<void> {
    const prisma = new PrismaClient();
    try {
      // Clean up test data in the correct order to avoid foreign key constraints
      await prisma.nodeExecution.deleteMany({
        where: {
          execution: {
            workflow: {
              name: {
                startsWith: "Test",
              },
            },
          },
        },
      });

      await prisma.execution.deleteMany({
        where: {
          workflow: {
            name: {
              startsWith: "Test",
            },
          },
        },
      });

      await prisma.workflow.deleteMany({
        where: {
          name: {
            startsWith: "Test",
          },
        },
      });

      await prisma.user.deleteMany({
        where: {
          email: {
            contains: "test",
          },
        },
      });
    } finally {
      await prisma.$disconnect();
    }
  },

  async waitFor(
    condition: () => boolean | Promise<boolean>,
    timeout = 5000
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const result = await condition();
      if (result) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    throw new Error(`Condition not met within ${timeout}ms`);
  },
};

export {};
