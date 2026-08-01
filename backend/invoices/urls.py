from rest_framework.routers import DefaultRouter

from .views import InvoiceViewSet

router = DefaultRouter(trailing_slash=True)
router.register("", InvoiceViewSet, basename="invoice")

urlpatterns = router.urls
