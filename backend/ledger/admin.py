from django.contrib import admin

from .models import Anomaly, Revision, Transaction


class AnomalyInline(admin.TabularInline):
    model = Anomaly
    extra = 0


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ["merchant", "date", "total", "category", "vat_amount", "approved", "user"]
    list_filter = ["category", "vat_status", "approved"]
    search_fields = ["merchant", "description"]
    inlines = [AnomalyInline]


admin.site.register(Revision)
