from rest_framework import serializers

from vat.services import compute

from .models import Anomaly, Revision, Transaction

EDITABLE_FIELDS = [
    "merchant",
    "date",
    "description",
    "line_items",
    "total",
    "stated_vat",
    "vat_status",
    "category",
    "payment_method",
]


class AnomalySerializer(serializers.ModelSerializer):
    class Meta:
        model = Anomaly
        fields = [
            "id",
            "transaction",
            "type",
            "label",
            "matched_transaction",
            "reasoning",
            "confidence",
            "recommended_action",
            "human_approval_required",
            "resolved",
        ]


class RevisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Revision
        fields = ["id", "transaction", "field", "before", "after", "changed_by", "changed_at"]


class TransactionSerializer(serializers.ModelSerializer):
    anomalies = AnomalySerializer(many=True, read_only=True)
    period = serializers.CharField(source="period.month", read_only=True)

    class Meta:
        model = Transaction
        fields = [
            "id",
            "period",
            "upload",
            "merchant",
            "date",
            "description",
            "line_items",
            "total",
            "stated_vat",
            "vat_status",
            "vat_amount",
            "net_amount",
            "category",
            "category_source",
            "payment_method",
            "missing_information",
            "anomalies",
            "edited",
            "approved",
            "created_at",
            "updated_at",
        ]
        # VAT is server-computed; never accepted from the client.
        read_only_fields = [
            "id",
            "period",
            "upload",
            "vat_amount",
            "net_amount",
            "missing_information",
            "category_source",
            "edited",
            "approved",
            "created_at",
            "updated_at",
        ]

    def update(self, instance, validated_data):
        from .anomalies import detect_for

        revisions = []
        for field, value in validated_data.items():
            before = getattr(instance, field)
            if str(before) != str(value):
                revisions.append(
                    Revision(
                        transaction=instance,
                        field=field,
                        before=None if before is None else str(before),
                        after=None if value is None else str(value),
                        changed_by="user",
                    )
                )
                setattr(instance, field, value)

        if "category" in validated_data:
            instance.category_source = "user"
        if revisions:
            instance.edited = True

        instance.vat_amount, instance.net_amount, _ = compute(instance.total, instance.vat_status)
        instance.missing_information = [
            field
            for field in ("merchant", "date", "total")
            if not getattr(instance, field)
        ]
        instance.save()
        Revision.objects.bulk_create(revisions)
        detect_for(instance)
        return instance
