import { useMalume } from "@/lib/malume/store";
import { Button } from "@/components/ui/button";
import { MalumeSays } from "./MalumeSays";
import { batchVatTotals, formatZAR } from "@/lib/malume/vat";
import { CheckCircle2, XCircle } from "lucide-react";

export function ReviewView() {
  const { transactions, anomalies, insights, review, changesMade, setReview } = useMalume();
  const totals = batchVatTotals(transactions);
  const needsApproval = Object.values(anomalies)
    .flat()
    .filter((a) => a.human_approval_required);
  const missing = transactions.filter((t) => t.missing_information.length);

  return (
    <div className="space-y-6">
      <MalumeSays tone="ink">
        Before you lock this in: {transactions.length} records, {formatZAR(totals.gross)} recorded
        spend, {formatZAR(totals.confirmed)} in confirmed VAT.{" "}
        {needsApproval.length
          ? `${needsApproval.length} flag${needsApproval.length > 1 ? "s" : ""} still want your eyes.`
          : "Nothing outstanding from my side."}{" "}
        I'm not a tax practitioner or an accountant — you're the one signing this off.
      </MalumeSays>

      <div className="grid gap-4 md:grid-cols-3">
        <Panel title="Extracted data">
          <p className="num text-2xl font-semibold">{transactions.length}</p>
          <p className="text-sm text-muted-foreground">records in this batch</p>
        </Panel>
        <Panel title="Warnings & conflicts">
          <p className="num text-2xl font-semibold">{Object.values(anomalies).flat().length}</p>
          <p className="text-sm text-muted-foreground">
            {missing.length} record{missing.length === 1 ? "" : "s"} with missing fields
          </p>
        </Panel>
        <Panel title="Edits you made">
          <p className="num text-2xl font-semibold">
            {transactions.filter((t) => t.edited).length}
          </p>
          <p className="text-sm text-muted-foreground">
            {changesMade ? "changes_made: true" : "changes_made: false"}
          </p>
        </Panel>
      </div>

      {insights.length ? (
        <div className="card-paper rounded-lg p-5">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Malume's recommendations
          </h3>
          <ul className="mt-3 space-y-2 text-sm">
            {insights.map((i, idx) => (
              <li key={idx} className="flex gap-2">
                <span className="text-accent">•</span>
                <span>
                  {i.recommended_action}{" "}
                  <span className="num text-xs text-muted-foreground">
                    ({i.supporting_transactions.join(", ")})
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setReview("approved")} disabled={!transactions.length}>
          <CheckCircle2 className="h-4 w-4" aria-hidden /> Approve ledger
        </Button>
        <Button
          variant="outline"
          onClick={() => setReview("rejected")}
          disabled={!transactions.length}
        >
          <XCircle className="h-4 w-4" aria-hidden /> Reject
        </Button>
      </div>

      {review ? (
        <div className="card-paper rounded-lg p-5">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Final output
          </h3>
          <pre className="num mt-3 overflow-x-auto rounded-md bg-muted/70 p-4 text-xs">
            {JSON.stringify(
              {
                review_status: review.review_status,
                reviewed_by: review.reviewed_by,
                changes_made: review.changes_made,
              },
              null,
              2,
            )}
          </pre>
          <p className="mt-2 text-xs text-muted-foreground">Reviewed at {review.reviewed_at}</p>
        </div>
      ) : null}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card-paper rounded-lg p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {title}
      </p>
      <div className="mt-2">{children}</div>
    </div>
  );
}
