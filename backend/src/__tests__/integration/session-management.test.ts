/**
 * Session Management Integration Tests
 * 
 * Tests for session expiration handling, admin session revocation,
 * and role update propagation.
 * 
 * Requirements: 7.3, 7.5, 4.4, 9.4
 */

import prisma from "../../config/database";

// Use the actual database URL from environment
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/node_drop";

// Test user data
const testUser1 = {
  email: "session-test-user1@example.com",
  password: "TestPassword123!",
  name: "Session Test User 1"
};

const testUser2 = {
  email: "session-test-user2@example.com",
  password: "TestPassword456!",
  name: "Session Test User 2"
};

const adminUser = {
  email: "session-test-admin@example.com",
  password: "AdminPassword123!",
  name: "Session Test Admin"
};

describe("Session Management - Database State Tests", () => {
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
              in: [testUser1.email, testUser2.email, adminUser.email]
            }
          }
        }
      });

      // Delete accounts
      await prisma.account.deleteMany({
        where: {
          user: {
            email: {
              in: [testUser1.email, testUser2.email, adminUser.email]
            }
          }
        }
      });

      // Delete users
      await prisma.user.deleteMany({
        where: {
          email: {
            in: [testUser1.email, testUser2.email, adminUser.email]
          }
        }
      });
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  describe("9.1 Session Expiration Handling", () => {
    let testUserId: string;

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
    });

    /**
     * Test: Expired sessions are identified correctly
     * Requirements: 7.3
     */
    it("should identify expired sessions based on expiresAt timestamp", async () => {
      // Create an expired session (expired 1 hour ago)
      const expiredAt = new Date(Date.now() - 60 * 60 * 1000);
      const expiredSession = await prisma.session.create({
        data: {
          userId: testUserId,
          token: "expired-session-token-" + Date.now(),
          expiresAt: expiredAt
        }
      });

      // Verify session exists
      const session = await prisma.session.findUnique({
        where: { id: expiredSession.id }
      });
      expect(session).toBeTruthy();

      // Check if session is expired
      const isExpired = session!.expiresAt < new Date();
      expect(isExpired).toBe(true);
    });

    /**
     * Test: Valid sessions are not expired
     * Requirements: 7.3
     */
    it("should identify valid sessions as not expired", async () => {
      // Create a valid session (expires in 7 days)
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const validSession = await prisma.session.create({
        data: {
          userId: testUserId,
          token: "valid-session-token-" + Date.now(),
          expiresAt: expiresAt
        }
      });

      // Verify session exists
      const session = await prisma.session.findUnique({
        where: { id: validSession.id }
      });
      expect(session).toBeTruthy();

      // Check if session is not expired
      const isExpired = session!.expiresAt < new Date();
      expect(isExpired).toBe(false);
    });

    /**
     * Test: Session validation checks expiration
     * Requirements: 9.4
     */
    it("should validate session expiration during authentication check", async () => {
      // Create an expired session
      const expiredAt = new Date(Date.now() - 60 * 60 * 1000);
      const expiredSession = await prisma.session.create({
        data: {
          userId: testUserId,
          token: "auth-check-expired-" + Date.now(),
          expiresAt: expiredAt
        }
      });

      // Simulate authentication check - find session and verify expiration
      const session = await prisma.session.findUnique({
        where: { token: expiredSession.token },
        include: { user: true }
      });

      expect(session).toBeTruthy();
      
      // Authentication should fail for expired session
      const isAuthenticated = session !== null && session.expiresAt >= new Date();
      expect(isAuthenticated).toBe(false);
    });

    /**
     * Test: Valid session passes authentication check
     * Requirements: 9.4
     */
    it("should pass authentication check for valid session", async () => {
      // Create a valid session
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const validSession = await prisma.session.create({
        data: {
          userId: testUserId,
          token: "auth-check-valid-" + Date.now(),
          expiresAt: expiresAt
        }
      });

      // Simulate authentication check
      const session = await prisma.session.findUnique({
        where: { token: validSession.token },
        include: { user: true }
      });

      expect(session).toBeTruthy();
      
      // Authentication should pass for valid session
      const isAuthenticated = session !== null && session.expiresAt >= new Date();
      expect(isAuthenticated).toBe(true);
    });

    /**
     * Test: Expired sessions can be cleaned up
     * Requirements: 7.3
     */
    it("should allow cleanup of expired sessions", async () => {
      // Create multiple sessions - some expired, some valid
      const expiredAt = new Date(Date.now() - 60 * 60 * 1000);
      const validExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await prisma.session.createMany({
        data: [
          { userId: testUserId, token: "expired-1-" + Date.now(), expiresAt: expiredAt },
          { userId: testUserId, token: "expired-2-" + Date.now(), expiresAt: expiredAt },
          { userId: testUserId, token: "valid-1-" + Date.now(), expiresAt: validExpiresAt }
        ]
      });

      // Count sessions before cleanup
      const beforeCount = await prisma.session.count({
        where: { userId: testUserId }
      });
      expect(beforeCount).toBe(3);

      // Delete expired sessions
      await prisma.session.deleteMany({
        where: {
          userId: testUserId,
          expiresAt: { lt: new Date() }
        }
      });

      // Count sessions after cleanup
      const afterCount = await prisma.session.count({
        where: { userId: testUserId }
      });
      expect(afterCount).toBe(1);
    });
  });


  describe("9.3 Admin Session Revocation", () => {
    let adminUserId: string;
    let targetUserId: string;

    beforeEach(async () => {
      // Create admin user
      const admin = await prisma.user.create({
        data: {
          email: adminUser.email,
          name: adminUser.name,
          role: "ADMIN",
          emailVerified: false,
          active: true
        }
      });
      adminUserId = admin.id;

      // Create target user
      const targetUser = await prisma.user.create({
        data: {
          email: testUser1.email,
          name: testUser1.name,
          role: "USER",
          emailVerified: false,
          active: true
        }
      });
      targetUserId = targetUser.id;
    });

    /**
     * Test: Admin can revoke all sessions for a user
     * Requirements: 7.5
     */
    it("should allow admin to revoke all sessions for a target user", async () => {
      // Create multiple sessions for target user
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await prisma.session.createMany({
        data: [
          { userId: targetUserId, token: "target-session-1-" + Date.now(), expiresAt },
          { userId: targetUserId, token: "target-session-2-" + Date.now(), expiresAt },
          { userId: targetUserId, token: "target-session-3-" + Date.now(), expiresAt }
        ]
      });

      // Verify sessions exist
      const beforeCount = await prisma.session.count({
        where: { userId: targetUserId }
      });
      expect(beforeCount).toBe(3);

      // Admin revokes all sessions for target user
      const deleteResult = await prisma.session.deleteMany({
        where: { userId: targetUserId }
      });

      expect(deleteResult.count).toBe(3);

      // Verify all sessions are deleted
      const afterCount = await prisma.session.count({
        where: { userId: targetUserId }
      });
      expect(afterCount).toBe(0);
    });

    /**
     * Test: Admin revocation doesn't affect other users' sessions
     * Requirements: 7.5
     */
    it("should not affect other users' sessions when revoking one user", async () => {
      // Create second target user
      const otherUser = await prisma.user.create({
        data: {
          email: testUser2.email,
          name: testUser2.name,
          role: "USER",
          emailVerified: false,
          active: true
        }
      });

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      // Create sessions for both users
      await prisma.session.createMany({
        data: [
          { userId: targetUserId, token: "target-user-session-" + Date.now(), expiresAt },
          { userId: otherUser.id, token: "other-user-session-" + Date.now(), expiresAt }
        ]
      });

      // Revoke sessions for target user only
      await prisma.session.deleteMany({
        where: { userId: targetUserId }
      });

      // Verify target user has no sessions
      const targetSessions = await prisma.session.count({
        where: { userId: targetUserId }
      });
      expect(targetSessions).toBe(0);

      // Verify other user still has sessions
      const otherSessions = await prisma.session.count({
        where: { userId: otherUser.id }
      });
      expect(otherSessions).toBe(1);
    });

    /**
     * Test: Admin can deactivate user account
     * Requirements: 7.5
     */
    it("should allow admin to deactivate user account", async () => {
      // Verify user is active
      const userBefore = await prisma.user.findUnique({
        where: { id: targetUserId }
      });
      expect(userBefore!.active).toBe(true);

      // Admin deactivates user
      await prisma.user.update({
        where: { id: targetUserId },
        data: { active: false }
      });

      // Verify user is deactivated
      const userAfter = await prisma.user.findUnique({
        where: { id: targetUserId }
      });
      expect(userAfter!.active).toBe(false);
    });

    /**
     * Test: Deactivated user sessions should be invalidated
     * Requirements: 7.5
     */
    it("should invalidate sessions when user is deactivated", async () => {
      // Create session for target user
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const session = await prisma.session.create({
        data: {
          userId: targetUserId,
          token: "deactivation-test-" + Date.now(),
          expiresAt
        }
      });

      // Deactivate user and delete all their sessions
      await prisma.$transaction([
        prisma.user.update({
          where: { id: targetUserId },
          data: { active: false }
        }),
        prisma.session.deleteMany({
          where: { userId: targetUserId }
        })
      ]);

      // Verify user is deactivated
      const user = await prisma.user.findUnique({
        where: { id: targetUserId }
      });
      expect(user!.active).toBe(false);

      // Verify sessions are deleted
      const sessionCount = await prisma.session.count({
        where: { userId: targetUserId }
      });
      expect(sessionCount).toBe(0);
    });
  });

  describe("9.5 Role Update Propagation", () => {
    let testUserId: string;

    beforeEach(async () => {
      // Create a test user with USER role
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
    });

    /**
     * Test: Role update is persisted in database
     * Requirements: 4.4
     */
    it("should persist role update in database", async () => {
      // Verify initial role
      const userBefore = await prisma.user.findUnique({
        where: { id: testUserId }
      });
      expect(userBefore!.role).toBe("USER");

      // Update role to ADMIN
      await prisma.user.update({
        where: { id: testUserId },
        data: { role: "ADMIN" }
      });

      // Verify role is updated
      const userAfter = await prisma.user.findUnique({
        where: { id: testUserId }
      });
      expect(userAfter!.role).toBe("ADMIN");
    });

    /**
     * Test: Session validation uses current role from database
     * Requirements: 4.4
     */
    it("should use updated role in subsequent session validations", async () => {
      // Create a session
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const session = await prisma.session.create({
        data: {
          userId: testUserId,
          token: "role-update-test-" + Date.now(),
          expiresAt
        }
      });

      // Verify initial role via session lookup
      const sessionWithUser1 = await prisma.session.findUnique({
        where: { id: session.id },
        include: { user: true }
      });
      expect(sessionWithUser1!.user.role).toBe("USER");

      // Update user role
      await prisma.user.update({
        where: { id: testUserId },
        data: { role: "ADMIN" }
      });

      // Verify updated role via session lookup (same session)
      const sessionWithUser2 = await prisma.session.findUnique({
        where: { id: session.id },
        include: { user: true }
      });
      expect(sessionWithUser2!.user.role).toBe("ADMIN");
    });

    /**
     * Test: Role downgrade is reflected in session
     * Requirements: 4.4
     */
    it("should reflect role downgrade in session validation", async () => {
      // Set user as ADMIN first
      await prisma.user.update({
        where: { id: testUserId },
        data: { role: "ADMIN" }
      });

      // Create a session
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const session = await prisma.session.create({
        data: {
          userId: testUserId,
          token: "role-downgrade-test-" + Date.now(),
          expiresAt
        }
      });

      // Verify ADMIN role
      const sessionWithAdmin = await prisma.session.findUnique({
        where: { id: session.id },
        include: { user: true }
      });
      expect(sessionWithAdmin!.user.role).toBe("ADMIN");

      // Downgrade to USER
      await prisma.user.update({
        where: { id: testUserId },
        data: { role: "USER" }
      });

      // Verify USER role via same session
      const sessionWithUser = await prisma.session.findUnique({
        where: { id: session.id },
        include: { user: true }
      });
      expect(sessionWithUser!.user.role).toBe("USER");
    });

    /**
     * Test: Multiple sessions reflect role update
     * Requirements: 4.4
     */
    it("should reflect role update across all user sessions", async () => {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      // Create multiple sessions
      await prisma.session.createMany({
        data: [
          { userId: testUserId, token: "multi-session-1-" + Date.now(), expiresAt },
          { userId: testUserId, token: "multi-session-2-" + Date.now(), expiresAt },
          { userId: testUserId, token: "multi-session-3-" + Date.now(), expiresAt }
        ]
      });

      // Update role
      await prisma.user.update({
        where: { id: testUserId },
        data: { role: "ADMIN" }
      });

      // Verify all sessions reflect the new role
      const sessions = await prisma.session.findMany({
        where: { userId: testUserId },
        include: { user: true }
      });

      expect(sessions.length).toBe(3);
      sessions.forEach(session => {
        expect(session.user.role).toBe("ADMIN");
      });
    });
  });
});
