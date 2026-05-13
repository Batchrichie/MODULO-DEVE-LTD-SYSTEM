/**
 * Shared TypeScript types — consumed by both client and server.
 * No runtime code here. Types only.
 */

// ─── Users & Auth ─────────────────────────────────────────────────────────────

export type UserRole = "ceo" | "accountant" | "employee" | "admin";
export type InvoiceStatus = "Draft" | "Sent" | "Partial" | "Paid" | "Overdue";
export type ProjectStatus = "Tender" | "Active" | "OnHold" | "Completed" | "Cancelled";
export type JournalStatus = "Draft" | "Posted" | "Reversed" | "Locked";
export type TaxType = "VAT" | "WHT" | "PAYE" | "CIT";
export type TaxPeriodStatus = "Computed" | "Filed" | "Paid";

// ─── Core entities ────────────────────────────────────────────────────────────

export interface User {
  id: string;
  firmId: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface Client {
  id: string;
  firmId: string;
  name: string;
  tin?: string;              // Ghana TIN
  isVatRegistered: boolean;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  createdAt: string;
}

export interface Project {
  id: string;
  firmId: string;
  clientId: string;
  name: string;
  description?: string;
  contractValue: number;
  retentionPercent: number;  // e.g. 0.05 = 5% retention
  status: ProjectStatus;
  startDate: string;
  expectedEndDate?: string;
  actualEndDate?: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  firmId: string;
  projectId: string;
  clientId: string;
  invoiceNumber: string;     // e.g. "INV-2024-001"
  description: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  vatAmount: number;
  nhilAmount: number;
  getfundAmount: number;
  grossTotal: number;
  whtAmount: number;
  netPayable: number;
  applyVat: boolean;
  applyWht: boolean;
  status: InvoiceStatus;
  paidAmount: number;
  notes?: string;
  createdBy: string;         // userId
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  paymentDate: string;
  method: "BankTransfer" | "Cheque" | "Cash" | "MobileMoney";
  reference?: string;
  notes?: string;
  recordedBy: string;        // userId
  createdAt: string;
}

export interface Expense {
  id: string;
  firmId: string;
  projectId?: string;
  supplierId?: string;
  description: string;
  amount: number;
  vatInput: number;          // Claimable input VAT
  category: string;          // e.g. "Materials", "Labour", "Plant", "Subcontractor"
  expenseDate: string;
  receiptUrl?: string;       // S3 URL
  recordedBy: string;
  createdAt: string;
}

export interface Employee {
  id: string;
  firmId: string;
  userId?: string;
  employeeNumber: string;
  fullName: string;
  jobTitle: string;
  department: string;
  grossSalary: number;
  ssnit?: string;
  tin?: string;
  startDate: string;
  isActive: boolean;
  createdAt: string;
}

// ─── API response envelope ────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
  };
}

export interface ApiError {
  error: string;
  details?: Record<string, string[]>;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
