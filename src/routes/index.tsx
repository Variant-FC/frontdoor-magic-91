import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMalume } from "@/lib/malume/store";
import { SAMPLE_BATCH } from "@/lib/malume/samples";
import { malumeBatchTake } from "@/lib/malume/analysis";
import { MalumeSays } from "@/components/malume/MalumeSays";
import { TransactionCard } from "@/components/malume/TransactionCard";
import { VatView } from "@/components/malume/VatView";
import { LedgerView } from "@/components/malume/LedgerView";
import { InsightsView } from "@/components/malume/InsightsView";
import { ReviewView } from "@/components/malume/ReviewView";
import { PrototypeNote } from "@/components/malume/PrototypeNote";
import { batchVatTotals, formatZAR } from "@/lib/malume/vat";

const TITLE = "Malume Money — receipts into a ledger you actually understand";
const DESCRIPTION =
  "Paste South African receipts and invoices, get a clean ledger with VAT worked out in code, duplicate flags, plain-language insights and a human review step.";

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
  component: Workspace,
});

function Workspace() {
  const { transactions, anomalies, anomalyCount, processBatch, clearBatch } = useMalume();
  const [input, setInput] = useState("");
  const [tab, setTab] = useState("extracted");
  const [highlight, setHighlight] = useState<string[]>([]);
  const totals = batchVatTotals(transactions);

  const run = (text: string) => {
    if (!text.trim()) return;
    processBatch(text);
    setTab("extracted");
    setHighlight([]);
  };

  const jump = (ids: string[]) => {
    setHighlight(ids);
    setTab("ledger");
    requestAnimationFrame(() => {
      document.getElementById(`ledger-${ids[0]}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10 md:py-14">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Micro-business financial workflow assistant
        </p>
        <h1 className="mt-3 font-display text-4xl leading-tight md:text-5xl">
          Your receipts, sorted — and explained like a person would.
        </h1>
        <p className="mt-4 text-base text-muted-foreground">
          Paste your receipts and invoices below. Malume Money pulls out the merchant, date, totals
          and VAT, flags anything that looks off, and lets you fix everything before you sign it off.
        </p>
      </header>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="card-paper space-y-3 rounded-lg p-5">
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
          <MalumeSays tone="ink">{malumeBatchTake(transactions, anomalyCount)}</MalumeSays>
          {transactions.length ? (
            <div className="grid grid-cols-2 gap-3">
              <MiniStat label="Records" value={String(transactions.length)} />
              <MiniStat label="Flags" value={String(anomalyCount)} />
              <MiniStat label="Spend" value={formatZAR(totals.gross)} />
              <MiniStat label="VAT" value={formatZAR(totals.confirmed)} />
            </div>
          ) : null}
        </div>
      </section>

      {transactions.length ? (
        <section className="mt-12">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-secondary p-1">
              <TabsTrigger value="extracted">Extracted data</TabsTrigger>
              <TabsTrigger value="vat">VAT</TabsTrigger>
              <TabsTrigger value="ledger">Ledger</TabsTrigger>
              <TabsTrigger value="insights">
                Insights {anomalyCount ? `(${anomalyCount})` : ""}
              </TabsTrigger>
              <TabsTrigger value="review">Review & approve</TabsTrigger>
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
            <TabsContent value="ledger" className="mt-6 space-y-3">
              {highlight.length ? (
                <p className="text-sm text-muted-foreground">
                  Highlighting evidence:{" "}
                  <span className="num">{highlight.join(", ")}</span>{" "}
                  <button className="underline" onClick={() => setHighlight([])}>
                    clear
                  </button>
                </p>
              ) : null}
              <LedgerView highlight={highlight} />
            </TabsContent>
            <TabsContent value="insights" className="mt-6">
              <InsightsView onJump={jump} />
            </TabsContent>
            <TabsContent value="review" className="mt-6">
              <ReviewView />
            </TabsContent>
          </Tabs>
        </section>
      ) : null}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-paper rounded-lg p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="num mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
