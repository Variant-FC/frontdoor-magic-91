export type VatStatus = "inclusive" | "exclusive" | "unknown";

export type ExpenseCategory =
  | "office_supplies"
  | "transport"
  | "food_and_entertainment"
  | "utilities"
  | "software_and_subscriptions"
  | "stock_and_materials"
  | "professional_services"
  | "marketing"
  | "other";

export const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: "office_supplies", label: "Office supplies" },
  { value: "transport", label: "Transport" },
  { value: "food_and_entertainment", label: "Food & entertainment" },
  { value: "utilities", label: "Utilities" },
  { value: "software_and_subscriptions", label: "Software & subscriptions" },
  { value: "stock_and_materials", label: "Stock & materials" },
  { value: "professional_services", label: "Professional services" },
  { value: "marketing", label: "Marketing" },
  { value: "other", label: "Other" },
];

export type LineItem = {
  description: string;
  quantity: number;
  unit_price: number;
};

export type Anomaly = {
  type: string;
  label: string;
  matched_transaction_id?: string;
  reasoning: string;
  confidence: number;
  recommended_action: string;
  human_approval_required: boolean;
};

export type Transaction = {
  transaction_id: string;
  merchant: string | null;
  date: string | null;
  description: string;
  line_items: LineItem[];
  total: number | null;
  stated_vat: number | null;
  vat_status: VatStatus;
  category: ExpenseCategory;
  payment_method: string | null;
  missing_information: string[];
  /** user opted in to an estimated VAT figure for unknown status */
  vat_estimate_opt_in: boolean;
  raw_text: string;
  edited: boolean;
};

export type Insight = {
  insight: string;
  malume_take: string;
  supporting_transactions: string[];
  financial_effect: string;
  recommended_action: string;
};

export type InvoiceStatus = "draft" | "sent" | "paid";

export type Invoice = {
  invoice_id: string;
  client_name: string;
  client_details: string;
  issue_date: string;
  due_date: string;
  line_items: LineItem[];
  vat_status: VatStatus | "none";
  payment_details_note: string;
  status: InvoiceStatus;
  finalised: boolean;
};

export type ReviewOutput = {
  review_status: "approved" | "rejected";
  reviewed_by: "user";
  changes_made: boolean;
  reviewed_at: string;
};
