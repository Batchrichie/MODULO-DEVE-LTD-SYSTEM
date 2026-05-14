import { Router, Response } from "express";
import { getSupabaseClient } from "../config/supabaseClient";

const router = Router();

router.post("/login", async (req, res: Response) => {
  const { email, password } = req.body ?? {};

  if (email == null || email === "" || password == null || password === "") {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const supabase = getSupabaseClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: String(email),
    password: String(password),
  });

  if (error) {
    return res.status(401).json({ message: error.message });
  }

  const { data: userRow, error: userError } = await supabase
    .from("users")
    .select("role")
    .eq("id", data.user!.id)
    .single();

  if (userError) {
    return res.status(500).json({ message: userError.message });
  }

  return res.status(200).json({
    access_token: data.session!.access_token,
    role: userRow.role,
  });
});

router.post("/logout", async (req, res: Response) => {
  const authHeader = req.headers.authorization;
  const token =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : undefined;

  if (!token) {
    return res.status(401).end();
  }

  const supabase = getSupabaseClient(token);
  const { error } = await supabase.auth.signOut();

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  return res.status(204).end();
});

export default router;
