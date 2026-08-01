import { useMalume } from "@/lib/malume/store";
import { batchVatTotals, formatZAR, txVat } from "@/lib/malume/vat";

export function VatView() {
  const { transactions } = useMalume();
  const totals = batchVatTotals(transactions);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Net (excl. VAT)" value={formatZAR(totals.net)} />
        <Stat label="VAT confirmed" value={formatZAR(totals.confirmed)} highlight />
        <Stat label="VAT estimated" value={formatZAR(totals.estimated)} muted />
        <Stat label="Gross recorded" value={formatZAR(totals.gross)} />
      </div>

      <div className="card-paper overflow-x-auto rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-muted/70 text-left text-xs uppercase tracking-[0.1em] text-muted-foreground">
            <tr>
              <th className="p-3">ID</th>
              <th className="p-3">Merchant</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Net</th>
              <th className="p-3 text-right">VAT</th>
              <th className="p-3 text-right">Gross</th>
              <th className="p-3">Working</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => {
              const v = txVat(t);
              return (
                <tr key={t.transaction_id} className="border-t border-border">
                  <td className="num p-3">{t.transaction_id}</td>
                  <td className="p-3">{t.merchant ?? "—"}</td>
                  <td className="p-3 capitalize">{t.vat_status}</td>
                  <td className="num p-3 text-right">{formatZAR(v.net)}</td>
                  <td className="num p-3 text-right">
                    {v.vat_amount !== null
                      ? formatZAR(v.vat_amount)
                      : v.vat_amount_estimate !== null
                        ? `${formatZAR(v.vat_amount_estimate)}*`
                        : "—"}
                  </td>
                  <td className="num p-3 text-right">{formatZAR(v.gross)}</td>
                  <td className="num p-3 text-xs text-muted-foreground">{v.formula ?? v.note}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        * Labelled estimate assuming VAT-inclusive pricing — not confirmed, and excluded from the
        confirmed VAT total. Standard SA VAT rate: 15%.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
  muted,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  muted?: boolean;
}) {
  return (
    <div className={`rounded-lg p-4 ${highlight ? "ink-panel" : "card-paper"}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] opacity-70">{label}</p>
      <p className={`num mt-2 text-xl font-semibold ${muted ? "text-muted-foreground" : ""}`}>
        {value}
      </p>
    </div>
  );
}
