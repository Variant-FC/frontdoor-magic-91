from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from periods.models import Period

from .models import Insight
from .serializers import InsightSerializer
from .services import generate, income_by_client, spend_by_category


def _period(request):
    return Period.get_or_open(request.user, request.query_params.get("period"))


class InsightListView(APIView):
    def get(self, request):
        period = _period(request)
        generate(request.user, period)
        insights = Insight.objects.filter(user=request.user, period=period)
        return Response(InsightSerializer(insights, many=True).data)


class InsightStatusView(APIView):
    def post(self, request, pk):
        insight = get_object_or_404(Insight, pk=pk, user=request.user)
        serializer = InsightSerializer(insight, data={"status": request.data.get("status")}, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class SpendByCategoryView(APIView):
    def get(self, request):
        return Response(spend_by_category(request.user, _period(request)))


class IncomeByClientView(APIView):
    def get(self, request):
        return Response(income_by_client(request.user, _period(request)))
