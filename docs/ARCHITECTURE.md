# BuildRight & Associates — Architecture Reference

## Overview

Monorepo with three workspaces:

```
buildright/
├── client/       React + TypeScript + Vite (web frontend)
├── server/       Node.js + Express + TypeScript (REST API)
└── shared/       Types shared between client and server
```

## Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file and fill in values
cp .env.example .env

# 3. Create the PostgreSQL database
createdb buildright_dev

# 4. Run migrations
npm run db:migrate

# 5. Seed with development data
npm run db:seed

# 6. Start both client and server in watch mode
npm run dev
```

Client runs at: http://localhost:3000  
API runs at:    http://localhost:4000  
Health check:   http://localhost:4000/api/v1/health  

## API Convention

All endpoints are under `/api/v1/`.  
All responses are JSON wrapped in `{ data }` (success) or `{ error }` (failure).  
Authentication: `Authorization: Bearer <jwt>` header on all protected routes.

## Key Design Decisions

### Single source of truth
Invoice data flows automatically into journals (Phase 3) and VAT returns (Phase 4). No re-entry.

### Soft deletes
No table row is ever deleted. Rows have a `deleted_at` timestamp. Queries filter `WHERE deleted_at IS NULL`.

### Period locking
Accounting periods have a `locked_at` field. Once locked, no journal entries can be backdated into that period.

### Tax rates as config
All GRA tax rates live in `server/src/config/taxRates.ts`. When GRA changes a rate, update that file and redeploy. In Phase 4, this moves to a database config table.

### UTC everywhere
The database connection is forced to UTC (`-c timezone=UTC`). All dates are stored as `TIMESTAMPTZ`. The client formats dates for display in the user's local timezone.

### Audit log
Every mutation (INSERT, UPDATE, soft-delete) writes a row to `audit_log` with old and new data as JSONB. Non-negotiable for GRA audit defence.

## Build Phases

| Phase | Scope | Target Weeks |
|---|---|---|
| 1 | Invoicing, clients, cash flow | 1–8 |
| 2 | Projects, costs, WIP | 9–16 |
| 3 | Double-entry accounting, financial statements | 17–26 |
| 4 | Ghana tax compliance (PAYE, VAT, WHT, CIT) | 27–34 |
| 5 | Employees, timesheets, performance | 35–42 |

## Folder Conventions

### Client (`client/src/`)
- `components/` — UI components, organised by domain
- `pages/` — Route-level page components (one per route)
- `hooks/` — Custom React hooks (e.g. `useInvoices`, `useAuth`)
- `lib/` — Utilities: `apiClient.ts`, `formatters.ts`, `validators.ts`
- `store/` — Zustand global state (auth session, UI state)
- `types/` — Client-only types (extend shared types here)

### Server (`server/src/`)
- `routes/` — Express routers (thin — delegate to controllers)
- `controllers/` — Request/response handling
- `services/` — Business logic (tax computation, invoice generation)
- `models/` — Database query functions (no ORM — raw pg queries)
- `middleware/` — Auth, validation, logging
- `config/` — Database pool, tax rates, environment
- `db/migrations/` — SQL migration files (numbered, forward-only)
- `db/seeds/` — Dev-only seed data SQL
