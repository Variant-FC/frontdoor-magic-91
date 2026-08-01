from rest_framework import serializers

from .models import Invoice


class InvoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invoice
        fields = [
            "id",
            "invoice_number",
            "client_name",
            "client_details",
            "issue_date",
            "due_date",
            "line_items",
            "vat_status",
            "subtotal",
            "vat_amount",
            "total",
            "payment_details_note",
            "status",
            "finalised",
        ]
        # Numbering and money are the server's job.
        read_only_fields = ["id", "invoice_number", "subtotal", "vat_amount", "total"]

    def create(self, validated_data):
        user = self.context["request"].user
        invoice = Invoice(user=user, invoice_number=Invoice.next_number(user), **validated_data)
        invoice.recalculate()
        invoice.save()
        return invoice

    def update(self, instance, validated_data):
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.recalculate()
        instance.save()
        return instance
