/**
 * auth.ts — JWT authentication & role-based access middleware
 *
 * Usage:
 *   router.get("/invoices", authenticate, authorize("accountant", "ceo"), handler)
 *
 * Implemented fully in Phase 1.
 */

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export type UserRole = "ceo" | "accountant" | "employee" | "admin";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    firmId: string;
  };
}

/** Verify JWT and attach user to request */
export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthenticatedRequest["user"];
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

/** Check that the authenticated user has one of the required roles */
export function authorize(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    next();
  };
}
