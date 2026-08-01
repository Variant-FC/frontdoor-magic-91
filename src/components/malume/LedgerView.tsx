import { useMalume } from "@/lib/malume/store";
import { formatZAR, round2, txVat } from "@/lib/malume/vat";
import { CATEGORIES } from "@/lib/malume/types";
import { AlertTriangle } from "lucide-react";

const catLabel = (v: string) => CATEGORIES.find((c) => c.value === v)?.label ?? v;

export function LedgerView({ highlight = [] }: { highlight?: string[] }) {
  const { transactions, anomalies } = useMalume();
  const sorted = [...transactions].sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999"));
  let running = 0;

  return (
    <div className="card-paper overflow-x-auto rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-muted/70 text-left text-xs uppercase tracking-[0.1em] text-muted-foreground">
          <tr>
            <th className="p-3">Date</th>
            <th className="p-3">ID</th>
            <th className="p-3">Merchant</th>
            <th className="p-3">Category</th>
            <th className="p-3 text-right">Amount</th>
            <th className="p-3 text-right">VAT</th>
            <th className="p-3 text-right">Running total</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((t) => {
            const v = txVat(t);
            running = round2(running + (t.total ?? 0));
            const flags = anomalies[t.transaction_id] ?? [];
            const isHighlighted = highlight.includes(t.transaction_id);
            return (
              <tr
                key={t.transaction_id}
                id={`ledger-${t.transaction_id}`}
                className={`scroll-mt-28 border-t border-border ${
                  isHighlighted ? "bg-accent/20" : flags.length ? "bg-warning/10" : ""
                }`}
              >
                <td className="num p-3">{t.date ?? "no date"}</td>
                <td className="num p-3">{t.transaction_id}</td>
                <td className="p-3">
                  <span className="flex items-center gap-2">
                    {flags.length ? (
                      <AlertTriangle
                        className="h-3.5 w-3.5 text-warning-foreground"
                        aria-label={flags.map((f) => f.label).join(", ")}
                      />
                    ) : null}
                    {t.merchant ?? "Unknown merchant"}
                  </span>
                </td>
                <td className="p-3">{catLabel(t.category)}</td>
                <td className="num p-3 text-right">{formatZAR(t.total)}</td>
                <td className="num p-3 text-right">
                  {v.vat_amount !== null
                    ? formatZAR(v.vat_amount)
                    : v.vat_amount_estimate !== null
                      ? `${formatZAR(v.vat_amount_estimate)}*`
                      : "—"}
                </td>
                <td className="num p-3 text-right font-semibold">{formatZAR(running)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
