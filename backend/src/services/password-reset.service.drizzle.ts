/**
 * Password Reset Service (Drizzle ORM)
 * 
 * This service handles password reset functionality including:
 * - Generating secure reset tokens
 * - Storing tokens in the database with expiration
 * - Validating tokens
 * - Updating passwords
 * - Invalidating sessions after password reset
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import crypto from "crypto";
import { db } from "../db/client";
import { verifications, accounts, sessions, users } from "../db/schema/auth";
import { eq, and, lt } from "drizzle-orm";
import { logger } from "../utils/logger";

/**
 * Token expiration time in milliseconds (1 hour)
 */
const TOKEN_EXPIRATION_MS = 60 * 60 * 1000; // 1 hour

/**
 * Token length in bytes (32 bytes = 64 hex characters)
 */
const TOKEN_LENGTH_BYTES = 32;

/**
 * Password reset request result
 */
export interface PasswordResetRequestResult {
  success: boolean;
  message: string;
  token?: string; // Only returned for logging/testing, not sent to client
  expiresAt?: Date;
}

/**
 * Password reset result
 */
export interface PasswordResetResult {
  success: boolean;
  message: string;
  code?: string;
}

/**
 * Password Reset Service class (Drizzle)
 */
export class PasswordResetServiceDrizzle {
  /**
   * Generate a secure random token
   * 
   * @returns A cryptographically secure random token as hex string
   */
  private generateSecureToken(): string {
    return crypto.randomBytes(TOKEN_LENGTH_BYTES).toString("hex");
  }

