from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action

from extraction.readers import text_from_upload

from .models import Upload
from .serializers import UploadSerializer
from .services import process


class UploadViewSet(ModelViewSet):
    serializer_class = UploadSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):
        qs = Upload.objects.filter(user=self.request.user)
        if period := self.request.query_params.get("period"):
            qs = qs.filter(uploaded_at__startswith=period)
        return qs

    def create(self, request):
        file = request.FILES.get("file")
        if not file:
            return Response({"file": ["A file is required."]}, status=status.HTTP_400_BAD_REQUEST)

        content_type = file.content_type or ""
        upload = Upload.objects.create(
            user=request.user,
            file=file,
            filename=file.name,
            content_type=content_type,
            size_bytes=file.size,
        )
        try:
            upload.file.open("rb")
            upload.raw_text = text_from_upload(upload.file, content_type)
            upload.save(update_fields=["raw_text"])
        except ValueError as exc:
            upload.status = "failed"
            upload.error_message = str(exc)
            upload.save(update_fields=["status", "error_message"])
            return Response(UploadSerializer(upload).data, status=status.HTTP_201_CREATED)

        process(upload)
        return Response(UploadSerializer(upload).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"], url_path="text")
    def from_text(self, request):
        text = (request.data.get("text") or "").strip()
        if not text:
            return Response({"text": ["Paste some receipt text first."]}, status=status.HTTP_400_BAD_REQUEST)

        upload = Upload.objects.create(
            user=request.user,
            filename="pasted-batch.txt",
            content_type="text/plain",
            size_bytes=len(text.encode("utf-8")),
            raw_text=text,
        )
        process(upload)
        return Response(UploadSerializer(upload).data, status=status.HTTP_201_CREATED)
