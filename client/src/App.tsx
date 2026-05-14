/**
 * BuildRight app shell — single-file layout (top nav, sidebar, main areas).
 * Default export: AppShell
 */

import { useEffect, useMemo, useState } from "react";
import type { JSX } from "react";

type ActiveTab = "invoices" | "cashflow";

const NAV_HEIGHT = 54;
const SIDEBAR_W = 215;

const INVOICE_STATUSES = ["Draft", "Sent", "Partial", "Paid", "Overdue"] as const;

type InvoiceTaxBreakdown = {
  subtotal?: number | string | null;
  vat_amount?: number | string | null;
  nhil_amount?: number | string | null;
  getfund_amount?: number | string | null;
  gross_total?: number | string | null;
  wht_amount?: number | string | null;
  net_payable?: number | string | null;
};

type InvoiceRow = {
  id?: string;
  invoice_number?: string | null;
  description?: string | null;
  client_id?: string | null;
  issue_date?: string | null;
  due_date?: string | null;
  status?: string | null;
  paid_amount?: number | string | null;
  apply_wht?: boolean | null;
  invoice_tax_breakdowns?: InvoiceTaxBreakdown | InvoiceTaxBreakdown[] | null;
};

function invoicesApiUrl(): string {
  const base = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (base && base.trim()) {
    const trimmed = base.replace(/\/$/, "");
    return `${trimmed}/invoices`;
  }
  return "/api/v1/invoices";
}

function getTaxBreakdown(inv: InvoiceRow): InvoiceTaxBreakdown | null {
  const b = inv.invoice_tax_breakdowns;
  if (!b) return null;
  return Array.isArray(b) ? b[0] ?? null : b;
}

function getNetPayable(inv: InvoiceRow): number {
  const row = getTaxBreakdown(inv);
  const n = row?.net_payable;
  const num = typeof n === "string" ? parseFloat(n) : Number(n);
  return Number.isFinite(num) ? num : 0;
}

