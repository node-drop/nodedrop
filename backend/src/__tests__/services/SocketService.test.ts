import { Server as HTTPServer } from "http";
import jwt from "jsonwebtoken";
import { Server as SocketIOServer } from "socket.io";
import { io as Client, Socket as ClientSocket } from "socket.io-client";
import { SocketService } from "../../services/SocketService";

describe("SocketService", () => {
  let httpServer: HTTPServer;
  let socketService: SocketService;
  let clientSocket: ClientSocket;
  let serverPort: number;

  beforeAll((done) => {
    httpServer = new HTTPServer();
    socketService = new SocketService(httpServer);

    httpServer.listen(() => {
      const address = httpServer.address();
      serverPort = typeof address === "object" && address ? address.port : 3001;
      done();
    });
  });

  afterAll((done) => {
    socketService.shutdown().then(() => {
      httpServer.close(done);
    });
  });

  beforeEach(() => {
    // Set up JWT secret for testing
    process.env.JWT_SECRET = "test-secret";
  });

  afterEach((done) => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }
    done();
  });

  describe("Authentication", () => {
    it("should reject connection without token", (done) => {
      clientSocket = Client(`http://localhost:${serverPort}`);

      clientSocket.on("connect_error", (error) => {
        expect(error.message).toContain("Authentication token required");
        done();
      });
    });

    it("should reject connection with invalid token", (done) => {
      clientSocket = Client(`http://localhost:${serverPort}`, {
        auth: { token: "invalid-token" },
      });

      clientSocket.on("connect_error", (error) => {
        expect(error.message).toContain("Invalid authentication token");
        done();
      });
    });

    it("should accept connection with valid token", (done) => {
      const token = jwt.sign(
        { id: "test-user", email: "test@example.com" },
        "test-secret"
      );

      clientSocket = Client(`http://localhost:${serverPort}`, {
        auth: { token },
      });

      clientSocket.on("connect", () => {
        expect(clientSocket.connected).toBe(true);
        done();
      });

      clientSocket.on("connected", (data) => {
        expect(data.id).toBe("test-user");
        expect(data.message).toContain("Successfully connected");
      });
    });
  });

  describe("Execution Subscription", () => {
    let token: string;

    beforeEach(() => {
      token = jwt.sign(
        { id: "test-user", email: "test@example.com" },
        "test-secret"
      );
    });

    it("should handle execution subscription", (done) => {
      clientSocket = Client(`http://localhost:${serverPort}`, {
        auth: { token },
      });

      clientSocket.on("connect", () => {
        clientSocket.emit("subscribe-execution", "test-execution-id");
      });

      clientSocket.on("execution-subscribed", (data) => {
        expect(data.executionId).toBe("test-execution-id");
        expect(data.timestamp).toBeDefined();
        done();
      });
    });

    it("should handle execution unsubscription", (done) => {
      clientSocket = Client(`http://localhost:${serverPort}`, {
        auth: { token },
      });

      clientSocket.on("connect", () => {
        clientSocket.emit("unsubscribe-execution", "test-execution-id");
      });

      clientSocket.on("execution-unsubscribed", (data) => {
        expect(data.executionId).toBe("test-execution-id");
        expect(data.timestamp).toBeDefined();
        done();
      });
    });

    it("should handle workflow subscription", (done) => {
      clientSocket = Client(`http://localhost:${serverPort}`, {
        auth: { token },
      });

      clientSocket.on("connect", () => {
        clientSocket.emit("subscribe-workflow", "test-workflow-id");
      });

      clientSocket.on("workflow-subscribed", (data) => {
        expect(data.workflowId).toBe("test-workflow-id");
        expect(data.timestamp).toBeDefined();
        done();
      });
    });
  });

  describe("Event Broadcasting", () => {
    let token: string;

    beforeEach(() => {
      token = jwt.sign(
        { id: "test-user", email: "test@example.com" },
        "test-secret"
      );
    });

    it("should broadcast execution events to subscribers", (done) => {
      clientSocket = Client(`http://localhost:${serverPort}`, {
        auth: { token },
      });

      const executionId = "test-execution-id";
      const eventData = {
        executionId,
        type: "started" as const,
        timestamp: new Date(),
      };

      clientSocket.on("connect", () => {
        clientSocket.emit("subscribe-execution", executionId);
      });

      clientSocket.on("execution-subscribed", () => {
        // Simulate broadcasting an event
        socketService.broadcastExecutionEvent(executionId, eventData);
      });

      clientSocket.on("execution-event", (data) => {
        expect(data.executionId).toBe(executionId);
        expect(data.type).toBe("started");
        expect(data.timestamp).toBeDefined();
        done();
      });
    });

    it("should broadcast execution progress to subscribers", (done) => {
      clientSocket = Client(`http://localhost:${serverPort}`, {
        auth: { token },
      });

      const executionId = "test-execution-id";
      const progressData = {
        executionId,
        totalNodes: 5,
        completedNodes: 2,
        failedNodes: 0,
        status: "running" as const,
        startedAt: new Date(),
      };

      clientSocket.on("connect", () => {
        clientSocket.emit("subscribe-execution", executionId);
      });

      clientSocket.on("execution-subscribed", () => {
        socketService.broadcastExecutionProgress(executionId, progressData);
      });

      clientSocket.on("execution-progress", (data) => {
        expect(data.executionId).toBe(executionId);
        expect(data.totalNodes).toBe(5);
        expect(data.completedNodes).toBe(2);
        expect(data.status).toBe("running");
        done();
      });
    });

    it("should broadcast node execution events to subscribers", (done) => {
      clientSocket = Client(`http://localhost:${serverPort}`, {
        auth: { token },
      });

      const executionId = "test-execution-id";
      const nodeId = "test-node-id";

      clientSocket.on("connect", () => {
        clientSocket.emit("subscribe-execution", executionId);
      });

      clientSocket.on("execution-subscribed", () => {
        socketService.broadcastNodeExecutionEvent(
          executionId,
          nodeId,
          "started"
        );
      });

      clientSocket.on("node-execution-event", (data) => {
        expect(data.executionId).toBe(executionId);
        expect(data.nodeId).toBe(nodeId);
        expect(data.type).toBe("started");
        expect(data.timestamp).toBeDefined();
        done();
      });
    });
  });

  describe("Service Management", () => {
    it("should track connected users count", () => {
      const count = socketService.getConnectedUsersCount();
      expect(typeof count).toBe("number");
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it("should track execution subscribers count", () => {
      const count =
        socketService.getExecutionSubscribersCount("test-execution-id");
      expect(typeof count).toBe("number");
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it("should provide server instance", () => {
      const server = socketService.getServer();
      expect(server).toBeInstanceOf(SocketIOServer);
    });
  });
});
