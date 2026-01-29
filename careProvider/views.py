from django.shortcuts import render
from user.models import SharingRequest,AccessGrant,MedicalFile,UserChronic
from django.contrib.auth.decorators import login_required
from django.core.exceptions import PermissionDenied
from django.shortcuts import redirect
from django.conf import settings


# Create your views here.

import hashlib

def name_to_color(name: str) -> str:
    """إرجاع لون hex استنادًا إلى الاسم (deterministic)."""
    if not name:
        return "777777"
    h = hashlib.md5(name.encode('utf-8')).hexdigest()
    # استخدم أول 6 أحرف كـ hex color
    return h[:6]

def initial_avatar(request, pk):
    """
    يعيد SVG يحتوي أول حرف من اسم المستخدم.
    يقبل GET param `size` (مثلاً ?size=128) لتحديد العرض/الارتفاع بالبيكسل.
    """
    # غيّر get_object_or_404 إلى النموذج المناسب لديك، مثلاً UserProfile أو User
    from django.contrib.auth import get_user_model
    user = request.user

    name = user.first_name
    if callable(name):
        name = name()
    if not name:
        name = getattr(user, "username", "") or ""

    initial = name.strip()[:1].upper() if name.strip() else "?"

    try:
        size = int(request.GET.get("size", 128))
    except ValueError:
        size = 128
    if size <= 0:
        size = 128

    bg_color = name_to_color(name)
    font_size = int(size * 0.5)  # اضبط حسب الذوق

    svg = f"""<svg xmlns='http://www.w3.org/2000/svg' width='{size}' height='{size}' viewBox='0 0 {size} {size}'>
      <rect width='100%' height='100%' fill='#{bg_color}'/>
      <text x='50%' y='50%' dy='.05em' font-family='Arial, Helvetica, sans-serif' font-size='{font_size}' fill='white'
        text-anchor='middle' dominant-baseline='middle'>{initial}</text>
    </svg>"""

    return HttpResponse(svg, content_type='image/svg+xml')


# --- Permission helpers ---
PERMISSION_MAP = {
    "fiels":      "Medical Records",
    "madactions": "Medications",
    "alergys":    "Allergies",
    "desises":    "Chronic Conditions",
    "family":     "Family History",
}

def build_permissions(access):
    return [
        label
        for field, label in PERMISSION_MAP.items()
        if getattr(access, field, False)
    ]


@login_required(login_url='/login/')
def careProvider(request):
    if not getattr(request.user, 'is_doctor', False):
        return redirect(f"{settings.LOGIN_URL}?next={request.path}")

    # ✅ ALL (active + hidden) for the patients grid
    accesses_all = AccessGrant.objects.filter(
        provider=request.user
    ).select_related("user")

    # ✅ active only for badges/stats
    accesses_active = accesses_all.filter(active=True)
    active_count = accesses_active.count()

    dcumantCount = 0
    chronicCount = 0
    for access in accesses_active:
        dcumantCount += MedicalFile.objects.filter(user=access.user).count()
        chronicCount += UserChronic.objects.filter(user=access.user).count()

    pending_requests = SharingRequest.objects.filter(
        to_provider=request.user,
        status=SharingRequest.STATUS_PENDING
    )

    pationt = []
    for access in accesses_all:
        pationt.append({
            "access": access,
            "permissions": build_permissions(access),
        })

    return render(request, "careProvider/careprovider.html", {
        "pending_requests": pending_requests,
        "pationt": pationt,              # ✅ now includes hidden too
        "provider": request.user,
        "dcumantCount": dcumantCount,
        "chronicCount": chronicCount,
        "active_count": active_count,    # ✅ badge "X active"
    })



# user/views.py
import json
from datetime import date
from django.http import JsonResponse, HttpResponseBadRequest, HttpResponseNotAllowed, HttpResponseForbidden, HttpResponse
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404

from user.models import (
    Medication, UserMedication,
    Allergy, UserAllergy,
    ChronicDisease, UserChronic,
    AccessGrant
)

