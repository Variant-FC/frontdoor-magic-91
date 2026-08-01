import uuid

from django.conf import settings
from django.db import models


def upload_path(instance, filename):
    return f"receipts/{instance.user_id}/{uuid.uuid4()}/{filename}"


class Upload(models.Model):
    STATUS = [
        ("pending", "Pending"),
        ("processing", "Processing"),
        ("extracted", "Extracted"),
        ("failed", "Failed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="uploads")
    file = models.FileField(upload_to=upload_path, null=True, blank=True)
    filename = models.CharField(max_length=255)
    content_type = models.CharField(max_length=120, blank=True)
    size_bytes = models.PositiveIntegerField(default=0)
    raw_text = models.TextField(blank=True)
    status = models.CharField(max_length=12, choices=STATUS, default="pending")
    transaction_count = models.PositiveIntegerField(null=True, blank=True)
    error_message = models.TextField(null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-uploaded_at"]

    def __str__(self):
        return self.filename
