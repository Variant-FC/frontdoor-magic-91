from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from .models import Invoice
from .serializers import InvoiceSerializer


class InvoiceViewSet(ModelViewSet):
    serializer_class = InvoiceSerializer

    def get_queryset(self):
        qs = Invoice.objects.filter(user=self.request.user)
        if status_filter := self.request.query_params.get("status"):
            qs = qs.filter(status=status_filter)
        return qs

    @action(detail=True, methods=["post"])
    def status(self, request, pk=None):
        invoice = self.get_object()
        value = request.data.get("status")
        if value not in dict(Invoice.STATUS):
            return Response({"status": ["Must be draft, sent or paid."]}, status=400)
        invoice.status = value
        invoice.finalised = value != "draft"
        invoice.save(update_fields=["status", "finalised"])
        return Response(self.get_serializer(invoice).data)
