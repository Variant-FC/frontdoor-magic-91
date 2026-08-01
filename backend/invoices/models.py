import uuid
from datetime import date

from django.conf import settings
from django.db import models, transaction as db_transaction


class Invoice(models.Model):
    STATUS = [("draft", "Draft"), ("sent", "Sent"), ("paid", "Paid")]
    VAT_STATUS = [("inclusive", "Inclusive"), ("exclusive", "Exclusive"), ("none", "None")]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="invoices")
    invoice_number = models.CharField(max_length=32)
    client_name = models.CharField(max_length=200)
    client_details = models.TextField(blank=True)
    issue_date = models.DateField(default=date.today)
    due_date = models.DateField(null=True, blank=True)
    line_items = models.JSONField(default=list)
    vat_status = models.CharField(max_length=12, choices=VAT_STATUS, default="none")
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    vat_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    payment_details_note = models.TextField(blank=True)
    status = models.CharField(max_length=8, choices=STATUS, default="draft")
    finalised = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-issue_date", "-created_at"]
        unique_together = [("user", "invoice_number")]

    def __str__(self):
        return self.invoice_number

    @classmethod
    @db_transaction.atomic
    def next_number(cls, user) -> str:
        year = date.today().year
        count = cls.objects.filter(user=user, invoice_number__startswith=f"INV-{year}-").count()
        return f"INV-{year}-{count + 1:04d}"

    def recalculate(self):
        """Server-side totals. Never trust client-supplied money."""
        from vat.services import compute, line_items_subtotal

        subtotal = line_items_subtotal(self.line_items)
        if self.vat_status == "none":
            self.subtotal, self.vat_amount, self.total = subtotal, 0, subtotal
        else:
            vat, net, gross = compute(subtotal, self.vat_status)
            self.subtotal, self.vat_amount, self.total = net, vat, gross
