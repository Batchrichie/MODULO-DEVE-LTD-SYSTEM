import { Router, Response } from "express";
import { authenticate, authorize, AuthenticatedRequest } from "../middleware/auth";
import { query } from "../config/database";
import { computeInvoiceTax } from "../lib/taxComputation";

const router = Router();

/**
 * GET /api/v1/invoices
 * List all invoices for the authenticated user's firm
 */
router.get("/", authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const invoices = await query<{
      id: string;
      firm_id: string;
      client: string;
      project: string;
      description: string;
      issue_date: string;
      due_date: string;
      subtotal: number;
      apply_vat: boolean;
      apply_wht: boolean;
      status: string;
      paid_amount: number;
    }>(
      `SELECT id, firm_id, client, project, description, issue_date, due_date, 
              subtotal, apply_vat, apply_wht, status, paid_amount 
       FROM invoices WHERE firm_id = $1 ORDER BY issue_date DESC`,
      [req.user.firmId]
    );

    res.json(
      invoices.map(inv => ({
        id: inv.id,
        client: inv.client,
        project: inv.project,
        description: inv.description,
        issueDate: inv.issue_date,
        dueDate: inv.due_date,
        subtotal: inv.subtotal,
        applyVAT: inv.apply_vat,
        applyWHT: inv.apply_wht,
        status: inv.status,
        paidAmount: inv.paid_amount,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

/**
 * POST /api/v1/invoices
 * Create a new invoice (accountant or ceo only)
 */
router.post("/", authenticate, authorize("accountant", "ceo"), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { client, project, description, issueDate, dueDate, subtotal, applyVAT, applyWHT } = req.body;

    if (!client || !project || subtotal === undefined || issueDate === undefined) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    // Compute taxes
    const tax = computeInvoiceTax(subtotal, applyVAT ?? true, applyWHT ?? false);

    // Generate invoice ID
    const timestamp = Date.now().toString(36).toUpperCase();
    const invoiceId = `INV-${timestamp}`;

    const result = await query<{ id: string }>(
      `INSERT INTO invoices 
       (id, firm_id, client, project, description, issue_date, due_date, subtotal, 
        apply_vat, apply_wht, status, paid_amount, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
       RETURNING id`,
      [invoiceId, req.user.firmId, client, project, description, issueDate, dueDate || issueDate, 
       subtotal, applyVAT ?? true, applyWHT ?? false, "Draft", 0]
    );

    res.status(201).json({
      id: result[0].id,
      client,
      project,
      description,
      issueDate,
      dueDate: dueDate || issueDate,
      subtotal,
      applyVAT: applyVAT ?? true,
      applyWHT: applyWHT ?? false,
      status: "Draft",
      paidAmount: 0,
      tax,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to create invoice" });
  }
});

/**
 * GET /api/v1/invoices/:id
 * Get a specific invoice
 */
router.get("/:id", authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const invoices = await query<{
      id: string;
      client: string;
      project: string;
      description: string;
      issue_date: string;
      due_date: string;
      subtotal: number;
      apply_vat: boolean;
      apply_wht: boolean;
      status: string;
      paid_amount: number;
    }>(
      `SELECT id, client, project, description, issue_date, due_date, 
              subtotal, apply_vat, apply_wht, status, paid_amount 
       FROM invoices WHERE id = $1 AND firm_id = $2`,
      [req.params.id, req.user.firmId]
    );

    if (invoices.length === 0) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }

    const inv = invoices[0];
    const tax = computeInvoiceTax(inv.subtotal, inv.apply_vat, inv.apply_wht);

    res.json({
      id: inv.id,
      client: inv.client,
      project: inv.project,
      description: inv.description,
      issueDate: inv.issue_date,
      dueDate: inv.due_date,
      subtotal: inv.subtotal,
      applyVAT: inv.apply_vat,
      applyWHT: inv.apply_wht,
      status: inv.status,
      paidAmount: inv.paid_amount,
      tax,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch invoice" });
  }
});

/**
 * PATCH /api/v1/invoices/:id
 * Update invoice status or payment info (accountant or ceo only)
 */
router.patch("/:id", authenticate, authorize("accountant", "ceo"), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { status, paidAmount } = req.body;

    const invoices = await query<{ subtotal: number; apply_vat: boolean; apply_wht: boolean }>(
      `SELECT subtotal, apply_vat, apply_wht FROM invoices 
       WHERE id = $1 AND firm_id = $2`,
      [req.params.id, req.user.firmId]
    );

    if (invoices.length === 0) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }

    const inv = invoices[0];
    const updateFields = [];
    const updateValues: any[] = [];
    let paramCount = 1;

    if (status !== undefined) {
      updateFields.push(`status = $${paramCount++}`);
      updateValues.push(status);
    }

    if (paidAmount !== undefined) {
      updateFields.push(`paid_amount = $${paramCount++}`);
      updateValues.push(paidAmount);
    }

    if (updateFields.length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(req.params.id, req.user.firmId);

    const sql = `UPDATE invoices SET ${updateFields.join(", ")} 
                 WHERE id = $${paramCount + 1} AND firm_id = $${paramCount + 2} 
                 RETURNING *`;

    const result = await query<any>(sql, updateValues);

    if (result.length === 0) {
      res.status(500).json({ error: "Failed to update invoice" });
      return;
    }

    const updated = result[0];
    const tax = computeInvoiceTax(inv.subtotal, inv.apply_vat, inv.apply_wht);

    res.json({
      id: updated.id,
      client: updated.client,
      project: updated.project,
      description: updated.description,
      issueDate: updated.issue_date,
      dueDate: updated.due_date,
      subtotal: updated.subtotal,
      applyVAT: updated.apply_vat,
      applyWHT: updated.apply_wht,
      status: updated.status,
      paidAmount: updated.paid_amount,
      tax,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to update invoice" });
  }
});

/**
 * DELETE /api/v1/invoices/:id
 * Delete an invoice (ceo only)
 */
router.delete("/:id", authenticate, authorize("ceo"), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const result = await query<{ id: string }>(
      `DELETE FROM invoices WHERE id = $1 AND firm_id = $2 RETURNING id`,
      [req.params.id, req.user.firmId]
    );

    if (result.length === 0) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }

    res.json({ message: "Invoice deleted", id: result[0].id });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete invoice" });
  }
});

export default router;
