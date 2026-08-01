import uuid

from django.conf import settings
from django.db import models


class Insight(models.Model):
    """A plain-language finding, always linked to the rows that prove it."""

    STATUS = [("pending", "Pending"), ("approved", "Approved"), ("rejected", "Rejected")]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="insights")
    period = models.ForeignKey("periods.Period", on_delete=models.CASCADE, related_name="insights")
    insight = models.TextField()
    malume_take = models.TextField(blank=True)
    supporting_transactions = models.JSONField(default=list)
    financial_effect = models.CharField(max_length=200, blank=True)
    recommended_action = models.CharField(max_length=250, blank=True)
    status = models.CharField(max_length=10, choices=STATUS, default="pending")
    generated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-generated_at"]
