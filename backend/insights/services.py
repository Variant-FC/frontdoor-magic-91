"""Generate insights from a period's transactions. Arithmetic in code only."""

from collections import defaultdict
from decimal import Decimal

from ledger.models import Transaction
from vat.services import q

from .models import Insight


def _rand(value):
    return f"R{q(value)}"


def generate(user, period) -> list[Insight]:
    rows = list(Transaction.objects.filter(user=user, period=period))
    period.insights.filter(status="pending").delete()
    if not rows:
        return []

    totals = defaultdict(Decimal)
    for row in rows:
        if row.total:
            totals[row.category] += row.total
    grand_total = sum(totals.values()) or Decimal("0")

    found: list[Insight] = []

    if totals:
        top_category, top_total = max(totals.items(), key=lambda kv: kv[1])
        share = int((top_total / grand_total) * 100) if grand_total else 0
        found.append(
            Insight(
                user=user,
                period=period,
                insight=f"{top_category.replace('_', ' ').title()} is your biggest cost at {_rand(top_total)} ({share}% of spend).",
                malume_take="That's where your money is going, my friend. Trim there first and you feel it right away.",
                supporting_transactions=[
                    str(row.id) for row in rows if row.category == top_category
                ],
                financial_effect=_rand(top_total),
                recommended_action=f"Review your {top_category.replace('_', ' ')} suppliers.",
            )
        )

    reclaimable = sum((row.vat_amount or Decimal("0")) for row in rows)
    if reclaimable > 0:
        found.append(
            Insight(
                user=user,
                period=period,
                insight=f"{_rand(reclaimable)} of input VAT sits in this month's receipts.",
                malume_take="Don't leave that with SARS. Claim it back when you file.",
                supporting_transactions=[str(row.id) for row in rows if row.vat_amount],
                financial_effect=_rand(reclaimable),
                recommended_action="Include these in your VAT201 return.",
            )
        )

    no_vat = [row for row in rows if row.vat_status == "unknown" and row.total]
    if no_vat:
        missed = sum(row.total for row in no_vat)
        found.append(
            Insight(
                user=user,
                period=period,
                insight=f"{len(no_vat)} receipts worth {_rand(missed)} don't state their VAT.",
                malume_take="Without the VAT status you can't claim it. Sort those out.",
                supporting_transactions=[str(row.id) for row in no_vat],
                financial_effect=_rand(missed),
                recommended_action="Set the VAT status on each of these.",
            )
        )

    flagged = [row for row in rows if row.anomalies.filter(resolved=False).exists()]
    if flagged:
        found.append(
            Insight(
                user=user,
                period=period,
                insight=f"{len(flagged)} transactions are flagged and waiting for you.",
                malume_take="Quick check now saves a big headache at year end.",
                supporting_transactions=[str(row.id) for row in flagged],
                financial_effect="",
                recommended_action="Work through the review queue.",
            )
        )

    return Insight.objects.bulk_create(found)


def spend_by_category(user, period):
    rows = Transaction.objects.filter(user=user, period=period).exclude(total=None)
    totals = defaultdict(lambda: [Decimal("0"), 0])
    for row in rows:
        totals[row.category][0] += row.total
        totals[row.category][1] += 1
    grand_total = sum(value[0] for value in totals.values()) or Decimal("1")
    return [
        {
            "category": category,
            "total": str(q(total)),
            "share": round(float(total / grand_total), 4),
            "transaction_count": count,
        }
        for category, (total, count) in sorted(totals.items(), key=lambda kv: kv[1][0], reverse=True)
    ]


def income_by_client(user, period):
    from invoices.models import Invoice

    rows = Invoice.objects.filter(user=user, status="paid", issue_date__startswith=period.month)
    totals = defaultdict(lambda: [Decimal("0"), 0])
    for row in rows:
        totals[row.client_name][0] += row.total
        totals[row.client_name][1] += 1
    return [
        {"client_name": name, "total": str(q(total)), "invoice_count": count}
        for name, (total, count) in sorted(totals.items(), key=lambda kv: kv[1][0], reverse=True)
    ]
