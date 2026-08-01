from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from .models import Transaction
from .serializers import RevisionSerializer, TransactionSerializer


class TransactionViewSet(ModelViewSet):
    """Every queryset is scoped to request.user — no cross-user access."""

    serializer_class = TransactionSerializer
    http_method_names = ["get", "patch", "delete", "post", "head", "options"]

    def get_queryset(self):
        qs = Transaction.objects.filter(user=self.request.user).prefetch_related("anomalies")
        params = self.request.query_params
        if period := params.get("period"):
            qs = qs.filter(period__month=period)
        if category := params.get("category"):
            qs = qs.filter(category=category)
        if params.get("flagged") in ("1", "true"):
            qs = qs.filter(anomalies__resolved=False).distinct()
        return qs

    @action(detail=True, methods=["get"])
    def revisions(self, request, pk=None):
        transaction = self.get_object()
        return Response(RevisionSerializer(transaction.revisions.all(), many=True).data)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        transaction = self.get_object()
        transaction.approved = True
        transaction.rejected = False
        transaction.save(update_fields=["approved", "rejected"])
        return Response(self.get_serializer(transaction).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        transaction = self.get_object()
        transaction.rejected = True
        transaction.approved = False
        transaction.save(update_fields=["approved", "rejected"])
        return Response(self.get_serializer(transaction).data)

    @action(detail=True, methods=["post"], url_path=r"anomalies/(?P<anomaly_id>[^/.]+)/resolve")
    def resolve_anomaly(self, request, pk=None, anomaly_id=None):
        transaction = self.get_object()
        anomaly = get_object_or_404(transaction.anomalies, pk=anomaly_id)
        anomaly.resolved = True
        anomaly.save(update_fields=["resolved"])
        return Response(self.get_serializer(transaction).data, status=status.HTTP_200_OK)