function toNum(v: number | string | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatGHS(amount: number): string {
  return `GHS ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// —— Icons ——————————————————————————————————————————————————————————

function IconBuilding({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M3 21h18M5 21V7l8-4v18M13 21V11l4-2v12M9 9v.01M9 12v.01M9 15v.01M9 18v.01" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconDashboard({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}

function IconInvoice({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinejoin="round" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" />
    </svg>
  );
}

function IconCashFlow({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconExpenses({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  );
}

function IconClients({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" />
    </svg>
  );
}

function IconPayments({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="1" y="4" width="22" height="16" rx="2" />
      <path d="M1 10h22" />
    </svg>
  );
}

function IconReports({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M18 20V10M12 20V4M6 20v-6" strokeLinecap="round" />
    </svg>
  );
}

function IconSettings({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeLinecap="round" />
    </svg>
  );
}

// —— TopNav —————————————————————————————————————————————————————————

function TopNav() {
  return (
    <header
      className="app-topnav"
      style={{
        height: NAV_HEIGHT,
        minHeight: NAV_HEIGHT,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingLeft: 24,
        paddingRight: 24,
        background: "linear-gradient(180deg, #0d3a66 0%, #0a2f56 100%)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: "linear-gradient(145deg, #f0b429 0%, #d4921a 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#0a2f56",
            flexShrink: 0,
          }}
          aria-hidden
        >
          <IconBuilding size={20} />
        </div>
        <div>
          <div
            style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700,
              fontSize: 17,
              letterSpacing: "-0.02em",
              color: "#fff",
              lineHeight: 1.15,
            }}
          >
            BuildRight & Associates
          </div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 11,
              fontWeight: 500,
              color: "rgba(255,255,255,0.62)",
              marginTop: 2,
              letterSpacing: "0.01em",
            }}
          >
            Construction & Architecture · Accra, Ghana
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: "0.12em",
            color: "#0a2f56",
            background: "rgba(255,255,255,0.92)",
            padding: "6px 14px",
            borderRadius: 999,
            boxShadow: "0 1px 2px rgba(0,0,0,0.12)",
          }}
        >
          ACCOUNTANT
        </div>
        <div
          title="Efua Asante"
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #2d6fb8 0%, #1a5088 100%)",
            border: "2px solid rgba(255,255,255,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'Inter', sans-serif",
            fontWeight: 600,
            fontSize: 12,
            color: "#e8f2fc",
          }}
        >
          EA
        </div>
      </div>
    </header>
  );
}

// —— Sidebar ————————————————————————————————————————————————————————

type NavIcon = ({ size }: { size?: number }) => JSX.Element;

const mainNav: { id: string; label: string; icon: NavIcon }[] = [
  { id: "dashboard", label: "Dashboard", icon: IconDashboard },
  { id: "invoices", label: "Invoices", icon: IconInvoice },
  { id: "cashflow", label: "Cash Flow", icon: IconCashFlow },
  { id: "expenses", label: "Expenses", icon: IconExpenses },
  { id: "clients", label: "Clients", icon: IconClients },
  { id: "payments", label: "Payments", icon: IconPayments },
  { id: "reports", label: "Reports", icon: IconReports },
  { id: "settings", label: "Settings", icon: IconSettings },
];

const taxItems = ["PAYE", "VAT Return", "WHT", "Corp. Tax"] as const;

function Sidebar({
  activeTab,
  setActiveTab,
}: {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}) {
  return (
    <aside
      style={{
        width: SIDEBAR_W,
        minWidth: SIDEBAR_W,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(180deg, #0c3358 0%, #082642 100%)",
        borderRight: "1px solid rgba(255,255,255,0.1)",
        paddingTop: 20,
        paddingBottom: 24,
        overflowY: "auto",
      }}
    >
      <div
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.14em",
          color: "rgba(255,255,255,0.38)",
          paddingLeft: 20,
          paddingRight: 16,
          marginBottom: 10,
        }}
      >
        MENU
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 2, paddingLeft: 8, paddingRight: 10 }}>
        {mainNav.map((item) => {
          const Icon = item.icon;
          const active = item.id === activeTab;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (item.id === "invoices") setActiveTab("invoices");
                if (item.id === "cashflow") setActiveTab("cashflow");
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px 10px 14px",
                border: "none",
                borderRadius: 8,
                background: active ? "rgba(255,255,255,0.1)" : "transparent",
                color: active ? "#fff" : "rgba(255,255,255,0.72)",
                fontFamily: "'Inter', sans-serif",
                fontSize: 13.5,
                fontWeight: active ? 600 : 500,
                cursor: "pointer",
                textAlign: "left",
                position: "relative",
                boxShadow: active ? "inset 3px 0 0 #5eb0ff" : "inset 3px 0 0 transparent",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              <span style={{ opacity: active ? 1 : 0.85, display: "flex" }}>
                <Icon size={18} />
              </span>
              {item.label}
            </button>
          );
        })}
      </nav>

      <div style={{ height: 28, flexShrink: 0 }} />

      <div
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.12em",
          color: "rgba(255,255,255,0.38)",
          paddingLeft: 20,
          paddingRight: 16,
          marginBottom: 10,
        }}
      >
        TAX SCHEDULES
      </div>
      <ul
        style={{
          listStyle: "none",
          paddingLeft: 22,
          paddingRight: 12,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {taxItems.map((label) => (
          <li
            key={label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontFamily: "'Inter', sans-serif",
              fontSize: 12.5,
              fontWeight: 500,
              color: "rgba(255,255,255,0.58)",
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.35)",
                flexShrink: 0,
              }}
            />
            {label}
          </li>
        ))}
      </ul>
    </aside>
  );
}

const INVOICE_STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  Draft: { bg: "#e2e8f0", color: "#475569" },
  Sent: { bg: "#dbeafe", color: "#1d4ed8" },
  Partial: { bg: "#fef3c7", color: "#b45309" },
  Paid: { bg: "#dcfce7", color: "#15803d" },
  Overdue: { bg: "#fee2e2", color: "#b91c1c" },
};

function InvoiceDetailModal({ invoice, onClose }: { invoice: InvoiceRow; onClose: () => void }) {
  const tb = getTaxBreakdown(invoice);
  const status = String(invoice.status ?? "Draft");
  const badge = INVOICE_STATUS_BADGE[status] ?? INVOICE_STATUS_BADGE.Draft;
  const paid = toNum(invoice.paid_amount);
  const net = getNetPayable(invoice);
  const barPct = paid > 0 && net > 0 ? Math.min(100, (paid / net) * 100) : 0;
  const applyWht = Boolean(invoice.apply_wht);

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: "rgba(15, 23, 42, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 560,
          maxHeight: "90vh",
          overflow: "auto",
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 25px 50px rgba(0,0,0,0.2)",
          padding: "28px 28px 24px",
        }}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            width: 36,
            height: 36,
            border: "none",
            borderRadius: 8,
            background: "#f1f5f9",
            cursor: "pointer",
            fontSize: 20,
            lineHeight: 1,
            color: "#475569",
          }}
        >
          ×
        </button>

        <h2
          style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 22,
            fontWeight: 800,
            color: "#0a2f56",
            marginBottom: 16,
            paddingRight: 40,
          }}
        >
          Invoice detail
        </h2>

        <div style={{ display: "grid", gap: 12, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", letterSpacing: "0.05em", marginBottom: 4 }}>
              INVOICE NUMBER
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#0f172a" }}>{invoice.invoice_number ?? "—"}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", letterSpacing: "0.05em", marginBottom: 4 }}>
              DESCRIPTION
            </div>
            <div style={{ fontSize: 14, color: "#334155" }}>
              {invoice.description != null && String(invoice.description).trim() !== "" ? invoice.description : "—"}
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", letterSpacing: "0.05em", marginBottom: 4 }}>
                ISSUE DATE
              </div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{invoice.issue_date ?? "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", letterSpacing: "0.05em", marginBottom: 4 }}>
                DUE DATE
              </div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{invoice.due_date ?? "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", letterSpacing: "0.05em", marginBottom: 4 }}>
                STATUS
              </div>
              <span
                style={{
                  display: "inline-block",
                  padding: "4px 12px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  background: badge.bg,
                  color: badge.color,
                }}
              >
                {status}
              </span>
            </div>
          </div>
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8 }}>Tax breakdown</div>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20, fontSize: 13 }}>
          <tbody>
            {(
              [
                ["Subtotal", tb ? formatGHS(toNum(tb.subtotal)) : formatGHS(0)],
                ["VAT 15%", tb ? formatGHS(toNum(tb.vat_amount)) : formatGHS(0)],
                ["NHIL 2.5%", tb ? formatGHS(toNum(tb.nhil_amount)) : formatGHS(0)],
                ["GETFund 2.5%", tb ? formatGHS(toNum(tb.getfund_amount)) : formatGHS(0)],
                ["Gross Total", tb ? formatGHS(toNum(tb.gross_total)) : formatGHS(0)],
                ["WHT 5%", applyWht ? (tb ? formatGHS(toNum(tb.wht_amount)) : formatGHS(0)) : "N/A"],
                ["Net Payable", tb ? formatGHS(toNum(tb.net_payable)) : formatGHS(0)],
              ] as [string, string][]
            ).map(([label, val]) => (
              <tr key={label} style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "8px 0", color: "#64748b" }}>{label}</td>
                <td style={{ padding: "8px 0", textAlign: "right", fontWeight: 600, color: "#0f172a" }}>{val}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 700, color: "#475569" }}>Payment</div>
        <div style={{ height: 8, borderRadius: 999, background: "#e2e8f0", overflow: "hidden", marginBottom: 8 }}>
          <div
            style={{
              height: "100%",
              width: paid > 0 ? `${barPct}%` : 0,
              borderRadius: 999,
              background: "linear-gradient(90deg, #22c55e 0%, #16a34a 100%)",
              transition: "width 0.2s ease",
            }}
          />
        </div>
        <div style={{ fontSize: 13, color: "#334155", marginBottom: 24 }}>
          {formatGHS(paid)} paid of {formatGHS(net)}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            paddingTop: 8,
            borderTop: "1px solid #e2e8f0",
          }}
        >
          <button
            type="button"
            style={{
              flex: 1,
              padding: "12px 16px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              background: "#fff",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Export PDF
          </button>
          <button
            type="button"
            style={{
              flex: 1,
              padding: "12px 16px",
              borderRadius: 8,
              border: "none",
              background: "linear-gradient(145deg, #f0b429 0%, #d4921a 100%)",
              color: "#0a2f56",
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Send Invoice
          </button>
        </div>
      </div>
    </div>
  );
}

// —— Invoices module ——————————————————————————————————————————————————

function InvoicesModule() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [detailInvoice, setDetailInvoice] = useState<InvoiceRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem("access_token");

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(invoicesApiUrl(), {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token ?? ""}`,
            Accept: "application/json",
          },
        });
        const text = await res.text();
        let data: unknown = null;
        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          data = null;
        }
        if (!res.ok) {
          const msg =
            data && typeof data === "object" && data !== null && "message" in data
              ? String((data as { message?: unknown }).message)
              : data && typeof data === "object" && data !== null && "error" in data
                ? String((data as { error?: unknown }).error)
                : res.statusText || `HTTP ${res.status}`;
          throw new Error(msg || "Request failed");
        }
        if (!Array.isArray(data)) {
          throw new Error("Invalid response: expected an array of invoices");
        }
        if (!cancelled) setInvoices(data as InvoiceRow[]);
      } catch (e) {
        if (!cancelled) {
          setInvoices([]);
          setError(e instanceof Error ? e.message : "Failed to load invoices");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const metrics = useMemo(() => {
    let totalInvoiced = 0;
    let totalReceived = 0;
    let overdue = 0;
    for (const inv of invoices) {
      const net = getNetPayable(inv);
      totalInvoiced += net;
      totalReceived += toNum(inv.paid_amount);
      if (String(inv.status) === "Overdue") overdue += net;
    }
    const outstanding = totalInvoiced - totalReceived;
    return { totalInvoiced, totalReceived, outstanding, overdue };
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter((inv) => {
      const num = String(inv.invoice_number ?? "").toLowerCase();
      const matchSearch = !q || num.includes(q);
      const st = String(inv.status ?? "");
      const matchStatus = !statusFilter || st === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [invoices, search, statusFilter]);

  const cardStyle = {
    flex: 1,
    minWidth: 140,
    background: "#f7f9fc",
    border: "1px solid #e1e8ef",
    borderRadius: 12,
    padding: "16px 18px",
    fontFamily: "'Inter', sans-serif",
  };

  if (loading) {
    return (
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          fontFamily: "'Inter', sans-serif",
          color: "#4a6578",
        }}
      >
        Loading invoices…
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
          background: "#ffffff",
        }}
      >
        <div
          style={{
            maxWidth: 480,
            padding: 20,
            borderRadius: 12,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            fontFamily: "'Inter', sans-serif",
            fontSize: 14,
          }}
        >
          {error}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        overflow: "auto",
        background: "#ffffff",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ padding: "24px 28px 0" }}>
        <h1
          style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 800,
            fontSize: 26,
            letterSpacing: "-0.03em",
            color: "#0a2f56",
            marginBottom: 20,
          }}
        >
          Invoices
        </h1>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 14,
            marginBottom: 24,
          }}
        >
          <div style={cardStyle}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", letterSpacing: "0.06em", marginBottom: 6 }}>
              TOTAL INVOICED
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#0a2f56" }}>{formatGHS(metrics.totalInvoiced)}</div>
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", letterSpacing: "0.06em", marginBottom: 6 }}>
              TOTAL RECEIVED
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#0a2f56" }}>{formatGHS(metrics.totalReceived)}</div>
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", letterSpacing: "0.06em", marginBottom: 6 }}>
              OUTSTANDING
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#0a2f56" }}>{formatGHS(metrics.outstanding)}</div>
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", letterSpacing: "0.06em", marginBottom: 6 }}>
              OVERDUE
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#b45309" }}>{formatGHS(metrics.overdue)}</div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <input
            type="search"
            placeholder="Search by invoice number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: "1 1 220px",
              maxWidth: 360,
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid #c8d0da",
              fontFamily: "'Inter', sans-serif",
              fontSize: 14,
            }}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid #c8d0da",
              fontFamily: "'Inter', sans-serif",
              fontSize: 14,
              minWidth: 160,
              background: "#fff",
            }}
          >
            <option value="">All statuses</option>
            {INVOICE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            type="button"
            style={{
              marginLeft: "auto",
              padding: "10px 20px",
              borderRadius: 8,
              border: "none",
              background: "linear-gradient(145deg, #f0b429 0%, #d4921a 100%)",
              color: "#0a2f56",
              fontFamily: "'Inter', sans-serif",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            New Invoice
          </button>
        </div>
      </div>

      <div style={{ padding: "0 28px 28px", flex: 1 }}>
        <div
          style={{
            border: "1px solid #e1e8ef",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
            }}
          >
            <thead>
              <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                {["Invoice Number", "Client ID", "Issue Date", "Due Date", "Amount (net_payable)", "Status"].map((h) => (
                  <th key={h} style={{ padding: "12px 14px", fontWeight: 600, color: "#475569", borderBottom: "1px solid #e1e8ef" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 24, textAlign: "center", color: "#64748b" }}>
                    No invoices match your filters.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr
                    key={inv.id ?? `${inv.invoice_number}-${inv.issue_date}`}
                    onClick={() => setDetailInvoice(inv)}
                    style={{
                      borderBottom: "1px solid #eef2f6",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.background = "#f8fafc";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.background = "transparent";
                    }}
                  >
                    <td style={{ padding: "12px 14px", fontWeight: 500 }}>{inv.invoice_number ?? "—"}</td>
                    <td style={{ padding: "12px 14px", color: "#334155" }}>{inv.client_id ?? "—"}</td>
                    <td style={{ padding: "12px 14px" }}>{inv.issue_date ?? "—"}</td>
                    <td style={{ padding: "12px 14px" }}>{inv.due_date ?? "—"}</td>
                    <td style={{ padding: "12px 14px", fontWeight: 600 }}>{formatGHS(getNetPayable(inv))}</td>
                    <td style={{ padding: "12px 14px" }}>{inv.status ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {detailInvoice ? <InvoiceDetailModal invoice={detailInvoice} onClose={() => setDetailInvoice(null)} /> : null}
    </div>
  );
}

function CashFlowModulePlaceholder() {
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 48,
        background: "#ffffff",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 420 }}>
        <div
          style={{
            width: 120,
            height: 120,
            margin: "0 auto 28px",
            borderRadius: 28,
            background: "linear-gradient(145deg, #e8f2fc 0%, #d4e7f7 45%, #c5ddf3 100%)",
            border: "1px solid rgba(10, 47, 86, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#1a5088",
            boxShadow: "0 12px 40px rgba(10, 47, 86, 0.08)",
          }}
          aria-hidden
        >
          <IconCashFlow size={56} />
        </div>
        <h1
          style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 800,
            fontSize: "clamp(1.75rem, 4vw, 2.25rem)",
            letterSpacing: "-0.03em",
            color: "#0a2f56",
            lineHeight: 1.15,
            marginBottom: 14,
          }}
        >
          Cash Flow Module
        </h1>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 16,
            fontWeight: 400,
            lineHeight: 1.55,
            color: "#4a6578",
          }}
        >
          Create, track, and manage client invoices with precision and ease.
        </p>
      </div>
    </div>
  );
}

// —— Shell ——————————————————————————————————————————————————————————

export default function AppShell() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("invoices");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: "100vh",
        overflow: "hidden",
        background: "#ffffff",
      }}
    >
      <TopNav />
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        {activeTab === "invoices" ? <InvoicesModule /> : <CashFlowModulePlaceholder />}
      </div>
    </div>
  );
}
