/**
 * app.ts — Express server setup
 * Configures middleware, routes, and error handling
 */

import express from "express";
import cors from "cors";
import logger from "./utils/logger";

// Import routes
import healthRouter from "./routes/health";
import authRouter from "./routes/auth";
import invoicesRouter from "./routes/invoices";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use("/health", healthRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/invoices", invoicesRouter);

// Health check at root
app.get("/", (req, res) => {
  res.json({ message: "BuildRight API - Under Construction" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

export default app;
  const [invoices, setInvoices] = useState<Invoice[]>(seedInvoices);
  const [showForm, setShowForm] = useState(false);
  const [selectedInv, setSelectedInv] = useState<Invoice | null>(null);
  const [filterStatus, setFilterStatus] = useState<InvoiceStatus | "All">("All");
  const [searchQ, setSearchQ] = useState("");

  const [form, setForm] = useState({
    client: "", project: "", description: "",
    issueDate: new Date().toISOString().split("T")[0],
    dueDate: "", subtotal: "", applyVAT: true, applyWHT: false,
  });

  const filtered = useMemo(() => invoices.filter(inv => {
    const matchStatus = filterStatus === "All" || inv.status === filterStatus;
    const q = searchQ.toLowerCase();
    const matchSearch = !q || inv.client.toLowerCase().includes(q) || inv.project.toLowerCase().includes(q) || inv.id.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  }), [invoices, filterStatus, searchQ]);

  const totals = useMemo(() => {
    let totalInvoiced = 0, totalPaid = 0, totalOverdue = 0, totalVAT = 0;
    invoices.forEach(inv => {
      const t = calcTax(inv);
      totalInvoiced += t.total;
      totalPaid += inv.paidAmount;
      if (inv.status === "Overdue") totalOverdue += t.total;
      if (inv.status === "Paid") totalVAT += t.vat;
    });
    return { totalInvoiced, totalPaid, totalOutstanding: totalInvoiced - totalPaid, totalOverdue, totalVAT };
  }, [invoices]);

  const cashflowData = useMemo(() => {
    const monthly: Record<string, { received: number; expected: number }> = {};
    MONTHS.forEach(m => { monthly[m] = { received: 0, expected: 0 }; });
    invoices.forEach(inv => {
      const mo = MONTHS[new Date(inv.issueDate).getMonth()];
      const t = calcTax(inv);
      if (inv.status === "Paid") monthly[mo].received += inv.paidAmount;
      else monthly[mo].expected += t.total;
    });
    return MONTHS.map(m => ({ month: m, ...monthly[m] }));
  }, [invoices]);

  const maxBar = Math.max(...cashflowData.map(d => Math.max(d.received, d.expected)), 1);

  function submitForm() {
    const sub = parseFloat(form.subtotal);
    if (!form.client || !form.project || !sub) return;
    const newInv: Invoice = {
      id: "INV-2024-" + String(invoices.length + 1).padStart(3, "0"),
      client: form.client, project: form.project, description: form.description,
      issueDate: form.issueDate, dueDate: form.dueDate || form.issueDate,
      subtotal: sub, applyVAT: form.applyVAT, applyWHT: form.applyWHT,
      status: "Draft", paidAmount: 0,
    };
    setInvoices(prev => [newInv, ...prev]);
    setShowForm(false);
    setForm({ client: "", project: "", description: "", issueDate: new Date().toISOString().split("T")[0], dueDate: "", subtotal: "", applyVAT: true, applyWHT: false });
  }

  const previewTax = useMemo(() => {
    const sub = parseFloat(form.subtotal) || 0;
    const vat = form.applyVAT ? sub * VAT_RATE : 0;
    const nhil = form.applyVAT ? sub * NHIL_RATE : 0;
    const getfund = form.applyVAT ? sub * GETFUND_RATE : 0;
    const gross = sub + vat + nhil + getfund;
    const wht = form.applyWHT ? gross * WHT_RATE : 0;
    return { vat, nhil, getfund, gross, wht, total: gross - wht };
  }, [form.subtotal, form.applyVAT, form.applyWHT]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-background-tertiary)", fontFamily: "var(--font-sans)" }}>
      {/* Top nav */}
      <div style={{ background: "#0C1B2E", padding: "0 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "#EF9F27", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="ti ti-building" style={{ color: "#0C1B2E", fontSize: 18 }} aria-hidden="true" />
          </div>
          <div>
            <div style={{ color: "#fff", fontWeight: 500, fontSize: 15, lineHeight: 1.2 }}>BuildRight & Associates</div>
            <div style={{ color: "#6B8CAE", fontSize: 11 }}>Construction & Architecture · Accra, Ghana</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ background: "#EF9F2722", borderRadius: 6, padding: "3px 10px", color: "#EF9F27", fontSize: 12, fontWeight: 500 }}>
            <i className="ti ti-shield-check" style={{ fontSize: 12, marginRight: 4 }} aria-hidden="true" />
            Accountant
          </div>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#185FA5", display: "flex", alignItems: "center", justifyContent: "center", color: "#B5D4F4", fontSize: 13, fontWeight: 500 }}>EA</div>
        </div>
      </div>

      {/* Sidebar + content */}
      <div style={{ display: "flex", minHeight: "calc(100vh - 56px)" }}>
        {/* Sidebar */}
        <div style={{ width: 220, background: "#0F2337", padding: "1.5rem 0", flexShrink: 0 }}>
          {[
            { icon: "ti-layout-dashboard", label: "Dashboard" },
            { icon: "ti-file-invoice", label: "Invoices", active: true },
            { icon: "ti-cash", label: "Cash Flow", active: tab === "cashflow" },
            { icon: "ti-building-skyscraper", label: "Projects" },
            { icon: "ti-book", label: "Journals" },
            { icon: "ti-chart-bar", label: "Reports" },
            { icon: "ti-receipt-tax", label: "Tax & GRA" },
            { icon: "ti-users", label: "Employees" },
          ].map(item => (
            <div
              key={item.label}
              onClick={() => {
                if (item.label === "Invoices") { setTab("invoices"); }
                if (item.label === "Cash Flow") { setTab("cashflow"); }
              }}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 1.5rem", cursor: "pointer",
                color: (item.label === "Invoices" && tab === "invoices") || (item.label === "Cash Flow" && tab === "cashflow") ? "#EF9F27" : "#6B8CAE",
                background: (item.label === "Invoices" && tab === "invoices") || (item.label === "Cash Flow" && tab === "cashflow") ? "#EF9F2712" : "transparent",
                borderLeft: (item.label === "Invoices" && tab === "invoices") || (item.label === "Cash Flow" && tab === "cashflow") ? "3px solid #EF9F27" : "3px solid transparent",
                fontSize: 14, fontWeight: 400, transition: "all 0.15s",
              }}
            >
              <i className={`ti ${item.icon}`} style={{ fontSize: 18 }} aria-hidden="true" />
              {item.label}
            </div>
          ))}
          <div style={{ margin: "2rem 1.5rem 0.5rem", color: "#344D63", fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" }}>Tax Schedules</div>
          {["PAYE", "VAT Return", "WHT", "Corp. Tax"].map(t => (
            <div key={t} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 1.5rem", cursor: "pointer", color: "#4A6580", fontSize: 13 }}>
              <i className="ti ti-point" style={{ fontSize: 14 }} aria-hidden="true" />
              {t}
            </div>
          ))}
        </div>

        {/* Main */}
        <div style={{ flex: 1, padding: "2rem", overflowX: "auto" }}>

          {/* KPI cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: "2rem" }}>
            {[
              { label: "Total Invoiced", value: GHS(totals.totalInvoiced), icon: "ti-file-dollar", accent: "#185FA5", bg: "#E6F1FB" },
              { label: "Total Received", value: GHS(totals.totalPaid), icon: "ti-circle-check", accent: "#3B6D11", bg: "#EAF3DE" },
              { label: "Outstanding", value: GHS(totals.totalOutstanding), icon: "ti-clock-hour-4", accent: "#854F0B", bg: "#FAEEDA" },
              { label: "Overdue", value: GHS(totals.totalOverdue), icon: "ti-alert-triangle", accent: "#A32D2D", bg: "#FCEBEB" },
              { label: "VAT Collected", value: GHS(totals.totalVAT), icon: "ti-receipt-tax", accent: "#533AB7", bg: "#EEEDFE" },
            ].map(card => (
              <div key={card.label} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{card.label}</span>
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: card.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <i className={`ti ${card.icon}`} style={{ fontSize: 15, color: card.accent }} aria-hidden="true" />
                  </div>
                </div>
                <div style={{ fontSize: 18, fontWeight: 500, color: "var(--color-text-primary)" }}>{card.value}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginBottom: "1.5rem", background: "var(--color-background-secondary)", padding: 4, borderRadius: "var(--border-radius-md)", width: "fit-content" }}>
            {(["invoices", "cashflow"] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: "7px 20px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500,
                  background: tab === t ? "var(--color-background-primary)" : "transparent",
                  color: tab === t ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                  boxShadow: tab === t ? "0 0 0 0.5px var(--color-border-secondary)" : "none",
                  transition: "all 0.15s",
                }}
              >
                <i className={`ti ${t === "invoices" ? "ti-file-invoice" : "ti-chart-line"}`} style={{ fontSize: 14, marginRight: 6 }} aria-hidden="true" />
                {t === "invoices" ? "Invoices" : "Cash Flow"}
              </button>
            ))}
          </div>

          {/* INVOICES TAB */}
          {tab === "invoices" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ position: "relative" }}>
                    <i className="ti ti-search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-tertiary)", fontSize: 15 }} aria-hidden="true" />
                    <input
                      value={searchQ} onChange={e => setSearchQ(e.target.value)}
                      placeholder="Search invoices..."
                      style={{ paddingLeft: 32, width: 220, fontSize: 13 }}
                    />
                  </div>
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} style={{ fontSize: 13 }}>
                    <option value="All">All Statuses</option>
                    {(["Draft","Sent","Partial","Paid","Overdue"] as InvoiceStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <button onClick={() => setShowForm(true)} style={{ background: "#EF9F27", color: "#0C1B2E", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 500, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <i className="ti ti-plus" style={{ fontSize: 16 }} aria-hidden="true" />
                  New Invoice
                </button>
              </div>

              {/* Invoice table */}
              <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                        {["Invoice #", "Client", "Project", "Issue Date", "Due Date", "Amount (GHS)", "Status", "Action"].map(h => (
                          <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 500, color: "var(--color-text-secondary)", fontSize: 12, whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((inv, i) => {
                        const t = calcTax(inv);
                        const s = STATUS_STYLE[inv.status];
                        return (
                          <tr
                            key={inv.id}
                            style={{ borderBottom: "0.5px solid var(--color-border-tertiary)", background: i % 2 === 0 ? "transparent" : "var(--color-background-secondary)", cursor: "pointer" }}
                            onClick={() => setSelectedInv(inv)}
                          >
                            <td style={{ padding: "12px 16px", color: "#185FA5", fontWeight: 500 }}>{inv.id}</td>
                            <td style={{ padding: "12px 16px", color: "var(--color-text-primary)" }}>{inv.client}</td>
                            <td style={{ padding: "12px 16px", color: "var(--color-text-secondary)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inv.project}</td>
                            <td style={{ padding: "12px 16px", color: "var(--color-text-secondary)" }}>{inv.issueDate}</td>
                            <td style={{ padding: "12px 16px", color: "var(--color-text-secondary)" }}>{inv.dueDate}</td>
                            <td style={{ padding: "12px 16px", fontWeight: 500, color: "var(--color-text-primary)" }}>{GHS(t.total)}</td>
                            <td style={{ padding: "12px 16px" }}>
                              <span style={{ background: s.bg, color: s.color, borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 5 }}>
                                <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, display: "inline-block" }} />
                                {inv.status}
                              </span>
                            </td>
                            <td style={{ padding: "12px 16px" }}>
                              <button
                                onClick={e => { e.stopPropagation(); setSelectedInv(inv); }}
                                style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, cursor: "pointer", background: "transparent", border: "0.5px solid var(--color-border-secondary)", color: "var(--color-text-secondary)" }}
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {filtered.length === 0 && (
                        <tr><td colSpan={8} style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-tertiary)" }}>No invoices found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Receivables aging */}
              <div style={{ marginTop: "1.5rem", background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1.25rem" }}>
                <div style={{ fontWeight: 500, marginBottom: "1rem", fontSize: 14, color: "var(--color-text-primary)" }}>
                  <i className="ti ti-clock-hour-4" style={{ marginRight: 8, color: "#EF9F27" }} aria-hidden="true" />
                  Receivables Aging
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                  {[
                    { label: "Current (0–30 days)", amount: invoices.filter(i => i.status === "Sent").reduce((s, i) => s + calcTax(i).total, 0), color: "#EAF3DE", text: "#3B6D11" },
                    { label: "30–60 days", amount: invoices.filter(i => i.status === "Partial").reduce((s, i) => s + calcTax(i).total - i.paidAmount, 0), color: "#FAEEDA", text: "#854F0B" },
                    { label: "60–90 days", amount: 0, color: "#FAECE7", text: "#993C1D" },
                    { label: "90+ days (Overdue)", amount: invoices.filter(i => i.status === "Overdue").reduce((s, i) => s + calcTax(i).total, 0), color: "#FCEBEB", text: "#A32D2D" },
                  ].map(bucket => (
                    <div key={bucket.label} style={{ background: bucket.color, borderRadius: "var(--border-radius-md)", padding: "0.75rem 1rem" }}>
                      <div style={{ fontSize: 11, color: bucket.text, marginBottom: 4, opacity: 0.8 }}>{bucket.label}</div>
                      <div style={{ fontSize: 16, fontWeight: 500, color: bucket.text }}>{GHS(bucket.amount)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* CASH FLOW TAB */}
          {tab === "cashflow" && (
            <div>
              <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1.5rem", marginBottom: "1.5rem" }}>
                <div style={{ fontWeight: 500, marginBottom: "1.5rem", fontSize: 14, color: "var(--color-text-primary)" }}>
                  <i className="ti ti-chart-bar" style={{ marginRight: 8, color: "#EF9F27" }} aria-hidden="true" />
                  Monthly Cash Flow — 2024
                </div>
                <div style={{ display: "flex", gap: 16, marginBottom: "1rem" }}>
                  {[{ label: "Received", color: "#639922" }, { label: "Expected", color: "#378ADD" }].map(l => (
                    <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--color-text-secondary)" }}>
                      <span style={{ width: 12, height: 12, borderRadius: 3, background: l.color, display: "inline-block" }} />
                      {l.label}
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 180, overflowX: "auto", paddingBottom: 8 }}>
                  {cashflowData.map(d => (
                    <div key={d.month} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 44 }}>
                      <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 150 }}>
                        <div title={`Received: ${GHS(d.received)}`} style={{ width: 18, background: "#639922", borderRadius: "3px 3px 0 0", height: Math.max(2, (d.received / maxBar) * 150), opacity: 0.9 }} />
                        <div title={`Expected: ${GHS(d.expected)}`} style={{ width: 18, background: "#378ADD", borderRadius: "3px 3px 0 0", height: Math.max(2, (d.expected / maxBar) * 150), opacity: 0.7 }} />
                      </div>
                      <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{d.month}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cash flow summary */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                {[
                  { label: "Total Cash Received (YTD)", value: GHS(totals.totalPaid), icon: "ti-trending-up", color: "#3B6D11", bg: "#EAF3DE" },
                  { label: "Expected (Pending Invoices)", value: GHS(totals.totalOutstanding), icon: "ti-hourglass", color: "#185FA5", bg: "#E6F1FB" },
                  { label: "At Risk (Overdue)", value: GHS(totals.totalOverdue), icon: "ti-alert-circle", color: "#A32D2D", bg: "#FCEBEB" },
                  { label: "VAT Output Liability", value: GHS(invoices.filter(i => i.status !== "Draft").reduce((s, i) => s + calcTax(i).vat, 0)), icon: "ti-receipt-tax", color: "#533AB7", bg: "#EEEDFE" },
                ].map(card => (
                  <div key={card.label} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: card.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <i className={`ti ${card.icon}`} style={{ fontSize: 20, color: card.color }} aria-hidden="true" />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 3 }}>{card.label}</div>
                      <div style={{ fontSize: 17, fontWeight: 500, color: "var(--color-text-primary)" }}>{card.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Upcoming payments */}
              <div style={{ marginTop: "1.5rem", background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1.25rem" }}>
                <div style={{ fontWeight: 500, marginBottom: "1rem", fontSize: 14 }}>
                  <i className="ti ti-calendar-due" style={{ marginRight: 8, color: "#378ADD" }} aria-hidden="true" />
                  Upcoming & Overdue Payments
                </div>
                {invoices.filter(i => ["Sent","Partial","Overdue"].includes(i.status)).map(inv => {
                  const t = calcTax(inv);
                  const remaining = t.total - inv.paidAmount;
                  const s = STATUS_STYLE[inv.status];
                  return (
                    <div key={inv.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{inv.client}</div>
                        <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{inv.id} · Due {inv.dueDate}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ background: s.bg, color: s.color, borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 500 }}>{inv.status}</span>
                        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>{GHS(remaining)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Invoice detail modal */}
      {selectedInv && (() => {
        const t = calcTax(selectedInv);
        const s = STATUS_STYLE[selectedInv.status];
        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "1rem" }}>
            <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", padding: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 500, color: "var(--color-text-primary)" }}>{selectedInv.id}</div>
                  <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 2 }}>{selectedInv.description}</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ background: s.bg, color: s.color, borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 500 }}>{selectedInv.status}</span>
                  <button onClick={() => setSelectedInv(null)} style={{ border: "0.5px solid var(--color-border-secondary)", background: "transparent", cursor: "pointer", borderRadius: 6, padding: "4px 8px", color: "var(--color-text-secondary)" }}>
                    <i className="ti ti-x" style={{ fontSize: 16 }} aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "1.5rem" }}>
                {[
                  { label: "Client", value: selectedInv.client },
                  { label: "Project", value: selectedInv.project },
                  { label: "Issue Date", value: selectedInv.issueDate },
                  { label: "Due Date", value: selectedInv.dueDate },
                ].map(row => (
                  <div key={row.label} style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "0.75rem" }}>
                    <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 3 }}>{row.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{row.value}</div>
                  </div>
                ))}
              </div>

              {/* Tax breakdown */}
              <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", overflow: "hidden", marginBottom: "1.5rem" }}>
                <div style={{ background: "var(--color-background-secondary)", padding: "8px 16px", fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)" }}>Tax Breakdown</div>
                {[
                  { label: "Subtotal", value: GHS(selectedInv.subtotal), bold: false },
                  { label: "VAT (15%)", value: selectedInv.applyVAT ? GHS(t.vat) : "N/A", bold: false },
                  { label: "NHIL (2.5%)", value: selectedInv.applyVAT ? GHS(t.nhil) : "N/A", bold: false },
                  { label: "GETFund (2.5%)", value: selectedInv.applyVAT ? GHS(t.getfund) : "N/A", bold: false },
                  { label: "Gross Total", value: GHS(t.gross), bold: false },
                  { label: "WHT (5%)", value: selectedInv.applyWHT ? `– ${GHS(t.wht)}` : "N/A", bold: false },
                  { label: "Net Payable", value: GHS(t.total), bold: true },
                ].map(row => (
                  <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "9px 16px", borderBottom: "0.5px solid var(--color-border-tertiary)", background: row.bold ? "#FAEEDA" : "transparent" }}>
                    <span style={{ fontSize: 13, color: row.bold ? "#854F0B" : "var(--color-text-secondary)", fontWeight: row.bold ? 500 : 400 }}>{row.label}</span>
                    <span style={{ fontSize: 13, fontWeight: row.bold ? 500 : 400, color: row.bold ? "#854F0B" : "var(--color-text-primary)" }}>{row.value}</span>
                  </div>
                ))}
              </div>

              {selectedInv.paidAmount > 0 && (
                <div style={{ background: "#EAF3DE", borderRadius: "var(--border-radius-md)", padding: "0.75rem 1rem", marginBottom: "1rem", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: "#3B6D11" }}>Amount Paid</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#3B6D11" }}>{GHS(selectedInv.paidAmount)}</span>
                </div>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ flex: 1, padding: "9px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", cursor: "pointer", fontSize: 13, color: "var(--color-text-secondary)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <i className="ti ti-download" style={{ fontSize: 15 }} aria-hidden="true" /> Export PDF
                </button>
                <button style={{ flex: 1, padding: "9px", borderRadius: 8, border: "none", background: "#EF9F27", cursor: "pointer", fontSize: 13, color: "#0C1B2E", fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <i className="ti ti-send" style={{ fontSize: 15 }} aria-hidden="true" /> Send Invoice
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* New invoice form modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "1rem" }}>
          <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", width: "100%", maxWidth: 540, maxHeight: "90vh", overflowY: "auto", padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <div style={{ fontSize: 16, fontWeight: 500 }}>New Invoice</div>
              <button onClick={() => setShowForm(false)} style={{ border: "0.5px solid var(--color-border-secondary)", background: "transparent", cursor: "pointer", borderRadius: 6, padding: "4px 8px", color: "var(--color-text-secondary)" }}>
                <i className="ti ti-x" style={{ fontSize: 16 }} aria-hidden="true" />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { label: "Client Name", key: "client", placeholder: "e.g. Ghana Highways Authority" },
                { label: "Project", key: "project", placeholder: "e.g. Accra Ring Road Extension" },
                { label: "Description", key: "description", placeholder: "Brief description of works" },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>{f.label}</label>
                  <input value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} style={{ width: "100%", fontSize: 13 }} />
                </div>
              ))}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Issue Date</label>
                  <input type="date" value={form.issueDate} onChange={e => setForm(p => ({ ...p, issueDate: e.target.value }))} style={{ width: "100%", fontSize: 13 }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Due Date</label>
                  <input type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} style={{ width: "100%", fontSize: 13 }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Subtotal (GHS)</label>
                <input type="number" value={form.subtotal} onChange={e => setForm(p => ({ ...p, subtotal: e.target.value }))} placeholder="0.00" style={{ width: "100%", fontSize: 13 }} />
              </div>
              <div style={{ display: "flex", gap: 16 }}>
                {[
                  { key: "applyVAT", label: "Apply VAT / NHIL / GETFund" },
                  { key: "applyWHT", label: "Apply WHT (5%)" },
                ].map(f => (
                  <label key={f.key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer", color: "var(--color-text-primary)" }}>
                    <input type="checkbox" checked={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.checked }))} />
                    {f.label}
                  </label>
                ))}
              </div>

              {/* Live tax preview */}
              {parseFloat(form.subtotal) > 0 && (
                <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "1rem", border: "0.5px solid var(--color-border-tertiary)" }}>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 8, fontWeight: 500 }}>Tax Preview</div>
                  {[
                    { label: "Subtotal", value: GHS(parseFloat(form.subtotal) || 0) },
                    { label: "VAT (15%)", value: form.applyVAT ? GHS(previewTax.vat) : "–" },
                    { label: "NHIL (2.5%)", value: form.applyVAT ? GHS(previewTax.nhil) : "–" },
                    { label: "GETFund (2.5%)", value: form.applyVAT ? GHS(previewTax.getfund) : "–" },
                    { label: "WHT (5%)", value: form.applyWHT ? `– ${GHS(previewTax.wht)}` : "–" },
                  ].map(row => (
                    <div key={row.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "3px 0" }}>
                      <span style={{ color: "var(--color-text-secondary)" }}>{row.label}</span>
                      <span style={{ color: "var(--color-text-primary)" }}>{row.value}</span>
                    </div>
                  ))}
                  <div style={{ borderTop: "0.5px solid var(--color-border-secondary)", marginTop: 6, paddingTop: 6, display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#854F0B" }}>Net Payable</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#854F0B" }}>{GHS(previewTax.total)}</span>
                  </div>
                </div>
              )}

              <button onClick={submitForm} style={{ background: "#EF9F27", color: "#0C1B2E", border: "none", borderRadius: 8, padding: "10px", fontWeight: 500, fontSize: 14, cursor: "pointer", marginTop: 4 }}>
                Create Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