# ------------------ helpers ------------------

def json_error(message, status=400):
    return JsonResponse({'status': 'error', 'message': message}, status=status)

def parse_json_body(request):
    try:
        return json.loads(request.body.decode('utf-8') or "{}")
    except Exception:
        return None

def provider_has_access_for_accesspk(provider, access_pk):
    if not access_pk:
        return None
    try:
        grant = AccessGrant.objects.get(pk=access_pk, provider=provider, active=True)
        return grant
    except AccessGrant.DoesNotExist:
        return None

def provider_has_access_for_user(provider, user):
    # any active grant for this provider and user
    return AccessGrant.objects.filter(provider=provider, user=user, active=True).exists()

# ------------------ serializers ------------------

def user_medication_to_dict(obj: UserMedication):
    return {
        'id': obj.id,
        'medication_name': obj.medication.name,
        'dosage': obj.dosage,
        'frequency': obj.frequency,
        'start_date': obj.start_date.isoformat() if obj.start_date else None,
        'user_id': obj.user.id
    }

def user_chronic_to_dict(obj: UserChronic):
    return {
        'id': obj.id,
        'disease': obj.chronic_disease.name,
        'date_diagnosed': obj.date_diagnosed.isoformat() if obj.date_diagnosed else None,
        'severity': obj.severity,
        'status': obj.status,
        'user_id': obj.user.id
    }

def user_allergy_to_dict(obj: UserAllergy):
    return {
        'id': obj.id,
        'allergen': obj.allergy.name,
        'type': getattr(obj.allergy, 'type', None),
        'severity': obj.severity,
        'reaction': obj.reaction,
        'user_id': obj.user.id
    }


###

# map ACTION → AccessGrant field

SECTION_PERMISSION_MAP = {
    "files": "fiels",
    "medications": "madactions",
    "allergies": "alergys",
    "diseases": "desises",
    "family": "family",
}

def require_section_permission(grant, section):
    field = SECTION_PERMISSION_MAP.get(section)
    if not field or not getattr(grant, field, False):
        raise PermissionDenied(f"No permission for {section}")

# ------------------ MEDICATION endpoints ------------------

@login_required
@require_http_methods(["POST"])
def medication_create(request):
    """POST /user/api/medication/  { medication_name, dosage, frequency, started, access_pk }"""
    body = parse_json_body(request)
    if body is None:
        return json_error("Invalid JSON", 400)

    med_name = (body.get('medication_name') or body.get('medication') or "").strip()
    dosage = body.get('dosage', '').strip()
    frequency = body.get('frequency', '').strip()
    started = body.get('started') or body.get('start_date') or None
    access_pk = body.get('access_pk')

    if not med_name:
        return json_error("medication_name is required", 400)
    grant = provider_has_access_for_accesspk(request.user, access_pk)
    if not grant:
        return json_error("Access denied (invalid access_pk or no grant)", 403)

    try:
        # 🔐 enforce section permission
        require_section_permission(grant, "medications")

        medication_obj, _ = Medication.objects.get_or_create(name=med_name)

        umed = UserMedication.objects.create(
            user=grant.user,
            medication=medication_obj,
            dosage=dosage,
            frequency=frequency,
            start_date=(date.fromisoformat(started) if started else None)
        )

        return JsonResponse(
            {'status': 'success', 'item': user_medication_to_dict(umed)},
            status=201
        )

    except PermissionDenied as e:
        # ✅ this is what shows the message to frontend
        return json_error(str(e), 403)
    

