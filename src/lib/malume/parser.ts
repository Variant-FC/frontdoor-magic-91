import type { ExpenseCategory, LineItem, Transaction, VatStatus } from "./types";
import { round2 } from "./vat";

const MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[Rr\s\u00a0]/g, "").replace(/,(\d{2})\b/, ".$1").replace(/,/g, "");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? round2(n) : null;
}

function findDate(text: string): string | null {
  const iso = text.match(/(20\d{2})[-/](\d{1,2})[-/](\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  const dmy = text.match(/\b(\d{1,2})[-/](\d{1,2})[-/](20\d{2})\b/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  const named = text.match(/\b(\d{1,2})\s+([A-Za-z]{3,9})\s+(20\d{2})\b/);
  if (named) {
    const m = MONTHS[named[2].slice(0, 3).toLowerCase()];
    if (m) return `${named[3]}-${m}-${named[1].padStart(2, "0")}`;
  }
  return null;
}

function findTotal(text: string): number | null {
  const patterns = [
    /(?:grand\s+)?total[^\n\d-]*([R\s]*[\d\s.,]+)/i,
    /amount(?:\s+(?:incl|excl)[^\n\d]*)?[^\n\d-]*([R\s]*[\d\s.,]+)/i,
    /\bR\s?([\d\s.,]+)/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const v = parseAmount(m[1]);
      if (v !== null && v > 0) return v;
    }
  }
  return null;
}

function findVatStatus(text: string): VatStatus {
  const t = text.toLowerCase();
  if (/(incl\.?\s*vat|vat\s*incl|including vat|vat inclusive)/.test(t)) return "inclusive";
  if (/(excl\.?\s*vat|vat\s*excl|excluding vat|vat exclusive|before vat|plus vat)/.test(t))
    return "exclusive";
  return "unknown";
}

function findStatedVat(text: string): number | null {
  const m = text.match(/(?:stated\s+vat|vat\s+amount|vat)\s*[:\-]?\s*R?\s*([\d\s.,]+)/i);
  if (!m) return null;
  const v = parseAmount(m[1]);
  return v && v > 0 ? v : null;
}

function findPaymentMethod(text: string): string | null {
  const m = text.match(/(?:paid(?:\s+by)?|payment(?:\s+method)?)\s*[:\-]?\s*([A-Za-z ]{2,30})/i);
  if (m) {
    const v = m[1].trim().replace(/\s+/g, " ");
    if (v) return v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
  }
  if (/\bcash\b/i.test(text)) return "Cash";
  return null;
}

function findMerchant(text: string, lines: string[]): string | null {
  const labelled = text.match(/(?:merchant|supplier|vendor|from)\s*[:\-]\s*(.+)/i);
  if (labelled) return labelled[1].trim();
  for (const line of lines) {
    const l = line.trim();
    if (!l) continue;
    if (/^(date|invoice|total|amount|paid|payment|vat|stated|tax)\b/i.test(l)) continue;
    if (/^\d/.test(l)) continue;
    if (l.length > 60) continue;
    return l.replace(/\s+/g, " ");
  }
  return null;
}

function findLineItems(lines: string[]): LineItem[] {
  const items: LineItem[] = [];
  for (const line of lines) {
    const m = line.match(/^\s*(\d+)\s*[xX*]\s*(.+?)\s*@\s*R?\s*([\d\s.,]+)\s*$/);
    if (m) {
      const price = parseAmount(m[3]);
      if (price !== null)
        items.push({ description: m[2].trim(), quantity: Number(m[1]), unit_price: price });
    }
  }
  return items;
}

const CATEGORY_RULES: [RegExp, ExpenseCategory][] = [
  [/(office|paper|toner|stationery|printer|mart)/i, "office_supplies"],
  [/(petrol|fuel|garage|uber|bolt|taxi|parking|toll|shell|engen)/i, "transport"],
  [/(catering|coffee|lunch|restaurant|food|cafe|braai)/i, "food_and_entertainment"],
  [/(electricity|water|municipal|city of|rates|internet|fibre|airtime)/i, "utilities"],
  [/(subscription|software|cloud|saas|licence|license|hosting)/i, "software_and_subscriptions"],
  [/(stock|packaging|materials|wholesale|supplier|market)/i, "stock_and_materials"],
  [/(attorney|accountant|consult|legal|bookkeep)/i, "professional_services"],
  [/(advert|marketing|flyer|social media|branding|print run)/i, "marketing"],
];

function guessCategory(text: string): ExpenseCategory {
  for (const [re, cat] of CATEGORY_RULES) if (re.test(text)) return cat;
  return "other";
}

export function splitBatch(input: string): string[] {
  return input
    .split(/\n\s*(?:-{3,}|={3,}|\*{3,})\s*\n|\n\s*\n\s*\n/)
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
}

export function parseRecord(raw: string, index: number): Transaction {
  const lines = raw.split("\n");
  const merchant = findMerchant(raw, lines);
  const date = findDate(raw);
  const total = findTotal(raw);
  const lineItems = findLineItems(lines);

  const descriptionLines = lines
    .map((l) => l.trim())
    .filter(
      (l) =>
        l &&
        l !== merchant &&
        !/^(date|invoice\s*#|total|amount|paid|payment|stated vat)\b/i.test(l),
    );

  const missing: string[] = [];
  if (!merchant) missing.push("merchant");
  if (!date) missing.push("date");
  if (total === null) missing.push("total");
  const vat_status = findVatStatus(raw);
  if (vat_status === "unknown") missing.push("vat_status");

  return {
    transaction_id: `EXP-${String(index + 1).padStart(3, "0")}`,
    merchant,
    date,
    description: descriptionLines.join(" · ") || raw.slice(0, 80),
    line_items: lineItems,
    total,
    stated_vat: findStatedVat(raw),
    vat_status,
    category: guessCategory(raw),
    payment_method: findPaymentMethod(raw),
    missing_information: missing,
    vat_estimate_opt_in: false,
    raw_text: raw,
    edited: false,
  };
}

export function parseBatch(input: string): Transaction[] {
  return splitBatch(input).map(parseRecord);
}
