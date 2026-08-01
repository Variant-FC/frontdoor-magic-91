import type { Anomaly, Insight, Transaction } from "./types";
import { CATEGORIES } from "./types";
import { computeVat, formatZAR, round2 } from "./vat";

const catLabel = (v: string) => CATEGORIES.find((c) => c.value === v)?.label ?? v;

/** All anomalies are derived in code from the current (possibly edited) ledger. */
export function detectAnomalies(transactions: Transaction[]): Record<string, Anomaly[]> {
  const out: Record<string, Anomaly[]> = {};
  const push = (id: string, a: Anomaly) => {
    (out[id] ||= []).push(a);
  };

  // duplicates
  const seen = new Map<string, string>();
  for (const t of transactions) {
    const key = [t.merchant?.toLowerCase() ?? "", t.date ?? "", t.total ?? "", t.payment_method ?? ""].join("|");
    if (!t.merchant || t.total === null) continue;
    const first = seen.get(key);
    if (first) {
      push(t.transaction_id, {
        type: "probable_duplicate",
        label: "Probable duplicate",
        matched_transaction_id: first,
        reasoning: `Merchant, date, total (${formatZAR(t.total)}) and payment method are identical to ${first}.`,
        confidence: 0.99,
        recommended_action: `Review both transactions before adding ${t.transaction_id} to the ledger.`,
        human_approval_required: true,
      });
    } else {
      seen.set(key, t.transaction_id);
    }
  }

  const amounts = transactions.map((t) => t.total ?? 0).filter((n) => n > 0);
  const mean = amounts.length ? amounts.reduce((a, b) => a + b, 0) / amounts.length : 0;
  const sd = amounts.length
    ? Math.sqrt(amounts.reduce((s, n) => s + (n - mean) ** 2, 0) / amounts.length)
    : 0;

  for (const t of transactions) {
    // missing fields
    const missingCore = t.missing_information.filter((f) => f === "merchant" || f === "date");
    if (missingCore.length) {
      push(t.transaction_id, {
        type: "missing_required_field",
        label: `Missing ${missingCore.join(" & ")}`,
        reasoning: `The source text has no ${missingCore.join(" or ")} for this record.`,
        confidence: 1,
        recommended_action: "Fill in the missing field before approving the ledger.",
        human_approval_required: true,
      });
    }

    // VAT mismatch
    if (t.stated_vat !== null && t.total !== null && t.vat_status !== "unknown") {
      const calc = computeVat(t.total, t.vat_status).vat_amount;
      if (calc !== null && Math.abs(calc - t.stated_vat) > 0.05) {
        push(t.transaction_id, {
          type: "vat_mismatch",
          label: "VAT mismatch",
          reasoning: `The document states VAT of ${formatZAR(t.stated_vat)}, but ${formatZAR(t.total)} works out to ${formatZAR(calc)} at 15%.`,
          confidence: 0.9,
          recommended_action: "Check the receipt — the stated VAT and the total don't agree.",
          human_approval_required: true,
        });
      }
    }

    // line item mismatch
    if (t.line_items.length && t.total !== null) {
      const sum = round2(t.line_items.reduce((s, li) => s + li.quantity * li.unit_price, 0));
      const target = t.vat_status === "inclusive" ? round2(t.total / 1.15) : t.total;
      if (Math.abs(sum - target) > 0.5 && Math.abs(sum - t.total) > 0.5) {
        push(t.transaction_id, {
          type: "line_item_total_mismatch",
          label: "Line items don't add up",
          reasoning: `Line items sum to ${formatZAR(sum)}, which doesn't match the stated total of ${formatZAR(t.total)}.`,
          confidence: 0.75,
          recommended_action: "Recheck the line items or the total on this document.",
          human_approval_required: true,
        });
      }
    }

    // outlier
    if (t.total !== null && sd > 0 && t.total > mean + 2 * sd) {
      push(t.transaction_id, {
        type: "unusual_amount",
        label: "Unusually large amount",
        reasoning: `${formatZAR(t.total)} is more than two standard deviations above this batch's average of ${formatZAR(round2(mean))}.`,
        confidence: 0.7,
        recommended_action: "Confirm this larger-than-usual spend is correct.",
        human_approval_required: true,
      });
    }

    // large cash
    if (t.total !== null && /cash/i.test(t.payment_method ?? "") && t.total > mean * 1.5) {
      push(t.transaction_id, {
        type: "large_cash_transaction",
        label: "Large cash payment",
        reasoning: `A cash payment of ${formatZAR(t.total)} sits well above the typical transaction in this batch.`,
        confidence: 0.8,
        recommended_action: "Keep proof of payment for this one — cash is the hardest to reconstruct later.",
        human_approval_required: true,
      });
    }
  }

  // recurring subscription
  const byMerchant = new Map<string, Transaction[]>();
  for (const t of transactions) {
    if (!t.merchant) continue;
    const k = t.merchant.toLowerCase();
    byMerchant.set(k, [...(byMerchant.get(k) ?? []), t]);
  }
  for (const group of byMerchant.values()) {
    if (group.length < 2) continue;
    const dates = new Set(group.map((g) => g.date));
    const totals = new Set(group.map((g) => g.total));
    if (dates.size === group.length && totals.size === 1) {
      for (const t of group) {
        push(t.transaction_id, {
          type: "recurring_subscription",
          label: "Recurring charge",
          ...(group.find((g) => g !== t) ? { matched_transaction_id: group.find((g) => g !== t)!.transaction_id } : {}),
          reasoning: `${t.merchant} charges the same amount on a repeating schedule (${group.map((g) => g.date).join(", ")}).`,
          confidence: 0.85,
          recommended_action: "Confirm you still use this subscription.",
          human_approval_required: false,
        });
      }
    }
  }

  return out;
}