@login_required
@require_http_methods(["PUT", "DELETE"])
def medication_detail(request, pk):
    """PUT /user/api/medication/<pk>/   DELETE /user/api/medication/<pk>/"""
    umed = get_object_or_404(UserMedication, pk=pk)
    # check provider has access to that user
    if not provider_has_access_for_user(request.user, umed.user):
        return json_error("Access denied", 403)

    if request.method == "DELETE":
        umed.delete()
        return JsonResponse({'status': 'success', 'message': 'Deleted'})

    # PUT (update)
    body = parse_json_body(request)
    if body is None:
        return json_error("Invalid JSON", 400)

    med_name = (body.get('medication_name') or body.get('medication') or "").strip()
    if med_name:
        medication_obj, _ = Medication.objects.get_or_create(name=med_name)
        umed.medication = medication_obj

    if 'dosage' in body:
        umed.dosage = body.get('dosage') or ''
    if 'frequency' in body:
        umed.frequency = body.get('frequency') or ''
    # accept either 'start_date' or 'started'
    started = body.get('start_date') or body.get('started')
    if started is not None:
        try:
            umed.start_date = date.fromisoformat(started) if started else None
        except Exception:
            return json_error("Invalid date format for start_date (use YYYY-MM-DD)", 400)

    umed.save()
    return JsonResponse({'status': 'success', 'item': user_medication_to_dict(umed)})

# ------------------ CHRONIC endpoints ------------------

@login_required
@require_http_methods(["POST"])
def chronic_create(request):
    """POST /user/api/chronic/   { disease, date_diagnosed, severity, status, access_pk }"""
    body = parse_json_body(request)
    if body is None:
        return json_error("Invalid JSON", 400)

    disease = (body.get('disease') or "").strip()
    date_diagnosed = body.get('date_diagnosed') or None
    severity = body.get('severity') or ''
    status = body.get('status') or 'active'
    access_pk = body.get('access_pk')

    if not disease:
        return json_error("disease is required", 400)
    grant = provider_has_access_for_accesspk(request.user, access_pk)
    if not grant:
        return json_error("Access denied (invalid access_pk or no grant)", 403)

    try:
        require_section_permission(grant, "diseases")

        cd, _ = ChronicDisease.objects.get_or_create(name=disease)
        try:
            dd = date.fromisoformat(date_diagnosed) if date_diagnosed else None
        except Exception:
            return json_error("Invalid date_diagnosed (expected YYYY-MM-DD)", 400)

        uc = UserChronic.objects.create(
        user=grant.user,
        chronic_disease=cd,
        date_diagnosed=dd,
        severity=severity,
        status=status
        )
        return JsonResponse({'status': 'success', 'item': user_chronic_to_dict(uc)}, status=201)
    
    except PermissionDenied as e:
        # ✅ this is what shows the message to frontend
        return json_error(str(e), 403)

@login_required
@require_http_methods(["PUT", "DELETE"])
def chronic_detail(request, pk):
    uc = get_object_or_404(UserChronic, pk=pk)
    if not provider_has_access_for_user(request.user, uc.user):
        return json_error("Access denied", 403)

    if request.method == "DELETE":
        uc.delete()
        return JsonResponse({'status': 'success', 'message': 'Deleted'})

    body = parse_json_body(request)
    if body is None:
        return json_error("Invalid JSON", 400)

    disease = body.get('disease')
    if disease:
        cd, _ = ChronicDisease.objects.get_or_create(name=disease.strip())
        uc.chronic_disease = cd

    if 'date_diagnosed' in body:
        dd = body.get('date_diagnosed')
        try:
            uc.date_diagnosed = date.fromisoformat(dd) if dd else None
        except Exception:
            return json_error("Invalid date format for date_diagnosed (YYYY-MM-DD)", 400)

    if 'severity' in body:
        uc.severity = body.get('severity') or ''
    if 'status' in body:
        uc.status = body.get('status') or uc.status

    uc.save()
    return JsonResponse({'status': 'success', 'item': user_chronic_to_dict(uc)})

# ------------------ ALLERGY endpoints ------------------

