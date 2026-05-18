// ─── server/auth.ts ──────────────────────────────────────────────────────────
// JWT authentication middleware for fallback mode (when Supabase is not configured).
// Ensures that even in offline/development mode, access is restricted to authenticated users.
// ─────────────────────────────────────────────────────────────────────────────

import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthRequest extends Request {
  userId?: string;
  token?: string;
}

export interface DecodedToken {
  sub: string;      // subject (user ID)
  iat: number;      // issued at
  exp: number;      // expiration time
  email?: string;
}

// ─── Configuration ────────────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key-change-in-production";
const JWT_EXPIRY = process.env.JWT_EXPIRY || "7d";

// ─── Middleware ───────────────────────────────────────────────────────────────

/**
 * Authentication middleware for fallback mode.
 * Validates JWT token in Authorization header and attaches userId to request.
 * 
 * @example
 * app.get("/api/entries", authenticateToken, handleGetEntries);
 */
export function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Missing Authorization header. Use: Authorization: Bearer <token>",
      },
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
    req.userId = decoded.sub;
    req.token = token;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: {
          code: "TOKEN_EXPIRED",
          message: "JWT token has expired. Please refresh your token.",
        },
      });
    } else if (err instanceof jwt.JsonWebTokenError) {
      res.status(403).json({
        success: false,
        error: {
          code: "INVALID_TOKEN",
          message: "Invalid or malformed JWT token.",
        },
      });
    } else {
      res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Token validation failed.",
        },
      });
    }
  }
}

/**
 * Generate a JWT token for development/offline testing.
 * Only available in development mode (NODE_ENV !== 'production').
 * 
 * @param userId - Unique identifier for the user
 * @param email - Optional email address
 * @returns JWT token string
 */
export function generateDevToken(
  userId: string = "dev-user",
  email: string = "dev@example.com"
): string {
  const payload: DecodedToken = {
    sub: userId,
    email,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

/**
 * Verify a JWT token and return decoded payload.
 * 
 * @param token - JWT token string
 * @returns Decoded token object
 * @throws Error if token is invalid or expired
 */
export function verifyToken(token: string): DecodedToken {
  return jwt.verify(token, JWT_SECRET) as DecodedToken;
}

/**
 * Decode a JWT token WITHOUT verification (use with caution).
 * Useful for inspection only - does not validate signature or expiration.
 * 
 * @param token - JWT token string
 * @returns Decoded token object or null if invalid format
 */
export function decodeToken(token: string): DecodedToken | null {
  try {
    const decoded = jwt.decode(token);
    return decoded as DecodedToken | null;
  } catch {
    return null;
  }
}

/**
 * Check if a token is expired.
 * 
 * @param token - JWT token string
 * @returns true if expired, false otherwise
 */
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return true;
    return Math.floor(Date.now() / 1000) >= decoded.exp;
  } catch {
    return true;
  }
}

/**
 * Extract user ID from Authorization header.
 * Useful for logging and debugging.
 * 
 * @param req - Express request object
 * @returns User ID or "anonymous"
 */
export function extractUserId(req: AuthRequest): string {
  if (req.userId) return req.userId;

  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token) {
    const decoded = decodeToken(token);
    if (decoded?.sub) return decoded.sub;
  }

  return "anonymous";
}
