import { Router, Request, Response } from "express";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";
import { query } from "../config/database";
import jwt from "jsonwebtoken";

const router = Router();

/**
 * POST /api/v1/auth/login
 * Sign in user and return JWT token + role
 */
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password required" });
      return;
    }

    // Query user from database
    const users = await query<{ id: string; email: string; password_hash: string; role: string; firm_id: string }>(
      "SELECT id, email, password_hash, role, firm_id FROM users WHERE email = $1",
      [email]
    );

    if (users.length === 0) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const user = users[0];

    // In production, use bcrypt to compare password_hash with password
    // For now, simple comparison (replace with proper hashing)
    if (user.password_hash !== password) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        firmId: user.firm_id,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "24h" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firmId: user.firm_id,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

/**
 * POST /api/v1/auth/logout
 * Invalidate the JWT (client-side handling)
 */
router.post("/logout", authenticate, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    // JWT is stateless, so logout is client-side (remove token from storage)
    res.json({ message: "Logged out successfully" });
  } catch (err) {
    res.status(500).json({ error: "Logout failed" });
  }
});

export default router;
