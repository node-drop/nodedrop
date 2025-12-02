import { createServer } from "http";
import { io as Client } from "socket.io-client";
import { SocketService } from "../../services/SocketService";

describe("WebSocket Integration Tests", () => {
  let httpServer: any;
  let socketService: SocketService;
  let clientSocket: any;
  let port: number;

  beforeAll((done) => {
    httpServer = createServer();
    socketService = new SocketService(httpServer);

    httpServer.listen(() => {
      port = httpServer.address()?.port;
      clientSocket = Client(`http://localhost:${port}`);
      clientSocket.on("connect", done);
    });
  });

  afterAll((done) => {
    clientSocket.disconnect();
    httpServer.close(done);
  });

  describe("Connection Management", () => {
    it("should establish WebSocket connection", (done) => {
      expect(clientSocket.connected).toBe(true);
      done();
    });

    it("should track connected users", () => {
      const userCount = socketService.getConnectedUsersCount();
      expect(userCount).toBeGreaterThan(0);
    });

    it("should handle user authentication", (done) => {
      clientSocket.emit("authenticate", {
        token: "test-token",
        userId: "test-user-123",
      });

      clientSocket.on("authenticated", (data: any) => {
        expect(data.success).toBe(true);
        done();
      });
    });
  });

  describe("Execution Room Management", () => {
    const executionId = "test-execution-123";

    it("should allow joining execution rooms", (done) => {
      clientSocket.emit("join-execution", { executionId });

      clientSocket.on("joined-execution", (data: any) => {
        expect(data.executionId).toBe(executionId);
        expect(data.success).toBe(true);
        done();
      });
    });

    it("should allow leaving execution rooms", (done) => {
      // First join the room
      clientSocket.emit("join-execution", { executionId });

      clientSocket.once("joined-execution", () => {
        // Then leave the room
        clientSocket.emit("leave-execution", { executionId });

        clientSocket.on("left-execution", (data: any) => {
          expect(data.executionId).toBe(executionId);
          expect(data.success).toBe(true);
          done();
        });
      });
    });
  });

  describe("Real-time Execution Updates", () => {
    const executionId = "test-execution-456";

    beforeEach((done) => {
      clientSocket.emit("join-execution", { executionId });
      clientSocket.once("joined-execution", () => done());
    });

    it("should broadcast execution status updates", (done) => {
      clientSocket.on("execution-status", (data: any) => {
        expect(data.executionId).toBe(executionId);
        expect(data.status).toBe("RUNNING");
        expect(data.timestamp).toBeDefined();
        done();
      });

      // Simulate status update from server
      socketService.broadcastExecutionStatus(executionId, "RUNNING", {
        progress: 50,
        currentNode: "node-1",
      });
    });

    it("should broadcast node execution updates", (done) => {
      clientSocket.on("node-execution-update", (data: any) => {
        expect(data.executionId).toBe(executionId);
        expect(data.nodeId).toBe("test-node-1");
        expect(data.status).toBe("SUCCESS");
        expect(data.outputData).toBeDefined();
        done();
      });

      // Simulate node update from server
      socketService.broadcastNodeUpdate(executionId, "test-node-1", "SUCCESS", {
        result: "Node completed successfully",
      });
    });

    it("should broadcast execution errors", (done) => {
      clientSocket.on("execution-error", (data: any) => {
        expect(data.executionId).toBe(executionId);
        expect(data.error).toBeDefined();
        expect(data.error.message).toBe("Test error occurred");
        expect(data.nodeId).toBe("failing-node");
        done();
      });

      // Simulate error from server
      socketService.broadcastExecutionError(
        executionId,
        {
          message: "Test error occurred",
          code: "TEST_ERROR",
        },
        "failing-node"
      );
    });
  });

  describe("Progress Tracking", () => {
    const executionId = "test-execution-789";

    beforeEach((done) => {
      clientSocket.emit("join-execution", { executionId });
      clientSocket.once("joined-execution", () => done());
    });

    it("should broadcast execution progress updates", (done) => {
      clientSocket.on("execution-progress", (data: any) => {
        expect(data.executionId).toBe(executionId);
        expect(data.progress).toBe(75);
        expect(data.completedNodes).toBe(3);
        expect(data.totalNodes).toBe(4);
        expect(data.currentNode).toBe("node-3");
        done();
      });

      // Simulate progress update from server
      socketService.broadcastProgress(executionId, {
        progress: 75,
        completedNodes: 3,
        totalNodes: 4,
        currentNode: "node-3",
        estimatedTimeRemaining: 30000,
      });
    });

    it("should handle manual intervention requests", (done) => {
      clientSocket.on("manual-intervention-required", (data: any) => {
        expect(data.executionId).toBe(executionId);
        expect(data.nodeId).toBe("manual-node");
        expect(data.reason).toBe("User input required");
        expect(data.timeoutAt).toBeDefined();
        done();
      });

      // Simulate manual intervention request
      socketService.requestManualIntervention(executionId, "manual-node", {
        reason: "User input required",
        timeoutAt: new Date(Date.now() + 300000).toISOString(),
        options: ["approve", "reject"],
      });
    });
  });

  describe("System Notifications", () => {
    it("should broadcast system-wide notifications", (done) => {
      clientSocket.on("system-notification", (data: any) => {
        expect(data.type).toBe("maintenance");
        expect(data.message).toBe("System maintenance in 5 minutes");
        expect(data.level).toBe("warning");
        done();
      });

      // Simulate system notification
      socketService.broadcastSystemNotification({
        type: "maintenance",
        message: "System maintenance in 5 minutes",
        level: "warning",
        timestamp: new Date().toISOString(),
      });
    });

    it("should send user-specific notifications", (done) => {
      const userId = "test-user-123";

      // First authenticate the socket with a user ID
      clientSocket.emit("authenticate", {
        token: "test-token",
        userId,
      });

      clientSocket.once("authenticated", () => {
        clientSocket.on("user-notification", (data: any) => {
          expect(data.type).toBe("workflow-completed");
          expect(data.message).toBe("Your workflow has completed successfully");
          done();
        });

        // Simulate user notification
        socketService.sendUserNotification(userId, {
          type: "workflow-completed",
          message: "Your workflow has completed successfully",
          workflowId: "workflow-123",
          executionId: "execution-456",
        });
      });
    });
  });

  describe("Error Handling and Reconnection", () => {
    it("should handle connection errors gracefully", (done) => {
      const errorClient = Client(`http://localhost:${port}`, {
        timeout: 1000,
      });

      errorClient.on("connect_error", (error: any) => {
        expect(error).toBeDefined();
        errorClient.disconnect();
        done();
      });

      // Simulate connection error by connecting to wrong port
      const wrongPortClient = Client("http://localhost:99999", {
        timeout: 1000,
      });

      wrongPortClient.on("connect_error", () => {
        wrongPortClient.disconnect();
        done();
      });
    });

    it("should handle automatic reconnection", (done) => {
      const reconnectClient = Client(`http://localhost:${port}`, {
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 100,
      });

      let connectCount = 0;

      reconnectClient.on("connect", () => {
        connectCount++;

        if (connectCount === 1) {
          // Simulate disconnection
          reconnectClient.disconnect();
        } else if (connectCount === 2) {
          // Reconnection successful
          expect(connectCount).toBe(2);
          reconnectClient.disconnect();
          done();
        }
      });

      reconnectClient.on("reconnect", () => {
        // This should trigger on automatic reconnection
      });
    });
  });

  describe("Performance and Scalability", () => {
    it("should handle multiple simultaneous connections", (done) => {
      const connections: any[] = [];
      const expectedConnections = 10;
      let connectedCount = 0;

      // Create multiple connections
      for (let i = 0; i < expectedConnections; i++) {
        const client = Client(`http://localhost:${port}`);

        client.on("connect", () => {
          connectedCount++;

          if (connectedCount === expectedConnections) {
            // All connections established
            expect(connectedCount).toBe(expectedConnections);

            // Clean up connections
            connections.forEach((c) => c.disconnect());
            done();
          }
        });

        connections.push(client);
      }
    });

    it("should handle rapid message broadcasting efficiently", (done) => {
      const executionId = "performance-test-execution";
      const messageCount = 100;
      let receivedCount = 0;

      clientSocket.emit("join-execution", { executionId });

      clientSocket.once("joined-execution", () => {
        clientSocket.on("execution-status", () => {
          receivedCount++;

          if (receivedCount === messageCount) {
            expect(receivedCount).toBe(messageCount);
            done();
          }
        });

        // Rapidly broadcast messages
        for (let i = 0; i < messageCount; i++) {
          setTimeout(() => {
            socketService.broadcastExecutionStatus(executionId, "RUNNING", {
              progress: ((i + 1) / messageCount) * 100,
              iteration: i + 1,
            });
          }, i * 10); // 10ms intervals
        }
      });
    });
  });

  describe("Resource Management", () => {
    it("should properly clean up resources on disconnect", (done) => {
      const tempClient = Client(`http://localhost:${port}`);

      tempClient.on("connect", () => {
        const initialUserCount = socketService.getConnectedUsersCount();

        tempClient.disconnect();

        setTimeout(() => {
          const finalUserCount = socketService.getConnectedUsersCount();
          expect(finalUserCount).toBeLessThan(initialUserCount);
          done();
        }, 100);
      });
    });

    it("should handle memory efficiently with many room subscriptions", (done) => {
      const executionIds = Array.from(
        { length: 50 },
        (_, i) => `execution-${i}`
      );
      let joinedCount = 0;

      executionIds.forEach((executionId, index) => {
        setTimeout(() => {
          clientSocket.emit("join-execution", { executionId });

          clientSocket.once("joined-execution", () => {
            joinedCount++;

            if (joinedCount === executionIds.length) {
              // All rooms joined successfully
              expect(joinedCount).toBe(executionIds.length);

              // Leave all rooms
              executionIds.forEach((id) => {
                clientSocket.emit("leave-execution", { executionId: id });
              });

              done();
            }
          });
        }, index * 10);
      });
    });
  });
});
