import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AnomalyBlock } from "./AnomalyBlock";
import { CATEGORIES, type Anomaly, type Transaction, type VatStatus } from "@/lib/malume/types";
import { formatZAR, txVat } from "@/lib/malume/vat";
import { useMalume } from "@/lib/malume/store";
import { Trash2 } from "lucide-react";

export function TransactionCard({
  tx,
  anomalies,
  highlighted,
}: {
  tx: Transaction;
  anomalies: Anomaly[];
  highlighted?: boolean;
}) {
  const { updateTransaction, removeTransaction } = useMalume();
  const vat = txVat(tx);

  return (
    <article
      id={`tx-${tx.transaction_id}`}
      className={`card-paper scroll-mt-24 rounded-lg p-5 transition-shadow ${
        highlighted ? "ring-2 ring-accent" : ""
      }`}
    >
      <header className="flex flex-wrap items-center gap-3 border-b border-border pb-3">
        <span className="num rounded bg-secondary px-2 py-1 text-xs font-semibold text-secondary-foreground">
          {tx.transaction_id}
        </span>
        {tx.edited ? (
          <span className="rounded bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
            Edited by you
          </span>
        ) : null}
        {tx.missing_information.length ? (
          <span className="rounded bg-warning/20 px-2 py-1 text-xs font-medium text-warning-foreground">
            Missing: {tx.missing_information.join(", ")}
          </span>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto text-muted-foreground"
          onClick={() => removeTransaction(tx.transaction_id)}
        >
          <Trash2 className="h-4 w-4" aria-hidden /> Remove
        </Button>
      </header>

      <div className="grid gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Merchant" missing={!tx.merchant}>
          <Input
            value={tx.merchant ?? ""}
            placeholder="Merchant not found"
            onChange={(e) =>
              updateTransaction(tx.transaction_id, { merchant: e.target.value || null })
            }
          />
        </Field>
        <Field label="Date" missing={!tx.date}>
          <Input
            type="date"
            value={tx.date ?? ""}
            onChange={(e) => updateTransaction(tx.transaction_id, { date: e.target.value || null })}
          />
        </Field>
        <Field label="Total (ZAR)" missing={tx.total === null}>
          <Input
            className="num"
            inputMode="decimal"
            value={tx.total ?? ""}
            onChange={(e) => {
              const n = Number.parseFloat(e.target.value);
              updateTransaction(tx.transaction_id, {
                total: Number.isFinite(n) ? n : null,
              });
            }}
          />
        </Field>
        <Field label="VAT status" missing={tx.vat_status === "unknown"}>
          <Select
            value={tx.vat_status}
            onValueChange={(v) =>
              updateTransaction(tx.transaction_id, { vat_status: v as VatStatus })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="inclusive">VAT inclusive</SelectItem>
              <SelectItem value="exclusive">VAT exclusive</SelectItem>
              <SelectItem value="unknown">Unknown</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Category">
          <Select
            value={tx.category}
            onValueChange={(v) =>
              updateTransaction(tx.transaction_id, { category: v as Transaction["category"] })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Payment method" missing={!tx.payment_method}>
          <Input
            value={tx.payment_method ?? ""}
            placeholder="Not provided"
            onChange={(e) =>
              updateTransaction(tx.transaction_id, { payment_method: e.target.value || null })
            }
          />
        </Field>
      </div>

      <div className="mt-4 space-y-1 text-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Description
        </p>
        <p className="text-muted-foreground">{tx.description}</p>
      </div>

      {tx.line_items.length ? (
        <ul className="mt-3 space-y-1 text-sm">
          {tx.line_items.map((li, i) => (
            <li key={i} className="flex justify-between border-b border-border/60 py-1">
              <span>
                {li.quantity} × {li.description}
              </span>
              <span className="num">{formatZAR(li.quantity * li.unit_price)}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 rounded-md bg-muted/70 p-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            VAT (calculated in code)
          </span>
          <span className="num font-semibold">
            {vat.vat_amount !== null
              ? formatZAR(vat.vat_amount)
              : vat.vat_amount_estimate !== null
                ? `${formatZAR(vat.vat_amount_estimate)} (estimate)`
                : "Not calculated"}
          </span>
        </div>
        {vat.formula ? <p className="num mt-1 text-xs text-muted-foreground">{vat.formula}</p> : null}
        {vat.note ? <p className="mt-1 text-xs text-muted-foreground">{vat.note}</p> : null}
        {tx.stated_vat !== null ? (
          <p className="num mt-1 text-xs text-muted-foreground">
            Stated on document: {formatZAR(tx.stated_vat)}
          </p>
        ) : null}
        {tx.vat_status === "unknown" && tx.total !== null ? (
          <label className="mt-3 flex items-center gap-2 text-xs">
            <Switch
              checked={tx.vat_estimate_opt_in}
              onCheckedChange={(v) =>
                updateTransaction(tx.transaction_id, { vat_estimate_opt_in: v })
              }
            />
            Show a labelled estimate assuming VAT-inclusive pricing
          </label>
        ) : null}
      </div>

      {anomalies.length ? (
        <div className="mt-4 space-y-2">
          {anomalies.map((a, i) => (
            <AnomalyBlock key={i} anomaly={a} />
          ))}
        </div>
      ) : null}
    </article>
  );
}

function Field({
  label,
  missing,
  children,
}: {
  label: string;
  missing?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
        {missing ? <span className="ml-2 normal-case text-warning-foreground">not found</span> : null}
      </Label>
      {children}
    </div>
  );
}
