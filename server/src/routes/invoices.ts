import { Router, Response, NextFunction } from "express";
import { getSupabaseClient } from "../config/supabaseClient";
import { computeInvoiceTax } from "../lib/taxComputation";
import {
  requireAuth,
  requireRole,
  AuthenticatedRequest,
} from "../middleware/auth";

const router = Router();

const INVOICE_STATUSES = [
  "Draft",
  "Sent",
  "Partial",
  "Paid",
  "Overdue",
] as const;

type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

function isInvoiceStatus(s: string): s is InvoiceStatus {
  return (INVOICE_STATUSES as readonly string[]).includes(s);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

router.get(
  "/",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const supabase = getSupabaseClient(req.token!);
      const firmId = req.user!.firm_id;
      const statusParam =
        typeof req.query.status === "string" ? req.query.status : undefined;

      if (statusParam !== undefined && !isInvoiceStatus(statusParam)) {
        res.status(400).json({ error: "Invalid status query parameter" });
        return;
      }

      let q = supabase
        .from("invoices")
        .select("*, invoice_tax_breakdowns (*)")
        .eq("firm_id", firmId)
        .is("deleted_at", null);

      if (statusParam) {
        q = q.eq("status", statusParam);
      }

      const { data, error } = await q.order("created_at", { ascending: false });

      if (error) {
        res.status(500).json({ message: error.message });
        return;
      }

      res.status(200).json(data ?? []);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/",
  requireAuth,
  requireRole(["accountant"]),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = req.body ?? {};
      const {
        client_id,
        project_id,
        invoice_number,
        issue_date,
        due_date,
        subtotal: subtotalRaw,
      } = body;

      if (
        client_id == null ||
        client_id === "" ||
        project_id == null ||
        project_id === "" ||
        invoice_number == null ||
        invoice_number === "" ||
        issue_date == null ||
        issue_date === "" ||
        due_date == null ||
        due_date === "" ||
        subtotalRaw == null ||
        subtotalRaw === ""
      ) {
        res
          .status(400)
          .json({
            error:
              "client_id, project_id, invoice_number, issue_date, due_date, and subtotal are required",
          });
        return;
      }

      const subtotal = Number(subtotalRaw);
      if (Number.isNaN(subtotal)) {
        res.status(400).json({ error: "subtotal must be a number" });
        return;
      }

      const applyVat =
        body.apply_vat !== undefined ? Boolean(body.apply_vat) : true;
      const applyWht =
        body.apply_wht !== undefined ? Boolean(body.apply_wht) : false;

      const tax = computeInvoiceTax(subtotal, applyVat, applyWht);
      const supabase = getSupabaseClient(req.token!);
      const user = req.user!;

      const insertRow = {
        firm_id: user.firm_id,
        project_id,
        client_id,
        invoice_number: String(invoice_number),
        issue_date,
        due_date,
        subtotal: tax.subtotal,
        apply_vat: applyVat,
        apply_wht: applyWht,
        status: "Draft" as const,
        paid_amount: 0,
        created_by: user.id,
      };

      const { data: invoice, error: invError } = await supabase
        .from("invoices")
        .insert(insertRow)
        .select("id")
        .single();

      if (invError || !invoice) {
        res.status(500).json({ message: invError?.message ?? "Insert failed" });
        return;
      }

      const breakdownRow = {
        invoice_id: invoice.id,
        subtotal: tax.subtotal,
        vat_amount: tax.vatAmount,
        nhil_amount: tax.nhilAmount,
        getfund_amount: tax.getfundAmount,
        gross_total: tax.grossTotal,
        wht_amount: tax.whtAmount,
        net_payable: tax.netPayable,
      };

      const { error: taxError } = await supabase
        .from("invoice_tax_breakdowns")
        .insert(breakdownRow);

      if (taxError) {
        await supabase.from("invoices").delete().eq("id", invoice.id);
        res.status(500).json({ message: taxError.message });
        return;
      }

      const { data: full, error: fetchError } = await supabase
        .from("invoices")
        .select("*, invoice_tax_breakdowns (*)")
        .eq("id", invoice.id)
        .single();

      if (fetchError || !full) {
        res
          .status(500)
          .json({ message: fetchError?.message ?? "Failed to load invoice" });
        return;
      }

      res.status(201).json(full);
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  "/:id/status",
  requireAuth,
  requireRole(["accountant"]),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const status = req.body?.status;

      if (status == null || status === "" || !isInvoiceStatus(String(status))) {
        res.status(400).json({ error: "Invalid or missing status" });
        return;
      }

      const supabase = getSupabaseClient(req.token!);
      const firmId = req.user!.firm_id;

      const { data, error } = await supabase
        .from("invoices")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("firm_id", firmId)
        .is("deleted_at", null)
        .select()
        .maybeSingle();

      if (error) {
        res.status(500).json({ message: error.message });
        return;
      }

      if (!data) {
        res.status(404).json({ error: "Not found" });
        return;
      }

      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/:id/payments",
  requireAuth,
  requireRole(["accountant"]),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const paymentRaw = req.body?.payment_amount;

      if (
        paymentRaw == null ||
        paymentRaw === "" ||
        Number.isNaN(Number(paymentRaw))
      ) {
        res.status(400).json({ error: "payment_amount is required" });
        return;
      }

      const paymentAmount = round2(Number(paymentRaw));
      if (paymentAmount <= 0) {
        res.status(400).json({ error: "payment_amount must be positive" });
        return;
      }

      const supabase = getSupabaseClient(req.token!);
      const firmId = req.user!.firm_id;

      const { data: inv, error: fetchError } = await supabase
        .from("invoices")
        .select("paid_amount, net_payable, status")
        .eq("id", id)
        .eq("firm_id", firmId)
        .is("deleted_at", null)
        .maybeSingle();

      if (fetchError) {
        res.status(500).json({ message: fetchError.message });
        return;
      }

      if (!inv) {
        res.status(404).json({ error: "Not found" });
        return;
      }

      const netPayable = round2(Number(inv.net_payable));
      const prevPaid = round2(Number(inv.paid_amount));
      const newPaid = round2(prevPaid + paymentAmount);

      let newStatus: InvoiceStatus;
      if (newPaid >= netPayable) {
        newStatus = "Paid";
      } else {
        newStatus = "Partial";
      }

      const paidToStore = newPaid >= netPayable ? netPayable : newPaid;

      const { data: updated, error: updateError } = await supabase
        .from("invoices")
        .update({
          paid_amount: paidToStore,
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("firm_id", firmId)
        .is("deleted_at", null)
        .select()
        .maybeSingle();

      if (updateError) {
        res.status(500).json({ message: updateError.message });
        return;
      }

      if (!updated) {
        res.status(404).json({ error: "Not found" });
        return;
      }

      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/:id",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const supabase = getSupabaseClient(req.token!);
      const { id } = req.params;
      const firmId = req.user!.firm_id;

      const { data, error } = await supabase
        .from("invoices")
        .select("*, invoice_tax_breakdowns (*)")
        .eq("id", id)
        .eq("firm_id", firmId)
        .is("deleted_at", null)
        .maybeSingle();

      if (error) {
        res.status(500).json({ message: error.message });
        return;
      }

      if (!data) {
        res.status(404).json({ error: "Not found" });
        return;
      }

      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
