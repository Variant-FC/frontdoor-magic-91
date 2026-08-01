from django.urls import path

from .views import (
    IncomeByClientView,
    InsightListView,
    InsightStatusView,
    MalumeTakeView,
    SpendByCategoryView,
)

urlpatterns = [
    path("", InsightListView.as_view()),
    path("malume-take/", MalumeTakeView.as_view()),
    path("spend-by-category/", SpendByCategoryView.as_view()),
    path("income-by-client/", IncomeByClientView.as_view()),
    path("<uuid:pk>/status/", InsightStatusView.as_view()),
]
