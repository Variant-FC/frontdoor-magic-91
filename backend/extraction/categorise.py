"""Rule-based categorisation. Every expense always gets a category."""

KEYWORDS = {
    "transport": ["uber", "bolt", "petrol", "fuel", "engen", "shell", "sasol", "taxi", "parking", "toll"],
    "food_and_entertainment": ["kfc", "nandos", "restaurant", "cafe", "coffee", "woolworths food", "steers"],
    "office_supplies": ["waltons", "paper", "stationery", "printer", "cartridge", "postnet"],
    "utilities": ["eskom", "municipal", "water", "electricity", "prepaid", "vodacom", "mtn", "telkom", "airtime"],
    "software_and_subscriptions": ["google", "microsoft", "adobe", "canva", "xero", "sage", "netflix", "subscription", "saas"],
    "stock_and_materials": ["makro", "builders", "cash & carry", "wholesale", "supplier", "timber", "cement"],
    "professional_services": ["accountant", "attorney", "consult", "audit", "bookkeep", "legal"],
    "marketing": ["facebook ads", "meta ads", "google ads", "flyer", "printing", "branding", "banner"],
}


def categorise(merchant: str | None, description: str = "") -> tuple[str, str]:
    """Return (category, source). Falls back to ('other', 'rule')."""
    haystack = f"{merchant or ''} {description or ''}".lower()
    for category, keywords in KEYWORDS.items():
        if any(keyword in haystack for keyword in keywords):
            return category, "rule"
    return "other", "rule"
