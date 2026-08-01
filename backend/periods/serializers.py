from rest_framework import serializers

from .models import Period


class PeriodSerializer(serializers.ModelSerializer):
    total_expenses = serializers.SerializerMethodField()
    total_income = serializers.SerializerMethodField()
    profit = serializers.SerializerMethodField()
    total_vat = serializers.SerializerMethodField()
    transaction_count = serializers.SerializerMethodField()

    class Meta:
        model = Period
        fields = [
            "id",
            "month",
            "opened_at",
            "closed_at",
            "total_expenses",
            "total_income",
            "profit",
            "total_vat",
            "transaction_count",
        ]

    def _totals(self, obj):
        if not hasattr(obj, "_cached_totals"):
            obj._cached_totals = obj.totals()
        return obj._cached_totals

    def get_total_expenses(self, obj):
        return str(self._totals(obj)["total_expenses"])

    def get_total_income(self, obj):
        return str(self._totals(obj)["total_income"])

    def get_profit(self, obj):
        return str(self._totals(obj)["profit"])

    def get_total_vat(self, obj):
        return str(self._totals(obj)["total_vat"])

    def get_transaction_count(self, obj):
        return self._totals(obj)["transaction_count"]
