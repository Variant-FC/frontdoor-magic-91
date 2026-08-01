"""Anomaly detection over a user's transactions."""

from datetime import timedelta
from decimal import Decimal

from vat.services import line_items_subtotal, q, vat_from_inclusive

from .models import Anomaly, Transaction


def _flag(transaction, type_, label, reasoning, action, confidence=0.7, matched=None):
    return Anomaly(
        transaction=transaction,
        type=type_,
        label=label,
        reasoning=reasoning,
        recommended_action=action,
        confidence=confidence,
        matched_transaction=matched,
    )


def detect_for(transaction: Transaction) -> list[Anomaly]:
    """Recompute the flags for one transaction. Replaces unresolved flags."""
    flags: list[Anomaly] = []
    peers = Transaction.objects.filter(user=transaction.user).exclude(pk=transaction.pk)

    if transaction.missing_information:
        flags.append(
            _flag(
                transaction,
                "missing_required_field",
                "Missing information",
                "These fields could not be read: " + ", ".join(transaction.missing_information),
                "Fill them in by hand.",
                confidence=0.9,
            )
        )

    # Duplicates: same merchant + total within 3 days.
    if transaction.merchant and transaction.total and transaction.date:
        window = (transaction.date - timedelta(days=3), transaction.date + timedelta(days=3))
        match = peers.filter(
            merchant__iexact=transaction.merchant, total=transaction.total, date__range=window
        ).first()
        if match:
            flags.append(
                _flag(
                    transaction,
                    "probable_duplicate",
                    "Possible duplicate",
                    f"Same merchant and amount as a record dated {match.date}.",
                    "Check whether you paid twice, then delete one.",
                    confidence=0.8,
                    matched=match.pk,
                )
            )

    # VAT mismatch against the stated figure.
    if transaction.total and transaction.stated_vat is not None and transaction.vat_status == "inclusive":
        expected = vat_from_inclusive(transaction.total)
        if abs(expected - transaction.stated_vat) > Decimal("0.05"):
            flags.append(
                _flag(
                    transaction,
                    "vat_mismatch",
                    "VAT does not add up",
                    f"Receipt says R{transaction.stated_vat}, 15% of the total works out to R{expected}.",
                    "Confirm the amount on the receipt.",
                    confidence=0.85,
                )
            )

    # Missing VAT entirely.
    if transaction.total and transaction.vat_status == "unknown":
        flags.append(
            _flag(
                transaction,
                "missing_required_field",
                "No VAT stated",
                "The receipt does not say whether the total includes VAT.",
                "Set the VAT status so the claim is correct.",
                confidence=0.6,
            )
        )

    # Line items vs total.
    if transaction.line_items and transaction.total:
        subtotal = line_items_subtotal(transaction.line_items)
        gross = subtotal if transaction.vat_status != "exclusive" else q(subtotal * Decimal("1.15"))
        if abs(gross - transaction.total) > Decimal("0.05"):
            flags.append(
                _flag(
                    transaction,
                    "line_item_total_mismatch",
                    "Line items don't match the total",
                    f"Line items come to R{gross}, the total says R{transaction.total}.",
                    "Check the quantities and prices.",
                    confidence=0.75,
                )
            )

    # Large cash payment.
    if transaction.total and transaction.payment_method == "cash" and transaction.total > Decimal("5000"):
        flags.append(
            _flag(
                transaction,
                "large_cash_transaction",
                "Big cash payment",
                f"R{transaction.total} paid in cash.",
                "Keep the paper receipt safe for SARS.",
                confidence=0.6,
            )
        )

    # Outlier for the category.
    if transaction.total:
        peer_totals = [
            t.total
            for t in peers.filter(category=transaction.category).exclude(total=None)[:200]
        ]
        if len(peer_totals) >= 4:
            average = sum(peer_totals) / len(peer_totals)
            if average > 0 and transaction.total > average * Decimal("3"):
                flags.append(
                    _flag(
                        transaction,
                        "unusual_amount",
                        "Much bigger than usual",
                        f"Your usual {transaction.get_category_display().lower()} spend is about R{q(average)}.",
                        "Have a look at whether this is right.",
                        confidence=0.65,
                    )
                )

    # Recurring subscription.
    if transaction.merchant and peers.filter(merchant__iexact=transaction.merchant).count() >= 2:
        if transaction.category == "software_and_subscriptions":
            flags.append(
                _flag(
                    transaction,
                    "recurring_subscription",
                    "Recurring subscription",
                    f"{transaction.merchant} shows up every month.",
                    "Make sure you are still using it.",
                    confidence=0.7,
                )
            )

    transaction.anomalies.filter(resolved=False).delete()
    return Anomaly.objects.bulk_create(flags)
