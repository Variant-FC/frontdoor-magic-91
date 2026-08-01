"""VAT calculation service. Money is Decimal, always. Never float."""

from decimal import ROUND_HALF_UP, Decimal

VAT_RATE = Decimal("0.15")
CENTS = Decimal("0.01")


def q(value) -> Decimal:
    """Quantise any numeric-ish value to 2 decimal places."""
    return Decimal(str(value)).quantize(CENTS, rounding=ROUND_HALF_UP)


def vat_from_inclusive(total: Decimal) -> Decimal:
    """VAT portion contained inside a VAT-inclusive total."""
    return q(Decimal(total) * VAT_RATE / (Decimal("1") + VAT_RATE))


def vat_from_exclusive(net: Decimal) -> Decimal:
    """VAT added on top of a VAT-exclusive amount."""
    return q(Decimal(net) * VAT_RATE)


def compute(total, vat_status: str):
    """Return (vat_amount, net_amount, gross_amount) for a transaction total.

    `vat_status` is one of: inclusive, exclusive, unknown.
    An unknown status yields no VAT figure at all — we never guess.
    """
    if total is None:
        return None, None, None

    total = Decimal(str(total))

    if vat_status == "inclusive":
        vat = vat_from_inclusive(total)
        return vat, q(total - vat), q(total)

    if vat_status == "exclusive":
        vat = vat_from_exclusive(total)
        return vat, q(total), q(total + vat)

    return None, None, q(total)


def line_items_subtotal(line_items) -> Decimal:
    """Sum of quantity * unit_price across line items."""
    subtotal = Decimal("0")
    for item in line_items or []:
        quantity = Decimal(str(item.get("quantity", 0) or 0))
        unit_price = Decimal(str(item.get("unit_price", 0) or 0))
        subtotal += quantity * unit_price
    return q(subtotal)
