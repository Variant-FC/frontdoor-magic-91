from rest_framework.routers import DefaultRouter

from .views import TransactionViewSet

router = DefaultRouter(trailing_slash=True)
router.register("transactions", TransactionViewSet, basename="transaction")

urlpatterns = router.urls
