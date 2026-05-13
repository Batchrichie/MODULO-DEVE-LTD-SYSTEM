-- ─────────────────────────────────────────────────────────────────
-- Migration 001 — Initial Schema
-- BuildRight & Associates Management System
--
-- Covers Phase 1 entities: firms, users, clients, projects, invoices, payments
-- Run with: psql $DATABASE_URL -f 001_initial_schema.sql
-- ─────────────────────────────────────────────────────────────────

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Firms (multi-tenancy foundation) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS firms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  tin             TEXT,                   -- GRA Tax Identification Number
  vat_number      TEXT,                   -- GRA VAT registration number
  address         TEXT,
  email           TEXT,
  phone           TEXT,
  logo_url        TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Users ─────────────────────────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('ceo', 'accountant', 'employee', 'admin');

CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id         UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  password_hash   TEXT NOT NULL,
  full_name       TEXT NOT NULL,
  role            user_role NOT NULL DEFAULT 'employee',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_email_firm_unique UNIQUE (email, firm_id)
);

-- ── Clients ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id         UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  tin             TEXT,
  is_vat_registered BOOLEAN NOT NULL DEFAULT FALSE,
  contact_email   TEXT,
  contact_phone   TEXT,
  address         TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Projects ──────────────────────────────────────────────────────────────────
CREATE TYPE project_status AS ENUM ('Tender', 'Active', 'OnHold', 'Completed', 'Cancelled');

CREATE TABLE IF NOT EXISTS projects (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id             UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  client_id           UUID NOT NULL REFERENCES clients(id),
  name                TEXT NOT NULL,
  description         TEXT,
  contract_value      NUMERIC(15, 2) NOT NULL DEFAULT 0,
  retention_percent   NUMERIC(5, 4) NOT NULL DEFAULT 0.05,  -- 5% default
  status              project_status NOT NULL DEFAULT 'Active',
  start_date          DATE NOT NULL,
  expected_end_date   DATE,
  actual_end_date     DATE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Invoices ──────────────────────────────────────────────────────────────────
CREATE TYPE invoice_status AS ENUM ('Draft', 'Sent', 'Partial', 'Paid', 'Overdue');

CREATE TABLE IF NOT EXISTS invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id         UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES projects(id),
  client_id       UUID NOT NULL REFERENCES clients(id),
  invoice_number  TEXT NOT NULL,
  description     TEXT,
  issue_date      DATE NOT NULL,
  due_date        DATE NOT NULL,
  -- Amounts stored as computed columns to avoid recomputation errors
  subtotal        NUMERIC(15, 2) NOT NULL DEFAULT 0,
  vat_amount      NUMERIC(15, 2) NOT NULL DEFAULT 0,
  nhil_amount     NUMERIC(15, 2) NOT NULL DEFAULT 0,
  getfund_amount  NUMERIC(15, 2) NOT NULL DEFAULT 0,
  gross_total     NUMERIC(15, 2) NOT NULL DEFAULT 0,
  wht_amount      NUMERIC(15, 2) NOT NULL DEFAULT 0,
  net_payable     NUMERIC(15, 2) NOT NULL DEFAULT 0,
  apply_vat       BOOLEAN NOT NULL DEFAULT TRUE,
  apply_wht       BOOLEAN NOT NULL DEFAULT FALSE,
  status          invoice_status NOT NULL DEFAULT 'Draft',
  paid_amount     NUMERIC(15, 2) NOT NULL DEFAULT 0,
  notes           TEXT,
  created_by      UUID NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Soft delete
  deleted_at      TIMESTAMPTZ,
  CONSTRAINT invoices_number_firm_unique UNIQUE (invoice_number, firm_id)
);

-- ── Payments (against invoices) ───────────────────────────────────────────────
CREATE TYPE payment_method AS ENUM ('BankTransfer', 'Cheque', 'Cash', 'MobileMoney');

CREATE TABLE IF NOT EXISTS payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      UUID NOT NULL REFERENCES invoices(id),
  amount          NUMERIC(15, 2) NOT NULL,
  payment_date    DATE NOT NULL,
  method          payment_method NOT NULL DEFAULT 'BankTransfer',
  reference       TEXT,
  notes           TEXT,
  recorded_by     UUID NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Audit log (required for GRA audit defence) ────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id         UUID REFERENCES firms(id),
  user_id         UUID REFERENCES users(id),
  table_name      TEXT NOT NULL,
  record_id       UUID NOT NULL,
  action          TEXT NOT NULL,  -- 'INSERT', 'UPDATE', 'DELETE', 'VIEW'
  old_data        JSONB,
  new_data        JSONB,
  ip_address      INET,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_firm         ON users(firm_id);
CREATE INDEX IF NOT EXISTS idx_clients_firm       ON clients(firm_id);
CREATE INDEX IF NOT EXISTS idx_projects_firm      ON projects(firm_id);
CREATE INDEX IF NOT EXISTS idx_projects_client    ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_firm      ON invoices(firm_id);
CREATE INDEX IF NOT EXISTS idx_invoices_project   ON invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client    ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status    ON invoices(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_due_date  ON invoices(due_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payments_invoice   ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_record   ON audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_firm     ON audit_log(firm_id, created_at DESC);
