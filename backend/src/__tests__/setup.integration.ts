import { PrismaClient } from "@prisma/client";
import { createServer } from "http";
import app from "../index";

// Integration test specific setup
let testServer: any;
let prisma: PrismaClient;

beforeAll(async () => {
  // Set up test server
  testServer = createServer(app);
  await new Promise<void>((resolve) => {
    testServer.listen(0, () => {
      const port = testServer.address()?.port;
      process.env.TEST_SERVER_PORT = port?.toString();
      console.log(`Test server running on port ${port}`);
      resolve();
    });
  });

  // Set up database connection
  prisma = new PrismaClient();
  await prisma.$connect();

  // Run database migrations if needed
  try {
    await prisma.$executeRaw`SELECT 1`;
  } catch (error) {
    console.warn("Database connection check failed:", error);
  }
});

afterAll(async () => {
  // Clean up test server
  if (testServer) {
    await new Promise<void>((resolve) => {
      testServer.close(() => {
        console.log("Test server closed");
        resolve();
      });
    });
  }

  // Close database connection
  if (prisma) {
    await prisma.$disconnect();
  }
});

// Clean up test data before each test
beforeEach(async () => {
  try {
    // Clean up in the correct order to respect foreign key constraints
    await prisma.nodeExecution.deleteMany({
      where: {
        execution: {
          workflow: {
            name: {
              contains: "Test",
            },
          },
        },
      },
    });

    await prisma.execution.deleteMany({
      where: {
        workflow: {
          name: {
            contains: "Test",
          },
        },
      },
    });

    await prisma.workflow.deleteMany({
      where: {
        name: {
          contains: "Test",
        },
      },
    });

    await prisma.user.deleteMany({
      where: {
        email: {
          endsWith: "example.com",
        },
      },
    });
  } catch (error) {
    console.warn("Error cleaning up test data:", error);
  }
});

export { prisma, testServer };