@login_required
@require_http_methods(["POST"])
def allergy_create(request):
    """POST /user/api/allergy/  { allergen, type, severity, reaction, access_pk }"""
    body = parse_json_body(request)
    if body is None:
        return json_error("Invalid JSON", 400)

    allergen = (body.get('allergen') or "").strip()
    atype = body.get('type') or ''
    severity = body.get('severity') or ''
    reaction = body.get('reaction') or ''
    access_pk = body.get('access_pk')

    if not allergen:
        return json_error("allergen is required", 400)
    grant = provider_has_access_for_accesspk(request.user, access_pk)
    if not grant:
        return json_error("Access denied (invalid access_pk or no grant)", 403)

    try:
        require_section_permission(grant, "allergies")

        allergy_obj, created = Allergy.objects.get_or_create(name=allergen, defaults={'type': atype})
    # if allergy existed but type provided, update it
        if not created and atype:
            allergy_obj.type = atype
            allergy_obj.save()

        ua = UserAllergy.objects.create(
        user=grant.user,
        allergy=allergy_obj,
        severity=severity,
        reaction=reaction
        )
        return JsonResponse({'status': 'success', 'item': user_allergy_to_dict(ua)}, status=201)

    except PermissionDenied as e:
        # ✅ this is what shows the message to frontend
        return json_error(str(e), 403)
    
@login_required
@require_http_methods(["PUT", "DELETE"])
def allergy_detail(request, pk):
    ua = get_object_or_404(UserAllergy, pk=pk)
    if not provider_has_access_for_user(request.user, ua.user):
        return json_error("Access denied", 403)

    if request.method == "DELETE":
        ua.delete()
        return JsonResponse({'status': 'success', 'message': 'Deleted'})

    body = parse_json_body(request)
    if body is None:
        return json_error("Invalid JSON", 400)

    allergen = body.get('allergen')
    if allergen:
        allergy_obj, created = Allergy.objects.get_or_create(name=allergen.strip(), defaults={'type': body.get('type','')})
        ua.allergy = allergy_obj
    if 'type' in body and allergy_obj:
        allergy_obj.type = body.get('type') or allergy_obj.type
        allergy_obj.save()
    if 'severity' in body:
        ua.severity = body.get('severity') or ''
    if 'reaction' in body:
        ua.reaction = body.get('reaction') or ''

    ua.save()
    return JsonResponse({'status': 'success', 'item': user_allergy_to_dict(ua)})


###
from user.models import FamilyHistory

def family_history_to_dict(obj):
    return {
        "id": obj.id,
        "condition": obj.condition,
        "relationship": obj.relationship,
        "age_of_onset": obj.age_of_onset,
        "notes": obj.notes,
        "user_id": obj.user_id,
    }




@login_required
@require_http_methods(["POST"])
def family_history_create(request):
    body = parse_json_body(request)
    if body is None:
        return json_error("Invalid JSON")

    access_pk = body.get("access_pk")
    condition = (body.get("condition") or "").strip()
    relationship = body.get("relationship", "")
    age = body.get("age_of_onset")
    notes = body.get("notes", "")

    if not condition:
        return json_error("condition is required")

    grant = provider_has_access_for_accesspk(request.user, access_pk)
    if not grant:
        return json_error("Access denied", 403)

    try:
        require_section_permission(grant, "family")

        fh = FamilyHistory.objects.create(
        user=grant.user,
        condition=condition,
        relationship=relationship,
        age_of_onset=age,
        notes=notes
        )

        return JsonResponse({
        "status": "success",
        "item": family_history_to_dict(fh)
        }, status=201)

    except PermissionDenied as e:
        # ✅ this is what shows the message to frontend
        return json_error(str(e), 403)

@login_required
@require_http_methods(["PUT", "DELETE"])
def family_history_detail(request, pk):
    fh = get_object_or_404(FamilyHistory, pk=pk)

    if not provider_has_access_for_user(request.user, fh.user):
        return json_error("Access denied", 403)

    if request.method == "DELETE":
        fh.delete()
        return JsonResponse({"status": "success"})

    body = parse_json_body(request)
    if body is None:
        return json_error("Invalid JSON")

    if "condition" in body:
        fh.condition = body["condition"]
    if "relationship" in body:
        fh.relationship = body["relationship"]
    if "age_of_onset" in body:
        fh.age_of_onset = body["age_of_onset"]
    if "notes" in body:
        fh.notes = body["notes"]

    fh.save()

    return JsonResponse({
        "status": "success",
        "item": family_history_to_dict(fh)
    })


