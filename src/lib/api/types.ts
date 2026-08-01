/**
 * Wire types for the Django backend.
 *
 * These mirror the Django REST Framework serializers exactly (snake_case).
 * They are deliberately separate from the UI types in `@/lib/malume/types`
 * so the backend can evolve without breaking the frontend, and vice versa.
 */

import type {
  ExpenseCategory,
  InvoiceStatus,
  LineItem,
  VatStatus,
} from "@/lib/malume/types";

/** Django REST Framework pagination envelope. */
export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type ApiUser = {
  id: string;
  email: string;
  owner_name: string;
  business_name: string;
  vat_registered: boolean;
  date_joined: string;
};

export type ApiAuthResponse = {
  token: string;
  user: ApiUser;
};

export type UploadStatus = "pending" | "processing" | "extracted" | "failed";

export type ApiUpload = {
  id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  status: UploadStatus;
  /** null until extraction finishes */
  transaction_count: number | null;
  error_message: string | null;
  uploaded_at: string;
};

export type ApiAnomaly = {
  id: string;
  transaction: string;
  type: string;
  label: string;
  matched_transaction: string | null;
  reasoning: string;
  confidence: number;
  recommended_action: string;
  human_approval_required: boolean;
  resolved: boolean;
};

export type ApiTransaction = {
  id: string;
  period: string;
  upload: string | null;
  merchant: string | null;
  date: string | null;
  description: string;
  line_items: LineItem[];
  total: string | null;
  stated_vat: string | null;
  vat_status: VatStatus;
  /** Server-computed, never trusted from the client. */
  vat_amount: string | null;
  net_amount: string | null;
  category: ExpenseCategory;
  category_source: "ai" | "rule" | "user";
  payment_method: string | null;
  missing_information: string[];
  anomalies: ApiAnomaly[];
  edited: boolean;
  approved: boolean;
  created_at: string;
  updated_at: string;
};

export type ApiTransactionInput = Partial<
  Pick<
    ApiTransaction,
    | "merchant"
    | "date"
    | "description"
    | "line_items"
    | "total"
    | "stated_vat"
    | "vat_status"
    | "category"
    | "payment_method"
  >
>;

export type ApiRevision = {
  id: string;
  transaction: string;
  field: string;
  before: string | null;
  after: string | null;
  changed_by: string;
  changed_at: string;
};

export type ApiInsight = {
  id: string;
  period: string;
  insight: string;
  malume_take: string;
  supporting_transactions: string[];
  financial_effect: string;
  recommended_action: string;
  /** user verdict on the insight */
  status: "pending" | "approved" | "rejected";
  generated_at: string;
};

export type ApiPeriod = {
  id: string;
  /** YYYY-MM */
  month: string;
  opened_at: string;
  closed_at: string | null;
  total_expenses: string;
  total_income: string;
  profit: string;
  total_vat: string;
  transaction_count: number;
};

export type ApiCategoryBreakdown = {
  category: ExpenseCategory;
  total: string;
  share: number;
  transaction_count: number;
};

export type ApiClientIncome = {
  client_name: string;
  total: string;
  invoice_count: number;
};

export type ApiInvoice = {
  id: string;
  invoice_number: string;
  client_name: string;
  client_details: string;
  issue_date: string;
  due_date: string;
  line_items: LineItem[];
  vat_status: VatStatus | "none";
  subtotal: string;
  vat_amount: string;
  total: string;
  payment_details_note: string;
  status: InvoiceStatus;
  finalised: boolean;
};

export type ApiInvoiceInput = Omit<
  ApiInvoice,
  "id" | "invoice_number" | "subtotal" | "vat_amount" | "total"
> & { invoice_number?: string };
