import uuid
from datetime import date
from decimal import Decimal


from django.conf import settings
from django.db import models


class Period(models.Model):
    """A calendar month of trading. The ledger starts fresh every month."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="periods")
    month = models.CharField(max_length=7)  # YYYY-MM
    opened_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = [("user", "month")]
        ordering = ["-month"]

    def __str__(self):
        return f"{self.user_id} {self.month}"

    @classmethod
    def current_month(cls) -> str:
        return date.today().strftime("%Y-%m")

    @classmethod
    def get_or_open(cls, user, month: str | None = None) -> "Period":
        period, _ = cls.objects.get_or_create(user=user, month=month or cls.current_month())
        return period

    # --- totals -------------------------------------------------------
    def totals(self) -> dict:
        from invoices.models import Invoice

        agg = self.transactions.aggregate(
            expenses=models.Sum("total"),
            vat=models.Sum("vat_amount"),
            count=models.Count("id"),
        )
        expenses = agg["expenses"] or Decimal("0.00")
        income = Invoice.objects.filter(
            user=self.user, status="paid", issue_date__startswith=self.month
        ).aggregate(total=models.Sum("total"))["total"] or Decimal("0.00")

        from vat.services import q

        return {
            "total_expenses": q(expenses),
            "total_income": q(income),
            "profit": q(income - expenses),
            "total_vat": q(agg["vat"] or Decimal("0.00")),
            "transaction_count": agg["count"] or 0,
        }