@login_required
def family_history_list(request):
    access_pk = request.GET.get("access_pk")

    grant = provider_has_access_for_accesspk(request.user, access_pk)
    if not grant:
        return json_error("Access denied", 403)

    items = FamilyHistory.objects.filter(user=grant.user).order_by("-created_at")

    return JsonResponse([
        family_history_to_dict(i) for i in items
    ], safe=False)



from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from .models import ProviderNote
import json

@login_required
@require_http_methods(["GET"])
def list_provider_notes(request, patient_id):
    notes = ProviderNote.objects.filter(
        provider=request.user,
        patient_id=patient_id
    )

    return JsonResponse({
        "notes": [
            {
                "id": n.id,
                "note": n.note,
                "created_at": n.created_at.strftime("%b %d, %Y"),
            }
            for n in notes
        ]
    })


@login_required
@require_http_methods(["POST"])
def add_provider_note(request, patient_id):
    data = json.loads(request.body)
    note_text = data.get("note", "").strip()

    if not note_text:
        return JsonResponse({"error": "Empty note"}, status=400)

    note = ProviderNote.objects.create(
        provider=request.user,
        patient_id=patient_id,
        note=note_text
    )

    return JsonResponse({
        "id": note.id,
        "created_at": note.created_at.strftime("%b %d, %Y"),
    })

###
from django.views.decorators.http import require_POST
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from django.utils import timezone



from django.utils import timezone
from django.db import transaction

from django.utils import timezone
from django.db import transaction
from user.models import SharingRequest, AccessGrant

@login_required
@require_POST
def remove_patient(request):
    data = json.loads(request.body or "{}")
    access_pk = data.get("access_pk")
    if not access_pk:
        return JsonResponse({"error": "access_pk is required"}, status=400)

    access = get_object_or_404(AccessGrant, pk=access_pk, provider=request.user)

    with transaction.atomic():
        # 1) revoke grant
        access.active = False
        access.revoked_at = timezone.now()
        access.save(update_fields=["active", "revoked_at"])

        # 2) UPDATE existing accepted request (don’t create a new one)
        req = SharingRequest.objects.filter(
            from_user=access.user,
            to_provider=request.user,
            data_scope=access.data_scope,
            status=SharingRequest.STATUS_ACCEPTED,
        ).order_by("-responded_at", "-created_at").first()

        if req:
            req.status = SharingRequest.STATUS_REVOKED
            req.responded_at = timezone.now()
            req.message = "Access revoked by provider."
            req.save(update_fields=["status", "responded_at", "message"])
        else:
            # fallback: لو ما في accepted سجل، أنشئ revoked
            SharingRequest.objects.create(
                from_user=access.user,
                to_provider=request.user,
                data_scope=access.data_scope,
                status=SharingRequest.STATUS_REVOKED,
                responded_at=timezone.now(),
                message="Access revoked by provider.",
                madactions=access.madactions,
                alergys=access.alergys,
                fiels=access.fiels,
                family=access.family,
                desises=access.desises,
            )

    return JsonResponse({"status": "success"})

# @require_POST
# def remove_patient(request):
#     try:
#         payload = json.loads(request.body or "{}")
#     except json.JSONDecodeError:
#         return JsonResponse({"error": "Invalid JSON"}, status=400)

#     access_pk = payload.get("access_pk")
#     if not access_pk:
#         return JsonResponse({"error": "access_pk is required"}, status=400)

#     try:
#         grant = AccessGrant.objects.get(pk=access_pk, provider=request.user)
#     except AccessGrant.DoesNotExist:
#         return JsonResponse({"error": "Not found"}, status=404)

#     # This makes it "Hidden" (active=False)
#     grant.revoke(revoked_by=request.user)

#     return JsonResponse({"status": "success"})