  /**
   * Hash a token for secure storage
   * Using SHA-256 to hash the token before storing
   * 
   * @param token - The plain token to hash
   * @returns The hashed token
   */
  private hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  /**
   * Request a password reset for a user
   * 
   * Generates a secure reset token, stores it in the database with expiration,
   * and returns the token for email sending.
   * 
   * Requirements: 6.1, 6.2
   * 
   * @param email - The user's email address
   * @returns PasswordResetRequestResult with token if successful
   */
  async requestPasswordReset(email: string): Promise<PasswordResetRequestResult> {
    try {
      // Find user by email
      const user = await db.query.users.findFirst({
        where: eq(users.email, email.toLowerCase())
      });

      // Always return success message to prevent email enumeration
      // But only create token if user exists
      if (!user) {
        return {
          success: true,
          message: "If an account exists with this email, a password reset link will be sent."
        };
      }

      // Check if user is active
      if (!user.active) {
        return {
          success: true,
          message: "If an account exists with this email, a password reset link will be sent."
        };
      }

      // Generate secure token
      const plainToken = this.generateSecureToken();
      const hashedToken = this.hashToken(plainToken);
      
      // Calculate expiration time (1 hour from now)
      const expiresAt = new Date(Date.now() + TOKEN_EXPIRATION_MS);

      // Delete any existing reset tokens for this user
      await db.delete(verifications).where(
        eq(verifications.identifier, email.toLowerCase())
      );

      // Store the hashed token in the database
      await db.insert(verifications).values({
        identifier: email.toLowerCase(),
        value: hashedToken,
        expiresAt: expiresAt
      });

      // Log the reset request (in production, this would send an email)
      logger.info(`[Password Reset] Token generated for ${email}`);
      logger.info(`[Password Reset] Token expires at: ${expiresAt.toISOString()}`);
      
      // In a real implementation, you would send an email here
      // For now, we log the token for testing purposes
      if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
        logger.info(`[Password Reset] Reset token (DEV ONLY): ${plainToken}`);
      }

      return {
        success: true,
        message: "If an account exists with this email, a password reset link will be sent.",
        token: plainToken, // Return for logging/testing
        expiresAt: expiresAt
      };
    } catch (error) {
      logger.error('Error requesting password reset:', error);
      throw error;
    }
  }

  /**
   * Validate a password reset token
   * 
   * Checks if the token exists and is not expired.
   * 
   * Requirements: 6.3, 6.4
   * 
   * @param email - The user's email address
   * @param token - The plain reset token
   * @returns Object with valid flag and optional error code
   */
  async validateResetToken(email: string, token: string): Promise<{ valid: boolean; code?: string; message?: string }> {
    try {
      // Hash the provided token
      const hashedToken = this.hashToken(token);

      // Find the verification record
      const verification = await db.query.verifications.findFirst({
        where: and(
          eq(verifications.identifier, email.toLowerCase()),
          eq(verifications.value, hashedToken)
        )
      });

      // Token not found
      if (!verification) {
        return {
          valid: false,
          code: "INVALID_TOKEN",
          message: "Invalid or expired reset token"
        };
      }

      // Check if token is expired
      if (verification.expiresAt && verification.expiresAt < new Date()) {
        // Delete expired token
        await db.delete(verifications).where(
          eq(verifications.id, verification.id)
        );

        return {
          valid: false,
          code: "TOKEN_EXPIRED",
          message: "Reset token has expired. Please request a new one."
        };
      }

      return { valid: true };
    } catch (error) {
      logger.error('Error validating reset token:', error);
      throw error;
    }
  }

  /**
   * Reset a user's password
   * 
   * Validates the token, updates the password, and invalidates all sessions.
   * 
   * Requirements: 6.3, 6.4, 6.5
   * 
   * @param email - The user's email address
   * @param token - The plain reset token
   * @param newPassword - The new password (will be hashed by better-auth)
   * @returns PasswordResetResult
   */
  async resetPassword(email: string, token: string, newPassword: string): Promise<PasswordResetResult> {
    try {
      // Validate the token first
      const validation = await this.validateResetToken(email, token);
      if (!validation.valid) {
        return {
          success: false,
          message: validation.message || "Invalid token",
          code: validation.code
        };
      }

      // Find the user
      const user = await db.query.users.findFirst({
        where: eq(users.email, email.toLowerCase())
      });

      if (!user) {
        return {
          success: false,
          message: "User not found",
          code: "USER_NOT_FOUND"
        };
      }

      // Hash the new password using bcrypt (same as better-auth)
      const bcrypt = await import("bcryptjs");
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update the password in the accounts table
      const account = await db.query.accounts.findFirst({
        where: and(
          eq(accounts.userId, user.id),
          eq(accounts.providerId, "credential")
        )
      });

      if (!account) {
        return {
          success: false,
          message: "No password account found for this user",
          code: "NO_PASSWORD_ACCOUNT"
        };
      }

      // Update password
      await db.update(accounts)
        .set({ password: hashedPassword })
        .where(eq(accounts.id, account.id));

      // Invalidate all sessions for this user (Requirements 6.5)
      const deletedSessions = await db.delete(sessions)
        .where(eq(sessions.userId, user.id));

      logger.info(`[Password Reset] Password updated for ${email}`);
      logger.info(`[Password Reset] Invalidated sessions`);

      // Delete the used verification token
      const hashedToken = this.hashToken(token);
      await db.delete(verifications).where(
        and(
          eq(verifications.identifier, email.toLowerCase()),
          eq(verifications.value, hashedToken)
        )
      );

      return {
        success: true,
        message: "Password has been reset successfully. Please log in with your new password."
      };
    } catch (error) {
      logger.error('Error resetting password:', error);
      throw error;
    }
  }

  /**
   * Clean up expired verification tokens
   * 
   * This can be called periodically to remove expired tokens from the database.
   * 
   * @returns Number of deleted tokens
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      const result = await db.delete(verifications).where(
        lt(verifications.expiresAt, new Date())
      );

      const count = result.rowCount ?? 0;
      if (count > 0) {
        logger.info(`[Password Reset] Cleaned up ${count} expired tokens`);
      }

      return count;
    } catch (error) {
      logger.error('Error cleaning up expired tokens:', error);
      throw error;
    }
  }
}

/**
 * Create a password reset service instance
 * 
 * @returns PasswordResetServiceDrizzle instance
 */
export function createPasswordResetServiceDrizzle(): PasswordResetServiceDrizzle {
  return new PasswordResetServiceDrizzle();
}

/**
 * Export singleton instance
 */
export const passwordResetServiceDrizzle = new PasswordResetServiceDrizzle();
