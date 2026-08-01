/**
 * Resource methods, grouped to match the feature domains in
 * `@/lib/malume/features`. Each group maps 1:1 to a Django app.
 */

import { apiRequest } from "./client";
import { setAuthToken } from "./config";
import type {
  ApiAuthResponse,
  ApiCategoryBreakdown,
  ApiClientIncome,
  ApiInsight,
  ApiInvoice,
  ApiInvoiceInput,
  ApiPeriod,
  ApiRevision,
  ApiTransaction,
  ApiTransactionInput,
  ApiUpload,
  ApiUser,
  Paginated,
} from "./types";

/** accounts — Django app: `accounts` */
export const auth = {
  async register(input: {
    email: string;
    password: string;
    owner_name: string;
    business_name: string;
  }) {
    const res = await apiRequest<ApiAuthResponse>("/auth/register/", {
      method: "POST",
      body: input,
    });
    setAuthToken(res.token);
    return res;
  },
  async login(input: { email: string; password: string }) {
    const res = await apiRequest<ApiAuthResponse>("/auth/login/", {
      method: "POST",
      body: input,
    });
    setAuthToken(res.token);
    return res;
  },
  async logout() {
    try {
      await apiRequest<void>("/auth/logout/", { method: "POST" });
    } finally {
      setAuthToken(null);
    }
  },
  me: () => apiRequest<ApiUser>("/auth/me/"),
  updateProfile: (input: Partial<Pick<ApiUser, "owner_name" | "business_name" | "vat_registered">>) =>
    apiRequest<ApiUser>("/auth/me/", { method: "PATCH", body: input }),
};

/** ingestion — Django app: `uploads` */
export const uploads = {
  list: (query?: { period?: string; page?: number }) =>
    apiRequest<Paginated<ApiUpload>>("/uploads/", { query: query ?? {} }),
  get: (id: string) => apiRequest<ApiUpload>(`/uploads/${id}/`),
  /** PDF, image or plain text — extraction is queued server-side */
  upload: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiRequest<ApiUpload>("/uploads/", { method: "POST", formData: form });
  },
  /** paste-a-batch path, same extraction pipeline */
  submitText: (text: string) =>
    apiRequest<ApiUpload>("/uploads/text/", { method: "POST", body: { text } }),
  remove: (id: string) => apiRequest<void>(`/uploads/${id}/`, { method: "DELETE" }),
};

/** ledger + extraction + anomalies — Django app: `ledger` */
export const transactions = {
  list: (query?: { period?: string; category?: string; flagged?: boolean; page?: number }) =>
    apiRequest<Paginated<ApiTransaction>>("/transactions/", { query: query ?? {} }),
  get: (id: string) => apiRequest<ApiTransaction>(`/transactions/${id}/`),
  update: (id: string, patch: ApiTransactionInput) =>
    apiRequest<ApiTransaction>(`/transactions/${id}/`, { method: "PATCH", body: patch }),
  remove: (id: string) => apiRequest<void>(`/transactions/${id}/`, { method: "DELETE" }),
  /** before/after audit trail for a corrected record */
  revisions: (id: string) => apiRequest<ApiRevision[]>(`/transactions/${id}/revisions/`),
  approve: (id: string) =>
    apiRequest<ApiTransaction>(`/transactions/${id}/approve/`, { method: "POST" }),
  reject: (id: string) =>
    apiRequest<ApiTransaction>(`/transactions/${id}/reject/`, { method: "POST" }),
  resolveAnomaly: (transactionId: string, anomalyId: string) =>
    apiRequest<ApiTransaction>(`/transactions/${transactionId}/anomalies/${anomalyId}/resolve/`, {
      method: "POST",
    }),
};

/** insights + reporting — Django app: `insights` */
export const insights = {
  list: (query?: { period?: string }) =>
    apiRequest<ApiInsight[]>("/insights/", { query: query ?? {} }),
  /** user verdict — feeds the human-review loop */
  setStatus: (id: string, status: "approved" | "rejected") =>
    apiRequest<ApiInsight>(`/insights/${id}/status/`, { method: "POST", body: { status } }),
  spendByCategory: (query?: { period?: string }) =>
    apiRequest<ApiCategoryBreakdown[]>("/insights/spend-by-category/", { query: query ?? {} }),
  incomeByClient: (query?: { period?: string }) =>
    apiRequest<ApiClientIncome[]>("/insights/income-by-client/", { query: query ?? {} }),
};

/** persistence — Django app: `periods` */
export const periods = {
  list: () => apiRequest<ApiPeriod[]>("/periods/"),
  current: () => apiRequest<ApiPeriod>("/periods/current/"),
  get: (month: string) => apiRequest<ApiPeriod>(`/periods/${month}/`),
  close: (month: string) => apiRequest<ApiPeriod>(`/periods/${month}/close/`, { method: "POST" }),
};

/** invoicing — Django app: `invoices` */
export const invoices = {
  list: (query?: { status?: string; page?: number }) =>
    apiRequest<Paginated<ApiInvoice>>("/invoices/", { query: query ?? {} }),
  get: (id: string) => apiRequest<ApiInvoice>(`/invoices/${id}/`),
  create: (input: ApiInvoiceInput) =>
    apiRequest<ApiInvoice>("/invoices/", { method: "POST", body: input }),
  update: (id: string, patch: Partial<ApiInvoiceInput>) =>
    apiRequest<ApiInvoice>(`/invoices/${id}/`, { method: "PATCH", body: patch }),
  setStatus: (id: string, status: "draft" | "sent" | "paid") =>
    apiRequest<ApiInvoice>(`/invoices/${id}/status/`, { method: "POST", body: { status } }),
  remove: (id: string) => apiRequest<void>(`/invoices/${id}/`, { method: "DELETE" }),
};

export const api = { auth, uploads, transactions, insights, periods, invoices };
