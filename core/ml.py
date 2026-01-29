# ml.py (FAST)
import json
import re
import requests

_OLLAMA_CLIENT = None

# Reuse HTTP connection (faster)
_SESSION = requests.Session()

# Pre-compiled regex (faster)
_RE_DATE = re.compile(r"\b\d{2}/\d{2}/\d{4}\b")
_RE_NAME = re.compile(r"\bName:\s*([A-Za-z][A-Za-z\s\-.']+)", re.IGNORECASE)
_RE_CHRONIC_ROW = re.compile(
    r"\b([A-Za-z][A-Za-z\s\-]+?)\s+(\d{2}/\d{2}/\d{4})\s+(Ongoing|Resolved|Active|Inactive)\s+([A-Za-z]+)\b",
    re.IGNORECASE,
)
_RE_MED_PAIR = re.compile(r"\b([A-Za-z][A-Za-z0-9\-_/]+)\s+(\d+\s*mg|\d+/\d+)\b", re.IGNORECASE)
_RE_FREQ = re.compile(r"\b(Once daily|Twice daily|Daily|Weekly|Monthly)\b", re.IGNORECASE)

# --------- Fast + reliable: JSON schema enforced by Ollama format=SCHEMA ----------
MED_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "name_of_patient": {"type": ["string", "null"]},
        "chronic_conditions": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "name": {"type": ["string", "null"]},
                    "date_diagnosed": {"type": ["string", "null"]},
                    "resolved": {"type": ["string", "null"]},
                    "severity": {"type": ["string", "null"], "enum": ["mild", "moderate", "severe", None]},
                },
                "required": ["name", "date_diagnosed", "resolved", "severity"],
            },
        },
        "allergies": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "allergy": {"type": ["string", "null"]},
                    "reaction": {"type": ["string", "null"]},
                    "severity": {"type": ["string", "null"], "enum": ["mild", "moderate", "severe", None]},
                    "type": {"type": ["string", "null"], "enum": ["drug", "food", "environmental", "other", None]},
                },
                "required": ["allergy", "reaction", "severity", "type"],
            },
        },
        "medications": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "medication": {"type": ["string", "null"]},
                    "dosage": {"type": ["string", "null"]},
                    "frequency": {"type": ["string", "null"]},
                    "start_date": {"type": ["string", "null"]},
                },
                "required": ["medication", "dosage", "frequency", "start_date"],
            },
        },
    },
    "required": ["name_of_patient", "chronic_conditions", "allergies", "medications"],
}

# Keep this SHORT for speed (schema is enforced by format=MED_SCHEMA)
SYSTEM_FAST = (
    "Extract patient data from OCR. Use null if unknown. Keep dates as MM/DD/YYYY. Return JSON only."
)

# Keep your old variables for compatibility
UI_SCHEMA_EXAMPLE = {
    "name_of_patient": None,
    "chronic_conditions": [{"name": None, "date_diagnosed": None, "resolved": None, "severity": None}],
    "allergies": [{"allergy": None, "reaction": None, "severity": None, "type": None}],
    "medications": [{"medication": None, "dosage": None, "frequency": None, "start_date": None}],
}
SYSTEM_RULES_SCHEMA_STRICT = SYSTEM_FAST


class OllamaClient:
    def __init__(self, model_name: str, base_url: str = "http://localhost:11434"):
        self.model_name = model_name
        self.base_url = base_url.rstrip("/")

    def chat(
        self,
        user_content: str,
        *,
        system_content: str = "",
        temperature: float = 0.0,
        num_predict: int = 500,
        num_ctx: int = 2048,
        format_schema=None,          # <-- NEW: pass MED_SCHEMA here
        keep_alive: str = "10m",     # <-- NEW: keep model loaded (faster)
    ) -> str:
        messages = []
        if system_content:
            messages.append({"role": "system", "content": system_content})
        messages.append({"role": "user", "content": user_content})

        payload = {
            "model": self.model_name,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": num_predict,
                "num_ctx": num_ctx,
            },
            "keep_alive": keep_alive,
        }

        # Enforce JSON with schema (fast + reliable)
        if format_schema is not None:
            payload["format"] = format_schema
        else:
            payload["format"] = "json"

        r = _SESSION.post(f"{self.base_url}/api/chat", json=payload, timeout=180)
        r.raise_for_status()
        data = r.json()
        return data.get("message", {}).get("content", "")


