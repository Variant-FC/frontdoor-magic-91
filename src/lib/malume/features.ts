/**
 * Product feature model for Money Malume.
 *
 * Each entry is a domain "object": a bounded area of the product with its own
 * capabilities, data shapes and current build status. This is the single place
 * to look up what the product is meant to do and how far along each piece is.
 */

export type FeatureStatus = "done" | "partial" | "planned";

export type Capability = {
  id: string;
  title: string;
  detail: string;
  status: FeatureStatus;
};

export type FeatureDomain = {
  /** stable machine key */
  key: string;
  /** short human name */
  name: string;
  /** one-line purpose */
  purpose: string;
  /** the core entities this domain owns */
  entities: string[];
  capabilities: Capability[];
  /** other domains this one depends on */
  dependsOn: string[];
};

export const FEATURE_DOMAINS: FeatureDomain[] = [
  {
    key: "ingestion",
    name: "Receipt & document intake",
    purpose: "Get receipts and invoices into the system in any reasonable form.",
    entities: ["Upload", "RawDocument"],
    dependsOn: [],
    capabilities: [
      {
        id: "ingestion.paste",
        title: "Paste receipt text",
        detail: "User pastes one or many records; the batch splitter separates them.",
        status: "done",
      },
      {
        id: "ingestion.upload",
        title: "Upload PDF or text files",
        detail: "Accept file uploads, store the original, queue it for extraction.",
        status: "planned",
      },
      {
        id: "ingestion.scan",
        title: "Scan/OCR image and PDF receipts",
        detail: "Turn a scanned or photographed slip into machine-readable text.",
        status: "planned",
      },
    ],
  },
  {
    key: "extraction",
    name: "Extraction & categorisation",
    purpose: "Turn raw document text into a clean, categorised transaction.",
    entities: ["Transaction", "LineItem"],
    dependsOn: ["ingestion"],
    capabilities: [
      {
        id: "extraction.fields",
        title: "Extract merchant, date, total, VAT, payment method",
        detail: "Rule-based parser pulls the core fields and records what is missing.",
        status: "done",
      },
      {
        id: "extraction.lineItems",
        title: "Extract line items",
        detail: "Quantity x description @ unit price rows are captured per transaction.",
        status: "done",
      },
      {
        id: "extraction.category",
        title: "Auto-categorise every expense",
        detail:
          "Each transaction always receives a category (falling back to 'other') and the user can correct it.",
        status: "done",
      },
      {
        id: "extraction.ai",
        title: "AI-assisted extraction and analysis",
        detail:
          "Use a model for messy documents the rules miss, and to reason about intent behind a spend.",
        status: "planned",
      },
    ],
  },
  {
    key: "ledger",
    name: "Ledger & display",
    purpose: "Show every extracted record as a plain, trustworthy ledger.",
    entities: ["Transaction", "LedgerRow"],
    dependsOn: ["extraction"],
    capabilities: [
      {
        id: "ledger.table",
        title: "Structured ledger view",
        detail: "Date, merchant, category, VAT status and totals in one running table.",
        status: "done",
      },
      {
        id: "ledger.flags",
        title: "Flagged rows shown in red",
        detail: "Anomalous rows are visually separated so they cannot be missed.",
        status: "done",
      },
      {
        id: "ledger.monthly",
        title: "Organised by date, reset each month",
        detail: "Ledger periods roll over monthly with a closing summary.",
        status: "planned",
      },
    ],
  },
  {
    key: "vat",
    name: "VAT engine",
    purpose: "Do the 15% arithmetic in code, never in a language model.",
    entities: ["VatBreakdown"],
    dependsOn: ["extraction"],
    capabilities: [
      {
        id: "vat.compute",
        title: "Inclusive / exclusive VAT calculation",
        detail: "Net, VAT and gross derived per transaction and totalled per batch.",
        status: "done",
      },
      {
        id: "vat.unknown",
        title: "Handle unknown VAT status honestly",
        detail: "No guessing — unknown status is surfaced and the user opts in to an estimate.",
        status: "done",
      },
    ],
  },
  {
    key: "anomalies",
    name: "Anomaly detection & correction",
    purpose: "Catch the things that quietly cost money or break a tax return.",
    entities: ["Anomaly", "Correction"],
    dependsOn: ["extraction", "vat"],
    capabilities: [
      {
        id: "anomalies.duplicates",
        title: "Duplicate transaction detection",
        detail: "Same merchant, date, total and payment method flags a probable duplicate.",
        status: "done",
      },
      {
        id: "anomalies.vat",
        title: "Missing or mismatched VAT",
        detail: "Stated VAT that disagrees with the total, or no VAT status at all, is flagged.",
        status: "done",
      },
      {
        id: "anomalies.other",
        title: "Outliers, large cash and recurring charges",
        detail: "Statistical outliers, big cash spend and repeat subscriptions are surfaced.",
        status: "done",
      },
      {
        id: "anomalies.correct",
        title: "Correct a record with before/after",
        detail: "Editing a transaction shows the original value alongside the corrected one.",
        status: "partial",
      },
    ],
  },
  {
    key: "insights",
    name: "Financial insight",
    purpose: "Explain what the numbers mean, in Malume's voice, with receipts.",
    entities: ["Insight", "MalumeTake"],
    dependsOn: ["ledger", "anomalies"],
    capabilities: [
      {
        id: "insights.generate",
        title: "Cross-transaction insights",
        detail: "Concentration, duplicates, recurring spend and VAT exposure.",
        status: "done",
      },
      {
        id: "insights.origin",
        title: "Show the origin of each insight",
        detail: "Every insight links to the exact transactions it was derived from.",
        status: "done",
      },
      {
        id: "insights.totals",
        title: "Total expenses, income and profit",
        detail: "Income capture alongside expenses so profit can be tracked.",
        status: "planned",
      },
      {
        id: "insights.charts",
        title: "Charts: spend by category, income by client",
        detail: "Visual breakdown of where money goes and where it comes from.",
        status: "planned",
      },
    ],
  },
  {
    key: "review",
    name: "Human review",
    purpose: "Nothing is final until a person says so.",
    entities: ["ReviewOutput"],
    dependsOn: ["ledger", "anomalies"],
    capabilities: [
      {
        id: "review.approve",
        title: "Approve or reject the batch",
        detail: "Review status, reviewer, whether changes were made, and timestamp are recorded.",
        status: "done",
      },
      {
        id: "review.queue",
        title: "Queue of items needing a decision",
        detail: "Flagged and incomplete records are collected in one place to work through.",
        status: "done",
      },
    ],
  },
  {
    key: "invoicing",
    name: "Invoicing",
    purpose: "Bill clients without leaving the tool.",
    entities: ["Invoice", "LineItem"],
    dependsOn: ["vat"],
    capabilities: [
      {
        id: "invoicing.create",
        title: "Generate an invoice",
        detail: "Line items, VAT treatment, dates, payment note and printable letterhead.",
        status: "done",
      },
      {
        id: "invoicing.status",
        title: "Track draft / sent / paid",
        detail: "Invoice lifecycle status per client.",
        status: "done",
      },
      {
        id: "invoicing.income",
        title: "Feed paid invoices into income",
        detail: "Paid invoices become the income side of the profit calculation.",
        status: "planned",
      },
    ],
  },
  {
    key: "persistence",
    name: "Storage & tracking",
    purpose: "Keep the history instead of losing it on refresh.",
    entities: ["Upload", "Transaction", "Invoice", "Period"],
    dependsOn: ["ingestion", "ledger", "invoicing"],
    capabilities: [
      {
        id: "persistence.local",
        title: "Local profile persistence",
        detail: "Owner and business name survive a reload.",
        status: "done",
      },
      {
        id: "persistence.db",
        title: "Database-backed records",
        detail: "Uploads, transactions and invoices stored per user and queryable by date.",
        status: "planned",
      },
      {
        id: "persistence.periods",
        title: "Monthly periods",
        detail: "Each month opens fresh while history stays available.",
        status: "planned",
      },
    ],
  },
  {
    key: "accounts",
    name: "Accounts & access",
    purpose: "One person's books stay one person's books.",
    entities: ["User", "Session", "Profile"],
    dependsOn: [],
    capabilities: [
      {
        id: "accounts.profile",
        title: "Local business profile",
        detail: "Owner and business name captured for personalisation and invoices.",
        status: "done",
      },
      {
        id: "accounts.auth",
        title: "Email and password login",
        detail: "Sign up, sign in, sign out and password reset.",
        status: "planned",
      },
      {
        id: "accounts.scoping",
        title: "Per-user data isolation",
        detail: "Every record is owned by the signed-in user and unreadable by anyone else.",
        status: "planned",
      },
    ],
  },
];

export const FEATURE_DOMAIN_BY_KEY: Record<string, FeatureDomain> = Object.fromEntries(
  FEATURE_DOMAINS.map((d) => [d.key, d]),
);

export function capabilitiesByStatus(status: FeatureStatus): Capability[] {
  return FEATURE_DOMAINS.flatMap((d) => d.capabilities).filter((c) => c.status === status);
}
