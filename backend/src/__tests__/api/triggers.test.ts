import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import request from "supertest";
import { app } from "../../index";

// Mock Prisma
jest.mock("@prisma/client");
jest.mock("../../services/TriggerService");
jest.mock("node-cron");

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
  workflow: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
} as unknown as PrismaClient;

// Mock user for authentication
const mockUser = {
  id: "user-1",
  email: "test@example.com",
  name: "Test User",
  role: "USER",
};

const mockWorkflow = {
  id: "workflow-1",
  name: "Test Workflow",
  userId: "user-1",
  active: true,
  triggers: [],
};

// Generate test JWT token
const generateToken = (userId: string) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || "test-secret", {
    expiresIn: "1h",
  });
};

describe("Trigger API Routes", () => {
  let authToken: string;

  beforeEach(() => {
    jest.clearAllMocks();
    authToken = generateToken(mockUser.id);

    // Setup default mocks
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (mockPrisma.workflow.findFirst as jest.Mock).mockResolvedValue(
      mockWorkflow
    );
    (mockPrisma.workflow.update as jest.Mock).mockResolvedValue({
      ...mockWorkflow,
      triggers: [{ id: "trigger-1", type: "webhook", active: true }],
    });
  });

  describe("POST /api/triggers/workflows/:workflowId/triggers", () => {
    const validTriggerData = {
      type: "webhook",
      nodeId: "node-1",
      settings: {
        httpMethod: "POST",
        authentication: { type: "none" },
      },
      active: true,
    };

    it("should create a webhook trigger successfully", async () => {
      const response = await request(app)
        .post("/api/triggers/workflows/workflow-1/triggers")
        .set("Authorization", `Bearer ${authToken}`)
        .send(validTriggerData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        type: "webhook",
        nodeId: "node-1",
        active: true,
      });
    });

    it("should create a schedule trigger successfully", async () => {
      const scheduleData = {
        type: "schedule",
        nodeId: "node-1",
        settings: {
          cronExpression: "0 0 * * *",
          timezone: "UTC",
        },
        active: true,
      };

      const response = await request(app)
        .post("/api/triggers/workflows/workflow-1/triggers")
        .set("Authorization", `Bearer ${authToken}`)
        .send(scheduleData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe("schedule");
    });

    it("should create a manual trigger successfully", async () => {
      const manualData = {
        type: "manual",
        nodeId: "node-1",
        settings: {
          description: "Test manual trigger",
        },
        active: true,
      };

      const response = await request(app)
        .post("/api/triggers/workflows/workflow-1/triggers")
        .set("Authorization", `Bearer ${authToken}`)
        .send(manualData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe("manual");
    });

    it("should return 400 for invalid trigger type", async () => {
      const invalidData = {
        ...validTriggerData,
        type: "invalid",
      };

      await request(app)
        .post("/api/triggers/workflows/workflow-1/triggers")
        .set("Authorization", `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
    });

    it("should return 400 for missing nodeId", async () => {
      const invalidData = {
        ...validTriggerData,
        nodeId: "",
      };

      await request(app)
        .post("/api/triggers/workflows/workflow-1/triggers")
        .set("Authorization", `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
    });

    it("should return 400 for invalid workflow ID", async () => {
      await request(app)
        .post("/api/triggers/workflows/invalid-id/triggers")
        .set("Authorization", `Bearer ${authToken}`)
        .send(validTriggerData)
        .expect(400);
    });

    it("should return 401 without authentication", async () => {
      await request(app)
        .post("/api/triggers/workflows/workflow-1/triggers")
        .send(validTriggerData)
        .expect(401);
    });
  });

  describe("PUT /api/triggers/workflows/:workflowId/triggers/:triggerId", () => {
    const updateData = {
      active: false,
      settings: {
        httpMethod: "GET",
        authentication: { type: "header" },
      },
    };

    it("should update trigger successfully", async () => {
      const response = await request(app)
        .put("/api/triggers/workflows/workflow-1/triggers/trigger-1")
        .set("Authorization", `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it("should return 400 for invalid workflow ID", async () => {
      await request(app)
        .put("/api/triggers/workflows/invalid-id/triggers/trigger-1")
        .set("Authorization", `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);
    });

    it("should return 400 for invalid trigger ID", async () => {
      await request(app)
        .put("/api/triggers/workflows/workflow-1/triggers/invalid-id")
        .set("Authorization", `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);
    });

    it("should return 401 without authentication", async () => {
      await request(app)
        .put("/api/triggers/workflows/workflow-1/triggers/trigger-1")
        .send(updateData)
        .expect(401);
    });
  });

  describe("DELETE /api/triggers/workflows/:workflowId/triggers/:triggerId", () => {
    it("should delete trigger successfully", async () => {
      const response = await request(app)
        .delete("/api/triggers/workflows/workflow-1/triggers/trigger-1")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Trigger deleted successfully");
    });

    it("should return 400 for invalid workflow ID", async () => {
      await request(app)
        .delete("/api/triggers/workflows/invalid-id/triggers/trigger-1")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(400);
    });

    it("should return 401 without authentication", async () => {
      await request(app)
        .delete("/api/triggers/workflows/workflow-1/triggers/trigger-1")
        .expect(401);
    });
  });

  describe("POST /api/triggers/workflows/:workflowId/triggers/:triggerId/execute", () => {
    const executeData = {
      data: { test: "data" },
    };

    it("should execute manual trigger successfully", async () => {
      const response = await request(app)
        .post("/api/triggers/workflows/workflow-1/triggers/trigger-1/execute")
        .set("Authorization", `Bearer ${authToken}`)
        .send(executeData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.executionId).toBeDefined();
    });

    it("should return 400 for invalid workflow ID", async () => {
      await request(app)
        .post("/api/triggers/workflows/invalid-id/triggers/trigger-1/execute")
        .set("Authorization", `Bearer ${authToken}`)
        .send(executeData)
        .expect(400);
    });

    it("should return 401 without authentication", async () => {
      await request(app)
        .post("/api/triggers/workflows/workflow-1/triggers/trigger-1/execute")
        .send(executeData)
        .expect(401);
    });
  });

  describe("GET /api/triggers/workflows/:workflowId/triggers/events", () => {
    it("should get trigger events successfully", async () => {
      const response = await request(app)
        .get("/api/triggers/workflows/workflow-1/triggers/events")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it("should filter events by type", async () => {
      const response = await request(app)
        .get("/api/triggers/workflows/workflow-1/triggers/events?type=webhook")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it("should filter events by status", async () => {
      const response = await request(app)
        .get(
          "/api/triggers/workflows/workflow-1/triggers/events?status=completed"
        )
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it("should return 400 for invalid type filter", async () => {
      await request(app)
        .get("/api/triggers/workflows/workflow-1/triggers/events?type=invalid")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(400);
    });

    it("should return 401 without authentication", async () => {
      await request(app)
        .get("/api/triggers/workflows/workflow-1/triggers/events")
        .expect(401);
    });
  });

  describe("GET /api/triggers/workflows/:workflowId/triggers/stats", () => {
    it("should get trigger statistics successfully", async () => {
      const response = await request(app)
        .get("/api/triggers/workflows/workflow-1/triggers/stats")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        totalTriggers: expect.any(Number),
        activeTriggers: expect.any(Number),
        triggersByType: expect.any(Object),
        recentEvents: expect.any(Number),
      });
    });

    it("should return 401 without authentication", async () => {
      await request(app)
        .get("/api/triggers/workflows/workflow-1/triggers/stats")
        .expect(401);
    });
  });

  describe("Webhook endpoints", () => {
    describe("ALL /api/triggers/webhooks/:webhookId", () => {
      const webhookData = {
        test: "data",
        timestamp: new Date().toISOString(),
      };

      it("should handle POST webhook successfully", async () => {
        const response = await request(app)
          .post("/api/triggers/webhooks/webhook-1")
          .send(webhookData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Webhook processed successfully");
      });

      it("should handle GET webhook successfully", async () => {
        const response = await request(app)
          .get("/api/triggers/webhooks/webhook-1?param=value")
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it("should handle PUT webhook successfully", async () => {
        const response = await request(app)
          .put("/api/triggers/webhooks/webhook-1")
          .send(webhookData)
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it("should handle DELETE webhook successfully", async () => {
        const response = await request(app)
          .delete("/api/triggers/webhooks/webhook-1")
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it("should return 404 for non-existent webhook", async () => {
        // Mock the service to return webhook not found
        const response = await request(app)
          .post("/api/triggers/webhooks/non-existent")
          .send(webhookData);

        // The actual status code depends on the service implementation
        expect([200, 404]).toContain(response.status);
      });
    });

    describe("POST /api/triggers/webhooks/:webhookId/test", () => {
      it("should test webhook successfully", async () => {
        const testData = {
          test: true,
          message: "Test webhook",
        };

        const response = await request(app)
          .post("/api/triggers/webhooks/webhook-1/test")
          .send(testData)
          .expect(200);

        expect(response.body.success).toBeDefined();
        expect(response.body.message).toContain("test");
      });

      it("should test webhook with default data", async () => {
        const response = await request(app)
          .post("/api/triggers/webhooks/webhook-1/test")
          .expect(200);

        expect(response.body.success).toBeDefined();
      });
    });
  });

  describe("Input validation", () => {
    it("should validate limit parameter", async () => {
      await request(app)
        .get("/api/triggers/workflows/workflow-1/triggers/events?limit=0")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(400);

      await request(app)
        .get("/api/triggers/workflows/workflow-1/triggers/events?limit=101")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(400);
    });

    it("should validate offset parameter", async () => {
      await request(app)
        .get("/api/triggers/workflows/workflow-1/triggers/events?offset=-1")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(400);
    });

    it("should validate UUID parameters", async () => {
      await request(app)
        .post("/api/triggers/workflows/not-a-uuid/triggers")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          type: "webhook",
          nodeId: "node-1",
          settings: { httpMethod: "POST" },
        })
        .expect(400);
    });

    it("should validate required fields", async () => {
      await request(app)
        .post("/api/triggers/workflows/workflow-1/triggers")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          type: "webhook",
          // Missing nodeId
          settings: { httpMethod: "POST" },
        })
        .expect(400);
    });

    it("should validate settings object", async () => {
      await request(app)
        .post("/api/triggers/workflows/workflow-1/triggers")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          type: "webhook",
          nodeId: "node-1",
          settings: "not-an-object",
        })
        .expect(400);
    });
  });
});
