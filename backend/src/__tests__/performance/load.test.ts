import { PrismaClient } from "@prisma/client";
import { performance } from "perf_hooks";
import request from "supertest";
import app from "../../index";

describe("Performance and Load Tests", () => {
  let prisma: PrismaClient;
  let authToken: string;
  let testWorkflowId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();

    // Create test user and workflow
    authToken = await createTestUser();
    testWorkflowId = await createTestWorkflow();
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  describe("API Endpoint Performance", () => {
    it("should handle workflow creation within acceptable time", async () => {
      const startTime = performance.now();

      const response = await request(app)
        .post("/api/workflows")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "Performance Test Workflow",
          description: "Test workflow for performance testing",
          nodes: generateLargeWorkflow(50), // 50 nodes
          connections: generateConnections(50),
          isActive: true,
        });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      console.log(`Workflow creation took ${duration.toFixed(2)}ms`);
    });

    it("should handle concurrent API requests efficiently", async () => {
      const concurrentRequests = 20;
      const startTime = performance.now();

      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        request(app)
          .get("/api/workflows")
          .set("Authorization", `Bearer ${authToken}`)
          .query({ limit: 10, offset: i * 10 })
      );

      const responses = await Promise.all(promises);
      const endTime = performance.now();
      const duration = endTime - startTime;

      // All requests should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      // Average response time should be reasonable
      const avgResponseTime = duration / concurrentRequests;
      expect(avgResponseTime).toBeLessThan(1000); // Average < 1 second
      console.log(
        `${concurrentRequests} concurrent requests took ${duration.toFixed(
          2
        )}ms (avg: ${avgResponseTime.toFixed(2)}ms)`
      );
    });

    it("should handle execution history queries with large datasets efficiently", async () => {
      // Create multiple test executions
      await createTestExecutions(100);

      const startTime = performance.now();

      const response = await request(app)
        .get("/api/execution-history/query")
        .set("Authorization", `Bearer ${authToken}`)
        .query({
          limit: 50,
          offset: 0,
          sortBy: "startedAt",
          sortOrder: "desc",
        });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(response.status).toBe(200);
      expect(response.body.data.executions).toBeDefined();
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
      console.log(
        `History query with 100 executions took ${duration.toFixed(2)}ms`
      );
    });
  });

  describe("Database Performance", () => {
    it("should handle complex workflow queries efficiently", async () => {
      const startTime = performance.now();

      // Complex query with multiple joins and filters
      const workflows = await prisma.workflow.findMany({
        where: {
          isActive: true,
          executions: {
            some: {
              status: "SUCCESS",
              startedAt: {
                gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
              },
            },
          },
        },
        include: {
          executions: {
            select: {
              id: true,
              status: true,
              startedAt: true,
              finishedAt: true,
            },
            take: 10,
            orderBy: {
              startedAt: "desc",
            },
          },
          _count: {
            select: {
              executions: true,
            },
          },
        },
        take: 20,
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(workflows).toBeDefined();
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      console.log(`Complex workflow query took ${duration.toFixed(2)}ms`);
    });

    it("should handle bulk execution insertions efficiently", async () => {
      const executionCount = 50;
      const startTime = performance.now();

      const executions = Array.from({ length: executionCount }, (_, i) => ({
        workflowId: testWorkflowId,
        status: "SUCCESS" as const,
        startedAt: new Date(Date.now() - i * 60000), // 1 minute intervals
        finishedAt: new Date(Date.now() - i * 60000 + 30000), // 30 seconds duration
        triggerData: { index: i, test: true },
      }));

      // Use transaction for bulk insert
      await prisma.$transaction(
        executions.map((execution) =>
          prisma.execution.create({ data: execution })
        )
      );

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(3000); // Should complete within 3 seconds
      console.log(
        `Bulk insertion of ${executionCount} executions took ${duration.toFixed(
          2
        )}ms`
      );
    });
  });

  describe("Memory Usage and Resource Management", () => {
    it("should maintain reasonable memory usage during stress test", async () => {
      const initialMemory = process.memoryUsage();
      console.log("Initial memory usage:", formatMemoryUsage(initialMemory));

      // Perform memory-intensive operations
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(
          request(app)
            .post("/api/flow-execution/start")
            .set("Authorization", `Bearer ${authToken}`)
            .send({
              workflowId: testWorkflowId,
              triggerData: { iteration: i, data: generateLargeData(1000) },
            })
        );
      }

      await Promise.all(promises);

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      console.log("Final memory usage:", formatMemoryUsage(finalMemory));

      // Memory growth should be reasonable (less than 100MB increase)
      const heapGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(heapGrowth).toBeLessThan(100 * 1024 * 1024); // 100MB
      console.log(`Heap growth: ${(heapGrowth / 1024 / 1024).toFixed(2)}MB`);
    });

    it("should handle file descriptor limits appropriately", async () => {
      // Test with many concurrent connections
      const connectionCount = 100;
      const promises = [];

      for (let i = 0; i < connectionCount; i++) {
        promises.push(request(app).get("/health").timeout(5000));
      }

      const responses = await Promise.all(promises);

      // All requests should complete successfully
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      console.log(
        `Successfully handled ${connectionCount} concurrent connections`
      );
    });
  });

  describe("Error Handling Performance", () => {
    it("should handle error recovery operations efficiently", async () => {
      const startTime = performance.now();

      // Test error analysis performance
      const response = await request(app)
        .post("/api/execution-recovery/analyze")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          executionId: "test-execution-id",
          error: {
            message: "Complex error with nested context",
            code: "COMPLEX_ERROR",
            context: generateLargeData(100),
          },
        });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(500); // Should analyze quickly
      console.log(`Error analysis took ${duration.toFixed(2)}ms`);
    });

    it("should handle concurrent error analysis requests", async () => {
      const concurrentAnalyses = 10;
      const startTime = performance.now();

      const promises = Array.from({ length: concurrentAnalyses }, (_, i) =>
        request(app)
          .post("/api/execution-recovery/analyze")
          .set("Authorization", `Bearer ${authToken}`)
          .send({
            executionId: `test-execution-${i}`,
            error: {
              message: `Error ${i}`,
              code: `ERROR_${i}`,
              status: 500 + (i % 4),
            },
          })
      );

      const responses = await Promise.all(promises);
      const endTime = performance.now();
      const duration = endTime - startTime;

      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      const avgTime = duration / concurrentAnalyses;
      expect(avgTime).toBeLessThan(300); // Average < 300ms
      console.log(
        `${concurrentAnalyses} concurrent error analyses took ${duration.toFixed(
          2
        )}ms (avg: ${avgTime.toFixed(2)}ms)`
      );
    });
  });

  describe("Scalability Tests", () => {
    it("should scale execution history queries with pagination", async () => {
      const pageSize = 50;
      const totalPages = 10;
      const results = [];

      for (let page = 0; page < totalPages; page++) {
        const startTime = performance.now();

        const response = await request(app)
          .get("/api/execution-history/query")
          .set("Authorization", `Bearer ${authToken}`)
          .query({
            limit: pageSize,
            offset: page * pageSize,
            sortBy: "startedAt",
            sortOrder: "desc",
          });

        const endTime = performance.now();
        const duration = endTime - startTime;

        expect(response.status).toBe(200);
        results.push(duration);
      }

      // Response times should remain consistent across pages
      const avgTime =
        results.reduce((sum, time) => sum + time, 0) / results.length;
      const maxTime = Math.max(...results);

      expect(maxTime).toBeLessThan(avgTime * 2); // No single page should be more than 2x average
      console.log(
        `Pagination test - Avg: ${avgTime.toFixed(2)}ms, Max: ${maxTime.toFixed(
          2
        )}ms`
      );
    });

    it("should handle large workflow definitions efficiently", async () => {
      const largeWorkflow = {
        name: "Large Scale Workflow",
        description: "Workflow with many nodes for scalability testing",
        nodes: generateLargeWorkflow(200), // 200 nodes
        connections: generateConnections(200),
        isActive: true,
      };

      const startTime = performance.now();

      const response = await request(app)
        .post("/api/workflows")
        .set("Authorization", `Bearer ${authToken}`)
        .send(largeWorkflow);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(10000); // Should handle large workflows within 10 seconds
      console.log(
        `Large workflow (200 nodes) creation took ${duration.toFixed(2)}ms`
      );
    });
  });

  // Helper functions
  async function createTestUser(): Promise<string> {
    try {
      const response = await request(app).post("/api/auth/register").send({
        email: "perf-test@example.com",
        password: "testpass123",
        name: "Performance Test User",
      });

      return response.body.data.token;
    } catch {
      const loginResponse = await request(app).post("/api/auth/login").send({
        email: "perf-test@example.com",
        password: "testpass123",
      });

      return loginResponse.body.data.token;
    }
  }

  async function createTestWorkflow(): Promise<string> {
    const response = await request(app)
      .post("/api/workflows")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        name: "Performance Test Workflow",
        description: "Workflow for performance testing",
        nodes: [
          {
            id: "start",
            type: "trigger",
            name: "Start",
            position: { x: 100, y: 100 },
            parameters: {},
          },
          {
            id: "end",
            type: "success",
            name: "End",
            position: { x: 300, y: 100 },
            parameters: {},
          },
        ],
        connections: [
          {
            source: "start",
            target: "end",
            sourceHandle: "output",
            targetHandle: "input",
          },
        ],
        isActive: true,
      });

    return response.body.data.id;
  }

  async function createTestExecutions(count: number): Promise<void> {
    const executions = Array.from({ length: count }, (_, i) => ({
      workflowId: testWorkflowId,
      status: ["SUCCESS", "ERROR", "CANCELLED"][i % 3] as any,
      startedAt: new Date(Date.now() - i * 60000),
      finishedAt: new Date(Date.now() - i * 60000 + 30000),
      triggerData: { index: i, test: true },
    }));

    // Insert in batches to avoid overwhelming the database
    const batchSize = 20;
    for (let i = 0; i < executions.length; i += batchSize) {
      const batch = executions.slice(i, i + batchSize);
      await prisma.$transaction(
        batch.map((execution) => prisma.execution.create({ data: execution }))
      );
    }
  }

  function generateLargeWorkflow(nodeCount: number): any[] {
    return Array.from({ length: nodeCount }, (_, i) => ({
      id: `node-${i}`,
      type: "http",
      name: `HTTP Node ${i}`,
      position: { x: (i % 10) * 200, y: Math.floor(i / 10) * 150 },
      parameters: {
        url: `https://api.example.com/endpoint-${i}`,
        method: "GET",
        timeout: 30000,
      },
    }));
  }

  function generateConnections(nodeCount: number): any[] {
    const connections = [];
    for (let i = 0; i < nodeCount - 1; i++) {
      connections.push({
        source: `node-${i}`,
        target: `node-${i + 1}`,
        sourceHandle: "output",
        targetHandle: "input",
      });
    }
    return connections;
  }

  function generateLargeData(itemCount: number): any {
    return {
      items: Array.from({ length: itemCount }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        description: `Description for item ${i}`,
        value: Math.random() * 1000,
        timestamp: new Date().toISOString(),
        metadata: {
          category: `Category ${i % 10}`,
          tags: [`tag-${i % 5}`, `tag-${i % 7}`],
        },
      })),
    };
  }

  function formatMemoryUsage(memUsage: NodeJS.MemoryUsage): string {
    return Object.entries(memUsage)
      .map(([key, value]) => `${key}: ${(value / 1024 / 1024).toFixed(2)}MB`)
      .join(", ");
  }

  async function cleanupTestData(): Promise<void> {
    try {
      await prisma.execution.deleteMany({
        where: {
          workflow: {
            name: {
              contains: "Performance Test",
            },
          },
        },
      });

      await prisma.workflow.deleteMany({
        where: {
          name: {
            contains: "Performance Test",
          },
        },
      });

      await prisma.user.deleteMany({
        where: {
          email: "perf-test@example.com",
        },
      });
    } catch (error) {
      console.warn("Error cleaning up performance test data:", error);
    }
  }
});
