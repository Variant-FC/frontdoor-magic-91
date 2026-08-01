from rest_framework.routers import DefaultRouter

from .views import UploadViewSet

router = DefaultRouter(trailing_slash=True)
router.register("", UploadViewSet, basename="upload")

urlpatterns = router.urls
