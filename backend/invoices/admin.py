from django.contrib import admin

from .models import Invoice


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ["invoice_number", "client_name", "total", "status", "issue_date", "user"]
    list_filter = ["status"]
