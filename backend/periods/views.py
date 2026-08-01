from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Period
from .serializers import PeriodSerializer


class PeriodListView(ListAPIView):
    serializer_class = PeriodSerializer

    def get_queryset(self):
        return Period.objects.filter(user=self.request.user)


class CurrentPeriodView(APIView):
    def get(self, request):
        period = Period.get_or_open(request.user)
        return Response(PeriodSerializer(period).data)


class PeriodDetailView(APIView):
    def get(self, request, month):
        period = get_object_or_404(Period, user=request.user, month=month)
        return Response(PeriodSerializer(period).data)


class ClosePeriodView(APIView):
    def post(self, request, month):
        period = get_object_or_404(Period, user=request.user, month=month)
        if not period.closed_at:
            period.closed_at = timezone.now()
            period.save(update_fields=["closed_at"])
        return Response(PeriodSerializer(period).data)
