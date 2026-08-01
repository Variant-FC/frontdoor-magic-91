import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { parseBatch } from "./parser";
import { buildInsights, detectAnomalies } from "./analysis";
import type { Invoice, ReviewOutput, Transaction } from "./types";

type Store = {
  transactions: Transaction[];
  anomalies: ReturnType<typeof detectAnomalies>;
  anomalyCount: number;
  insights: ReturnType<typeof buildInsights>;
  review: ReviewOutput | null;
  changesMade: boolean;
  invoices: Invoice[];
  processBatch: (raw: string) => number;
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  removeTransaction: (id: string) => void;
  clearBatch: () => void;
  setReview: (status: "approved" | "rejected") => void;
  saveInvoice: (invoice: Invoice) => void;
  nextInvoiceId: () => string;
};

const Ctx = createContext<Store | null>(null);

export function MalumeProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [review, setReviewState] = useState<ReviewOutput | null>(null);
  const [changesMade, setChangesMade] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const anomalies = useMemo(() => detectAnomalies(transactions), [transactions]);
  const insights = useMemo(() => buildInsights(transactions, anomalies), [transactions, anomalies]);
  const anomalyCount = useMemo(
    () => Object.values(anomalies).reduce((s, l) => s + l.length, 0),
    [anomalies],
  );

  const value: Store = {
    transactions,
    anomalies,
    anomalyCount,
    insights,
    review,
    changesMade,
    invoices,
    processBatch: (raw) => {
      const parsed = parseBatch(raw);
      setTransactions(parsed);
      setReviewState(null);
      setChangesMade(false);
      return parsed.length;
    },
    updateTransaction: (id, patch) => {
      setChangesMade(true);
      setReviewState(null);
      setTransactions((prev) =>
        prev.map((t) => {
          if (t.transaction_id !== id) return t;
          const next = { ...t, ...patch, edited: true };
          const missing: string[] = [];
          if (!next.merchant) missing.push("merchant");
          if (!next.date) missing.push("date");
          if (next.total === null) missing.push("total");
          if (next.vat_status === "unknown") missing.push("vat_status");
          next.missing_information = missing;
          return next;
        }),
      );
    },
    removeTransaction: (id) => {
      setChangesMade(true);
      setReviewState(null);
      setTransactions((prev) => prev.filter((t) => t.transaction_id !== id));
    },
    clearBatch: () => {
      setTransactions([]);
      setReviewState(null);
      setChangesMade(false);
    },
    setReview: (status) =>
      setReviewState({
        review_status: status,
        reviewed_by: "user",
        changes_made: changesMade,
        reviewed_at: new Date().toISOString(),
      }),
    saveInvoice: (invoice) =>
      setInvoices((prev) => {
        const exists = prev.some((i) => i.invoice_id === invoice.invoice_id);
        return exists ? prev.map((i) => (i.invoice_id === invoice.invoice_id ? invoice : i)) : [...prev, invoice];
      }),
    nextInvoiceId: () => `INV-${String(invoices.length + 1).padStart(3, "0")}`,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMalume() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useMalume must be used inside MalumeProvider");
  return ctx;
}
