"""Get plain text out of an uploaded file (PDF or text)."""

import io


def text_from_upload(django_file, content_type: str) -> str:
    data = django_file.read()
    if content_type == "application/pdf" or (django_file.name or "").lower().endswith(".pdf"):
        try:
            from pypdf import PdfReader

            reader = PdfReader(io.BytesIO(data))
            return "\n".join((page.extract_text() or "") for page in reader.pages)
        except Exception as exc:  # noqa: BLE001
            raise ValueError(f"Could not read the PDF: {exc}") from exc

    try:
        return data.decode("utf-8", errors="replace")
    except Exception as exc:  # noqa: BLE001
        raise ValueError("Unsupported file type. Upload a PDF or a text file.") from exc
