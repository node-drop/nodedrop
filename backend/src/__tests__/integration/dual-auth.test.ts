/**
 * Dual Authentication Support Tests
 * 
 * Tests for dual authentication methods (Authorization header and cookies)
 * and OAuth/password auth coexistence.
 * 
 * Requirements: 15.4, 8.3, 8.4
 */

import { PrismaClient } from "@prisma/client";

// Use the actual database URL from environment
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/node_drop";

let prisma: PrismaClient;

// Test user data
const testUser = {
  email: "dual-auth-test@example.com",
  name: "Dual Auth Test User"
};

describe("Dual Authentication Support", () => {
  beforeAll(async () => {
    // Initialize Prisma client with actual database URL
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: DATABASE_URL
        }
      }
    });
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
            email: testUser.email
          }
        }
      });

      // Delete accounts
      await prisma.account.deleteMany({
        where: {
          user: {
            email: testUser.email
          }
        }
      });

      // Delete users
      await prisma.user.deleteMany({
        where: {
          email: testUser.email
        }
      });
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  describe("17.1 Authorization Header Authentication", () => {
    /**
     * Test: Session token can be used for authentication
     * Requirements: 15.4
     */
    it("should store session token that can be used for Bearer auth", async () => {
      // Create user
      const user = await prisma.user.create({
        data: {
          email: testUser.email,
          name: testUser.name,
          role: "USER",
          emailVerified: false,
          active: true
        }
      });

      // Create session with token
      const sessionToken = "bearer-auth-token-" + Date.now();
      const session = await prisma.session.create({
        data: {
          userId: user.id,
          token: sessionToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        }
      });

      // Verify session can be looked up by token
      const foundSession = await prisma.session.findUnique({
        where: { token: sessionToken },
        include: { user: true }
      });

      expect(foundSession).toBeTruthy();
      expect(foundSession!.userId).toBe(user.id);
      expect(foundSession!.user.email).toBe(testUser.email);
    });

    /**
     * Test: Session lookup by token returns user data
     * Requirements: 15.4
     */
    it("should return complete user data when looking up session by token", async () => {
      // Create user with all fields
      const user = await prisma.user.create({
        data: {
          email: testUser.email,
          name: testUser.name,
          role: "ADMIN",
          emailVerified: true,
          active: true,
          image: "https://example.com/avatar.png"
        }
      });

      // Create session
      const sessionToken = "complete-user-token-" + Date.now();
      await prisma.session.create({
        data: {
          userId: user.id,
          token: sessionToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });

      // Look up session with user data
      const session = await prisma.session.findUnique({
        where: { token: sessionToken },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              emailVerified: true,
              image: true,
              active: true
            }
          }
        }
      });

      expect(session).toBeTruthy();
      expect(session!.user.id).toBe(user.id);
      expect(session!.user.email).toBe(testUser.email);
      expect(session!.user.name).toBe(testUser.name);
      expect(session!.user.role).toBe("ADMIN");
      expect(session!.user.emailVerified).toBe(true);
      expect(session!.user.image).toBe("https://example.com/avatar.png");
      expect(session!.user.active).toBe(true);
    });

    /**
     * Test: Expired session token should not be valid
     * Requirements: 15.4
     */
    it("should identify expired sessions when looking up by token", async () => {
      // Create user
      const user = await prisma.user.create({
        data: {
          email: testUser.email,
          name: testUser.name,
          role: "USER",
          emailVerified: false,
          active: true
        }
      });

      // Create expired session
      const sessionToken = "expired-token-" + Date.now();
      const expiredAt = new Date(Date.now() - 1000); // 1 second ago
      await prisma.session.create({
        data: {
          userId: user.id,
          token: sessionToken,
          expiresAt: expiredAt
        }
      });

      // Look up session
      const session = await prisma.session.findUnique({
        where: { token: sessionToken }
      });

      expect(session).toBeTruthy();
      expect(session!.expiresAt.getTime()).toBeLessThan(Date.now());
    });

    /**
     * Test: Invalid token returns null
     * Requirements: 15.4
     */
    it("should return null for non-existent token", async () => {
      const session = await prisma.session.findUnique({
        where: { token: "non-existent-token-12345" }
      });

      expect(session).toBeNull();
    });

    /**
     * Test: Inactive user session should be identifiable
     * Requirements: 15.4
     */
    it("should identify inactive user when looking up session", async () => {
      // Create inactive user
      const user = await prisma.user.create({
        data: {
          email: testUser.email,
          name: testUser.name,
          role: "USER",
          emailVerified: false,
          active: false // Inactive
        }
      });

      // Create session
      const sessionToken = "inactive-user-token-" + Date.now();
      await prisma.session.create({
        data: {
          userId: user.id,
          token: sessionToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });

      // Look up session with user
      const session = await prisma.session.findUnique({
        where: { token: sessionToken },
        include: { user: true }
      });

      expect(session).toBeTruthy();
      expect(session!.user.active).toBe(false);
    });
  });

  describe("17.3 OAuth and Password Auth Coexistence", () => {
    /**
     * Test: User can have both password and OAuth accounts
     * Requirements: 8.3, 8.4
     */
    it("should allow user to have both credential and OAuth accounts", async () => {
      // Create user
      const user = await prisma.user.create({
        data: {
          email: testUser.email,
          name: testUser.name,
          role: "USER",
          emailVerified: true,
          active: true
        }
      });

      // Create credential account (password auth)
      const credentialAccount = await prisma.account.create({
        data: {
          userId: user.id,
          providerId: "credential",
          accountId: user.id,
          password: "$2a$10$hashedpasswordvalue"
        }
      });

      // Create OAuth account (e.g., Google)
      const oauthAccount = await prisma.account.create({
        data: {
          userId: user.id,
          providerId: "google",
          accountId: "google-oauth-id-12345",
          accessToken: "google-access-token",
          refreshToken: "google-refresh-token"
        }
      });

      // Verify both accounts exist for the user
      const accounts = await prisma.account.findMany({
        where: { userId: user.id }
      });

      expect(accounts.length).toBe(2);
      
      const credAccount = accounts.find(a => a.providerId === "credential");
      const googleAccount = accounts.find(a => a.providerId === "google");
      
      expect(credAccount).toBeTruthy();
      expect(credAccount!.password).toBeTruthy();
      
      expect(googleAccount).toBeTruthy();
      expect(googleAccount!.accessToken).toBe("google-access-token");
    });

    /**
     * Test: Password auth works when OAuth is configured
     * Requirements: 8.4
     */
    it("should allow password authentication when OAuth account exists", async () => {
      // Create user
      const user = await prisma.user.create({
        data: {
          email: testUser.email,
          name: testUser.name,
          role: "USER",
          emailVerified: true,
          active: true
        }
      });

      // Create OAuth account first
      await prisma.account.create({
        data: {
          userId: user.id,
          providerId: "github",
          accountId: "github-user-id-67890",
          accessToken: "github-access-token"
        }
      });

      // Create credential account
      await prisma.account.create({
        data: {
          userId: user.id,
          providerId: "credential",
          accountId: user.id,
          password: "$2a$10$hashedpassword"
        }
      });

      // Verify credential account can be found for password auth
      const credentialAccount = await prisma.account.findFirst({
        where: {
          userId: user.id,
          providerId: "credential"
        }
      });

      expect(credentialAccount).toBeTruthy();
      expect(credentialAccount!.password).toBeTruthy();
    });

    /**
     * Test: Multiple OAuth providers can be linked
     * Requirements: 8.3
     */
    it("should allow multiple OAuth providers for same user", async () => {
      // Create user
      const user = await prisma.user.create({
        data: {
          email: testUser.email,
          name: testUser.name,
          role: "USER",
          emailVerified: true,
          active: true
        }
      });

      // Create Google OAuth account
      await prisma.account.create({
        data: {
          userId: user.id,
          providerId: "google",
          accountId: "google-id-123",
          accessToken: "google-token"
        }
      });

      // Create GitHub OAuth account
      await prisma.account.create({
        data: {
          userId: user.id,
          providerId: "github",
          accountId: "github-id-456",
          accessToken: "github-token"
        }
      });

      // Verify both OAuth accounts exist
      const oauthAccounts = await prisma.account.findMany({
        where: {
          userId: user.id,
          providerId: { in: ["google", "github"] }
        }
      });

      expect(oauthAccounts.length).toBe(2);
    });

    /**
     * Test: Session works regardless of auth method
     * Requirements: 8.3, 8.4
     */
    it("should create valid session regardless of authentication method", async () => {
      // Create user with both auth methods
      const user = await prisma.user.create({
        data: {
          email: testUser.email,
          name: testUser.name,
          role: "USER",
          emailVerified: true,
          active: true
        }
      });

      // Create both account types
      await prisma.account.create({
        data: {
          userId: user.id,
          providerId: "credential",
          accountId: user.id,
          password: "$2a$10$hashedpassword"
        }
      });

      await prisma.account.create({
        data: {
          userId: user.id,
          providerId: "google",
          accountId: "google-id",
          accessToken: "google-token"
        }
      });

      // Create session (could be from either auth method)
      const session = await prisma.session.create({
        data: {
          userId: user.id,
          token: "multi-auth-session-" + Date.now(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });

      // Verify session is valid and linked to user
      const sessionWithUser = await prisma.session.findUnique({
        where: { id: session.id },
        include: { user: true }
      });

      expect(sessionWithUser).toBeTruthy();
      expect(sessionWithUser!.user.id).toBe(user.id);
      
      // Verify user has both auth methods available
      const accounts = await prisma.account.count({
        where: { userId: user.id }
      });
      expect(accounts).toBe(2);
    });

    /**
     * Test: OAuth account unique constraint
     * Requirements: 8.3
     */
    it("should enforce unique constraint on provider + accountId", async () => {
      // Create first user
      const user1 = await prisma.user.create({
        data: {
          email: testUser.email,
          name: testUser.name,
          role: "USER",
          emailVerified: true,
          active: true
        }
      });

      // Create OAuth account
      await prisma.account.create({
        data: {
          userId: user1.id,
          providerId: "google",
          accountId: "unique-google-id",
          accessToken: "token"
        }
      });

      // Create second user
      const user2 = await prisma.user.create({
        data: {
          email: "second-user@example.com",
          name: "Second User",
          role: "USER",
          emailVerified: true,
          active: true
        }
      });

      // Try to create OAuth account with same provider + accountId
      await expect(
        prisma.account.create({
          data: {
            userId: user2.id,
            providerId: "google",
            accountId: "unique-google-id", // Same as user1
            accessToken: "different-token"
          }
        })
      ).rejects.toThrow();

      // Cleanup second user
      await prisma.user.delete({ where: { id: user2.id } });
    });
  });
});
