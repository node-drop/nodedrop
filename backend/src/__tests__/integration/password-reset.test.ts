/**
 * Password Reset Integration Tests
 * 
 * Tests for password reset request and reset flows.
 * These tests verify the password reset functionality works correctly
 * by testing the database state directly after operations.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import bcrypt from "bcryptjs";
import prisma from "../../config/database";
import { PasswordResetService, createPasswordResetService } from "../../services/password-reset.service";

// Use the actual database URL from environment
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/node_drop";

let passwordResetService: PasswordResetService;

// Test user data
const testUser = {
  email: "password-reset-test@example.com",
  password: "OldPassword123!",
  name: "Password Reset Test User"
};

describe("Password Reset Flow - Database State Tests", () => {
  beforeAll(async () => {
    await prisma.$connect();
    
    // Initialize password reset service
    passwordResetService = createPasswordResetService(prisma);
  });

  afterAll(async () => {
    // Disconnect Prisma
    if (prisma) {
      await prisma.$disconnect();
    }
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await cleanupTestData();
  });

  afterEach(async () => {
    // Clean up test data after each test
    await cleanupTestData();
  });

  async function cleanupTestData() {
    try {
      // Delete verifications first
      await prisma.verification.deleteMany({
        where: { identifier: testUser.email.toLowerCase() }
      });

      // Delete sessions
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

  async function createTestUser() {
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

    // Create account with hashed password
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    await prisma.account.create({
      data: {
        userId: user.id,
        providerId: "credential",
        accountId: user.id,
        password: hashedPassword
      }
    });

    return user;
  }

  describe("7.1 Password Reset Request - Token Generation", () => {
    /**
     * Test: Generate secure reset token
     * Requirements: 6.1
     */
    it("should generate a secure reset token", async () => {
      await createTestUser();

      const result = await passwordResetService.requestPasswordReset(testUser.email);

      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(result.token!.length).toBe(64); // 32 bytes = 64 hex chars
    });

    /**
     * Test: Set token expiration (1 hour)
     * Requirements: 6.1
     */
    it("should set token expiration to 1 hour", async () => {
      await createTestUser();

      const result = await passwordResetService.requestPasswordReset(testUser.email);

      expect(result.expiresAt).toBeDefined();
      
      // Check expiration is approximately 1 hour from now
      const oneHourMs = 60 * 60 * 1000;
      const expirationDiff = result.expiresAt!.getTime() - Date.now();
      expect(expirationDiff).toBeLessThanOrEqual(oneHourMs);
      expect(expirationDiff).toBeGreaterThan(oneHourMs - 60000); // Within 1 minute
    });

    /**
     * Test: Store token in database
     * Requirements: 6.1
     */
    it("should store hashed token in database", async () => {
      await createTestUser();

      await passwordResetService.requestPasswordReset(testUser.email);

      // Check verification record exists
      const verification = await prisma.verification.findFirst({
        where: { identifier: testUser.email.toLowerCase() }
      });

      expect(verification).toBeTruthy();
      expect(verification!.value).toBeDefined();
      expect(verification!.value.length).toBe(64); // SHA-256 hash = 64 hex chars
      expect(verification!.expiresAt).toBeDefined();
    });

    /**
     * Test: Return success for non-existent email (prevent enumeration)
     * Requirements: 6.2
     */
    it("should return success for non-existent email to prevent enumeration", async () => {
      const result = await passwordResetService.requestPasswordReset("nonexistent@example.com");

      expect(result.success).toBe(true);
      expect(result.message).toContain("If an account exists");
      expect(result.token).toBeUndefined(); // No token for non-existent user
    });

    /**
     * Test: Replace existing token on new request
     */
    it("should replace existing token on new request", async () => {
      await createTestUser();

      // First request
      await passwordResetService.requestPasswordReset(testUser.email);
      
      // Second request
      await passwordResetService.requestPasswordReset(testUser.email);

      // Should only have one verification record
      const verifications = await prisma.verification.findMany({
        where: { identifier: testUser.email.toLowerCase() }
      });

      expect(verifications.length).toBe(1);
    });
  });


  describe("7.3 Password Reset - Token Validation and Password Update", () => {
    /**
     * Test: Validate reset token
     * Requirements: 6.3
     */
    it("should validate a valid reset token", async () => {
      await createTestUser();

      const requestResult = await passwordResetService.requestPasswordReset(testUser.email);
      const validation = await passwordResetService.validateResetToken(
        testUser.email,
        requestResult.token!
      );

      expect(validation.valid).toBe(true);
    });

    /**
     * Test: Reject invalid token
     * Requirements: 6.3
     */
    it("should reject an invalid reset token", async () => {
      await createTestUser();

      // Request a token first
      await passwordResetService.requestPasswordReset(testUser.email);

      // Try to validate with wrong token
      const validation = await passwordResetService.validateResetToken(
        testUser.email,
        "invalid-token-12345"
      );

      expect(validation.valid).toBe(false);
      expect(validation.code).toBe("INVALID_TOKEN");
    });

    /**
     * Test: Check token expiration
     * Requirements: 6.4
     */
    it("should reject expired reset token", async () => {
      const user = await createTestUser();

      // Create an expired verification directly
      const crypto = await import("crypto");
      const token = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

      await prisma.verification.create({
        data: {
          identifier: testUser.email.toLowerCase(),
          value: hashedToken,
          expiresAt: new Date(Date.now() - 1000) // Expired 1 second ago
        }
      });

      const validation = await passwordResetService.validateResetToken(
        testUser.email,
        token
      );

      expect(validation.valid).toBe(false);
      expect(validation.code).toBe("TOKEN_EXPIRED");
    });

    /**
     * Test: Update password with valid token
     * Requirements: 6.3
     */
    it("should update password with valid token", async () => {
      await createTestUser();

      const requestResult = await passwordResetService.requestPasswordReset(testUser.email);
      const newPassword = "NewSecurePassword456!";

      const resetResult = await passwordResetService.resetPassword(
        testUser.email,
        requestResult.token!,
        newPassword
      );

      expect(resetResult.success).toBe(true);

      // Verify password was updated
      const account = await prisma.account.findFirst({
        where: {
          user: { email: testUser.email },
          providerId: "credential"
        }
      });

      expect(account).toBeTruthy();
      const passwordMatch = await bcrypt.compare(newPassword, account!.password!);
      expect(passwordMatch).toBe(true);
    });

    /**
     * Test: Invalidate all user sessions after password reset
     * Requirements: 6.5
     */
    it("should invalidate all sessions after password reset", async () => {
      const user = await createTestUser();

      // Create some sessions
      await prisma.session.create({
        data: {
          userId: user.id,
          token: "session-1-" + Date.now(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });
      await prisma.session.create({
        data: {
          userId: user.id,
          token: "session-2-" + Date.now(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });

      // Verify sessions exist
      const sessionsBefore = await prisma.session.count({
        where: { userId: user.id }
      });
      expect(sessionsBefore).toBe(2);

      // Request and complete password reset
      const requestResult = await passwordResetService.requestPasswordReset(testUser.email);
      await passwordResetService.resetPassword(
        testUser.email,
        requestResult.token!,
        "NewPassword789!"
      );

      // Verify all sessions are invalidated
      const sessionsAfter = await prisma.session.count({
        where: { userId: user.id }
      });
      expect(sessionsAfter).toBe(0);
    });

    /**
     * Test: Delete verification token after successful reset
     */
    it("should delete verification token after successful reset", async () => {
      await createTestUser();

      const requestResult = await passwordResetService.requestPasswordReset(testUser.email);
      
      // Verify token exists
      const tokenBefore = await prisma.verification.findFirst({
        where: { identifier: testUser.email.toLowerCase() }
      });
      expect(tokenBefore).toBeTruthy();

      // Reset password
      await passwordResetService.resetPassword(
        testUser.email,
        requestResult.token!,
        "NewPassword789!"
      );

      // Verify token is deleted
      const tokenAfter = await prisma.verification.findFirst({
        where: { identifier: testUser.email.toLowerCase() }
      });
      expect(tokenAfter).toBeNull();
    });

    /**
     * Test: Reject reset with expired token
     * Requirements: 6.4
     */
    it("should reject password reset with expired token", async () => {
      await createTestUser();

      // Create an expired verification directly
      const crypto = await import("crypto");
      const token = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

      await prisma.verification.create({
        data: {
          identifier: testUser.email.toLowerCase(),
          value: hashedToken,
          expiresAt: new Date(Date.now() - 1000) // Expired
        }
      });

      const resetResult = await passwordResetService.resetPassword(
        testUser.email,
        token,
        "NewPassword789!"
      );

      expect(resetResult.success).toBe(false);
      expect(resetResult.code).toBe("TOKEN_EXPIRED");
    });
  });

  describe("Cleanup Expired Tokens", () => {
    /**
     * Test: Clean up expired tokens
     */
    it("should clean up expired verification tokens", async () => {
      // Create some expired tokens
      await prisma.verification.create({
        data: {
          identifier: "expired1@example.com",
          value: "expired-token-1",
          expiresAt: new Date(Date.now() - 1000)
        }
      });
      await prisma.verification.create({
        data: {
          identifier: "expired2@example.com",
          value: "expired-token-2",
          expiresAt: new Date(Date.now() - 1000)
        }
      });

      // Create a valid token
      await prisma.verification.create({
        data: {
          identifier: "valid@example.com",
          value: "valid-token",
          expiresAt: new Date(Date.now() + 60 * 60 * 1000)
        }
      });

      const deletedCount = await passwordResetService.cleanupExpiredTokens();

      expect(deletedCount).toBe(2);

      // Verify valid token still exists
      const validToken = await prisma.verification.findFirst({
        where: { identifier: "valid@example.com" }
      });
      expect(validToken).toBeTruthy();

      // Clean up
      await prisma.verification.deleteMany({
        where: {
          identifier: {
            in: ["expired1@example.com", "expired2@example.com", "valid@example.com"]
          }
        }
      });
    });
  });
});
