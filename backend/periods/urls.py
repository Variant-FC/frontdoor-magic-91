from django.urls import path

from .views import ClosePeriodView, CurrentPeriodView, PeriodDetailView, PeriodListView

urlpatterns = [
    path("", PeriodListView.as_view()),
    path("current/", CurrentPeriodView.as_view()),
    path("<str:month>/", PeriodDetailView.as_view()),
    path("<str:month>/close/", ClosePeriodView.as_view()),
]