export function buildInsights(
  transactions: Transaction[],
  anomalies: Record<string, Anomaly[]>,
): Insight[] {
  const insights: Insight[] = [];
  if (!transactions.length) return insights;

  // duplicates
  const dupes = Object.entries(anomalies).flatMap(([id, list]) =>
    list.filter((a) => a.type === "probable_duplicate").map((a) => ({ id, a })),
  );
  if (dupes.length) {
    const ids = dupes.flatMap(({ id, a }) => [id, a.matched_transaction_id!].filter(Boolean));
    const value = round2(
      dupes.reduce(
        (s, { id }) => s + (transactions.find((t) => t.transaction_id === id)?.total ?? 0),
        0,
      ),
    );
    insights.push({
      insight: "This batch probably contains a duplicate payment.",
      malume_take: `Eish — I see the same slip twice. Removing the repeat would knock ${formatZAR(value)} off your recorded expenses. Check the bank before you keep both, né.`,
      supporting_transactions: [...new Set(ids)],
      financial_effect: `Removing the duplicate would reduce recorded expenses by ${formatZAR(value)}.`,
      recommended_action: "Confirm whether both payments actually left your account before finalising.",
    });
  }

  // category concentration
  const totalSpend = round2(transactions.reduce((s, t) => s + (t.total ?? 0), 0));
  const byCat = new Map<string, { sum: number; ids: string[] }>();
  for (const t of transactions) {
    const e = byCat.get(t.category) ?? { sum: 0, ids: [] };
    e.sum = round2(e.sum + (t.total ?? 0));
    e.ids.push(t.transaction_id);
    byCat.set(t.category, e);
  }
  const top = [...byCat.entries()].sort((a, b) => b[1].sum - a[1].sum)[0];
  if (top && totalSpend > 0 && top[1].sum / totalSpend > 0.4) {
    const pct = Math.round((top[1].sum / totalSpend) * 100);
    insights.push({
      insight: `${catLabel(top[0])} makes up ${pct}% of this batch's spend.`,
      malume_take: `Most of your money went one way this batch — ${pct}% into ${catLabel(top[0]).toLowerCase()}. Not wrong, just worth knowing where the bucket is leaking.`,
      supporting_transactions: top[1].ids,
      financial_effect: `${formatZAR(top[1].sum)} of ${formatZAR(totalSpend)} total spend sits in one category.`,
      recommended_action: "Have a look at whether that concentration is planned or just habit.",
    });
  }

  // recurring
  const recurring = Object.entries(anomalies).filter(([, l]) =>
    l.some((a) => a.type === "recurring_subscription"),
  );
  if (recurring.length) {
    const ids = recurring.map(([id]) => id);
    const sum = round2(
      ids.reduce((s, id) => s + (transactions.find((t) => t.transaction_id === id)?.total ?? 0), 0),
    );
    insights.push({
      insight: "There's a repeating monthly charge in this batch.",
      malume_take: "Same merchant, same amount, month after month. If you're still using it, lovely. If not, that's free money walking out the door.",
      supporting_transactions: ids,
      financial_effect: `${formatZAR(sum)} across the recurring charges shown here.`,
      recommended_action: "Confirm the subscription is still earning its keep.",
    });
  }

  // unknown VAT exposure
  const unknown = transactions.filter((t) => t.vat_status === "unknown");
  if (unknown.length) {
    const sum = round2(unknown.reduce((s, t) => s + (t.total ?? 0), 0));
    insights.push({
      insight: `${unknown.length} transaction${unknown.length > 1 ? "s" : ""} don't say whether VAT is included.`,
      malume_take: "I'm not going to guess VAT and hand you a wrong number. Tell me inclusive or exclusive and I'll do the maths properly.",
      supporting_transactions: unknown.map((t) => t.transaction_id),
      financial_effect: `${formatZAR(sum)} of spend currently has no VAT figure attached.`,
      recommended_action: "Set the VAT status on these so the batch VAT total is complete.",
    });
  }

  return insights;
}

export function malumeBatchTake(transactions: Transaction[], anomalyCount: number): string {
  if (!transactions.length) return "Malume's still waiting on your receipts, chief.";
  const spend = formatZAR(round2(transactions.reduce((s, t) => s + (t.total ?? 0), 0)));
  const flagged = anomalyCount === 0 ? "Nothing looks dodgy in here" : `${anomalyCount} thing${anomalyCount > 1 ? "s" : ""} worth a second look`;
  return `Right, I've been through all ${transactions.length} of these. ${spend} in total spend. ${flagged}. Numbers are all worked out in code — the talking is mine, the maths isn't.`;
}
