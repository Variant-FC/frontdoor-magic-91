import type { Transaction } from "./types";
import { batchVatTotals, formatZAR } from "./vat";

/**
 * Builds the fact sheet handed to the model. Every figure here is already
 * computed in code — the model only turns it into sentences.
 */
export function buildBatchFacts(
  transactions: Transaction[],
  anomalyCount: number,
  business?: string,
): string {
  const totals = batchVatTotals(transactions);
  const byCategory = new Map<string, number>();
  for (const t of transactions) {
    byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + (t.total ?? 0));
  }
  const top = [...byCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const unknownVat = transactions.filter((t) => t.vat_status === "unknown").length;

  return [
    `Business: ${business || "this business"}.`,
    `Transactions recorded: ${transactions.length}.`,
    `Total spend including VAT: ${formatZAR(totals.gross)}.`,
    `Input VAT confirmed: ${formatZAR(totals.confirmed)}.`,
    `Transactions with unknown VAT status: ${unknownVat}.`,
    `Flagged transactions needing review: ${anomalyCount}.`,
    top.length
      ? `Biggest spend categories: ${top
          .map(([category, value]) => `${category.replace(/_/g, " ")} ${formatZAR(value)}`)
          .join(", ")}.`
      : "",
    "Write your take on this batch for the owner.",
  ]
    .filter(Boolean)
    .join(" ");
}
