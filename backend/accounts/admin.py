from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class MalumeUserAdmin(UserAdmin):
    ordering = ["email"]
    list_display = ["email", "owner_name", "business_name", "vat_registered", "is_staff"]
    search_fields = ["email", "owner_name", "business_name"]
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Business", {"fields": ("owner_name", "business_name", "vat_registered")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Dates", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("email", "password1", "password2")}),
    )
