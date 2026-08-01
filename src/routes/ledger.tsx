import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMalume } from "@/lib/malume/store";
import { LedgerView } from "@/components/malume/LedgerView";
import { batchVatTotals, formatZAR } from "@/lib/malume/vat";

const TITLE = "Ledger — Malume Money";
const DESCRIPTION =
  "A running ledger of your recorded expenses: date, merchant, category, amount, VAT and a running total, with flagged rows marked inline.";

export const Route = createFileRoute("/ledger")({
  validateSearch: (search: Record<string, unknown>) => ({
    ids: typeof search["ids"] === "string" ? (search["ids"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LedgerPage,
});

function LedgerPage() {
  const { transactions } = useMalume();
  const { ids } = Route.useSearch();
  const navigate = useNavigate({ from: "/ledger" });
  const highlight = ids ? ids.split(",").filter(Boolean) : [];
  const totals = batchVatTotals(transactions);

  useEffect(() => {
    if (!highlight.length) return;
    const el = document.getElementById(`ledger-${highlight[0]}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [ids]);

  return (
    <div className="w-full py-6 md:py-8">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Ledger
        </p>
        <h1 className="mt-3 text-3xl leading-tight font-semibold md:text-4xl">
          Everything in order, with a running total.
        </h1>
        <p className="mt-4 text-base text-muted-foreground">
          Sorted by date. Flagged rows are tinted so nothing slips past you. Totals recalculate the
          moment you edit a record in Recorded Expenses.
        </p>
      </header>

      {transactions.length ? (
        <>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Mini label="Records" value={String(transactions.length)} />
            <Mini label="Net (excl. VAT)" value={formatZAR(totals.net)} />
            <Mini label="VAT confirmed" value={formatZAR(totals.confirmed)} />
            <Mini label="Gross recorded" value={formatZAR(totals.gross)} />
          </div>

          {highlight.length ? (
            <p className="mt-6 text-sm text-muted-foreground">
              Highlighting evidence: <span className="num">{highlight.join(", ")}</span>{" "}
              <button
                className="underline underline-offset-4"
                onClick={() => navigate({ search: {} })}
              >
                clear
              </button>
            </p>
          ) : null}

          <section className="mt-6">
            <LedgerView highlight={highlight} />
          </section>
        </>
      ) : (
        <p className="mt-8 text-sm text-muted-foreground">
          Nothing in the ledger yet.{" "}
          <Link to="/expenses" className="text-primary underline underline-offset-4">
            Add some receipts first
          </Link>
          .
        </p>
      )}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-paper rounded-xl p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="num mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
