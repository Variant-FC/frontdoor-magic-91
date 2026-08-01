from rest_framework import serializers

from .models import Upload


class UploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Upload
        fields = [
            "id",
            "filename",
            "content_type",
            "size_bytes",
            "status",
            "transaction_count",
            "error_message",
            "uploaded_at",
        ]
        read_only_fields = fields
