from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

api_v1 = [
    path("auth/", include("accounts.urls")),
    path("uploads/", include("uploads.urls")),
    path("", include("ledger.urls")),
    path("insights/", include("insights.urls")),
    path("periods/", include("periods.urls")),
    path("invoices/", include("invoices.urls")),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include(api_v1)),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
