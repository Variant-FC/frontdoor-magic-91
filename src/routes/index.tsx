import { createFileRoute, Link } from "@tanstack/react-router";
import { useMalume } from "@/lib/malume/store";
import { malumeBatchTake } from "@/lib/malume/analysis";
import { MalumeSays } from "@/components/malume/MalumeSays";
import { PrototypeNote } from "@/components/malume/PrototypeNote";
import { ProfileCard } from "@/components/malume/ProfileCard";
import { batchVatTotals, formatZAR } from "@/lib/malume/vat";
import { ArrowRight, FileText, Receipt, ScrollText, Sparkles } from "lucide-react";

const TITLE = "Malume Money — your business money, explained like a person would";
const DESCRIPTION =
  "A personalised home for South African micro-business money: recorded expenses, a running ledger, plain-language insights and invoices you can send.";

export const Route = createFileRoute("/")({
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
  component: Dashboard,
});

function Dashboard() {
  const { transactions, anomalyCount, insights, invoices, profile, profileReady, review } =
    useMalume();
  const totals = batchVatTotals(transactions);
  const outstanding = invoices.filter((i) => i.status === "sent");

  // profile only exists after localStorage is read on the client
  const owner = profileReady ? profile.owner : "";
  const business = profileReady ? profile.business : "";
  const greeting = owner ? `Howzit, ${owner}` : "Howzit";


  return (
    <div className="w-full py-6 md:py-8">
      <div className="mb-8">
        <ProfileCard />
      </div>

      <header className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Dashboard
        </p>
        <h1 className="mt-3 text-4xl leading-tight font-semibold md:text-5xl">{greeting}</h1>
        <p className="mt-4 text-base text-muted-foreground">
          {business
            ? `Here's where ${business}'s money is sitting right now.`
            : "Here's where your money is sitting right now."}{" "}
          Every number below is worked out in code — the talking is Malume's, the maths isn't.
        </p>
      </header>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          <MalumeSays tone="ink">{malumeBatchTake(transactions, anomalyCount)}</MalumeSays>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Records" value={String(transactions.length)} />
            <Stat label="Flags" value={String(anomalyCount)} />
            <Stat label="Gross (incl. VAT)" value={formatZAR(totals.gross)} />
            <Stat label="VAT confirmed" value={formatZAR(totals.confirmed)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Stat label="Insights ready" value={String(insights.length)} />
            <Stat label="Invoices marked sent" value={String(outstanding.length)} />
          </div>
          {review ? (
            <p className="num text-xs text-muted-foreground">
              Ledger {review.review_status} · reviewed_by: {review.reviewed_by} · changes_made:{" "}
              {String(review.changes_made)}
            </p>
          ) : null}
        </div>

        <div className="space-y-4">

          <div className="card-paper rounded-xl p-4">
            <PrototypeNote />
          </div>
        </div>
      </section>

      <section className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Shortcut
          to="/expenses"
          icon={<Receipt className="h-4 w-4" aria-hidden />}
          title="Recorded Expenses"
          body="Paste or load receipts, fix anything wrong, see the VAT working."
        />
        <Shortcut
          to="/ledger"
          icon={<ScrollText className="h-4 w-4" aria-hidden />}
          title="Ledger"
          body="A running ledger by date, with flagged rows called out inline."
        />
        <Shortcut
          to="/insights"
          icon={<Sparkles className="h-4 w-4" aria-hidden />}
          title="Insights"
          body="Anomalies and cross-transaction patterns, each with its evidence."
        />
        <Shortcut
          to="/invoices"
          icon={<FileText className="h-4 w-4" aria-hidden />}
          title="Invoices"
          body="Bill your own clients with VAT handled the same way."
        />
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-paper rounded-xl p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="num mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function Shortcut({
  to,
  icon,
  title,
  body,
}: {
  to: "/expenses" | "/ledger" | "/insights" | "/invoices";
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Link
      to={to}
      className="card-paper group rounded-xl p-5 transition-colors hover:border-primary"
    >
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-secondary text-secondary-foreground">
        {icon}
      </span>
      <p className="mt-3 flex items-center gap-1 font-semibold">
        {title}
        <ArrowRight
          className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100"
          aria-hidden
        />
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </Link>
  );
}
