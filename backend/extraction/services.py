"""Turn raw receipt text into structured transaction dicts.

Two paths: a deterministic regex parser (always available) and an optional
AI pass that fills gaps when LOVABLE_AI_API_KEY is configured. The AI never
does arithmetic — VAT is always computed in `vat.services`.
"""

import json
import re
from datetime import datetime
from decimal import Decimal, InvalidOperation

from django.conf import settings

from .categorise import categorise

AMOUNT = r"(?:R|ZAR)?\s*([0-9][0-9\s,]*(?:\.[0-9]{2})?)"
DATE_PATTERNS = [
    (r"(\d{4})-(\d{2})-(\d{2})", "%Y-%m-%d"),
    (r"(\d{2})/(\d{2})/(\d{4})", "%d/%m/%Y"),
    (r"(\d{2})-(\d{2})-(\d{4})", "%d-%m-%Y"),
]


def _to_decimal(raw: str) -> Decimal | None:
    try:
        return Decimal(raw.replace(" ", "").replace(",", ""))
    except (InvalidOperation, AttributeError):
        return None


def _find_date(text: str) -> str | None:
    for pattern, fmt in DATE_PATTERNS:
        match = re.search(pattern, text)
        if match:
            try:
                return datetime.strptime(match.group(0), fmt).date().isoformat()
            except ValueError:
                continue
    return None


def parse_receipt(text: str) -> dict:
    """Parse a single receipt blob into a transaction dict."""
    lines = [line.strip() for line in text.strip().splitlines() if line.strip()]
    merchant = None
    for line in lines[:4]:
        if not re.search(r"\d{2}", line):
            merchant = line[:200]
            break
    if merchant is None and lines:
        merchant = lines[0][:200]

    total = None
    total_match = re.search(rf"(?:total|amount due|grand total)[^0-9R]*{AMOUNT}", text, re.I)
    if total_match:
        total = _to_decimal(total_match.group(1))

    stated_vat = None
    vat_match = re.search(rf"(?:vat|btw|tax)[^0-9R]*{AMOUNT}", text, re.I)
    if vat_match:
        stated_vat = _to_decimal(vat_match.group(1))

    if re.search(r"vat\s*incl|incl(?:usive)?\s*of\s*vat|incl\.?\s*vat", text, re.I):
        vat_status = "inclusive"
    elif re.search(r"vat\s*excl|excl(?:usive)?\s*of\s*vat", text, re.I):
        vat_status = "exclusive"
    elif stated_vat is not None:
        vat_status = "inclusive"
    else:
        vat_status = "unknown"

    payment_method = None
    payment_match = re.search(r"\b(cash|card|eft|debit|credit|snapscan|zapper|payfast)\b", text, re.I)
    if payment_match:
        payment_method = payment_match.group(1).lower()

    date = _find_date(text)
    category, source = categorise(merchant, text)

    missing = [
        field
        for field, value in (("merchant", merchant), ("date", date), ("total", total))
        if not value
    ]

    return {
        "merchant": merchant,
        "date": date,
        "description": lines[0][:500] if lines else "",
        "line_items": [],
        "total": total,
        "stated_vat": stated_vat,
        "vat_status": vat_status,
        "payment_method": payment_method,
        "category": category,
        "category_source": source,
        "missing_information": missing,
        "raw_text": text[:5000],
    }


def split_batch(text: str) -> list[str]:
    """Split a pasted batch into individual receipts."""
    chunks = re.split(r"\n\s*(?:-{3,}|={3,}|\n)\s*\n?", text.strip())
    return [chunk.strip() for chunk in chunks if chunk.strip()]


def extract(text: str) -> list[dict]:
    records = [parse_receipt(chunk) for chunk in split_batch(text)]
    if settings.HUGGINGFACE_API_KEY or settings.LOVABLE_AI_API_KEY:
        records = [_ai_enrich(record) for record in records]
    return records


# --- optional AI pass -------------------------------------------------
PROMPT = (
    "Extract receipt fields as JSON with keys merchant, date (YYYY-MM-DD), "
    "category (one of office_supplies, transport, food_and_entertainment, utilities, "
    "software_and_subscriptions, stock_and_materials, professional_services, marketing, other). "
    "Reply with JSON only. Do not compute VAT or any totals. Receipt:\n\n"
)


def _call_huggingface(prompt: str) -> str:
    import requests

    response = requests.post(
        f"https://router.huggingface.co/v1/chat/completions",
        headers={"Authorization": f"Bearer {settings.HUGGINGFACE_API_KEY}"},
        json={
            "model": settings.HUGGINGFACE_MODEL,
            "messages": [{"role": "user", "content": prompt}],
        },
        timeout=30,
    )
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"]


def _call_lovable(prompt: str) -> str:
    import requests

    response = requests.post(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        headers={"Authorization": f"Bearer {settings.LOVABLE_AI_API_KEY}"},
        json={
            "model": settings.AI_EXTRACTION_MODEL,
            "messages": [{"role": "user", "content": prompt}],
        },
        timeout=30,
    )
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"]


def _ai_enrich(record: dict) -> dict:
    """Ask the model to fill in only the fields the parser missed."""
    if not record["missing_information"] and record["category"] != "other":
        return record

    prompt = PROMPT + record["raw_text"]
    try:
        if settings.HUGGINGFACE_API_KEY:
            content = _call_huggingface(prompt)
        else:
            content = _call_lovable(prompt)
        data = json.loads(re.search(r"\{.*\}", content, re.S).group(0))
    except Exception:  # AI is best-effort; the rule parser already succeeded
        return record

    if not record["merchant"] and data.get("merchant"):
        record["merchant"] = str(data["merchant"])[:200]
    if not record["date"] and data.get("date"):
        record["date"] = data["date"]
    if record["category"] == "other" and data.get("category"):
        record["category"] = data["category"]
        record["category_source"] = "ai"

    record["missing_information"] = [
        field for field in record["missing_information"] if not record.get(field)
    ]
    return record
