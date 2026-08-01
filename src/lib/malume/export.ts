import type { Anomaly, Insight, Transaction } from "./types";
import { batchVatTotals, formatZAR, txVat } from "./vat";

export function buildInsightsSummary(opts: {
  business: string;
  owner: string;
  transactions: Transaction[];
  anomalies: Record<string, Anomaly[]>;
  insights: Insight[];
  malumeTake: string;
}) {
  const { business, owner, transactions, anomalies, insights, malumeTake } = opts;
  const totals = batchVatTotals(transactions);
  const lines: string[] = [];

  lines.push(`MALUME MONEY — INSIGHTS SUMMARY`);
  lines.push(`Business: ${business || "—"}`);
  lines.push(`Owner: ${owner || "—"}`);
  lines.push(`Generated: ${new Date().toLocaleString("en-ZA")}`);
  lines.push("");
  lines.push(
    "Educational prototype summary built on synthetic data. Not tax or accounting advice.",
  );
  lines.push("");
  lines.push("FIGURES");
  lines.push(`Records: ${transactions.length}`);
  lines.push(`Gross recorded spend: ${formatZAR(totals.gross)}`);
  lines.push(`Net (excl. VAT): ${formatZAR(totals.net)}`);
  lines.push(`VAT confirmed: ${formatZAR(totals.confirmed)}`);
  lines.push(`VAT estimated (labelled, not confirmed): ${formatZAR(totals.estimated)}`);
  lines.push("");
  lines.push("MALUME'S TAKE");
  lines.push(malumeTake);
  lines.push("");
  lines.push("CROSS-TRANSACTION INSIGHTS");
  if (!insights.length) lines.push("None generated for this batch.");
  insights.forEach((i, n) => {
    lines.push(`${n + 1}. ${i.insight}`);
    lines.push(`   Malume: ${i.malume_take}`);
    lines.push(`   Financial effect: ${i.financial_effect}`);
    lines.push(`   Recommended action: ${i.recommended_action}`);
    lines.push(`   Supporting transactions: ${i.supporting_transactions.join(", ")}`);
  });
  lines.push("");
  lines.push("TRANSACTION-LEVEL FLAGS");
  const flags = Object.entries(anomalies);
  if (!flags.length) lines.push("No flags raised on individual records.");
  for (const [id, list] of flags) {
    for (const a of list) {
      lines.push(`${id} — ${a.label} (${Math.round(a.confidence * 100)}% confidence)`);
      lines.push(`   ${a.reasoning}`);
      lines.push(`   Recommended: ${a.recommended_action}`);
      if (a.matched_transaction_id) lines.push(`   Evidence: ${a.matched_transaction_id}`);
    }
  }
  lines.push("");
  lines.push("LEDGER");
  for (const t of transactions) {
    const v = txVat(t);
    lines.push(
      `${t.transaction_id} | ${t.date ?? "no date"} | ${t.merchant ?? "unknown merchant"} | ${formatZAR(
        t.total,
      )} | VAT ${v.vat_amount !== null ? formatZAR(v.vat_amount) : v.vat_amount_estimate !== null ? `${formatZAR(v.vat_amount_estimate)} (est)` : "—"}`,
    );
  }

  return lines.join("\n");
}

export function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
