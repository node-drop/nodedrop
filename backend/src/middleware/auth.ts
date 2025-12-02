import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "./errorHandler";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  // Try to get token from Authorization header first, then from cookie
  const authHeader = req.headers.authorization;
  let token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  // If no token in header, try to get it from cookie
  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    throw new AppError("Access token required", 401, "UNAUTHORIZED");
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new AppError("JWT secret not configured", 500, "CONFIG_ERROR");
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as any;
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role || "user",
    };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError("Token expired", 401, "TOKEN_EXPIRED");
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError("Invalid token", 401, "INVALID_TOKEN");
    } else {
      throw new AppError(
        "Token verification failed",
        401,
        "TOKEN_VERIFICATION_FAILED"
      );
    }
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }

    if (!roles.includes(req.user.role)) {
      throw new AppError("Insufficient permissions", 403, "FORBIDDEN");
    }

    next();
  };
};

export const optionalAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return next();
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as any;
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role || "user",
    };
  } catch (error) {
    // Ignore token errors for optional auth
  }

  next();
};
