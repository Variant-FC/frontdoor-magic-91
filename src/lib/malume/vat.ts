import type { Transaction, VatStatus } from "./types";

export const VAT_RATE = 0.15;

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Deterministic ZAR formatting — Intl's en-ZA output differs between the
 *  server and the browser, which broke hydration. */
export const formatZAR = (n: number | null | undefined) => {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const neg = n < 0;
  const [whole, cents] = Math.abs(round2(n)).toFixed(2).split(".");
  const grouped = whole!.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${neg ? "-" : ""}R ${grouped}.${cents}`;
};


export type VatBreakdown = {
  /** null when it must not be calculated */
  vat_amount: number | null;
  /** clearly-labelled estimate, only when the user opted in */
  vat_amount_estimate: number | null;
  net: number | null;
  gross: number | null;
  note: string | null;
  formula: string | null;
};

/** All VAT arithmetic happens here, in code — never inferred by prose. */
export function computeVat(
  total: number | null,
  status: VatStatus,
  estimateOptIn = false,
): VatBreakdown {
  if (total === null || Number.isNaN(total)) {
    return {
      vat_amount: null,
      vat_amount_estimate: null,
      net: null,
      gross: null,
      note: "No total found, so no VAT can be worked out.",
      formula: null,
    };
  }

  if (status === "inclusive") {
    const vat = round2((total * 15) / 115);
    return {
      vat_amount: vat,
      vat_amount_estimate: null,
      net: round2(total - vat),
      gross: round2(total),
      note: null,
      formula: `${total.toFixed(2)} × 15 ÷ 115 = ${vat.toFixed(2)}`,
    };
  }

  if (status === "exclusive") {
    const vat = round2(total * VAT_RATE);
    return {
      vat_amount: vat,
      vat_amount_estimate: null,
      net: round2(total),
      gross: round2(total + vat),
      note: null,
      formula: `${total.toFixed(2)} × 15% = ${vat.toFixed(2)}`,
    };
  }

  // unknown
  if (estimateOptIn) {
    const vat = round2((total * 15) / 115);
    return {
      vat_amount: null,
      vat_amount_estimate: vat,
      net: round2(total - vat),
      gross: round2(total),
      note: "Estimated assuming VAT-inclusive pricing — not confirmed",
      formula: `${total.toFixed(2)} × 15 ÷ 115 = ${vat.toFixed(2)} (estimate)`,
    };
  }

  return {
    vat_amount: null,
    vat_amount_estimate: null,
    net: null,
    gross: round2(total),
    note: "VAT status unknown — nothing calculated on purpose.",
    formula: null,
  };
}

export const txVat = (t: Transaction) =>
  computeVat(t.total, t.vat_status, t.vat_estimate_opt_in);

/** Sum of confirmed VAT only (estimates excluded from the hard total). */
export function batchVatTotals(transactions: Transaction[]) {
  let confirmed = 0;
  let estimated = 0;
  let gross = 0;
  let net = 0;
  for (const t of transactions) {
    const v = txVat(t);
    if (v.vat_amount !== null) confirmed += v.vat_amount;
    if (v.vat_amount_estimate !== null) estimated += v.vat_amount_estimate;
    if (v.gross !== null) gross += v.gross;
    if (v.net !== null) net += v.net;
  }
  return {
    confirmed: round2(confirmed),
    estimated: round2(estimated),
    gross: round2(gross),
    net: round2(net),
  };
}

export function invoiceTotals(
  lineItems: { quantity: number; unit_price: number }[],
  vatStatus: "inclusive" | "exclusive" | "unknown" | "none",
) {
  const raw = round2(
    lineItems.reduce((s, li) => s + (Number(li.quantity) || 0) * (Number(li.unit_price) || 0), 0),
  );
  if (vatStatus === "exclusive") {
    const vat = round2(raw * VAT_RATE);
    return { subtotal: raw, vat, total: round2(raw + vat) };
  }
  if (vatStatus === "inclusive") {
    const vat = round2((raw * 15) / 115);
    return { subtotal: round2(raw - vat), vat, total: raw };
  }
  return { subtotal: raw, vat: 0, total: raw };
}
