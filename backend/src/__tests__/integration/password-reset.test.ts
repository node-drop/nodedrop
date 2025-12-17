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
import { PasswordResetServiceDrizzle, passwordResetServiceDrizzle } from "../../services/password-reset.service.drizzle";
import { db } from "../../db/client";
import { users, accounts, verifications, sessions } from "../../db/schema/auth";
import { eq } from "drizzle-orm";

// Use the actual database URL from environment
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/node_drop";

let passwordResetService: PasswordResetServiceDrizzle;

// Test user data
const testUser = {
  email: "password-reset-test@example.com",
  password: "OldPassword123!",
  name: "Password Reset Test User"
};

describe("Password Reset Flow - Database State Tests", () => {
  beforeAll(async () => {
    // Initialize password reset service (Drizzle)
    passwordResetService = passwordResetServiceDrizzle;
  });

  afterAll(async () => {
    // Drizzle doesn't require explicit disconnect
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
      // Find user first
      const user = await db.query.users.findFirst({
        where: eq(users.email, testUser.email)
      });

      if (user) {
        // Delete verifications
        await db.delete(verifications).where(
          eq(verifications.identifier, testUser.email.toLowerCase())
        );

        // Delete sessions
        await db.delete(sessions).where(
          eq(sessions.userId, user.id)
        );

        // Delete accounts
        await db.delete(accounts).where(
          eq(accounts.userId, user.id)
        );

        // Delete users
        await db.delete(users).where(
          eq(users.id, user.id)
        );
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  async function createTestUser() {
    // Create user using Drizzle
    const userResult = await db.insert(users).values({
      email: testUser.email,
      name: testUser.name,
      role: "user",
      emailVerified: false,
      active: true
    }).returning();

    const user = userResult[0];

    // Create account with hashed password
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    await db.insert(accounts).values({
      userId: user.id,
      providerId: "credential",
      accountId: user.id,
      password: hashedPassword
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
      const verification = await db.query.verifications.findFirst({
        where: eq(verifications.identifier, testUser.email.toLowerCase())
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
      const verificationsList = await db.query.verifications.findMany({
        where: eq(verifications.identifier, testUser.email.toLowerCase())
      });

      expect(verificationsList.length).toBe(1);
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
      const user = await db.query.users.findFirst({
        where: eq(users.email, testUser.email)
      });

      const account = await db.query.accounts.findFirst({
        where: eq(accounts.userId, user!.id)
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
      await db.insert(sessions).values({
        userId: user.id,
        token: "session-1-" + Date.now(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });
      await db.insert(sessions).values({
        userId: user.id,
        token: "session-2-" + Date.now(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      // Verify sessions exist
      const sessionsBefore = await db.query.sessions.findMany({
        where: eq(sessions.userId, user.id)
      });
      expect(sessionsBefore.length).toBe(2);

      // Request and complete password reset
      const requestResult = await passwordResetService.requestPasswordReset(testUser.email);
      await passwordResetService.resetPassword(
        testUser.email,
        requestResult.token!,
        "NewPassword789!"
      );

      // Verify all sessions are invalidated
      const sessionsAfter = await db.query.sessions.findMany({
        where: eq(sessions.userId, user.id)
      });
      expect(sessionsAfter.length).toBe(0);
    });

    /**
     * Test: Delete verification token after successful reset
     */
    it("should delete verification token after successful reset", async () => {
      await createTestUser();

      const requestResult = await passwordResetService.requestPasswordReset(testUser.email);
      
      // Verify token exists
      const tokenBefore = await db.query.verifications.findFirst({
        where: eq(verifications.identifier, testUser.email.toLowerCase())
      });
      expect(tokenBefore).toBeTruthy();

      // Reset password
      await passwordResetService.resetPassword(
        testUser.email,
        requestResult.token!,
        "NewPassword789!"
      );

      // Verify token is deleted
      const tokenAfter = await db.query.verifications.findFirst({
        where: eq(verifications.identifier, testUser.email.toLowerCase())
      });
      expect(tokenAfter).toBeUndefined();
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
      await db.insert(verifications).values({
        identifier: "expired1@example.com",
        value: "expired-token-1",
        expiresAt: new Date(Date.now() - 1000)
      });
      await db.insert(verifications).values({
        identifier: "expired2@example.com",
        value: "expired-token-2",
        expiresAt: new Date(Date.now() - 1000)
      });

      // Create a valid token
      await db.insert(verifications).values({
        identifier: "valid@example.com",
        value: "valid-token",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000)
      });

      const deletedCount = await passwordResetService.cleanupExpiredTokens();

      expect(deletedCount).toBe(2);

      // Verify valid token still exists
      const validToken = await db.query.verifications.findFirst({
        where: eq(verifications.identifier, "valid@example.com")
      });
      expect(validToken).toBeTruthy();

      // Clean up
      await db.delete(verifications).where(
        eq(verifications.identifier, "expired1@example.com")
      );
      await db.delete(verifications).where(
        eq(verifications.identifier, "expired2@example.com")
      );
      await db.delete(verifications).where(
        eq(verifications.identifier, "valid@example.com")
      );
    });
  });
});
