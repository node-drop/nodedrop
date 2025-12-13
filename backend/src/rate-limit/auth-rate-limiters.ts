/**
 * Authentication Rate Limiters
 * 
 * Rate limiting middleware for authentication endpoints to prevent abuse.
 * 
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5
 */

import rateLimit from "express-rate-limit";
import { Request, Response } from "express";
import { rateLimitConfig, shouldSkipRateLimit } from "./rate-limit.config";
import { ApiResponse } from "../types/api";

/**
 * Creates a rate limit response in ApiResponse format
 */
const createRateLimitResponse = (message: string, retryAfterSeconds: number): ApiResponse => ({
  success: false,
  error: {
    code: "RATE_LIMIT_EXCEEDED",
    message,
    details: {
      retryAfter: retryAfterSeconds
    }
  }
});

/**
 * Rate limiter for login endpoint
 * Limits login attempts per IP address to prevent brute force attacks
 * Uses default IP-based key generator
 * 
 * Requirements: 14.1, 14.4
 */
export const loginRateLimiter = rateLimit({
  windowMs: rateLimitConfig.authLogin.windowMs,
  max: rateLimitConfig.authLogin.max,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => shouldSkipRateLimit(req.ip),
  handler: (req: Request, res: Response) => {
    const retryAfterSeconds = Math.ceil(rateLimitConfig.authLogin.windowMs / 1000);
    res.status(429).json(
      createRateLimitResponse(
        rateLimitConfig.authLogin.message,
        retryAfterSeconds
      )
    );
  }
});

/**
 * Rate limiter for registration endpoint
 * Limits registration attempts per IP address to prevent mass account creation
 * Uses default IP-based key generator
 * 
 * Requirements: 14.2, 14.4
 */
export const registrationRateLimiter = rateLimit({
  windowMs: rateLimitConfig.authRegister.windowMs,
  max: rateLimitConfig.authRegister.max,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => shouldSkipRateLimit(req.ip),
  handler: (req: Request, res: Response) => {
    const retryAfterSeconds = Math.ceil(rateLimitConfig.authRegister.windowMs / 1000);
    res.status(429).json(
      createRateLimitResponse(
        rateLimitConfig.authRegister.message,
        retryAfterSeconds
      )
    );
  }
});

/**
 * Rate limiter for password reset endpoint
 * Limits password reset requests per email address to prevent abuse
 * Uses email-based key generator with IP fallback
 * 
 * Requirements: 14.3, 14.4
 */
export const passwordResetRateLimiter = rateLimit({
  windowMs: rateLimitConfig.authPasswordReset.windowMs,
  max: rateLimitConfig.authPasswordReset.max,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => shouldSkipRateLimit(req.ip),
  // Use email as the key for password reset rate limiting
  // This prevents abuse by limiting requests per email address
  keyGenerator: (req: Request) => {
    const email = req.body?.email;
    if (email && typeof email === "string") {
      // Use email as key - normalize to lowercase
      return `email:${email.toLowerCase().trim()}`;
    }
    // Fall back to a generic key if no email provided
    // The request will likely fail validation anyway
    return "no-email";
  },
  handler: (req: Request, res: Response) => {
    const retryAfterSeconds = Math.ceil(rateLimitConfig.authPasswordReset.windowMs / 1000);
    res.status(429).json(
      createRateLimitResponse(
        rateLimitConfig.authPasswordReset.message,
        retryAfterSeconds
      )
    );
  }
});

/**
 * General authentication rate limiter
 * Can be used for other auth endpoints that don't have specific limiters
 * Uses default IP-based key generator
 */
export const generalAuthRateLimiter = rateLimit({
  windowMs: rateLimitConfig.auth.windowMs,
  max: rateLimitConfig.auth.max,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => shouldSkipRateLimit(req.ip),
  handler: (req: Request, res: Response) => {
    const retryAfterSeconds = Math.ceil(rateLimitConfig.auth.windowMs / 1000);
    res.status(429).json(
      createRateLimitResponse(
        rateLimitConfig.auth.message,
        retryAfterSeconds
      )
    );
  }
});
