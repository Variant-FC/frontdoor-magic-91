from rest_framework import serializers

from .models import Insight


class InsightSerializer(serializers.ModelSerializer):
    period = serializers.CharField(source="period.month", read_only=True)

    class Meta:
        model = Insight
        fields = [
            "id",
            "period",
            "insight",
            "malume_take",
            "supporting_transactions",
            "financial_effect",
            "recommended_action",
            "status",
            "generated_at",
        ]
        read_only_fields = [f for f in fields if f != "status"]
