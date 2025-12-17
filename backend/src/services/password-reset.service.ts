/**
 * Password Reset Service
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
 * Password Reset Service class
 */
export class PasswordResetService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

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
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() }
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
    await this.prisma.verification.deleteMany({
      where: { identifier: email.toLowerCase() }
    });

    // Store the hashed token in the database
    await this.prisma.verification.create({
      data: {
        identifier: email.toLowerCase(),
        value: hashedToken,
        expiresAt: expiresAt
      }
    });

    // Log the reset request (in production, this would send an email)
    console.log(`[Password Reset] Token generated for ${email}`);
    console.log(`[Password Reset] Token expires at: ${expiresAt.toISOString()}`);
    
    // In a real implementation, you would send an email here
    // For now, we log the token for testing purposes
    if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
      console.log(`[Password Reset] Reset token (DEV ONLY): ${plainToken}`);
    }

    return {
      success: true,
      message: "If an account exists with this email, a password reset link will be sent.",
      token: plainToken, // Return for logging/testing
      expiresAt: expiresAt
    };
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
    // Hash the provided token
    const hashedToken = this.hashToken(token);

    // Find the verification record
    const verification = await this.prisma.verification.findUnique({
      where: {
        identifier_value: {
          identifier: email.toLowerCase(),
          value: hashedToken
        }
      }
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
    if (verification.expiresAt < new Date()) {
      // Delete expired token
      await this.prisma.verification.delete({
        where: { id: verification.id }
      });

      return {
        valid: false,
        code: "TOKEN_EXPIRED",
        message: "Reset token has expired. Please request a new one."
      };
    }

    return { valid: true };
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
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() }
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
    const account = await this.prisma.account.findFirst({
      where: {
        userId: user.id,
        providerId: "credential"
      }
    });

    if (!account) {
      return {
        success: false,
        message: "No password account found for this user",
        code: "NO_PASSWORD_ACCOUNT"
      };
    }

    // Update password
    await this.prisma.account.update({
      where: { id: account.id },
      data: { password: hashedPassword }
    });

    // Invalidate all sessions for this user (Requirements 6.5)
    const deletedSessions = await this.prisma.session.deleteMany({
      where: { userId: user.id }
    });

    console.log(`[Password Reset] Password updated for ${email}`);
    console.log(`[Password Reset] Invalidated ${deletedSessions.count} sessions`);

    // Delete the used verification token
    const hashedToken = this.hashToken(token);
    await this.prisma.verification.deleteMany({
      where: {
        identifier: email.toLowerCase(),
        value: hashedToken
      }
    });

    return {
      success: true,
      message: "Password has been reset successfully. Please log in with your new password."
    };
  }

  /**
   * Clean up expired verification tokens
   * 
   * This can be called periodically to remove expired tokens from the database.
   * 
   * @returns Number of deleted tokens
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.prisma.verification.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });

    if (result.count > 0) {
      console.log(`[Password Reset] Cleaned up ${result.count} expired tokens`);
    }

    return result.count;
  }
}

/**
 * Create a password reset service instance
 * 
 * @param prisma - PrismaClient instance
 * @returns PasswordResetService instance
 */
export function createPasswordResetService(prisma: PrismaClient): PasswordResetService {
  return new PasswordResetService(prisma);
}
