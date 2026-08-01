import { useMalume } from "@/lib/malume/store";
import { MalumeSays } from "./MalumeSays";
import { Button } from "@/components/ui/button";
import { AnomalyBlock } from "./AnomalyBlock";

export function InsightsView({ onJump }: { onJump: (ids: string[]) => void }) {
  const { insights, anomalies, transactions } = useMalume();
  const flagged = Object.entries(anomalies);

  if (!transactions.length) return null;

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Cross-transaction insights</h2>
        {insights.length ? (
          insights.map((ins, i) => (
            <article key={i} className="card-paper space-y-3 rounded-lg p-5">
              <h3 className="text-lg font-semibold">{ins.insight}</h3>
              <MalumeSays>{ins.malume_take}</MalumeSays>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Financial effect
                  </dt>
                  <dd>{ins.financial_effect}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Recommended action
                  </dt>
                  <dd>{ins.recommended_action}</dd>
                </div>
              </dl>
              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Evidence
                </span>
                {ins.supporting_transactions.map((id) => (
                  <Button
                    key={id}
                    size="sm"
                    variant="secondary"
                    className="num h-7 px-2 text-xs"
                    onClick={() => onJump([id])}
                  >
                    {id}
                  </Button>
                ))}
                <Button
                  size="sm"
                  variant="link"
                  className="ml-auto"
                  onClick={() => onJump(ins.supporting_transactions)}
                >
                  Show all in ledger
                </Button>
              </div>
            </article>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            Nothing cross-cutting stands out in this batch yet.
          </p>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Transaction-level flags</h2>
        {flagged.length ? (
          flagged.map(([id, list]) => (
            <div key={id} className="card-paper space-y-2 rounded-lg p-4">
              <button
                className="num text-sm font-semibold underline-offset-4 hover:underline"
                onClick={() => onJump([id])}
              >
                {id}
              </button>
              {list.map((a, i) => (
                <AnomalyBlock key={i} anomaly={a} />
              ))}
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No flags raised on individual records.</p>
        )}
      </section>
    </div>
  );
}
