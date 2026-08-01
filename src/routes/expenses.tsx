import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMalume } from "@/lib/malume/store";
import { SAMPLE_BATCH } from "@/lib/malume/samples";
import { malumeBatchTake } from "@/lib/malume/analysis";
import { buildBatchFacts } from "@/lib/malume/facts";
import { useMalumeTake } from "@/lib/malume/useMalumeTake";
import { MalumeSays } from "@/components/malume/MalumeSays";
import { TransactionCard } from "@/components/malume/TransactionCard";
import { VatView } from "@/components/malume/VatView";
import { PrototypeNote } from "@/components/malume/PrototypeNote";
import { batchVatTotals, formatZAR } from "@/lib/malume/vat";

const TITLE = "Recorded Expenses — Malume Money";
const DESCRIPTION =
  "Paste, load or correct South African receipts and invoices. VAT is calculated in code at 15%, missing fields are flagged, and every value stays editable.";

export const Route = createFileRoute("/expenses")({
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
  component: Expenses,
});

function Expenses() {
  const { transactions, anomalies, anomalyCount, processBatch, clearBatch } = useMalume();

  const { text: malumeText } = useMalumeTake(
    buildBatchFacts(transactions, anomalyCount),
    malumeBatchTake(transactions, anomalyCount),
    transactions.length > 0,
  );
  const [input, setInput] = useState("");
  const [tab, setTab] = useState("extracted");
  const totals = batchVatTotals(transactions);

  const run = (text: string) => {
    if (!text.trim()) return;
    processBatch(text);
    setTab("extracted");
  };

  return (
    <div className="w-full py-6 md:py-8">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Recorded Expenses
        </p>
        <h1 className="mt-3 text-3xl leading-tight font-semibold md:text-4xl">
          Receipts in, structured records out.
        </h1>
        <p className="mt-4 text-base text-muted-foreground">
          Merchant, date, totals, VAT and category get pulled out of the text. Anything missing is
          said out loud rather than guessed, and you can edit every field.
        </p>
      </header>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="card-paper space-y-3 rounded-xl p-5">
          <label htmlFor="batch" className="text-sm font-semibold">
            Paste a batch of receipts or invoices
          </label>
          <Textarea
            id="batch"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={10}
            placeholder={"MZANSI OFFICE MART\nDate: 2026-07-14\nTOTAL (incl VAT): R805.00\nPaid by: Card\n\n---\n\nNext receipt..."}
            className="num text-xs"
          />
          <p className="text-xs text-muted-foreground">
            Separate each record with a line of three dashes (---) or a blank gap.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => run(input)} disabled={!input.trim()}>
              Process batch
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setInput(SAMPLE_BATCH);
                run(SAMPLE_BATCH);
              }}
            >
              Load sample batch
            </Button>
            {transactions.length ? (
              <Button
                variant="ghost"
                onClick={() => {
                  clearBatch();
                  setInput("");
                }}
              >
                Clear
              </Button>
            ) : null}
          </div>
          <PrototypeNote />
        </div>

        <div className="space-y-4">
          <MalumeSays tone="ink">{malumeText}</MalumeSays>
          {transactions.length ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Mini label="Records" value={String(transactions.length)} />
                <Mini label="Flags" value={String(anomalyCount)} />
                <Mini label="Gross (incl. VAT)" value={formatZAR(totals.gross)} />
                <Mini label="VAT confirmed" value={formatZAR(totals.confirmed)} />
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <Link to="/ledger" className="text-primary underline underline-offset-4">
                  Open the ledger
                </Link>
                <span className="text-muted-foreground">·</span>
                <Link to="/insights" className="text-primary underline underline-offset-4">
                  See the insights
                </Link>
                <span className="text-muted-foreground">·</span>
                <Link to="/review" className="text-primary underline underline-offset-4">
                  Review &amp; approve
                </Link>
              </div>
            </>
          ) : null}
        </div>
      </section>

      {transactions.length ? (
        <section className="mt-12">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-secondary p-1">
              <TabsTrigger value="extracted">Extracted data</TabsTrigger>
              <TabsTrigger value="vat">VAT breakdown</TabsTrigger>
            </TabsList>
            <TabsContent value="extracted" className="mt-6 space-y-4">
              {transactions.map((t) => (
                <TransactionCard
                  key={t.transaction_id}
                  tx={t}
                  anomalies={anomalies[t.transaction_id] ?? []}
                />
              ))}
            </TabsContent>
            <TabsContent value="vat" className="mt-6">
              <VatView />
            </TabsContent>
          </Tabs>
        </section>
      ) : null}
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