def get_model(settings):
    global _OLLAMA_CLIENT
    if _OLLAMA_CLIENT is None:
        model_name = getattr(settings, "OLLAMA_MODEL", "qwen2.5")
        base_url = getattr(settings, "OLLAMA_BASE_URL", "http://localhost:11434")
        _OLLAMA_CLIENT = OllamaClient(model_name=model_name, base_url=base_url)
    return None, _OLLAMA_CLIENT


def extract_json_from_text(text: str):
    if not text:
        return None
    s = text.strip()
    try:
        return json.loads(s)
    except Exception:
        # minimal fallback (should be rare with format schema)
        m = re.search(r"\{[\s\S]*\}", s)
        if not m:
            return None
        try:
            return json.loads(m.group(0))
        except Exception:
            return None


def compact_ocr(ocr_text: str, keep_after_header: int = 2) -> str:
    if not ocr_text:
        return ""
    lines = [ln.strip() for ln in ocr_text.splitlines() if ln.strip()]
    keep = []
    after = 0
    headers = ("NAME", "CHRONIC", "ALLERG", "MEDICATION", "FREQUENCY", "STARTED")

    for ln in lines:
        u = ln.upper()

        if any(h in u for h in headers):
            keep.append(ln)
            after = keep_after_header
            continue

        if after > 0:
            keep.append(ln)
            after -= 1
            continue

        # keep signal lines
        if _RE_DATE.search(ln) or " mg" in ln.lower():
            keep.append(ln)

    # de-dup keep order
    seen = set()
    out = []
    for ln in keep:
        if ln not in seen:
            seen.add(ln)
            out.append(ln)
    return "\n".join(out)


def find_hints_in_ocr(ocr_text: str) -> str:
    if not ocr_text:
        return ""
    t = " ".join(ocr_text.split())
    hints = []

    m = _RE_NAME.search(t)
    if m:
        hints.append(f"NAME={m.group(1).strip()}")

    # chronic rows
    for cond, date, status, severity in _RE_CHRONIC_ROW.findall(t):
        hints.append(f"CHRONIC={cond.strip()}|{date}|{status}|{severity}")

    # meds pairs
    for med, dose in _RE_MED_PAIR.findall(t)[:20]:
        hints.append(f"MED={med}|{dose}")

    freqs = _RE_FREQ.findall(t)
    if freqs:
        hints.append("FREQS=" + ",".join(freqs[:20]))

    dates = _RE_DATE.findall(t)
    if dates:
        hints.append("DATES=" + ",".join(dates[:30]))

    return "\n".join(hints)


def build_model_input(ocr_text: str) -> str:
    # FAST: no big schema text in prompt (schema is enforced by format=MED_SCHEMA)
    c = compact_ocr(ocr_text)
    h = find_hints_in_ocr(ocr_text)
    return f"OCR:\n{c}\n\nHINTS:\n{h}\n"


def ensure_ui_keys(obj: dict) -> dict:
    if not isinstance(obj, dict):
        obj = {}
    obj.setdefault("name_of_patient", None)
    obj.setdefault("chronic_conditions", [])
    obj.setdefault("allergies", [])
    obj.setdefault("medications", [])
    if not isinstance(obj["chronic_conditions"], list):
        obj["chronic_conditions"] = []
    if not isinstance(obj["allergies"], list):
        obj["allergies"] = []
    if not isinstance(obj["medications"], list):
        obj["medications"] = []
    return obj
