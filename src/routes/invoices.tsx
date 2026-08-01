import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMalume } from "@/lib/malume/store";
import { formatZAR, invoiceTotals } from "@/lib/malume/vat";
import type { Invoice, InvoiceStatus, LineItem } from "@/lib/malume/types";
import { MalumeSays } from "@/components/malume/MalumeSays";
import { PrototypeNote } from "@/components/malume/PrototypeNote";
import { Plus, Printer, Trash2 } from "lucide-react";

const TITLE = "Create an invoice — Malume Money";
const DESCRIPTION =
  "Bill your clients with correct 15% VAT worked out in code, sequential invoice numbers, and a clean printable layout. Educational prototype, synthetic data only.";

export const Route = createFileRoute("/invoices")({
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
  component: InvoicesPage,
});

const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (n: number) =>
  new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

function InvoicesPage() {
  const { invoices, saveInvoice, nextInvoiceId } = useMalume();
  const [clientName, setClientName] = useState("");
  const [clientDetails, setClientDetails] = useState("");
  const [issueDate, setIssueDate] = useState(today());
  const [dueDate, setDueDate] = useState(plusDays(14));
  const [vatStatus, setVatStatus] = useState<Invoice["vat_status"]>("exclusive");
  const [paymentNote, setPaymentNote] = useState("EFT — account details here (demo only)");
  const [items, setItems] = useState<LineItem[]>([{ description: "", quantity: 1, unit_price: 0 }]);
  const [confirmed, setConfirmed] = useState<Invoice | null>(null);

  const totals = invoiceTotals(items, vatStatus);

  const setItem = (i: number, patch: Partial<LineItem>) =>
    setItems((prev) => prev.map((li, idx) => (idx === i ? { ...li, ...patch } : li)));

  const create = () => {
    const invoice: Invoice = {
      invoice_id: nextInvoiceId(),
      client_name: clientName || "Unnamed client",
      client_details: clientDetails,
      issue_date: issueDate,
      due_date: dueDate,
      line_items: items.filter((li) => li.description.trim()),
      vat_status: vatStatus,
      payment_details_note: paymentNote,
      status: "draft",
      finalised: true,
    };
    saveInvoice(invoice);
    setConfirmed(invoice);
    setClientName("");
    setClientDetails("");
    setItems([{ description: "", quantity: 1, unit_price: 0 }]);
  };

  return (
    <div className="w-full py-6 md:py-8">
      <header className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          The other side of the money
        </p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight">Bill your clients properly.</h1>
        <p className="mt-4 text-muted-foreground">
          Same VAT rules as your expenses, calculated in code. Check the numbers, then finalise —
          nothing gets emailed, this is a prototype.
        </p>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <section className="card-paper space-y-5 rounded-lg p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="client">Client name</Label>
              <Input
                id="client"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Thandeka's Bakery"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="details">Contact / address (optional)</Label>
              <Input
                id="details"
                value={clientDetails}
                onChange={(e) => setClientDetails(e.target.value)}
                placeholder="12 Long Street, Cape Town"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="issue">Invoice date</Label>
              <Input
                id="issue"
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="due">Due date</Label>
              <Input
                id="due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold">Line items</p>
            {items.map((li, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_5rem_7rem_2.5rem]">
                <Input
                  value={li.description}
                  placeholder="Logo design"
                  onChange={(e) => setItem(i, { description: e.target.value })}
                />
                <Input
                  className="num"
                  inputMode="numeric"
                  value={li.quantity}
                  onChange={(e) => setItem(i, { quantity: Number(e.target.value) || 0 })}
                />
                <Input
                  className="num"
                  inputMode="decimal"
                  value={li.unit_price}
                  onChange={(e) => setItem(i, { unit_price: Number(e.target.value) || 0 })}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remove line item"
                  onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            ))}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setItems((prev) => [...prev, { description: "", quantity: 1, unit_price: 0 }])}
            >
              <Plus className="h-4 w-4" aria-hidden /> Add line item
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>VAT treatment</Label>
              <Select
                value={vatStatus}
                onValueChange={(v) => setVatStatus(v as Invoice["vat_status"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="exclusive">Add 15% VAT (exclusive prices)</SelectItem>
                  <SelectItem value="inclusive">Prices already include VAT</SelectItem>
                  <SelectItem value="none">No VAT — not VAT registered</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay">Payment details note</Label>
              <Textarea
                id="pay"
                rows={2}
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
              />
            </div>
          </div>
          <PrototypeNote />
        </section>

        <aside className="space-y-4">
          <div className="ink-panel space-y-2 rounded-lg p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-70">
              Check before you finalise
            </p>
            <Row label="Subtotal" value={formatZAR(totals.subtotal)} />
            <Row label={vatStatus === "none" ? "VAT (not applied)" : "VAT at 15%"} value={formatZAR(totals.vat)} />
            <Row label="Total due" value={formatZAR(totals.total)} strong />
          </div>
          <Button className="w-full" onClick={create} disabled={!items.some((i) => i.description.trim())}>
            Confirm & create invoice
          </Button>
          {confirmed ? (
            <MalumeSays>
              You've billed {confirmed.client_name}{" "}
              {formatZAR(invoiceTotals(confirmed.line_items, confirmed.vat_status).total)}
              {confirmed.vat_status === "none" ? "" : " including VAT"} — due {confirmed.due_date}.
              It's sitting as a draft until you say otherwise.
            </MalumeSays>
          ) : null}
        </aside>
      </div>

      {invoices.length ? (
        <section className="mt-12 space-y-4">
          <h2 className="text-2xl font-semibold">Your invoices</h2>
          {invoices.map((inv) => (
            <InvoiceRow key={inv.invoice_id} invoice={inv} />
          ))}
        </section>
      ) : null}
    </div>
  );
}

function InvoiceRow({ invoice }: { invoice: Invoice }) {
  const { saveInvoice, profile } = useMalume();
  const [open, setOpen] = useState(false);
  const totals = invoiceTotals(invoice.line_items, invoice.vat_status);

  return (
    <article className="card-paper rounded-lg p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="num rounded bg-secondary px-2 py-1 text-xs font-semibold">
          {invoice.invoice_id}
        </span>
        <span className="font-medium">{invoice.client_name}</span>
        <span className="num text-sm text-muted-foreground">due {invoice.due_date}</span>
        <span className="num ml-auto font-semibold">{formatZAR(totals.total)}</span>
        <Select
          value={invoice.status}
          onValueChange={(v) => saveInvoice({ ...invoice, status: v as InvoiceStatus })}
        >
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => setOpen((o) => !o)}>
          {open ? "Hide" : "View"}
        </Button>
      </div>

      {open ? (
        <div className="mt-5 rounded-md border border-border bg-paper p-6">
          <div className="flex flex-wrap justify-between gap-4 border-b border-border pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {profile.business || "Your business"}
                {profile.owner ? ` · ${profile.owner}` : ""}
              </p>
              <h3 className="mt-1 text-2xl font-semibold">Invoice {invoice.invoice_id}</h3>
              <p className="text-sm text-muted-foreground">Issued {invoice.issue_date}</p>
            </div>
            <div className="text-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Billed to
              </p>
              <p className="font-semibold">{invoice.client_name}</p>
              <p className="text-muted-foreground">{invoice.client_details}</p>
              <p className="num text-muted-foreground">Due {invoice.due_date}</p>
            </div>
          </div>

          <table className="mt-4 w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-[0.1em] text-muted-foreground">
              <tr>
                <th className="py-2">Description</th>
                <th className="py-2 text-right">Qty</th>
                <th className="py-2 text-right">Unit</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.line_items.map((li, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="py-2">{li.description}</td>
                  <td className="num py-2 text-right">{li.quantity}</td>
                  <td className="num py-2 text-right">{formatZAR(li.unit_price)}</td>
                  <td className="num py-2 text-right">{formatZAR(li.quantity * li.unit_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 ml-auto w-full max-w-xs space-y-1 text-sm">
            <Row label="Subtotal" value={formatZAR(totals.subtotal)} />
            <Row
              label={invoice.vat_status === "none" ? "VAT (not registered)" : "VAT at 15%"}
              value={formatZAR(totals.vat)}
            />
            <Row label="Total due" value={formatZAR(totals.total)} strong />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">{invoice.payment_details_note}</p>
          <Button variant="secondary" size="sm" className="mt-4" onClick={() => window.print()}>
            <Printer className="h-4 w-4" aria-hidden /> Print / save as PDF
          </Button>
        </div>
      ) : null}
    </article>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "border-t border-border/60 pt-1 font-semibold" : ""}`}>
      <span className="text-sm opacity-80">{label}</span>
      <span className="num text-sm">{value}</span>
    </div>
  );
}
