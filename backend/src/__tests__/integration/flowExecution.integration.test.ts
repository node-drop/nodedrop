import { PrismaClient } from "@prisma/client";
import { createServer } from "http";
import { io as Client } from "socket.io-client";
import request from "supertest";
import app from "../../index";

describe("Flow Execution System Integration Tests", () => {
  let server: any;
  let httpServer: any;
  let prisma: PrismaClient;
  let clientSocket: any;
  let authToken: string;
  let testWorkflowId: string;
  let testExecutionId: string;

  beforeAll(async () => {
    // Set up test environment
    process.env.NODE_ENV = "test";
    process.env.DATABASE_URL =
      process.env.TEST_DATABASE_URL ||
      "postgresql://test:test@localhost:5432/nd_test";

    prisma = new PrismaClient();
    await prisma.$connect();

    // Clean up test data
    await cleanupTestData();

    // Create test server
    httpServer = createServer(app);
    server = httpServer.listen(0); // Use random port

    const port = server.address()?.port;

    // Set up Socket.IO client
    clientSocket = Client(`http://localhost:${port}`);

    // Create test user and get auth token
    authToken = await createTestUser();

    // Create test workflow
    testWorkflowId = await createTestWorkflow();
  });

  afterAll(async () => {
    // Clean up
    clientSocket.disconnect();
    server.close();
    await cleanupTestData();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Reset test data before each test
    await resetTestExecution();
  });

  describe("Flow Execution API Endpoints", () => {
    describe("POST /api/flow-execution/start", () => {
      it("should start a new flow execution", async () => {
        const response = await request(app)
          .post("/api/flow-execution/start")
          .set("Authorization", `Bearer ${authToken}`)
          .send({
            workflowId: testWorkflowId,
            triggerData: { test: "data" },
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.executionId).toBeDefined();
        expect(response.body.data.status).toBe("RUNNING");

        testExecutionId = response.body.data.executionId;
      });

      it("should return 400 for missing workflowId", async () => {
        const response = await request(app)
          .post("/api/flow-execution/start")
          .set("Authorization", `Bearer ${authToken}`)
          .send({
            triggerData: { test: "data" },
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain("workflowId");
      });

      it("should return 401 without authentication", async () => {
        const response = await request(app)
          .post("/api/flow-execution/start")
          .send({
            workflowId: testWorkflowId,
            triggerData: { test: "data" },
          });

        expect(response.status).toBe(401);
      });
    });

    describe("POST /api/flow-execution/cancel", () => {
      it("should cancel a running execution", async () => {
        // Start execution first
        const startResponse = await request(app)
          .post("/api/flow-execution/start")
          .set("Authorization", `Bearer ${authToken}`)
          .send({
            workflowId: testWorkflowId,
            triggerData: { test: "data" },
          });

        const executionId = startResponse.body.data.executionId;

        // Cancel execution
        const cancelResponse = await request(app)
          .post("/api/flow-execution/cancel")
          .set("Authorization", `Bearer ${authToken}`)
          .send({ executionId });

        expect(cancelResponse.status).toBe(200);
        expect(cancelResponse.body.success).toBe(true);
        expect(cancelResponse.body.data.cancelled).toBe(true);
      });
    });

    describe("GET /api/flow-execution/status/:executionId", () => {
      it("should return execution status", async () => {
        // Start execution first
        const startResponse = await request(app)
          .post("/api/flow-execution/start")
          .set("Authorization", `Bearer ${authToken}`)
          .send({
            workflowId: testWorkflowId,
            triggerData: { test: "data" },
          });

        const executionId = startResponse.body.data.executionId;

        // Get status
        const statusResponse = await request(app)
          .get(`/api/flow-execution/status/${executionId}`)
          .set("Authorization", `Bearer ${authToken}`);

        expect(statusResponse.status).toBe(200);
        expect(statusResponse.body.success).toBe(true);
        expect(statusResponse.body.data.execution).toBeDefined();
        expect(statusResponse.body.data.execution.id).toBe(executionId);
      });
    });
  });

  describe("Execution Control API Endpoints", () => {
    describe("POST /api/execution-control/request-intervention", () => {
      it("should request manual intervention", async () => {
        // Start execution first
        const startResponse = await request(app)
          .post("/api/flow-execution/start")
          .set("Authorization", `Bearer ${authToken}`)
          .send({
            workflowId: testWorkflowId,
            triggerData: { test: "data" },
          });

        const executionId = startResponse.body.data.executionId;

        // Request intervention
        const response = await request(app)
          .post("/api/execution-control/request-intervention")
          .set("Authorization", `Bearer ${authToken}`)
          .send({
            executionId,
            reason: "Test intervention",
            nodeId: "test-node",
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.requested).toBe(true);
      });
    });

    describe("GET /api/execution-control/pending-interventions", () => {
      it("should return pending interventions", async () => {
        const response = await request(app)
          .get("/api/execution-control/pending-interventions")
          .set("Authorization", `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data.interventions)).toBe(true);
      });
    });
  });

  describe("Execution History API Endpoints", () => {
    describe("GET /api/execution-history/query", () => {
      it("should return execution history with filters", async () => {
        const response = await request(app)
          .get("/api/execution-history/query")
          .set("Authorization", `Bearer ${authToken}`)
          .query({
            workflowId: testWorkflowId,
            limit: 10,
            offset: 0,
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data.executions)).toBe(true);
        expect(response.body.data.pagination).toBeDefined();
      });
    });

    describe("GET /api/execution-history/analytics", () => {
      it("should return execution analytics", async () => {
        const response = await request(app)
          .get("/api/execution-history/analytics")
          .set("Authorization", `Bearer ${authToken}`)
          .query({ days: 7 });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.summary).toBeDefined();
        expect(response.body.data.trends).toBeDefined();
      });
    });
  });

  describe("Execution Recovery API Endpoints", () => {
    describe("POST /api/execution-recovery/analyze", () => {
      it("should analyze execution failure", async () => {
        const response = await request(app)
          .post("/api/execution-recovery/analyze")
          .set("Authorization", `Bearer ${authToken}`)
          .send({
            executionId: "test-execution-id",
            error: {
              message: "Test error",
              code: "TEST_ERROR",
            },
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.analysis).toBeDefined();
        expect(response.body.data.analysis.errorType).toBeDefined();
        expect(response.body.data.analysis.suggestedStrategy).toBeDefined();
      });
    });

    describe("POST /api/execution-recovery/recover", () => {
      it("should attempt execution recovery", async () => {
        const response = await request(app)
          .post("/api/execution-recovery/recover")
          .set("Authorization", `Bearer ${authToken}`)
          .send({
            executionId: "test-execution-id",
            strategy: {
              type: "retry",
              retryConfig: {
                maxRetries: 2,
                retryDelay: 1000,
              },
            },
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.strategy).toBeDefined();
      });
    });
  });

  describe("WebSocket Communication", () => {
    it("should receive execution status updates via WebSocket", (done) => {
      clientSocket.emit("join-execution", { executionId: "test-execution" });

      clientSocket.on("execution-status", (data: any) => {
        expect(data.executionId).toBe("test-execution");
        expect(data.status).toBeDefined();
        done();
      });

      // Simulate status update
      setTimeout(() => {
        clientSocket.emit("test-status-update", {
          executionId: "test-execution",
          status: "RUNNING",
        });
      }, 100);
    });

    it("should receive node execution updates via WebSocket", (done) => {
      clientSocket.emit("join-execution", { executionId: "test-execution" });

      clientSocket.on("node-execution-update", (data: any) => {
        expect(data.executionId).toBe("test-execution");
        expect(data.nodeId).toBeDefined();
        expect(data.status).toBeDefined();
        done();
      });

      // Simulate node update
      setTimeout(() => {
        clientSocket.emit("test-node-update", {
          executionId: "test-execution",
          nodeId: "test-node",
          status: "SUCCESS",
        });
      }, 100);
    });
  });

  describe("Error Handling and Recovery", () => {
    it("should handle network errors gracefully", async () => {
      // Mock a network error scenario
      const response = await request(app)
        .post("/api/execution-recovery/analyze")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          executionId: "test-execution-id",
          error: {
            code: "ENOTFOUND",
            message: "Network error occurred",
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.analysis.category).toBe("transient");
      expect(response.body.data.analysis.isRetryable).toBe(true);
    });

    it("should handle authentication errors properly", async () => {
      const response = await request(app)
        .post("/api/execution-recovery/analyze")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          executionId: "test-execution-id",
          error: {
            status: 401,
            message: "Authentication failed",
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.analysis.category).toBe("configuration");
      expect(response.body.data.analysis.isRetryable).toBe(false);
    });
  });

  describe("System Performance and Reliability", () => {
    it("should handle concurrent executions", async () => {
      const concurrentRequests = Array.from({ length: 5 }, () =>
        request(app)
          .post("/api/flow-execution/start")
          .set("Authorization", `Bearer ${authToken}`)
          .send({
            workflowId: testWorkflowId,
            triggerData: { test: "concurrent" },
          })
      );

      const responses = await Promise.all(concurrentRequests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.executionId).toBeDefined();
      });

      // Verify all executions are unique
      const executionIds = responses.map((r) => r.body.data.executionId);
      const uniqueIds = new Set(executionIds);
      expect(uniqueIds.size).toBe(executionIds.length);
    });

    it("should maintain system stability under load", async () => {
      const loadRequests = Array.from({ length: 20 }, (_, i) =>
        request(app)
          .get("/api/execution-history/analytics")
          .set("Authorization", `Bearer ${authToken}`)
          .query({ days: 1 })
      );

      const responses = await Promise.all(loadRequests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });

  // Helper functions
  async function createTestUser(): Promise<string> {
    const response = await request(app).post("/api/auth/register").send({
      email: "test@example.com",
      password: "testpass123",
      name: "Test User",
    });

    if (response.status === 200) {
      return response.body.data.token;
    }

    // If user already exists, try to login
    const loginResponse = await request(app).post("/api/auth/login").send({
      email: "test@example.com",
      password: "testpass123",
    });

    return loginResponse.body.data.token;
  }

  async function createTestWorkflow(): Promise<string> {
    const response = await request(app)
      .post("/api/workflows")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        name: "Test Workflow",
        description: "Test workflow for integration tests",
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

  async function cleanupTestData(): Promise<void> {
    try {
      // Clean up test executions
      await prisma.nodeExecution.deleteMany({
        where: {
          execution: {
            workflow: {
              name: "Test Workflow",
            },
          },
        },
      });

      await prisma.execution.deleteMany({
        where: {
          workflow: {
            name: "Test Workflow",
          },
        },
      });

      // Clean up test workflows
      await prisma.workflow.deleteMany({
        where: {
          name: "Test Workflow",
        },
      });

      // Clean up test users
      await prisma.user.deleteMany({
        where: {
          email: "test@example.com",
        },
      });
    } catch (error) {
      console.warn("Error cleaning up test data:", error);
    }
  }

  async function resetTestExecution(): Promise<void> {
    if (testExecutionId) {
      try {
        await prisma.execution.update({
          where: { id: testExecutionId },
          data: { status: "CANCELLED" },
        });
      } catch (error) {
        // Execution may not exist, ignore error
      }
    }
  }
});
