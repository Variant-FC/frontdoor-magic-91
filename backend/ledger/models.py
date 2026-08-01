import uuid

from django.conf import settings
from django.db import models

CATEGORY_CHOICES = [
    ("office_supplies", "Office supplies"),
    ("transport", "Transport"),
    ("food_and_entertainment", "Food & entertainment"),
    ("utilities", "Utilities"),
    ("software_and_subscriptions", "Software & subscriptions"),
    ("stock_and_materials", "Stock & materials"),
    ("professional_services", "Professional services"),
    ("marketing", "Marketing"),
    ("other", "Other"),
]

VAT_STATUS_CHOICES = [
    ("inclusive", "Inclusive"),
    ("exclusive", "Exclusive"),
    ("unknown", "Unknown"),
]

ANOMALY_TYPES = [
    ("probable_duplicate", "Probable duplicate"),
    ("missing_required_field", "Missing required field"),
    ("vat_mismatch", "VAT mismatch"),
    ("line_item_total_mismatch", "Line item total mismatch"),
    ("unusual_amount", "Unusual amount"),
    ("large_cash_transaction", "Large cash transaction"),
    ("recurring_subscription", "Recurring subscription"),
]


class Transaction(models.Model):
    """One expense record. Always owned by a user, always categorised."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="transactions")
    period = models.ForeignKey("periods.Period", on_delete=models.PROTECT, related_name="transactions")
    upload = models.ForeignKey(
        "uploads.Upload", on_delete=models.SET_NULL, null=True, blank=True, related_name="transactions"
    )

    merchant = models.CharField(max_length=200, null=True, blank=True)
    date = models.DateField(null=True, blank=True)
    description = models.TextField(blank=True)
    line_items = models.JSONField(default=list, blank=True)

    total = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    stated_vat = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    vat_status = models.CharField(max_length=16, choices=VAT_STATUS_CHOICES, default="unknown")
    # Server-computed only.
    vat_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    net_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    category = models.CharField(max_length=40, choices=CATEGORY_CHOICES, default="other")
    category_source = models.CharField(
        max_length=8, choices=[("ai", "AI"), ("rule", "Rule"), ("user", "User")], default="rule"
    )
    payment_method = models.CharField(max_length=60, null=True, blank=True)
    missing_information = models.JSONField(default=list, blank=True)
    raw_text = models.TextField(blank=True)

    edited = models.BooleanField(default=False)
    approved = models.BooleanField(default=False)
    rejected = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-created_at"]
        indexes = [models.Index(fields=["user", "period"]), models.Index(fields=["user", "category"])]

    def __str__(self):
        return f"{self.merchant or 'Unknown'} — {self.total or '?'}"


class Revision(models.Model):
    """Append-only audit trail so the UI can show before/after."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    transaction = models.ForeignKey(Transaction, on_delete=models.CASCADE, related_name="revisions")
    field = models.CharField(max_length=60)
    before = models.TextField(null=True, blank=True)
    after = models.TextField(null=True, blank=True)
    changed_by = models.CharField(max_length=16, default="user")
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-changed_at"]


class Anomaly(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    transaction = models.ForeignKey(Transaction, on_delete=models.CASCADE, related_name="anomalies")
    type = models.CharField(max_length=40, choices=ANOMALY_TYPES)
    label = models.CharField(max_length=160)
    matched_transaction = models.UUIDField(null=True, blank=True)
    reasoning = models.TextField(blank=True)
    confidence = models.FloatField(default=0.5)
    recommended_action = models.CharField(max_length=200, blank=True)
    human_approval_required = models.BooleanField(default=True)
    resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-confidence"]
