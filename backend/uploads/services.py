"""Turn an upload into ledger transactions."""

from datetime import date as date_cls

from django.db import transaction as db_transaction

from extraction.services import extract
from ledger.anomalies import detect_for
from ledger.models import Transaction
from periods.models import Period
from vat.services import compute


def _period_for(user, record) -> Period:
    month = (record.get("date") or date_cls.today().isoformat())[:7]
    return Period.get_or_open(user, month)


@db_transaction.atomic
def process(upload) -> int:
    """Extract, VAT-calculate, categorise and flag. Returns row count."""
    upload.status = "processing"
    upload.save(update_fields=["status"])

    try:
        records = extract(upload.raw_text)
        created = []
        for record in records:
            vat_amount, net_amount, _ = compute(record["total"], record["vat_status"])
            created.append(
                Transaction.objects.create(
                    user=upload.user,
                    period=_period_for(upload.user, record),
                    upload=upload,
                    merchant=record["merchant"],
                    date=record["date"],
                    description=record["description"],
                    line_items=record["line_items"],
                    total=record["total"],
                    stated_vat=record["stated_vat"],
                    vat_status=record["vat_status"],
                    vat_amount=vat_amount,
                    net_amount=net_amount,
                    category=record["category"] or "other",
                    category_source=record["category_source"],
                    payment_method=record["payment_method"],
                    missing_information=record["missing_information"],
                    raw_text=record["raw_text"],
                )
            )

        for row in created:
            detect_for(row)

        upload.status = "extracted"
        upload.transaction_count = len(created)
        upload.error_message = None
    except Exception as exc:  # noqa: BLE001
        upload.status = "failed"
        upload.error_message = str(exc)[:500]
        upload.transaction_count = 0

    upload.save(update_fields=["status", "transaction_count", "error_message"])
    return upload.transaction_count or 0
