import os, json
from django.shortcuts import render, get_object_or_404
from django.conf import settings
from django.http import JsonResponse, HttpResponseBadRequest
from django.contrib.auth.decorators import login_required
from PIL import Image
import numpy as np

from .forms import UploadFileForm
from .models import Extraction
from . import ml

_OCR_READER = None


def is_cuda_available():
    try:
        import torch
        return torch.cuda.is_available()
    except Exception:
        return False


def run_easyocr_on_image(pil_img, reader):
    img = np.array(pil_img)
    results = reader.readtext(img, paragraph=True)
    return "\n".join([r[1] for r in results]) if results else ""


def read_pdf(path, dpi=300, poppler_path=getattr(settings, "POPPLER_PATH", None)):
    from pdf2image import convert_from_path
    if poppler_path:
        return convert_from_path(path, dpi=dpi, poppler_path=poppler_path)
    return convert_from_path(path, dpi=dpi)


@login_required
def index(request):
    form = UploadFileForm()
    return render(request, "index.html", {"form": form})


@login_required
def process_file(request):
    if request.method != "POST":
        return HttpResponseBadRequest("POST required")

    form = UploadFileForm(request.POST, request.FILES)
    if not form.is_valid():
        return HttpResponseBadRequest("Invalid form")

    uploaded = request.FILES["file"]

    # Save uploaded file
    media_path = settings.MEDIA_ROOT
    os.makedirs(media_path, exist_ok=True)
    save_path = os.path.join(media_path, uploaded.name)
    with open(save_path, "wb") as f:
        for chunk in uploaded.chunks():
            f.write(chunk)

    # OCR (lazy import)
    try:
        import easyocr
    except Exception as e:
        return JsonResponse({"error": "easyocr not installed: " + str(e)}, status=500)

    use_gpu = is_cuda_available()

    global _OCR_READER
    if _OCR_READER is None:
        _OCR_READER = easyocr.Reader(["en"], gpu=use_gpu)
    reader = _OCR_READER

    # Run OCR
    ext = os.path.splitext(save_path)[1].lower()
    all_text = ""
    try:
        if ext == ".pdf":
            dpi = getattr(settings, "PDF_DPI", 250)  # slightly faster than noted 300, usually OK
            pages = read_pdf(save_path, dpi=dpi, poppler_path=getattr(settings, "POPPLER_PATH", None))
            for p in pages:
                all_text += run_easyocr_on_image(p, reader) + "\n\n---PAGE---\n\n"
        else:
            with Image.open(save_path) as im:
                pil_img = im.convert("RGB")
            all_text = run_easyocr_on_image(pil_img, reader)
    except Exception as e:
        return JsonResponse({"error": "OCR failed: " + str(e)}, status=500)

    # Ollama inference (FAST path: schema-enforced output)
    decoded = ""
    try:
        _, model = ml.get_model(settings)

        user_msg = ml.build_model_input(all_text)

        decoded = model.chat(
            user_msg,
            system_content=getattr(settings, "OLLAMA_SYSTEM", getattr(ml, "SYSTEM_FAST", ml.SYSTEM_RULES_SCHEMA_STRICT)),
            format_schema=getattr(ml, "MED_SCHEMA", None),
            temperature=getattr(settings, "OLLAMA_TEMPERATURE", 0.0),
            num_predict=getattr(settings, "OLLAMA_NUM_PREDICT", 500),
            num_ctx=getattr(settings, "OLLAMA_NUM_CTX", 2048),
            keep_alive=getattr(settings, "OLLAMA_KEEP_ALIVE", "10m"),
        )

        parsed = ml.extract_json_from_text(decoded)
        parsed = ml.ensure_ui_keys(parsed)

    except Exception as e:
        return JsonResponse({"error": "Model inference failed: " + str(e)}, status=500)

    # Save to DB
    rec = Extraction.objects.create(
        user=request.user,
        filename=uploaded.name,
        file=uploaded,
        ocr_text=all_text,
        parsed=parsed if parsed is not None else None,
    )

    return JsonResponse({
        "id": rec.id,
        "ocr_text": all_text,
        "parsed": parsed,
        "raw_model_text": decoded,
    })


@login_required
def save_parsed(request):
    body = json.loads(request.body)
    rec = get_object_or_404(Extraction, pk=body["id"], user=request.user)
    rec.parsed = body["parsed"]
    rec.save()
    return JsonResponse({"ok": True})


@login_required
def records(request):
    qs = Extraction.objects.filter(user=request.user).order_by("-created_at").reverse()
    records_with_numbers = []
    for idx, rec in enumerate(qs, start=1):
        rec.display_no = idx
        records_with_numbers.append(rec)
    return render(request, "records.html", {"records": records_with_numbers})


@login_required
def record_detail(request, pk):
    rec = get_object_or_404(Extraction, pk=pk, user=request.user)

    user_records = list(
        Extraction.objects
        .filter(user=request.user)
        .order_by("created_at")
        .values_list("id", flat=True)
    )
    record_number = user_records.index(rec.id) + 1

    return render(request, "record_detail.html", {
        "rec": rec,
        "record_number": record_number,
    })
