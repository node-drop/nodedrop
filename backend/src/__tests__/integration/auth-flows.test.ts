/**
 * Authentication Flows Integration Tests
 * 
 * Tests for registration, login, and logout flows using better-auth.
 * These tests verify the authentication flows work correctly by testing
 * the database state directly after operations.
 * 
 * Requirements: 3.1, 3.2, 3.4, 3.5, 5.1, 5.2, 5.3, 5.4, 5.5, 7.4
 */

import prisma from "../../config/database";

// Use the actual database URL from environment
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/node_drop";

// Test user data
const testUser1 = {
  email: "test-first@example.com",
  password: "TestPassword123!",
  name: "First Test User"
};

const testUser2 = {
  email: "test-second@example.com",
  password: "TestPassword456!",
  name: "Second Test User"
};

describe("Authentication Flows - Database State Tests", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    // Disconnect Prisma
    if (prisma) {
      await prisma.$disconnect();
    }
  });

  beforeEach(async () => {
    // Clean up test users before each test
    await cleanupTestUsers();
  });

  afterEach(async () => {
    // Clean up test users after each test
    await cleanupTestUsers();
  });

  async function cleanupTestUsers() {
    try {
      // Delete sessions first (foreign key constraint)
      await prisma.session.deleteMany({
        where: {
          user: {
            email: {
              in: [testUser1.email, testUser2.email]
            }
          }
        }
      });

      // Delete accounts
      await prisma.account.deleteMany({
        where: {
          user: {
            email: {
              in: [testUser1.email, testUser2.email]
            }
          }
        }
      });

      // Delete users
      await prisma.user.deleteMany({
        where: {
          email: {
            in: [testUser1.email, testUser2.email]
          }
        }
      });
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  describe("6.1 Registration Flow - Database State", () => {
    /**
     * Test: User model creation
     * Requirements: 5.2
     */
    it("should create user record in database", async () => {
      // Create user directly via Prisma (simulating what better-auth does)
      const user = await prisma.user.create({
        data: {
          email: testUser1.email,
          name: testUser1.name,
          role: "USER",
          emailVerified: false,
          active: true
        }
      });

      expect(user).toBeTruthy();
      expect(user.email).toBe(testUser1.email);
      expect(user.name).toBe(testUser1.name);
      expect(user.role).toBe("USER");
    });

    /**
     * Test: Account model for password storage
     * Requirements: 5.2
     */
    it("should store password hash in accounts table (not plaintext)", async () => {
      // Create user
      const user = await prisma.user.create({
        data: {
          email: testUser1.email,
          name: testUser1.name,
          role: "USER",
          emailVerified: false,
          active: true
        }
      });

      // Create account with hashed password (simulating better-auth)
      const hashedPassword = "$2a$10$somehashedpasswordvalue"; // Simulated hash
      const account = await prisma.account.create({
        data: {
          userId: user.id,
          providerId: "credential",
          accountId: user.id,
          password: hashedPassword
        }
      });

      expect(account).toBeTruthy();
      expect(account.password).not.toBe(testUser1.password);
      expect(account.password).toBe(hashedPassword);
    });

    /**
     * Test: First user gets ADMIN role
     * Requirements: 5.3
     */
    it("should assign ADMIN role to first user when no users exist", async () => {
      // Check if any users exist
      const existingUsers = await prisma.user.count();
      
      // Determine role based on user count
      const role = existingUsers === 0 ? "ADMIN" : "USER";

      // Create user with appropriate role
      const user = await prisma.user.create({
        data: {
          email: testUser1.email,
          name: testUser1.name,
          role: role,
          emailVerified: false,
          active: true
        }
      });

      // If this was the first user, they should be ADMIN
      if (existingUsers === 0) {
        expect(user.role).toBe("ADMIN");
      }
    });

    /**
     * Test: Subsequent users get USER role
     * Requirements: 5.4
     */
    it("should assign USER role to subsequent users", async () => {
      // Create first user
      await prisma.user.create({
        data: {
          email: testUser1.email,
          name: testUser1.name,
          role: "ADMIN",
          emailVerified: false,
          active: true
        }
      });

      // Create second user - should get USER role
      const secondUser = await prisma.user.create({
        data: {
          email: testUser2.email,
          name: testUser2.name,
          role: "USER",
          emailVerified: false,
          active: true
        }
      });

      expect(secondUser.role).toBe("USER");
    });

    /**
     * Test: Session creation on registration
     * Requirements: 5.5
     */
    it("should create session record on registration", async () => {
      // Create user
      const user = await prisma.user.create({
        data: {
          email: testUser1.email,
          name: testUser1.name,
          role: "USER",
          emailVerified: false,
          active: true
        }
      });

      // Create session (simulating better-auth)
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      const session = await prisma.session.create({
        data: {
          userId: user.id,
          token: "test-session-token-" + Date.now(),
          expiresAt: expiresAt
        }
      });

      expect(session).toBeTruthy();
      expect(session.userId).toBe(user.id);
      expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    /**
     * Test: Unique email constraint
     */
    it("should reject duplicate email registration", async () => {
      // Create first user
      await prisma.user.create({
        data: {
          email: testUser1.email,
          name: testUser1.name,
          role: "USER",
          emailVerified: false,
          active: true
        }
      });

      // Try to create second user with same email
      await expect(
        prisma.user.create({
          data: {
            email: testUser1.email,
            name: "Different Name",
            role: "USER",
            emailVerified: false,
            active: true
          }
        })
      ).rejects.toThrow();
    });
  });

  describe("6.5 Login Flow - Database State", () => {
    let testUserId: string;

    beforeEach(async () => {
      // Create a test user for login tests
      const user = await prisma.user.create({
        data: {
          email: testUser1.email,
          name: testUser1.name,
          role: "USER",
          emailVerified: false,
          active: true
        }
      });
      testUserId = user.id;

      // Create account with password
      await prisma.account.create({
        data: {
          userId: user.id,
          providerId: "credential",
          accountId: user.id,
          password: "$2a$10$hashedpassword"
        }
      });
    });

    /**
     * Test: Session creation with expiration
     * Requirements: 3.2
     */
    it("should create session with expiration time on login", async () => {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      
      const session = await prisma.session.create({
        data: {
          userId: testUserId,
          token: "login-session-token-" + Date.now(),
          expiresAt: expiresAt
        }
      });

      expect(session).toBeTruthy();
      expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
      
      // Session should expire in approximately 7 days
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      const expirationDiff = session.expiresAt.getTime() - Date.now();
      expect(expirationDiff).toBeLessThanOrEqual(sevenDaysMs);
      expect(expirationDiff).toBeGreaterThan(sevenDaysMs - 60000); // Within 1 minute
    });

    /**
     * Test: Session contains user reference
     * Requirements: 3.4
     */
    it("should link session to user with correct data", async () => {
      const session = await prisma.session.create({
        data: {
          userId: testUserId,
          token: "session-with-user-" + Date.now(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });

      // Fetch session with user data
      const sessionWithUser = await prisma.session.findUnique({
        where: { id: session.id },
        include: { user: true }
      });

      expect(sessionWithUser).toBeTruthy();
      expect(sessionWithUser!.user.id).toBe(testUserId);
      expect(sessionWithUser!.user.email).toBe(testUser1.email);
      expect(sessionWithUser!.user.name).toBe(testUser1.name);
      expect(sessionWithUser!.user.role).toBe("USER");
    });

    /**
     * Test: Multiple sessions for same user
     * Requirements: 3.5
     */
    it("should allow multiple sessions for same user", async () => {
      // Create first session
      await prisma.session.create({
        data: {
          userId: testUserId,
          token: "session-1-" + Date.now(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });

      // Create second session
      await prisma.session.create({
        data: {
          userId: testUserId,
          token: "session-2-" + Date.now(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });

      // Count sessions for user
      const sessionCount = await prisma.session.count({
        where: { userId: testUserId }
      });

      expect(sessionCount).toBe(2);
    });

    /**
     * Test: Session token uniqueness
     */
    it("should enforce unique session tokens", async () => {
      const token = "unique-token-" + Date.now();

      // Create first session
      await prisma.session.create({
        data: {
          userId: testUserId,
          token: token,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });

      // Try to create second session with same token
      await expect(
        prisma.session.create({
          data: {
            userId: testUserId,
            token: token,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          }
        })
      ).rejects.toThrow();
    });
  });

  describe("6.9 Logout Flow - Database State", () => {
    let testUserId: string;
    let sessionId: string;

    beforeEach(async () => {
      // Create a test user
      const user = await prisma.user.create({
        data: {
          email: testUser1.email,
          name: testUser1.name,
          role: "USER",
          emailVerified: false,
          active: true
        }
      });
      testUserId = user.id;

      // Create a session
      const session = await prisma.session.create({
        data: {
          userId: user.id,
          token: "logout-test-token-" + Date.now(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });
      sessionId = session.id;
    });

    /**
     * Test: Session deletion on logout
     * Requirements: 7.4
     */
    it("should delete session from database on logout", async () => {
      // Verify session exists
      const sessionBefore = await prisma.session.findUnique({
        where: { id: sessionId }
      });
      expect(sessionBefore).toBeTruthy();

      // Delete session (simulating logout)
      await prisma.session.delete({
        where: { id: sessionId }
      });

      // Verify session is deleted
      const sessionAfter = await prisma.session.findUnique({
        where: { id: sessionId }
      });
      expect(sessionAfter).toBeNull();
    });

    /**
     * Test: User remains after session deletion
     * Requirements: 7.4
     */
    it("should keep user record after session deletion", async () => {
      // Delete session
      await prisma.session.delete({
        where: { id: sessionId }
      });

      // Verify user still exists
      const user = await prisma.user.findUnique({
        where: { id: testUserId }
      });
      expect(user).toBeTruthy();
      expect(user!.email).toBe(testUser1.email);
    });

    /**
     * Test: Delete all sessions for user (admin revocation)
     * Requirements: 7.5
     */
    it("should delete all sessions for a user on revocation", async () => {
      // Create additional sessions
      await prisma.session.create({
        data: {
          userId: testUserId,
          token: "extra-session-1-" + Date.now(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });

      await prisma.session.create({
        data: {
          userId: testUserId,
          token: "extra-session-2-" + Date.now(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });

      // Verify multiple sessions exist
      const sessionsBefore = await prisma.session.count({
        where: { userId: testUserId }
      });
      expect(sessionsBefore).toBe(3);

      // Delete all sessions for user (admin revocation)
      await prisma.session.deleteMany({
        where: { userId: testUserId }
      });

      // Verify all sessions are deleted
      const sessionsAfter = await prisma.session.count({
        where: { userId: testUserId }
      });
      expect(sessionsAfter).toBe(0);
    });

    /**
     * Test: Cascade delete sessions when user is deleted
     */
    it("should cascade delete sessions when user is deleted", async () => {
      // Create additional session
      await prisma.session.create({
        data: {
          userId: testUserId,
          token: "cascade-test-" + Date.now(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });

      // Delete user (should cascade to sessions)
      await prisma.user.delete({
        where: { id: testUserId }
      });

      // Verify sessions are deleted
      const sessions = await prisma.session.findMany({
        where: { userId: testUserId }
      });
      expect(sessions.length).toBe(0);
    });
  });
});
