/**
 * auth.ts — Bearer (Supabase access token) authentication & role checks
 */

import { Request, Response, NextFunction } from "express";
import { getSupabaseClient } from "../config/supabaseClient";

export type UserRole = "ceo" | "accountant" | "employee" | "admin";

export interface AuthenticatedRequest extends Request {
  token?: string;
  user?: {
    id: string;
    email: string;
    role: UserRole;
    firm_id: string;
  };
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  req.token = token;

  try {
    const supabase = getSupabaseClient(token);
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    const { data: row, error: userError } = await supabase
      .from("users")
      .select("id, email, role, firm_id")
      .eq("id", authData.user.id)
      .single();

    if (userError || !row) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    req.user = {
      id: row.id,
      email: row.email,
      role: row.role as UserRole,
      firm_id: row.firm_id,
    };

    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    next();
  };
}
