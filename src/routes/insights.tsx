import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMalume } from "@/lib/malume/store";
import { InsightsView } from "@/components/malume/InsightsView";
import { MalumeSays } from "@/components/malume/MalumeSays";
import { Button } from "@/components/ui/button";
import { malumeBatchTake } from "@/lib/malume/analysis";
import { buildInsightsSummary, downloadText } from "@/lib/malume/export";
import { Download } from "lucide-react";

const TITLE = "Insights — Malume Money";
const DESCRIPTION =
  "Anomalies and cross-transaction insights from your recorded expenses, each linked to the transaction IDs behind it, with a downloadable monthly summary.";

export const Route = createFileRoute("/insights")({
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
  component: InsightsPage,
});

function InsightsPage() {
  const { transactions, anomalies, anomalyCount, insights, profile } = useMalume();
  const navigate = useNavigate();

  const jump = (ids: string[]) => {
    navigate({ to: "/ledger", search: { ids: ids.join(",") } });
  };

  const exportSummary = () => {
    const text = buildInsightsSummary({
      business: profile.business,
      owner: profile.owner,
      transactions,
      anomalies,
      insights,
      malumeTake: malumeBatchTake(transactions, anomalyCount),
    });
    downloadText(
      `malume-insights-${new Date().toISOString().slice(0, 10)}.txt`,
      text,
    );
  };

  return (
    <div className="w-full max-w-4xl py-6 md:py-8">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Insights
        </p>
        <h1 className="mt-3 text-3xl leading-tight font-semibold md:text-4xl">
          What the numbers are actually telling you.
        </h1>
        <p className="mt-4 text-base text-muted-foreground">
          Every flag and every insight names the transactions it's based on — click through and the
          ledger jumps straight to the evidence.
        </p>
      </header>

      {transactions.length ? (
        <>
          <div className="mt-8 space-y-4">
            <MalumeSays tone="ink">{malumeBatchTake(transactions, anomalyCount)}</MalumeSays>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="secondary" onClick={exportSummary}>
                <Download className="h-4 w-4" aria-hidden /> Download monthly summary
              </Button>
              <span className="text-xs text-muted-foreground">
                Prototype/educational summary — figures, Malume's write-up and supporting IDs.
              </span>
            </div>
          </div>

          <section className="mt-10">
            <InsightsView onJump={jump} />
          </section>
        </>
      ) : (
        <p className="mt-8 text-sm text-muted-foreground">
          Malume's still waiting on your receipts, chief.{" "}
          <Link to="/expenses" className="text-primary underline underline-offset-4">
            Load a batch
          </Link>{" "}
          and the insights show up here.
        </p>
      )}
    </div>
  );
}
