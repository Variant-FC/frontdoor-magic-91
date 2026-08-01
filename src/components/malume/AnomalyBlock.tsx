import { AlertTriangle } from "lucide-react";
import type { Anomaly } from "@/lib/malume/types";
import { cn } from "@/lib/utils";

export function AnomalyBlock({ anomaly, compact }: { anomaly: Anomaly; compact?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-md border border-warning/50 bg-warning/10 p-3 text-sm",
        compact && "p-2 text-xs",
      )}
    >
      <div className="flex items-center gap-2 font-semibold text-warning-foreground">
        <AlertTriangle className="h-4 w-4" aria-hidden />
        <span>{anomaly.label}</span>
        <span className="num ml-auto text-xs opacity-70">
          {Math.round(anomaly.confidence * 100)}% confidence
        </span>
      </div>
      <p className="mt-1.5 text-muted-foreground">{anomaly.reasoning}</p>
      {anomaly.matched_transaction_id ? (
        <p className="num mt-1 text-xs text-muted-foreground">
          Evidence: {anomaly.matched_transaction_id}
        </p>
      ) : null}
      <p className="mt-1.5">
        <span className="font-medium">Recommended: </span>
        {anomaly.recommended_action}
      </p>
      {anomaly.human_approval_required ? (
        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Needs your sign-off
        </p>
      ) : null}
    </div>
  );
}
