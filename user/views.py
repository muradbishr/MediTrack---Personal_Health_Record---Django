from django.shortcuts import render,redirect
from .forms import HealthTrendForm, UserSignupForm
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import  UserMedication,VitalSign,FamilyHistory
import json
# Create your views here.
from django.contrib.auth import authenticate, login
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.contrib.auth import get_user_model

from django.contrib.auth import login
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required



from django.http import JsonResponse
from django.contrib.auth import get_user_model, login
from django.views.decorators.csrf import csrf_exempt
import json

from django.conf import settings
from django.contrib.auth.decorators import login_required, user_passes_test
from django.shortcuts import render

from django.http import HttpResponse

@csrf_exempt
def signup_view(request):

    # Allow GET only to show the page
    if request.method == 'GET':
        form = UserSignupForm()
        return render(request, 'user/signup.html', {'form': form})

    # Block all other non-POST methods
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)

    # ---- Try reading JSON first ----
    if request.headers.get("Content-Type") == "application/json":
        try:
            data = json.loads(request.body.decode("utf-8"))
        except Exception:
            return JsonResponse({"error": "Invalid JSON"}, status=400)

        # Normalize JSON → form-like dict
        post_data = {
            "email": data.get("email", "").strip().lower(),
            "password": data.get("password", ""),
            "first_name": (data.get("firstName") or data.get("first_name") or "").strip(),
            "last_name": (data.get("lastName") or data.get("last_name") or "").strip(),
        }
        form = UserSignupForm(post_data)

    else:
        # Standard HTML form submission
        form = UserSignupForm(request.POST)

    # ---- Validate with form ----
    if not form.is_valid():
        errors = [f"{field}: {','.join(err_list)}" for field, err_list in form.errors.items()]
        return JsonResponse({
            "success": False,
            "message": " | ".join(errors),
            "errors": form.errors
        }, status=400)

    UserModel = get_user_model()

    # ---- Extra check 1: Email uniqueness (case-insensitive) ----
    email = form.cleaned_data["email"].lower()
    if UserModel.objects.filter(email__iexact=email).exists():
        return JsonResponse({
            "success": False,
            "message": "Email already exists"
        }, status=409)

    # ---- Create user (with name normalization) ----
    user = UserModel.objects.create_user(
        email=email,
        password=form.cleaned_data["password"],
        first_name=form.cleaned_data["first_name"].title(),
        last_name=form.cleaned_data["last_name"].title()
    )


    return JsonResponse({
        "success": True,
        "message": "Account created. Please verify your email.",
        "user": {"first_name": user.first_name, "last_name": user.last_name, "email": user.email},
        "enter_otp_url": f"/enter-otp/?email={user.email}"
    }, status=201)



@csrf_exempt
def api_signup(request):
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)

    # اقرأ الـ body كـ JSON
    try:
        data = json.loads(request.body.decode('utf-8'))
    except Exception:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    # email / password
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    # قبول كلتا الصيغتين firstName أو first_name
    first_name = (data.get("firstName") or data.get("first_name") or "").strip()
    last_name  = (data.get("lastName")  or data.get("last_name")  or "").strip()

    # بعض الفحوص الأساسية
    if not email or not password:
        return JsonResponse({"error": "Email and password are required"}, status=400)

    UserModel = get_user_model()

    # تحقق من الوجود بواسطة email
    if UserModel.objects.filter(email__iexact=email).exists():
        return JsonResponse({"error": "Email already exists"}, status=409)

    # جهز الوسيطات للـ create_user — إذا نموذج المستخدم لا يستخدم email كـ USERNAME_FIELD، أضف username
    create_kwargs = {
        "email": email,
        "password": password,
        "first_name": first_name.title() if first_name else "",
        "last_name": last_name.title() if last_name else "",
    }
    # إذا USERNAME_FIELD ليس 'email' فضع username = email لملء الحقل الإلزامي
    if getattr(UserModel, "USERNAME_FIELD", "username") != "email":
        create_kwargs["username"] = email

    try:
        user = UserModel.objects.create_user(**create_kwargs)
    except TypeError:
        # fallback: بعض نماذج المستخدم المخصصة قد تتطلب حقول مختلفة — حاول إنشاء مستخدم بسيط
        user = UserModel.objects.create_user(email=email, password=password)
        user.first_name = create_kwargs.get("first_name", "")
        user.last_name = create_kwargs.get("last_name", "")
        user.save()

    return JsonResponse({"message": "Account created", "email": user.email, "id": user.id}, status=201)


# views.py
from django.views.decorators.http import require_POST
from django.http import JsonResponse
from .forms import FamilyHistoryForm
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods


@login_required
@require_POST
def add_family_history(request):
    # If JSON
    if request.content_type == 'application/json':
        try:
            data = json.loads(request.body.decode('utf-8'))
        except Exception:
            return JsonResponse({"status": "error", "message": "Invalid JSON"}, status=400)
    else:
        # FormData support (THIS FIXES YOUR ERROR)
        data = request.POST

    condition = data.get("condition")
    relationship = data.get("relationship")
    age_of_onset = data.get("age_of_onset")
    notes = data.get("notes")

    if not condition or not relationship:
        return JsonResponse({"status": "error", "message": "Missing fields"}, status=400)

    entry = FamilyHistory.objects.create(
        user=request.user,
        condition=condition,
        relationship=relationship,
        age_of_onset=age_of_onset,
        notes=notes or ""
    )

    return JsonResponse({
        "status": "success",
        "id": entry.id,
        "condition": entry.condition,
        "relationship": entry.relationship,
        "age_of_onset": entry.age_of_onset,
        "notes": entry.notes,
    })
   
@login_required
@require_POST
def delete_family_history(request, pk):
    try:
        entry = FamilyHistory.objects.get(pk=pk, user=request.user)
        entry.delete()
        return JsonResponse({"status": "success"})
    except FamilyHistory.DoesNotExist:
        return JsonResponse({"status": "error", "message": "Not found"}, status=404)

@login_required
@require_http_methods(["GET", "POST"])
def family_history_detail_api(request, pk):
    ua = get_object_or_404(FamilyHistory, pk=pk)
    if ua.user != request.user:
        return HttpResponseForbidden(json.dumps({'error': 'permission denied'}), content_type='application/json')

    if request.method == 'GET':
        return JsonResponse({
            'id': ua.pk,
            'condition': ua.condition,
            'relationship': ua.relationship,
            'age_of_onset': ua.age_of_onset,
            'notes': ua.notes or ''
        })

    data = _parse_request_data(request)
    form = FamilyHistoryForm(data, instance=ua)
    if form.is_valid():
        form.save(user=request.user)
        return JsonResponse({
            'status': 'success',
            'id': ua.pk,
            'condition': ua.condition,
            'relationship': ua.relationship,
            'age_of_onset': ua.age_of_onset,
            'notes': ua.notes or ''
        })
    return JsonResponse({'status': 'error', 'errors': form.errors}, status=400)

User = get_user_model()
@csrf_exempt  # Keep for testing, remove for production
def login_check(request):
    if request.method == 'POST':
        import json
        data = json.loads(request.body)
        email = data.get('email', '').strip().lower()
        password = data.get('password', '').strip()


        user = authenticate(request, email=email, password=password)
# in login_check (after user = authenticate(...))
        if user is not None:
            if getattr(user, "is_email_verified", True) is False:
                # do not log in
                return JsonResponse({
                    'success': False,
                    'message': 'Email not verified',
                    'reason': 'email_not_verified',
                    'enter_otp_url': f"/enter-otp/?email={user.email}"
                }, status=403)

            login(request, user)
            return JsonResponse({
                'success': True,
                'message': 'Welcome!',
                'user': {
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'email': user.email,
                    'is_doctor': getattr(user, 'is_doctor', False)
                }
            })

        else:
            return JsonResponse({'success': False, 'message': 'Invalid email or password'})

    return JsonResponse({'success': False, 'message': 'Invalid request method'})
 
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
import json

from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from .forms import HealthTrendForm
import json

from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.contrib.auth import get_user_model
from .forms import UserSignupForm, HealthTrendForm
from .models import VitalSign
import json

User = get_user_model()

from django.utils.text import slugify





@login_required
def save_trends(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            form = HealthTrendForm(data)
            if form.is_valid():
                trend = form.save(commit=False)
                trend.user = request.user  # ✅ works now
                trend.save()
                return JsonResponse({'status': 'success', 'message': 'Trends saved!'})
            return JsonResponse({'status': 'error', 'errors': form.errors})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)})
    return JsonResponse({'status': 'error', 'message': 'Invalid request method'})
from user.models import ActivityLog,VitalSign  # adjust import if needed
# utils/bp.py
import re
from typing import Optional, Tuple, Dict

BP_REGEX = re.compile(r'(\d{2,3})\s*[/\-]\s*(\d{2,3})')

def parse_bp(bp_value: Optional[str]) -> Optional[Tuple[int,int]]:
    """
    Parse strings like "120/80", " 120 / 80 mmHg", "120-80".
    Returns (systolic, diastolic) as ints or None on parse failure.
    """
    if not bp_value:
        return None
    s = str(bp_value).strip()
    m = BP_REGEX.search(s)
    if not m:
        return None
    try:
        systolic = int(m.group(1))
        diastolic = int(m.group(2))
        return systolic, diastolic
    except ValueError:
        return None

def categorize_bp(bp_value: Optional[str]) -> Dict:
    """
    Return a dict with category, label, systolic, diastolic and action_hint.
    Uses AHA/ACC categories by default (see docs).
    """
    parsed = parse_bp(bp_value)
    if not parsed:
        return {
            "category": "invalid",
            "label": "Invalid",
            "systolic": None,
            "diastolic": None,
            "action_hint": "Enter BP like '120/80'."
        }

    s, d = parsed

    # Hypertensive crisis (emergency)
    if s > 180 or d > 120:
        return {
            "category": "crisis",
            "label": "Hypertensive crisis — seek emergency care",
            "systolic": s,
            "diastolic": d,
            "action_hint": "Immediate medical attention required."
        }

    # Stage 2
    if s >= 140 or d >= 90:
        return {
            "category": "stage_2",
            "label": "Stage 2 Hypertension",
            "systolic": s,
            "diastolic": d,
            "action_hint": "Lifestyle + medication likely; follow-up with clinician."
        }

    # Stage 1
    if 130 <= s <= 139 or 80 <= d <= 89:
        return {
            "category": "stage_1",
            "label": "Stage 1 Hypertension",
            "systolic": s,
            "diastolic": d,
            "action_hint": "Lifestyle changes; monitor and consult clinician."
        }

    # Elevated
    if 120 <= s <= 129 and d < 80:
        return {
            "category": "elevated",
            "label": "Elevated",
            "systolic": s,
            "diastolic": d,
            "action_hint": "Lifestyle changes recommended; monitor regularly."
        }

    # Normal
    if s < 120 and d < 80:
        return {
            "category": "normal",
            "label": "Normal",
            "systolic": s,
            "diastolic": d,
            "action_hint": "Keep up healthy lifestyle."
        }

    # Fallback (shouldn't normally reach)
    return {
        "category": "uncategorized",
        "label": "Uncategorized",
        "systolic": s,
        "diastolic": d,
        "action_hint": "Check reading."
    }
# utils/hr.py
import re
from typing import Optional, Dict

HR_REGEX = re.compile(r'(\d{1,3})')

# Simple pediatric normal ranges by age (years). These are approximate
# reference ranges for resting heart rate (use with caution).
_PEDIATRIC_NORMALS = [
    (1,  (100, 160)),   # <1 year
    (2,  (90, 150)),    # 1-2 years
    (5,  (80, 140)),    # 3-5 years
    (12, (70, 120)),    # 6-12 years
    (17, (60, 100)),    # 13-17 years (adolescent)
]

def parse_hr(value: Optional[str]) -> Optional[int]:
    """
    Parse heart rate strings like "72", "72 bpm", "72bpm".
    Returns integer bpm or None on parse failure.
    """
    if value is None:
        return None
    s = str(value).strip()
    m = HR_REGEX.search(s)
    if not m:
        return None
    try:
        return int(m.group(1))
    except ValueError:
        return None

def _get_pediatric_range(age_years: int):
    for max_age, rng in _PEDIATRIC_NORMALS:
        if age_years <= max_age:
            return rng
    # If older than last group (>=18), treat as adult
    return (60, 100)

def categorize_hr(value: Optional[str], age_years: Optional[int] = None) -> Dict:
    """
    Categorize heart rate.
    - value: string like "72" or "72 bpm"
    - age_years: optional int; if provided and <18, use pediatric ranges.
    Returns dict: {category, label, hr, action_hint}
    Categories: invalid, severe_brady, bradycardia, normal, tachycardia, severe_tachy
    """
    hr = parse_hr(value)
    if hr is None:
        return {
            "category": "invalid",
            "label": "Invalid",
            "hr": None,
            "action_hint": "Enter heart rate like '72' or '72 bpm'."
        }

    # Emergency thresholds (general)
    if hr < 30:
        return {
            "category": "severe_brady",
            "label": "Severe bradycardia (urgent)",
            "hr": hr,
            "action_hint": "Very low heart rate — seek urgent medical evaluation."
        }
    if hr > 200:
        return {
            "category": "severe_tachy",
            "label": "Severe tachycardia (urgent)",
            "hr": hr,
            "action_hint": "Very high heart rate — seek urgent medical evaluation."
        }

    # Determine normal range
    if age_years is not None and age_years < 18:
        normal_min, normal_max = _get_pediatric_range(age_years)
    else:
        normal_min, normal_max = 60, 100  # adult resting

    # Bradycardia vs normal vs tachycardia
    if hr < normal_min:
        # mild vs moderate brady
        if hr < (normal_min - 10):
            cat = "bradycardia"
            label = "Bradycardia"
            action = "Consult clinician if symptomatic."
        else:
            cat = "bradycardia"
            label = "Low (bradycardia)"
            action = "Monitor; consult if symptoms (dizziness, syncope)."
        return {
            "category": cat,
            "label": label,
            "hr": hr,
            "action_hint": action
        }

    if normal_min <= hr <= normal_max:
        return {
            "category": "normal",
            "label": "Normal",
            "hr": hr,
            "action_hint": "Resting heart rate is within expected range."
        }

    # hr > normal_max => tachycardia. Distinguish severity
    if hr <= normal_max + 40:
        return {
            "category": "tachycardia",
            "label": "Tachycardia",
            "hr": hr,
            "action_hint": "Elevated heart rate; avoid stimulants, rest, and monitor."
        }

    # high tachy but not catastrophic (caught earlier >200)
    return {
        "category": "severe_tachy",
        "label": "Severe tachycardia",
        "hr": hr,
        "action_hint": "Markedly elevated heart rate — seek medical advice."
    }
import re
from typing import Optional, Dict

# regex to capture weight and height
# formats: "72kg/172cm", "165lb/5ft9in", "75/1.75m"
_RE_W_H = re.compile(
    r'(?P<weight>\d+(?:[.,]\d+)?)\s*(?P<w_unit>kg|kgs|lb|lbs)?\s*[/\\]\s*'
    r'(?P<height>\d+(?:[.,]\d+)?)\s*(?P<h_unit>cm|m)?',
    re.I
)

LB_TO_KG = 0.45359237

def parse_weight_height(value: str) -> Optional[Dict[str, float]]:
    """Return weight_kg and height_m if parsable."""
    if not value:
        return None
    m = _RE_W_H.search(value.strip())
    if not m:
        return None
    # weight
    w = float(m.group('weight').replace(',', '.'))
    w_unit = m.group('w_unit')
    if w_unit and w_unit.lower() in ['lb','lbs']:
        w = w * LB_TO_KG  # convert lb → kg
    # else assume kg

    # height
    h = float(m.group('height').replace(',', '.'))
    h_unit = m.group('h_unit')
    if h_unit and h_unit.lower() == 'cm':
        h = h / 100  # convert cm → m
    # else assume meters
    return {'weight_kg': round(w,3), 'height_m': round(h,3)}

def bmi_from_w_h(value: str) -> Optional[float]:
    data = parse_weight_height(value)
    if not data:
        return None
    w = data['weight_kg']
    h = data['height_m']
    if h <= 0:
        return None
    return round(w / (h * h), 1)

def bmi_category(value: str) -> Dict:
    bmi = bmi_from_w_h(value)
    if bmi is None:
        return {"category": "invalid", "label": "Invalid", "bmi": None, "action_hint": "Provide weight/height like '72kg/172cm'."}

    if bmi < 18.5:
        return {"category": "underweight", "label": "Underweight", "bmi": bmi, "action_hint": "Consider medical/nutrition advice."}
    if bmi < 25:
        return {"category": "normal", "label": "Normal", "bmi": bmi, "action_hint": "Maintain healthy lifestyle."}
    if bmi < 30:
        return {"category": "overweight", "label": "Overweight", "bmi": bmi, "action_hint": "Lifestyle changes recommended."}
    if bmi < 35:
        label = "Obesity (Class 1)"
    elif bmi < 40:
        label = "Obesity (Class 2)"
    else:
        label = "Obesity (Class 3)"
    return {"category": "obesity", "label": label, "bmi": bmi, "action_hint": "Clinical assessment recommended."}
from typing import Dict

def classify_glucose_value(mgdl: float, fasting: bool = True) -> Dict:
    """
    Classify a numeric blood sugar value (mg/dL).
    fasting=True: fasting glucose
    fasting=False: random glucose
    """
    if mgdl is None:
        return {"category":"invalid","label":"Invalid","value":None,"action_hint":"Provide numeric blood sugar"}

    if fasting:
        if mgdl < 70:
            return {"category":"low","label":"Low (hypoglycemia)","value":mgdl,"action_hint":"Consult doctor if symptomatic"}
        elif mgdl < 100:
            return {"category":"normal","label":"Normal","value":mgdl,"action_hint":"Routine monitoring"}
        elif mgdl < 126:
            return {"category":"prediabetes","label":"Prediabetes","value":mgdl,"action_hint":"Lifestyle changes recommended"}
        else:
            return {"category":"diabetes","label":"Diabetes","value":mgdl,"action_hint":"Consult clinician for diagnosis/treatment"}
    else:
        # random glucose
        if mgdl < 70:
            return {"category":"low","label":"Low","value":mgdl,"action_hint":"Check for symptoms"}
        elif mgdl < 140:
            return {"category":"normal","label":"Normal","value":mgdl,"action_hint":"Routine monitoring"}
        elif mgdl < 200:
            return {"category":"prediabetes","label":"High","value":mgdl,"action_hint":"Consider testing fasting glucose or A1c"}
        else:
            return {"category":"diabetes","label":"Very high","value":mgdl,"action_hint":"Seek medical advice immediately"}
ICON_MAP = {
    'MedicalFile': 'upload',
    'UserMedication': 'pill',
    'UserAllergy': 'pill',
    'UserChronic': 'pill',
    'Reminder': 'calendar',
    'SharingRequest': 'share',
    'AccessGrant': 'shield',
    'FamilyMember': 'user',
    'VitalSign': 'heart',
    'MedicalReport': 'file',
    # add more mappings as needed
}
@login_required(login_url='/login/')  # or settings.LOGIN_URL
def dashboard(request):
    if  getattr(request.user, 'is_doctor', False):
        return redirect(f"{settings.LOGIN_URL}?next={request.path}")
    if not getattr(request.user, 'is_email_verified', False):
        return redirect(f"{settings.LOGIN_URL}?next={request.path}")


    five_days_ago = timezone.now() - timedelta(days=5)
    vital_Sign = VitalSign.objects.filter(user=request.user).order_by("-recorded_at").first()
    if vital_Sign:
        heart_rate = categorize_hr(vital_Sign.heart_rate)
        bim = bmi_category(vital_Sign.weight)
        blood_sugar = classify_glucose_value(vital_Sign.blood_sugar)
        blood_pressure = categorize_bp(vital_Sign.blood_pressure)
    else:
        heart_rate = {"category": "unknown", "label": "N/A"}
        bim = {"category": "unknown", "label": "N/A"}
        blood_sugar = {"category": "unknown", "label": "N/A"}
        blood_pressure = {"category": "unknown", "label": "N/A"}
    logs = ActivityLog.objects.filter(user=request.user,created_at__gte=five_days_ago).order_by('-created_at')
    remainders=Reminder.objects.filter(user=request.user,enabled=True)
    form = HealthTrendForm()
    user = request.user
    file=MedicalFile.objects.filter(user=user).order_by('-id')[:3]
    activities = ActivityLog.objects.filter(user=request.user).select_related('user')[:20]
    for a in activities:
        a.icon = ICON_MAP.get(a.model_name, 'info')
    return render(request, 'user/dashboard.html', {'form': form,
                                                   'user':user,
                                                   'logscount':logs.count,
                                                   'remainders':remainders.count,
                                                   'blood_pressure':blood_pressure,
                                                   'heart_rate':heart_rate,
                                                   'bim':bim,
                                                   'blood_sugar':blood_sugar,
                                                   'files':file,
                                                   'activities':activities,
                                                   })
  

def index(request):
    return render(request, "user/index.html")
def onboarding(request):
    return render(request, 'user/onboarding.html')

def login_view(request):
    return render(request, 'user/login.html')



from .forms import UserChronicForm

from django.contrib.auth.decorators import login_required
from .models import UserChronic
from .forms import UserChronicForm ,UserMedicationForm,ProPersonalFileForm,ProAddressFileForm,FamilyHistoryForm

@login_required(login_url='/login/')  # or settings.LOGIN_URL
def healthdata(request):
    if  getattr(request.user, 'is_doctor', False):
        # include ?next=... so they can be redirected back after logging in (optional)
        return redirect(f"{settings.LOGIN_URL}?next={request.path}")

    form = UserChronicForm()
    allergy_form = UserAllergyForm()
    user = User.objects.get(id=request.user.id)


    # get all chronic entries for this user
    chronic_list = UserChronic.objects.filter(user=request.user)
    allergy_list = UserAllergy.objects.filter(user=request.user).select_related('allergy')
    med_form = UserMedicationForm()
    family_form=FamilyHistoryForm()
    medication_list = UserMedication.objects.filter(user=request.user).order_by('-id') if request.user.is_authenticated else []
    remainders=Reminder.objects.filter(user=request.user,enabled=True)
    family_history = FamilyHistory.objects.filter(user=request.user)


    return render(request, 'user/health-data.html', {
        
        'form': form,
        'chronic_list': chronic_list,
        'allergy_list': allergy_list, # optional - you might not be using it directly
        'allergy_form': allergy_form,
        'med_form': med_form,
        'family_form':family_form,
        'medication_list': medication_list,
        'user':user,
        'remainders':remainders.count,
        "family_history": family_history,

    })
@login_required(login_url='/login/')  # or settings.LOGIN_URL
def filesreports(request):
    if  getattr(request.user, 'is_doctor', False):
        # include ?next=... so they can be redirected back after logging in (optional)
        return redirect(f"{settings.LOGIN_URL}?next={request.path}")

    user = User.objects.get(id=request.user.id)
    remainders=Reminder.objects.filter(user=request.user,enabled=True)

    return render(request, 'user/files-reports.html',{'user':user,
                                                    'remainders':remainders.count,})
@login_required(login_url='/login/')  # or settings.LOGIN_URL
def profile(request):
    if  getattr(request.user, 'is_doctor', False):
        # include ?next=... so they can be redirected back after logging in (optional)
        return redirect(f"{settings.LOGIN_URL}?next={request.path}")

    # request.user IS the user instance
    user = request.user

    # instantiate the form for display (read-only or to show placeholders)
    form = ProPersonalFileForm(instance=user)
    form2=ProAddressFileForm(instance=user.address)
    remainders=Reminder.objects.filter(user=request.user,enabled=True)
    filecount=MedicalFile.objects.filter(user=request.user)
    provider=SharingRequest.objects.filter(from_user=request.user)

    context = {
        'profile': user,
        'form': form,
        'form2':form2,
        'remainders':remainders.count,
        'filecount':filecount.count,
        'provider':provider.count,
    }
    return render(request, 'user/profile.html', context)
 
# def alerts(request):

#     return render(request, 'user/alerts.html')
@login_required(login_url='/login/')  # or settings.LOGIN_URL
def sharepermission(request):
    if  getattr(request.user, 'is_doctor', False):
        # include ?next=... so they can be redirected back after logging in (optional)
        return redirect(f"{settings.LOGIN_URL}?next={request.path}")

    user = User.objects.get(id=request.user.id)
    remainders=Reminder.objects.filter(user=request.user,enabled=True)

    return render(request, 'user/share-permissions.html',{'user':user,
                                                          'remainders':remainders.count,
                                                          })


# user/views.py (add)
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, HttpResponseBadRequest
from .forms import UserChronicForm ,UserMedicationForm
from django.views.decorators.http import require_POST
import json

@login_required
@require_POST
def add_chronic(request):
    """
    Accepts:
      - JSON: Content-Type: application/json  -> responds JSON
      - Form POST: standard request.POST -> responds redirect or JSON if AJAX
    """
    # Try JSON first
    if request.content_type == 'application/json':
        try:
            payload = json.loads(request.body.decode('utf-8'))
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': 'Invalid JSON: ' + str(e)}, status=400)
        form = UserChronicForm(payload)
    else:
        form = UserChronicForm(request.POST)

    if form.is_valid():
        try:
            chronic = form.save(user=request.user)
            # Return JSON so JS can update UI
            return JsonResponse({
                'status': 'success',
                'id': chronic.id,
                'disease': chronic.chronic_disease.name,
                'date_diagnosed': chronic.date_diagnosed.isoformat() if chronic.date_diagnosed else None,
                'status_text': chronic.status,
                'severity': getattr(chronic, 'severity', None)
            })
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=500)
    else:
        # return form errors
        return JsonResponse({'status': 'error', 'errors': form.errors}, status=400)

from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from .models import UserChronic
import traceback
from .models import ChronicDisease
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST
from django.http import JsonResponse
from .models import UserChronic

@csrf_exempt
@login_required
@require_POST
def delete_chronic(request, pk):
    try:
        chronic_record = UserChronic.objects.get(pk=pk, user=request.user)
        chronic_record.delete()
        return JsonResponse({'status': 'success'})
    except UserChronic.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Record not found'}, status=404)

from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST
from django.http import JsonResponse
from .forms import UserAllergyForm
from .models import UserAllergy, Allergy
import json

import json, logging, traceback
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.contrib.auth.decorators import login_required

from django.views.decorators.http import require_POST
from django.http import JsonResponse
from django.conf import settings
import json, logging, traceback

logger = logging.getLogger(__name__)

@require_POST
def add_allergy(request):
    # Return JSON 401 for unauthenticated AJAX calls instead of HTML redirect
    if not request.user.is_authenticated:
        return JsonResponse({'status': 'error', 'message': 'Authentication required'}, status=401)

    data_source = 'json' if request.content_type == 'application/json' else 'form'
    try:
        if request.content_type == 'application/json':
            try:
                payload = json.loads(request.body.decode('utf-8') or '{}')
            except Exception as e:
                return JsonResponse({'status': 'error', 'message': 'Invalid JSON: ' + str(e)}, status=400)
            form = UserAllergyForm(payload)
        else:
            form = UserAllergyForm(request.POST)

        if not form.is_valid():
            return JsonResponse({'status': 'error', 'errors': form.errors}, status=400)

        allergy_record = form.save(user=request.user)
        return JsonResponse({
            'status': 'success',
            'id': allergy_record.id,
            'allergen': allergy_record.allergy.name,
            'type': allergy_record.allergy.type,
            'severity': allergy_record.severity,
            'reaction': getattr(allergy_record, 'reaction', None)
        })
    except Exception as exc:
        logger.exception("Error in add_allergy (data_source=%s)", data_source)
        if settings.DEBUG:
            return JsonResponse({'status': 'error', 'message': str(exc), 'traceback': traceback.format_exc()}, status=500)
        return JsonResponse({'status': 'error', 'message': 'Internal server error'}, status=500)

# views.py
import json, traceback, logging
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.conf import settings
from .forms import UserMedicationForm

logger = logging.getLogger(__name__)
# views.py
import json, traceback, logging
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.conf import settings
from .forms import UserMedicationForm

# app/views.py
import json, traceback, logging
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.conf import settings
from .forms import UserMedicationForm
# user/views.py
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, HttpResponseBadRequest, HttpResponseForbidden
from django.shortcuts import redirect, get_object_or_404
from django.urls import reverse
from .forms import UserMedicationForm
from .models import Medication, UserMedication

def _is_ajax(request):
    return request.headers.get('x-requested-with') == 'XMLHttpRequest'

@login_required
def add_medication(request):
    """
    Accepts POST (AJAX or regular). If AJAX -> returns JSON.
    Creates Medication (if needed) and UserMedication record.
    """
    if request.method != 'POST':
        if _is_ajax(request):
            return JsonResponse({'status': 'error', 'message': 'POST required'}, status=405)
        return HttpResponseBadRequest("POST required")

    form = UserMedicationForm(request.POST)
    if not form.is_valid():
        if _is_ajax(request):
            return JsonResponse({'status': 'error', 'errors': form.errors}, status=400)
        # fallback for non-AJAX: redirect back (you can customize)
        return redirect(request.META.get('HTTP_REFERER', '/'))

    med_name = form.cleaned_data['medication_name'].strip()
    dosage = form.cleaned_data['dosage'].strip()
    frequency = form.cleaned_data['frequency'].strip()
    start_date = form.cleaned_data.get('start_date')

    # Create or get medication (case-insensitive attempt)
    med = Medication.objects.filter(name__iexact=med_name).first()
    if not med:
        med = Medication.objects.create(name=med_name)

    user_med = UserMedication.objects.create(
        user=request.user,
        medication=med,
        dosage=dosage,
        frequency=frequency,
        start_date=start_date
    )

    if _is_ajax(request):
        # Build payload expected by front-end
        payload = {
            'status': 'success',
            'id': user_med.pk,
            'medication': med.name,
            'dosage': user_med.dosage,
            'frequency': user_med.frequency,
            'start_date': user_med.start_date.isoformat() if user_med.start_date else '',
            'delete_url': reverse('user:delete_medication', args=[user_med.pk])
        }
        return JsonResponse(payload, status=201)

    # Non-AJAX fallback
    return redirect(request.META.get('HTTP_REFERER', '/'))


@login_required
def delete_medication(request, pk):
    """
    Accepts POST (AJAX) to delete a user's medication record.
    """
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'POST required'}, status=405)

    user_med = get_object_or_404(UserMedication, pk=pk)
    if user_med.user != request.user:
        return JsonResponse({'status': 'error', 'message': 'Permission denied'}, status=403)

    user_med.delete()
    return JsonResponse({'status': 'success', 'id': pk})

@csrf_exempt
@login_required
@require_POST
def delete_allergy(request, pk):
    """
    Deletes a UserAllergy record for the logged-in user
    """
    try:
        allergy_record = UserAllergy.objects.get(pk=pk, user=request.user)
        allergy_record.delete()
        return JsonResponse({'status': 'success'})
    except UserAllergy.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Record not found'}, status=404)
@csrf_exempt
@login_required
@require_POST
def allergy_detail(request, pk):
    """
    Deletes a UserAllergy record for the logged-in user
    """
    try:
        allergy_record = UserAllergy.objects.get(pk=pk, user=request.user)
        allergy_record.delete()
        return JsonResponse({'status': 'success'})
    except UserAllergy.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Record not found'}, status=404)


from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.utils import timezone
import json


# def reminders_list(request):
#     reminders = Reminder.objects.filter(user=request.user).order_by('next_due')
#     return render(request, 'user/reminders.html', {
#         'reminders': reminders,
#         'reminders_json': json.dumps([reminder.to_dict() for reminder in reminders])
#     })



from .forms import ProPersonalFileForm
from django.contrib import messages

def edit_profile(request):
    user = request.user  # the user instance

    if request.method == 'POST':
        form = ProPersonalFileForm(request.POST, request.FILES or None, instance=user)
        if form.is_valid():
            form.save()
            messages.success(request, "Profile updated successfully!")
            return redirect('user:edit_profile')  # use app_name if present
        else:
            messages.error(request, "Please fix the errors below.")
    else:
        form = ProPersonalFileForm(instance=user)

    return render(request, 'user/edit_profile.html', {'form': form, 'profile': user})
  
from django.shortcuts import render, redirect
from django.contrib import messages
from .forms import ProAddressFileForm
from .models import Address

def edit_profile_adress(request):
    user = request.user

    # ensure user has an address object
    if not user.address:
        user.address = Address.objects.create()
        user.save()

    if request.method == 'POST':
        form = ProAddressFileForm(request.POST, instance=user.address)
        if form.is_valid():
            form.save()
            messages.success(request, "Address updated successfully!")
            return redirect('user:edit_profile_adress')
        else:
            messages.error(request, "Please fix the errors below.")
    else:
        form = ProAddressFileForm(instance=user.address)

    return render(request, 'user/edit_profile_adress.html', {'form': form, 'profile': user})





from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.contrib.auth.decorators import login_required
from .models import SharingRequest
from django.utils import timezone


from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.contrib.auth.decorators import login_required
import json

from .models import SharingRequest, AccessGrant

PERMISSION_MAP = {
    "fiels":      "Medical Records",
    "madactions": "Medications",
    "alergys":    "Allergies",
    "desises":    "Chronic Conditions",
    "family":     "Family History",
}

def build_permissions(access):
    return [label for field, label in PERMISSION_MAP.items() if getattr(access, field, False)]

@login_required
@require_POST
def handle_sharing_request(request):
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'status': 'error', 'message': 'Invalid JSON'}, status=400)

    request_id = data.get('request_id')
    action = (data.get('action') or "").lower()

    try:
        sharing_request = SharingRequest.objects.get(id=request_id, to_provider=request.user)
    except SharingRequest.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Request not found.'}, status=404)

    if action == 'accept':
        sharing_request.accept()

        grant = AccessGrant.objects.filter(
            provider=request.user,
            user=sharing_request.from_user,
            data_scope=sharing_request.data_scope
        ).order_by("-granted_at").first()

        if not grant:
            return JsonResponse({'status': 'error', 'message': 'Grant was not created.'}, status=500)

        pending_count = SharingRequest.objects.filter(
            to_provider=request.user,
            status=SharingRequest.STATUS_PENDING
        ).count()

        return JsonResponse({
            "status": "success",
            "message": "Request accepted.",
            "pending_count": pending_count,
            "grant": {
                "pk": grant.pk,
                "active": bool(grant.active),
                "data_scope": grant.data_scope,
                "granted_at": grant.granted_at.isoformat() if grant.granted_at else None,
                "user": {
                    "id": grant.user.id,
                    "first_name": grant.user.first_name,
                    "last_name": grant.user.last_name,
                    "email": grant.user.email,
                },
                "permissions": build_permissions(grant),
            }
        })

    if action == 'decline':
        sharing_request.reject()

        pending_count = SharingRequest.objects.filter(
            to_provider=request.user,
            status=SharingRequest.STATUS_PENDING
        ).count()

        return JsonResponse({
            "status": "success",
            "message": "Request declined.",
            "pending_count": pending_count
        })

    return JsonResponse({'status': 'error', 'message': 'Invalid action.'}, status=400)


# app/views.py
from django.shortcuts import get_object_or_404, redirect
from django.http import JsonResponse, HttpResponseBadRequest, HttpResponseForbidden
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from django.utils import timezone

from .models import MedicalFile

import mimetypes

def _format_file_obj(mf):
    return {
        "id": mf.id,
        "name": mf.file_name,
        "url": mf.file.url,
        "thumbnail": mf.thumbnail.url if mf.thumbnail else None,
        "type": mf.file_type,
        "category": mf.category,
        "size": mf.size_display(),
        "upload_date": mf.upload_date.strftime("%Y-%m-%d %H:%M"),
    }

@login_required
@require_http_methods(["GET"])
def api_files_list(request):
    """Return JSON list of user's medical files"""
    files_qs = MedicalFile.objects.filter(user=request.user).order_by('-upload_date')
    files = [_format_file_obj(f) for f in files_qs]
    return JsonResponse({"files": files})

@login_required
@require_http_methods(["POST"])
def api_files_upload(request):
    """
    Accepts multipart/form-data with one or more 'files' fields.
    Returns list of created file objects.
    """
    uploaded = request.FILES.getlist('files')
    if not uploaded:
        return HttpResponseBadRequest('No files uploaded.')

    created = []
    for f in uploaded:
        mf = MedicalFile(user=request.user, file=f)
        mf.save()
        created.append(_format_file_obj(mf))

    return JsonResponse({"uploaded": created}, status=201)

@login_required
@require_http_methods(["POST", "DELETE"])
def api_file_delete(request, pk):
    """Delete a file (only owner or staff may delete)"""
    mf = get_object_or_404(MedicalFile, pk=pk)
    if not (mf.user == request.user or request.user.is_staff):
        return HttpResponseForbidden("Not allowed to delete this file.")

    # delete file from storage
    try:
        mf.file.delete(save=False)
        if mf.thumbnail:
            mf.thumbnail.delete(save=False)
    except Exception:
        pass
    mf.delete()
    return JsonResponse({"deleted": True})

@login_required
@require_http_methods(["GET"])
def api_file_download(request, pk):
    """Redirect to the file URL (served by MEDIA) or stream if needed."""
    mf = get_object_or_404(MedicalFile, pk=pk)
    if not (mf.user == request.user or request.user.is_staff):
        return HttpResponseForbidden("Not allowed to download this file.")

    # Simple redirect to media URL (development). For production use proper storage URL
    return redirect(mf.file.url)
 
# shering 

# app/views.py
import json
from django.shortcuts import get_object_or_404
from django.http import JsonResponse, HttpResponseBadRequest, HttpResponseForbidden
from django.views.decorators.http import require_http_methods
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone

from .models import SharingRequest, AccessGrant

User = get_user_model()

def _json_request_body(request):
    if request.content_type == "application/json":
        return json.loads(request.body.decode() or "{}")
    return request.POST

from django.views.decorators.http import require_http_methods
from django.http import JsonResponse, HttpResponseForbidden, HttpResponseBadRequest
from django.urls import reverse
import json


@require_http_methods(["POST"])
def share_request_by_email(request):
    if not request.user.is_authenticated:
        return HttpResponseForbidden(json.dumps({"error": "authentication required"}), content_type="application/json")

    try:
        data = _json_request_body(request)
        provider_email = (data.get("provider_email") or "").strip().lower()
        data_scope = data.get("data_scope") or SharingRequest.DATA_FULL
        message = (data.get("message") or "").strip()

        if not provider_email:
            return HttpResponseBadRequest(json.dumps({"error": "provider_email is required"}), content_type="application/json")

        # find provider
        try:
            provider = User.objects.get(email__iexact=provider_email)
        except User.DoesNotExist:
            return HttpResponseBadRequest(json.dumps({"error": "provider not found"}), content_type="application/json")

        if not getattr(provider, "is_doctor", False):
            return HttpResponseBadRequest(json.dumps({"error": "target user is not a provider/doctor"}), content_type="application/json")

        if provider == request.user:
            return HttpResponseBadRequest(json.dumps({"error": "cannot share with yourself"}), content_type="application/json")

        # --- permissions parsing ---
        # incoming canonical list: ["medications", "files", ...]
        incoming_perms = data.get("permissions")
        # fallback to legacy/typo keys that come from checkboxes in forms
        if incoming_perms is None:
            incoming_perms = []
            # map values -> model field names
            fallback_map = {
                "madactions_pramition": "madactions",
                "medications_permission": "madactions",
                "alergys_pramition": "alergys",
                "allergies_permission": "alergys",
                "fiels_pramition": "fiels",
                "files_permission": "fiels",
                "family_pramition": "family",
                "family_permission": "family",
                "desises_pramition": "desises",
                "diseases_permission": "desises",
            }
            for key, model_field in fallback_map.items():
                val = data.get(key)
                if val in (True, "true", "True", "on", "1", 1):
                    incoming_perms.append(model_field)

        # turn list into boolean flags default False (explicit)
        # If you want default True semantics keep the default True below, but recommended is explicit False unless selected.
        perm_flags = {
            "madactions": False,
            "alergys": False,
            "fiels": False,
            "family": False,
            "desises": False,
        }
        if isinstance(incoming_perms, (list, tuple)):
            for p in incoming_perms:
                # accept a few synonyms
                if p in ("madactions", "madactions", "medications", "meds"):
                    perm_flags["madactions"] = True
                elif p in ("alergys", "allergies"):
                    perm_flags["alergys"] = True
                elif p in ("fiels", "files", "documents"):
                    perm_flags["fiels"] = True
                elif p in ("family",):
                    perm_flags["family"] = True
                elif p in ("desises", "diseases", "conditions"):
                    perm_flags["desises"] = True

        # --- check for existing request for same scope ---
        existing = SharingRequest.objects.filter(from_user=request.user, to_provider=provider, data_scope=data_scope).first()
        if existing:
            try:
                # If already accepted, ensure AccessGrant exists and has same permission flags
                if existing.status == SharingRequest.STATUS_ACCEPTED:
                    AccessGrant.objects.update_or_create(
                        user=request.user,
                        provider=provider,
                        data_scope=data_scope,
                        defaults={
                            "granted_by": provider,
                            "active": True,
                            # copy permission flags
                            "madactions": existing.madactions,
                            "alergys": existing.alergys,
                            "fiels": existing.fiels,
                            "family": existing.family,
                            "desises": existing.desises,
                        }
                    )
            except Exception as e:
                return JsonResponse({"error": f"Error ensuring access grant: {str(e)}"}, status=500)

            provider_url = request.build_absolute_uri(reverse('sharing:provider_minimal_view', args=[provider.pk]))
            return JsonResponse({
                "result": "exists",
                "sharing_request_id": existing.pk,
                "status": existing.status,
                "provider_view_url": provider_url,
            })

        # create new request safely with permission flags
        try:
            req = SharingRequest.objects.create(
                from_user=request.user,
                to_provider=provider,
                message=message,
                data_scope=data_scope,
                madactions=perm_flags["madactions"],
                alergys=perm_flags["alergys"],
                fiels=perm_flags["fiels"],
                family=perm_flags["family"],
                desises=perm_flags["desises"],
            )
        except Exception as e:
            return JsonResponse({"error": f"Error creating sharing request: {str(e)}"}, status=500)

        provider_url = request.build_absolute_uri(reverse('sharing:provider_minimal_view', args=[provider.pk]))
        return JsonResponse({
            "result": "created",
            "sharing_request_id": req.pk,
            "status": req.status,
            "provider_view_url": provider_url,
        })

    except Exception as e:
        return JsonResponse({"error": f"Unexpected error: {str(e)}"}, status=500)
  
@require_http_methods(["GET"])
def provider_minimal_view(request, provider_id):
    """
    Minimal provider view (only exposes allowed minimal fields).
    This view intentionally returns *only* the provider email (and optionally a display name)
    so you can share a link but not leak internal fields.
    """
    provider = get_object_or_404(User, pk=provider_id, is_doctor=True)

    # You can choose whether this view requires authentication or not.
    # If you require that only the requesting user or staff can see it, uncomment next lines:
    # if not request.user.is_authenticated:
    #     return HttpResponseForbidden(json.dumps({"error":"auth required"}), content_type="application/json")

    minimal = {
        "id": provider.pk,
        "email": provider.email,
        # optional: a small display name only (no extra provider profile fields)
        "display_name": f"{getattr(provider, 'first_name', '')} {getattr(provider, 'last_name', '')}".strip(),
    }
    return JsonResponse(minimal)


@require_http_methods(["POST"])
def respond_sharing_request(request, pk):
    """
    Provider responds to a sharing request:
    POST JSON: { "action": "accept" | "reject" }
    Must be authenticated as the provider (to_provider).
    """
    if not request.user.is_authenticated:
        return HttpResponseForbidden(json.dumps({"error": "authentication required"}), content_type="application/json")

    data = _json_request_body(request)
    action = (data.get("action") or "").lower()
    req = get_object_or_404(SharingRequest, pk=pk)

    if req.to_provider != request.user:
        return HttpResponseForbidden(json.dumps({"error": "only the target provider can respond"}), content_type="application/json")

    if req.status != SharingRequest.STATUS_PENDING:
        return HttpResponseBadRequest(json.dumps({"error": "request already responded"}), content_type="application/json")

    if action == "accept":
        req.status = SharingRequest.STATUS_ACCEPTED
        req.responded_at = timezone.now()
        req.save()
        AccessGrant.objects.get_or_create(user=req.from_user, provider=req.to_provider, data_scope=req.data_scope, defaults={'granted_by': request.user, 'active': True})
        return JsonResponse({"result": "accepted", "sharing_request_id": req.pk})

    if action == "reject":
        req.status = SharingRequest.STATUS_REJECTED
        req.responded_at = timezone.now()
        req.save()
        return JsonResponse({"result": "rejected", "sharing_request_id": req.pk})

    return HttpResponseBadRequest(json.dumps({"error": "invalid action"}), content_type="application/json")


@require_http_methods(["GET"])
def my_sharing_requests(request):
    """
    List the current user's requests grouped by status:
      ?status=pending|accepted|rejected  (optional)
    """
    if not request.user.is_authenticated:
        return HttpResponseForbidden(json.dumps({"error": "authentication required"}), content_type="application/json")

    qs = SharingRequest.objects.filter(from_user=request.user).order_by("-created_at")
    status = request.GET.get("status")
    if status:
        qs = qs.filter(status=status)

    data = [
        {
            "id": r.pk,
            "to_provider_email": r.to_provider.email,    # note: user asked to store/provide provider email only
            "data_scope": r.data_scope,
            "status": r.status,
            "created_at": r.created_at.isoformat(),
            "responded_at": r.responded_at.isoformat() if r.responded_at else None,
        } for r in qs
    ]

    # Also show counts (pending/accepted/rejected)
    counts = {
        "pending": SharingRequest.objects.filter(from_user=request.user, status=SharingRequest.STATUS_PENDING).count(),
        "accepted": SharingRequest.objects.filter(from_user=request.user, status=SharingRequest.STATUS_ACCEPTED).count(),
        "rejected": SharingRequest.objects.filter(from_user=request.user, status=SharingRequest.STATUS_REJECTED).count(),
    }

    return JsonResponse({"counts": counts, "requests": data})


# أعلى الملف
from django.db import transaction
from django.utils import timezone

@require_http_methods(["DELETE"])
def delete_sharing_request(request, pk):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "auth required"}, status=403)

    req = SharingRequest.objects.filter(pk=pk, from_user=request.user).first()
    if not req:
        return JsonResponse({"error": "not found"}, status=404)

    # خزن الحقول قبل الحذف
    provider = req.to_provider
    data_scope = req.data_scope
    from_user = req.from_user

    try:
        with transaction.atomic():
            # إلغاء أي منحة وصول موجودة وفعالة (revoke)
            AccessGrant.objects.filter(
                user=from_user,
                provider=provider,
                data_scope=data_scope,
                active=True
            ).delete()

            # ثم حذف طلب المشاركة نفسه
            req.delete()

        return JsonResponse({"status": "deleted"})

    except Exception as e:
        # سجّل الخطأ إذا رغبت ثم أعد خطأ مناسب
        return JsonResponse({"error": "delete_failed", "details": str(e)}, status=500)



from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from .models import EmergencyContact
import json

def body(request):
    return json.loads(request.body.decode() or "{}")


@login_required
@require_http_methods(["GET"])
def list_contacts(request):
    contacts = EmergencyContact.objects.filter(user=request.user)
    data = [
        {
            "id": c.id,
            "name": c.name,
            "phone_number": c.phone_number,
            "email": c.email,
            "relationship": c.relationship,
        } for c in contacts
    ]
    return JsonResponse({"contacts": data})


@login_required
@require_http_methods(["POST"])
def add_contact(request):
    data = body(request)

    contact = EmergencyContact.objects.create(
        user=request.user,
        name=data.get("name"),
        phone_number=data.get("phone_number"),
        email=data.get("email"),
        relationship=data.get("relationship"),
    )

    return JsonResponse({"status": "created", "contact_id": contact.id})


@login_required
@require_http_methods(["POST"])
def update_contact(request, pk):
    data = body(request)
    try:
        contact = EmergencyContact.objects.get(pk=pk, user=request.user)
    except EmergencyContact.DoesNotExist:
        return JsonResponse({"error": "not found"}, status=404)

    contact.name = data.get("name", contact.name)
    contact.phone_number = data.get("phone_number", contact.phone_number)
    contact.email = data.get("email", contact.email)
    contact.relationship = data.get("relationship", contact.relationship)
    contact.save()

    return JsonResponse({"status": "updated"})


@login_required
@require_http_methods(["DELETE"])
def delete_contact(request, pk):
    try:
        contact = EmergencyContact.objects.get(pk=pk, user=request.user)
        contact.delete()
        return JsonResponse({"status": "deleted"})
    except EmergencyContact.DoesNotExist:
        return JsonResponse({"error": "not found"}, status=404)

from django.http import JsonResponse
from django.utils import timezone
from .models import VitalSign
from datetime import timedelta

from django.http import JsonResponse
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth.decorators import login_required
import re

def _parse_weight_kg(weight_value):
    """
    Accepts:
      - "72kg/172cm"
      - "72 kg"
      - "72"
    Returns float kg or None
    """
    if weight_value is None:
        return None

    s = str(weight_value).strip().lower()
    if not s:
        return None

    # pick first number
    m = re.search(r"(\d+(?:\.\d+)?)", s)
    if not m:
        return None

    try:
        return float(m.group(1))
    except ValueError:
        return None


@login_required
def vitals_api(request):
    user = request.user
    period = int(request.GET.get("period", 7))  # default 7 days
    start_date = timezone.now() - timedelta(days=period)

    vitals = VitalSign.objects.filter(
        user=user,
        recorded_at__gte=start_date
    ).order_by("recorded_at")

    data = {
        "labels": [v.recorded_at.strftime('%Y-%m-%d') for v in vitals],
        "heart_rate": [v.heart_rate if v.heart_rate is not None else None for v in vitals],
        "blood_pressure": [v.blood_pressure or None for v in vitals],
        "weight": [_parse_weight_kg(v.weight) for v in vitals],   # ✅ numeric now
        "blood_sugar": [v.blood_sugar if v.blood_sugar is not None else None for v in vitals],
    }

    return JsonResponse(data)

#name imag
from django.shortcuts import get_object_or_404
from django.http import HttpResponse
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


# user/views.py
import json
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404
from django.http import JsonResponse, HttpResponseBadRequest, HttpResponseForbidden
from django.views.decorators.http import require_http_methods

from .models import UserMedication, UserAllergy, UserChronic
from .forms import UserMedicationForm, UserAllergyForm, UserChronicForm

def _parse_request_data(request):
    if request.content_type == 'application/json':
        try:
            return json.loads(request.body.decode('utf-8') or '{}')
        except Exception:
            return {}
    # form-data / x-www-form-urlencoded
    return request.POST

@login_required
@require_http_methods(["GET", "POST"])
def medication_detail_api(request, pk):
    um = get_object_or_404(UserMedication, pk=pk)
    if um.user != request.user:
        return HttpResponseForbidden(json.dumps({'error': 'permission denied'}), content_type='application/json')

    if request.method == 'GET':
        return JsonResponse({
            'id': um.pk,
            'medication_name': um.medication.name,
            'dosage': um.dosage,
            'frequency': um.frequency,
            'start_date': um.start_date.isoformat() if um.start_date else ''
        })

    # POST => update
    data = _parse_request_data(request)
    # Use form with instance to validate/update
    form = UserMedicationForm(data, instance=um)
    if form.is_valid():
        form.save(user=request.user)
        return JsonResponse({
            'status': 'success',
            'id': um.pk,
            'medication_name': um.medication.name,
            'dosage': um.dosage,
            'frequency': um.frequency,
            'start_date': um.start_date.isoformat() if um.start_date else ''
        })
    return JsonResponse({'status': 'error', 'errors': form.errors}, status=400)


@login_required
@require_http_methods(["GET", "POST"])
def allergy_detail_api(request, pk):
    ua = get_object_or_404(UserAllergy, pk=pk)
    if ua.user != request.user:
        return HttpResponseForbidden(json.dumps({'error': 'permission denied'}), content_type='application/json')

    if request.method == 'GET':
        return JsonResponse({
            'id': ua.pk,
            'name': ua.allergy.name,
            'type': ua.allergy.type,
            'severity': ua.severity,
            'reaction': ua.reaction or ''
        })

    data = _parse_request_data(request)
    form = UserAllergyForm(data, instance=ua)
    if form.is_valid():
        form.save(user=request.user)
        return JsonResponse({
            'status': 'success',
            'id': ua.pk,
            'name': ua.allergy.name,
            'type': ua.allergy.type,
            'severity': ua.severity,
            'reaction': ua.reaction or ''
        })
    return JsonResponse({'status': 'error', 'errors': form.errors}, status=400)


@login_required
@require_http_methods(["GET", "POST"])
def chronic_detail_api(request, pk):
    uc = get_object_or_404(UserChronic, pk=pk)
    if uc.user != request.user:
        return HttpResponseForbidden(json.dumps({'error': 'permission denied'}), content_type='application/json')

    if request.method == 'GET':
        return JsonResponse({
            'id': uc.pk,
            'disease_name': uc.chronic_disease.name,
            'date_diagnosed': uc.date_diagnosed.isoformat() if uc.date_diagnosed else '',
            'status': uc.status,
            'severity': uc.severity or ''
        })

    data = _parse_request_data(request)
    form = UserChronicForm(data, instance=uc)
    if form.is_valid():
        form.save(user=request.user)
        return JsonResponse({
            'status': 'success',
            'id': uc.pk,
            'disease_name': uc.chronic_disease.name,
            'date_diagnosed': uc.date_diagnosed.isoformat() if uc.date_diagnosed else '',
            'status': uc.status,
            'severity': uc.severity or ''
        })
    return JsonResponse({'status': 'error', 'errors': form.errors}, status=400)

# user/views.py
# user/views.py
# Secure JSON endpoint without assuming related_names exist.
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_GET
from django.core.serializers.json import DjangoJSONEncoder
from .models import AccessGrant

import datetime
from typing import List, Iterable

def _iso(dt):
    return dt.isoformat() if dt else None

def _iter_related_by_field_keywords(obj, keywords: Iterable[str]):
    """
    Search reverse relations on `obj` (auto-created related managers) whose related model name
    contains one of the keywords (case-insensitive). Return the first matching queryset (or [] if none).
    This avoids calling prefetch_related with invalid lookups.
    """
    keywords = [k.lower() for k in keywords]
    for f in obj._meta.get_fields():
        # look for reverse one-to-many or many-to-many relations created by other models
        if not getattr(f, "auto_created", False):
            continue
        if not (getattr(f, "one_to_many", False) or getattr(f, "many_to_many", False)):
            continue
        related_model = getattr(f, "related_model", None)
        if related_model is None:
            continue
        model_name = related_model.__name__.lower()
        if any(kw in model_name for kw in keywords):
            try:
                manager = getattr(obj, f.get_accessor_name())
                return manager.all()
            except Exception:
                continue
    return []

def _get_related_queryset_fallback(obj, possible_names: List[str]):
    """
    Try several possible attribute names on the object (e.g. 'chronics', 'userchronic_set').
    Return a queryset/list or empty list.
    """
    for name in possible_names:
        rel = getattr(obj, name, None)
        if rel is None:
            continue
        try:
            return rel.all()
        except Exception:
            # not a manager, maybe already iterable
            try:
                iter(rel)
                return rel
            except Exception:
                continue
    return []

# استبدل النسخة القديمة بهذه
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_GET
from django.core.serializers.json import DjangoJSONEncoder
from .models import AccessGrant
from typing import List


from django.contrib.auth.decorators import login_required
from django.core.serializers.json import DjangoJSONEncoder
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.http import require_GET

# helper to iso-format datetimes/dates
def _iso(value):
    if value is None:
        return None
    try:
        return value.isoformat()
    except Exception:
        return str(value)

@login_required
@require_GET
def accessgrant_detail(request, pk):
    qs = AccessGrant.objects.select_related("user", "provider", "granted_by").prefetch_related(
        "user__emergency_contacts",
        "user__medical_files",
        "user__family_history",
        "user__userchronic_set",
        "user__userallergy_set",
        "user__usermedication_set",
    )
    access = get_object_or_404(qs, pk=pk)

    # Permission checks
    if getattr(access, "provider", None) != request.user:
        return JsonResponse({"detail": "forbidden"}, status=403)
    if not bool(getattr(access, "active", True)):
        return JsonResponse({"detail": "inactive"}, status=403)

    patient = access.user

    # QuerySets
    chronics_qs = getattr(patient, "userchronic_set", patient.__class__).all() if hasattr(patient, "userchronic_set") else []
    allergies_qs = getattr(patient, "userallergy_set", patient.__class__).all() if hasattr(patient, "userallergy_set") else []
    meds_qs = getattr(patient, "usermedication_set", patient.__class__).all() if hasattr(patient, "usermedication_set") else []
    emergency_qs = getattr(patient, "emergency_contacts", []).all() if hasattr(patient, "emergency_contacts") else []
    files_qs = getattr(patient, "medical_files", []).all() if hasattr(patient, "medical_files") else []
    family_qs = patient.family_history.all()

    # patient basic info (always returned)
    patient_data = {
        "id": getattr(patient, "id", None),
        "first_name": getattr(patient, "first_name", None),
        "last_name": getattr(patient, "last_name", None),
        "date_of_birth": _iso(getattr(patient, "date_of_birth", None)),
        "gender": getattr(patient, "gender", None),
        "blood_type": getattr(patient, "blood_type", None),
        "phone_number": getattr(patient, "phone_number", None),
    }

    # helpers to map qs -> lists
    def serialize_chronics(qs):
        out = []
        for c in qs:
            out.append({
                "id": getattr(c, "id", None),
                "disease": getattr(getattr(c, "chronic_disease", None), "name", getattr(c, "disease", None)),
                "date_diagnosed": _iso(getattr(c, "date_diagnosed", None)),
                "status": getattr(c, "status", None),
                "severity": getattr(c, "severity", None),
            })
        return out

    def serialize_allergies(qs):
        out = []
        for a in qs:
            out.append({
                "id": getattr(a, "id", None),
                "allergen": getattr(getattr(a, "allergy", None), "name", getattr(a, "allergen", None)),
                "type": getattr(a, "type", None),
                "severity": getattr(a, "severity", None),
                "reaction": getattr(a, "reaction", None),
            })
        return out

    def serialize_medications(qs):
        out = []
        for m in qs:
            out.append({
                "id": getattr(m, "id", None),
                "medication_name": getattr(getattr(m, "medication", None), "name", getattr(m, "medication_name", None)),
                "dosage": getattr(m, "dosage", None),
                "frequency": getattr(m, "frequency", None),
                "start_date": _iso(getattr(m, "start_date", None)),
                "end_date": _iso(getattr(m, "end_date", None)),
            })
        return out

    def serialize_emergency(qs):
        out = []
        for e in qs:
            out.append({
                "id": getattr(e, "id", None),
                "name": getattr(e, "name", None),
                "phone_number": getattr(e, "phone_number", None),
                "email": getattr(e, "email", None),
                "relationship": getattr(e, "relationship", None),
            })
        return out

    def serialize_files(qs):
        out = []
        for f in qs:
            # file.url might be relative; make absolute if present
            file_url = None
            if getattr(f, "file", None):
                raw = getattr(f.file, "url", None)
                if raw:
                    file_url = request.build_absolute_uri(raw)
            out.append({
                "id": getattr(f, "id", None),
                "file_name": getattr(f, "file_name", getattr(f, "file", None) and getattr(f.file, "name", None)),
                "file_type": getattr(f, "file_type", None),
                "size": getattr(f, "size", None),
                "size_display": getattr(f, "size_display", lambda: None)() if hasattr(f, "size_display") else None,
                "category": getattr(f, "category", None),
                "upload_date": _iso(getattr(f, "upload_date", None)),
                "download_url": file_url,
            })
        return out

    def serialize_family(qs):
        out = []
        for f in qs:
            out.append({
            "id": f.id,
            "condition": f.condition,
            "relationship": f.relationship,
            "age_of_onset": f.age_of_onset,
            "notes": f.notes,
            "created_at": _iso(f.created_at),
        })
        return out

    # Build access metadata
    PERMISSION_MAP = {
    "fiels":      "Medical Records",
    "madactions": "Medications",
    "alergys":    "Allergies",
    "desises":    "Chronic Conditions",
    "family":     "Family History",
    }

    
    perms = [
    label
    for field, label in PERMISSION_MAP.items()
    if getattr(access, field, False)
    ]


    access_data = {
        "pk": access.pk,
        "data_scope": getattr(access, "data_scope", None),
        "granted_at": _iso(getattr(access, "granted_at", None)),
        "revoked_at": _iso(getattr(access, "revoked_at", None)),
        "active": bool(getattr(access, "active", True)),
        "permissions": perms,
    }

    # Only include sections allowed by AccessGrant boolean fields
    payload = {"patient": patient_data, "accessgrant": access_data}

    # map your AccessGrant booleans (note: names appear misspelled in your model)
    if bool(getattr(access, "desises", False)):   # disease/chronics flag
        payload["chronic"] = serialize_chronics(chronics_qs)

    if bool(getattr(access, "alergys", False)):   # allergies flag
        payload["allergies"] = serialize_allergies(allergies_qs)

    if bool(getattr(access, "madactions", False)):  # medications flag
        payload["medications"] = serialize_medications(meds_qs)

    # emergency contacts: included by default (change this if you want a dedicated flag)
    payload["emergency_contacts"] = serialize_emergency(emergency_qs)

    if bool(getattr(access, "fiels", False)):   # files flag
        payload["files"] = serialize_files(files_qs)

    if bool(getattr(access, "family", False)):  # family flag
        payload["family_history"] = serialize_family(family_qs)

    return JsonResponse(payload, encoder=DjangoJSONEncoder, safe=True)

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_POST

@login_required
@require_POST
def upload_profile_picture(request):
    # ensure a file was sent
    file = request.FILES.get('profile_picture')
    if not file:
        return JsonResponse({'success': False, 'error': 'No file uploaded'}, status=400)

    # optional: validate file type & size
    if not file.content_type.startswith('image/'):
        return JsonResponse({'success': False, 'error': 'File must be an image'}, status=400)
    if file.size > 10 * 1024 * 1024:  # 10MB cap
        return JsonResponse({'success': False, 'error': 'File too large'}, status=400)

    # assign and save
    user = request.user
    user.profile_picture.save(file.name, file, save=True)  # uses default storage
    # you may want to do image resizing/cropping here (Pillow) before save

    # return the new URL
    try:
        url = user.profile_picture.url
    except Exception:
        url = ''
    return JsonResponse({'success': True, 'url': url})


from django.contrib.auth.decorators import login_required
from django.contrib.auth import update_session_auth_hash
from django.http import JsonResponse
import json

@login_required
def change_password(request):
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "Invalid request"}, status=400)

    data = json.loads(request.body)
    current = data.get("current")
    newPass = data.get("newPass")

    user = request.user

    # verify current password is correct
    if not user.check_password(current):
        return JsonResponse({"success": False, "message": "Current password is incorrect"}, status=400)

    # optional extra validation (length, security)
    if len(newPass) < 8:
        return JsonResponse({"success": False, "message": "Password must be at least 8 characters"}, status=400)

    # save new password
    user.set_password(newPass)
    user.save()

    # keep user logged in after password change
    update_session_auth_hash(request, user)

    return JsonResponse({"success": True, "message": "Password updated successfully!"})


from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.contrib.auth import logout

@login_required
def delete_account(request):
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "Invalid request"}, status=400)

    user = request.user
    
    logout(request)        # Log user out first
    user.delete()          # Delete account safely

    return JsonResponse({
        "success": True,
        "message": "Account deleted successfully",
        "redirect": "/"     # Redirect to homepage (change if needed)
    })


# views.py
from django.contrib.auth import logout
from django.shortcuts import redirect

def user_logout(request):
    logout(request)
    return redirect('/')  # redirect to homepage or login page


# user/views/alerts.py
from django.shortcuts import get_object_or_404, render
from django.http import JsonResponse, HttpResponseForbidden
from django.views.decorators.http import require_POST, require_GET
from django.contrib.auth.decorators import login_required
from .models import Reminder
from django.utils.dateparse import parse_date, parse_time

# user/views/alerts.py
from django.shortcuts import get_object_or_404, render
from django.http import JsonResponse, HttpResponseNotAllowed
from django.views.decorators.http import require_POST, require_GET
from django.utils.dateparse import parse_date, parse_time
from .models import Reminder

def _json_auth_check(request):
    if not request.user or not request.user.is_authenticated:
        return JsonResponse({'success': False, 'error': 'authentication required'}, status=401)
    return None

@require_GET
def alerts(request):
    # صفحة HTML عادية (تستخدم reminders_json في القالب)
    if not request.user.is_authenticated:
        # Redirect to login for full page (optional) — أو يمكنك إظهار صفحة خطأ
        from django.shortcuts import redirect
        return redirect('login')
    reminders = Reminder.objects.filter(user=request.user).order_by('next_due', 'time')
    reminders_list = [r.to_dict() for r in reminders]
    import json
    reminders_json = json.dumps(reminders_list)
    remainders=Reminder.objects.filter(user=request.user)

    return render(request, 'user/alerts.html', {'reminders_json': reminders_json,'remainders':remainders.count,})

@require_GET
def reminders_list_json(request):
    unauth = _json_auth_check(request)
    if unauth: return unauth
    reminders = Reminder.objects.filter(user=request.user)
    data = [r.to_dict() for r in reminders]
    return JsonResponse({'success': True, 'reminders': data})

@require_POST
def create_reminder(request):
    unauth = _json_auth_check(request)
    if unauth: return unauth

    title = request.POST.get('title', '').strip()
    type_ = request.POST.get('type', 'medication')
    time_str = request.POST.get('time')  # "HH:MM"
    frequency = request.POST.get('frequency', 'daily')
    date_str = request.POST.get('date')  # optional "YYYY-MM-DD"

    if not title:
        return JsonResponse({'success': False, 'error': 'Title required'}, status=400)

    # parse time and date safely
    time_val = None
    date_val = None
    if time_str:
        try:
            time_val = parse_time(time_str)
        except Exception:
            time_val = None
    if date_str:
        try:
            date_val = parse_date(date_str)
        except Exception:
            date_val = None

    reminder = Reminder.objects.create(
        user=request.user,
        title=title,
        type=type_,
        time=time_val,
        frequency=frequency,
        next_due=date_val or None
    )

    return JsonResponse({'success': True, 'reminder': reminder.to_dict()})

@require_POST
def toggle_reminder(request, reminder_id):
    unauth = _json_auth_check(request)
    if unauth: return unauth

    reminder = get_object_or_404(Reminder, pk=reminder_id)
    if reminder.user != request.user:
        return JsonResponse({'success': False, 'error': 'forbidden'}, status=403)

    reminder.enabled = not reminder.enabled
    reminder.save(update_fields=['enabled', 'updated_at'])
    return JsonResponse({'success': True, 'enabled': reminder.enabled, 'reminder': reminder.to_dict()})

@require_POST
def delete_reminder(request, reminder_id):
    unauth = _json_auth_check(request)
    if unauth: return unauth

    reminder = get_object_or_404(Reminder, pk=reminder_id)
    if reminder.user != request.user:
        return JsonResponse({'success': False, 'error': 'forbidden'}, status=403)
    reminder.delete()
    return JsonResponse({'success': True})

@require_POST
def edit_reminder(request, reminder_id):
    unauth = _json_auth_check(request)
    if unauth: return unauth

    reminder = get_object_or_404(Reminder, pk=reminder_id)
    if reminder.user != request.user:
        return JsonResponse({'success': False, 'error': 'forbidden'}, status=403)

    title = request.POST.get('title')
    type_ = request.POST.get('type')
    time_str = request.POST.get('time')
    frequency = request.POST.get('frequency')
    date_str = request.POST.get('date')

    changed = False
    if title is not None:
        reminder.title = title.strip()
        changed = True
    if type_:
        reminder.type = type_
        changed = True
    if frequency:
        reminder.frequency = frequency
        changed = True
    if time_str is not None:
        try:
            reminder.time = parse_time(time_str) if time_str != '' else None
            changed = True
        except Exception:
            pass
    if date_str is not None:
        try:
            reminder.next_due = parse_date(date_str) if date_str != '' else None
            changed = True
        except Exception:
            pass

    if changed:
        reminder.save()
    return JsonResponse({'success': True, 'reminder': reminder.to_dict()})

# user/views.py
import json
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.contrib.auth import get_user_model
from django.views.decorators.csrf import csrf_protect

User = get_user_model()

@require_POST
@csrf_protect
def check_email(request):
    """
    Expects JSON: { "email": "someone@example.com" }
    Returns JSON: { "exists": true } or { "exists": false }
    """
    try:
        payload = json.loads(request.body.decode('utf-8'))
    except (ValueError, TypeError):
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    email = (payload.get('email') or '').strip().lower()
    if not email:
        return JsonResponse({'error': 'Email is required'}, status=400)

    exists = User.objects.filter(email__iexact=email).exists()
    return JsonResponse({'exists': exists})





from django.shortcuts import render
from .models import MedicalFile

def files_reports(request):
    files = MedicalFile.objects.all()

    category = request.GET.get('category')
    file_type = request.GET.get('file_type')

    if category:
        files = files.filter(category=category)
    if file_type:
        files = files.filter(file_type=file_type)

    context = {
        'files': files,
    }
    return render(request, 'user/files_reports.html', context)

from datetime import datetime
import json, os
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_POST
from django.contrib.auth.decorators import login_required
from django.core.files import File

from core.models import Extraction
from user.models import (
    MedicalFile,
    ChronicDisease, UserChronic,
    Allergy, UserAllergy,
    Medication, UserMedication
)


INVALID_VALUES = {"none", "null", "n/a", "unknown", ""}

def clean_str(val):
    if val is None:
        return None
    if isinstance(val, str) and val.strip().lower() in INVALID_VALUES:
        return None
    return val.strip() if isinstance(val, str) else val


from datetime import datetime as dt


def parse_date(val):
    if not val:
        return None
    s = str(val).strip()
    for fmt in ("%m/%d/%Y", "%m-%d-%Y", "%Y-%m-%d"):
        try:
            return dt.strptime(s, fmt).date()
        except ValueError:
            pass
    return None



@login_required
@require_POST
def import_extracted_health_data(request):
    data = json.loads(request.body)
    user = request.user

    extraction_id = data.get("_extraction_id")
    parsed = data.get("parsed")  # ✅ THIS WAS MISSING

    if not extraction_id:
        return JsonResponse({"error": "Missing extraction id"}, status=400)

    if not parsed:
        return JsonResponse({"error": "Missing parsed data"}, status=400)

    extraction = get_object_or_404(Extraction, id=extraction_id)

    # ---------------------------
    # MEDICAL FILE
    # ---------------------------
    if extraction.file and extraction.file.name:
        with extraction.file.open("rb") as f:
            MedicalFile.objects.get_or_create(
                user=user,
                file=File(f, name=os.path.basename(extraction.file.name))
            )

    # ---------------------------
    # CHRONIC CONDITIONS
    # ---------------------------
    for c in parsed.get("chronic_conditions", []):
        name = clean_str(c.get("name"))
        if not name:
            logger.info("Dropped empty chronic condition: %s", c)

            continue  # ✅ drop fake row

        disease, _ = ChronicDisease.objects.get_or_create(name=name)

        UserChronic.objects.get_or_create(
        user=user,
        chronic_disease=disease,
        defaults={
            "status": "resolved" if str(c.get("resolved")).lower() == "true" else "active",
            "date_diagnosed": parse_date(c.get("date_diagnosed")),
            "severity": clean_str(c.get("severity")) or "",
        }
    )


    # ---------------------------
    # ALLERGIES
    # ---------------------------
    for a in parsed.get("allergies", []):
        name = clean_str(a.get("allergy"))
        if not name:
            logger.info("Dropped empty allergy: %s", c)

            continue

        allergy, _ = Allergy.objects.get_or_create(
        name=name,
        defaults={"type": clean_str(a.get("type")) or ""}
        )

        UserAllergy.objects.get_or_create(
        user=user,
        allergy=allergy,
        defaults={
            "severity": clean_str(a.get("severity")) or "",
            "reaction": clean_str(a.get("reaction")) or "",
        }
    )


    # ---------------------------
    # MEDICATIONS
    # ---------------------------
    for m in parsed.get("medications", []):
        name = clean_str(m.get("medication"))
        if not name:
            logger.info("Dropped empty medication: %s", c)

            continue

        medication, _ = Medication.objects.get_or_create(name=name)

        UserMedication.objects.get_or_create(
        user=user,
        medication=medication,
        defaults={
            "dosage": clean_str(m.get("dosage")) or "",
            "frequency": clean_str(m.get("frequency")) or "",
            "start_date": parse_date(m.get("start_date")),
        }
    )


    return JsonResponse({"status": "success"})


import csv
from django.http import HttpResponse
from django.contrib.auth.decorators import login_required
 
@login_required
def export_health_csv(request,access_pk):
    access = get_object_or_404(
        AccessGrant,
        pk=access_pk,
        provider=request.user,
        active=True
    )
    
    user = access.user  # ✅ REAL USER

    response = HttpResponse(
    content_type='text/csv; charset=utf-8'
    )
    response['Content-Disposition'] = 'attachment; filename="health_data.csv"'
    response.write('\ufeff')  # 👈 REQUIRED for Arabic in Excel

    writer = csv.writer(response)


    # ===============================
    # PATIENT INFO
    # ===============================
    writer.writerow(["SECTION", "FIELD", "VALUE"])
    writer.writerow(["Patient", "ID", user.id])
    writer.writerow(["Patient", "Name", f"{user.first_name} {user.last_name}"])
    writer.writerow(["Patient", "Gender", getattr(user, "gender", "")])
    writer.writerow(["Patient", "Blood Type", getattr(user, "blood_type", "")])
    writer.writerow([])

    # ===============================
    # CHRONIC CONDITIONS
    # ===============================

    if bool(getattr(access, "desises", True)):   # disease/chronics flag
        writer.writerow(["Chronic Conditions"])
        writer.writerow(["Disease", "Status", "Date Diagnosed", "Severity"])

        for c in user.userchronic_set.all():
            writer.writerow([
            c.chronic_disease.name,
            c.status,
            c.date_diagnosed,
            c.severity or ""
        ])

        writer.writerow([])

    # ===============================
    # ALLERGIES
    # ===============================
    if bool(getattr(access, "alergys", True)):  
        writer.writerow(["Allergies"])
        writer.writerow(["Allergy", "Type", "Severity", "Reaction"])

        for a in user.userallergy_set.all():
            writer.writerow([
            a.allergy.name,
            a.allergy.type,
            a.severity,
            a.reaction or ""
        ])

        writer.writerow([])

    # ===============================
    # MEDICATIONS
    # ===============================
    if bool(getattr(access, "madactions", True)):  
        writer.writerow(["Medications"])
        writer.writerow(["Medication", "Dosage", "Frequency", "Start Date"])

        for m in user.usermedication_set.all():
            writer.writerow([
            m.medication.name,
            m.dosage,
            m.frequency,
            m.start_date
        ])

        writer.writerow([])

    # ===============================
    # FAMILY HISTORY
    # ===============================
    if bool(getattr(access, "family", True)):  
        writer.writerow(["Family History"])
        writer.writerow(["Condition", "Relationship", "Age of Onset", "Notes"])

        for f in user.family_history.all():
            writer.writerow([
            f.condition,
            f.relationship,
            f.age_of_onset or "",
            f.notes or ""
        ])

        writer.writerow([])

    # ===============================
    # MEDICAL FILES
    # ===============================
    if bool(getattr(access, "fiels", True)):  
        writer.writerow(["Medical Files"])
        writer.writerow(["File Name", "Type", "Category", "Size", "Uploaded"])

        for file in user.medical_files.all():
            writer.writerow([
            file.file_name,
            file.file_type,
            file.category,
            file.size_display(),
            file.upload_date.strftime("%Y-%m-%d")
        ])

    return response



# user/views.py (imports at top)
import uuid
import secrets
import datetime
import hmac
import hashlib
from django.conf import settings
from django.core.cache import cache
from django.core.mail import send_mail, EmailMultiAlternatives
from django.http import JsonResponse, HttpResponseBadRequest
from django.shortcuts import render, redirect
from django.utils import timezone
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt  # remove for production HTML forms
from django.contrib.auth import get_user_model, authenticate, login
from .models import EmailOTP

UserModel = get_user_model()

# Configurable constants
OTP_LENGTH = 6
OTP_TTL_SECONDS = 10 * 60  # 10 minutes
OTP_RESEND_COOLDOWN = 60  # 60 sec between requests per email
OTP_HOURLY_LIMIT = 6      # maximum OTP emails per hour per email

def _generate_numeric_otp(length=6):
    # cryptographically secure numeric OTP
    range_start = 10**(length-1)
    range_end = (10**length)-1
    return str(secrets.randbelow(range_end - range_start + 1) + range_start)

def _can_send_otp(email):
    # cooldown
    cooldown_key = f"otp:cooldown:{email}"
    if cache.get(cooldown_key):
        return False, "Please wait before requesting another code."
    # hourly cap
    hourly_key = f"otp:hourly:{email}"
    count = cache.get(hourly_key) or 0
    if count >= OTP_HOURLY_LIMIT:
        return False, "Too many OTP requests. Try again later."
    return True, None

def _note_send(email):
    cooldown_key = f"otp:cooldown:{email}"
    hourly_key = f"otp:hourly:{email}"
    cache.set(cooldown_key, True, OTP_RESEND_COOLDOWN)
    cache.incr(hourly_key) if cache.get(hourly_key) else cache.set(hourly_key, 1, 3600)

@require_POST
def send_email_otp(request):
    """
    Accepts JSON { "email": "..." } or form POST.
    Rate-limited.
    """
    data = request.POST if request.POST else {}
    if request.content_type == 'application/json':
        import json
        try:
            data = json.loads(request.body.decode('utf-8'))
        except Exception:
            return JsonResponse({"success": False, "message": "Invalid JSON"}, status=400)

    email = (data.get('email') or '').strip().lower()
    if not email:
        return JsonResponse({"success": False, "message": "Email required"}, status=400)

    can_send, reason = _can_send_otp(email)
    if not can_send:
        return JsonResponse({"success": False, "message": reason}, status=429)

    otp = _generate_numeric_otp(OTP_LENGTH)
    otp_hash = EmailOTP.make_otp_hash(otp)
    expires_at = timezone.now() + datetime.timedelta(seconds=OTP_TTL_SECONDS)

    otp_record = EmailOTP.objects.create(
        email=email,
        otp_hash=otp_hash,
        expires_at=expires_at
    )

    # send email (simple plaintext; you can add HTML)
    subject = "Your verification code"
    body = f"Your MediTrack verification code is: {otp}\n\nIt expires in 10 minutes.\n\nIf you didn't request this, ignore this email."
    from_email = settings.DEFAULT_FROM_EMAIL
    try:
        send_mail(subject, body, from_email, [email], fail_silently=False)
    except Exception as e:
        # On failure, delete the OTP record and return error
        otp_record.delete()
        return JsonResponse({"success": False, "message": "Failed to send email"}, status=500)

    _note_send(email)

    return JsonResponse({
        "success": True,
        "message": "OTP sent",
        "otp_uuid": str(otp_record.id),
        "expires_at": otp_record.expires_at.isoformat()
    }, status=200)


@require_POST
def verify_email_otp(request):
    """
    Accepts JSON/form:
      - { "email": "...", "code": "123456" }
      OR
      - { "otp_uuid": "...", "code": "123456" }
    If valid, mark OTP used and set user.is_email_verified=True (if user exists).
    Returns redirect_url on success.
    """
    data = request.POST if request.POST else {}
    if request.content_type == 'application/json':
        import json
        try:
            data = json.loads(request.body.decode('utf-8'))
        except Exception:
            return JsonResponse({"success": False, "message": "Invalid JSON"}, status=400)

    code = (data.get('code') or '').strip()
    email = (data.get('email') or '').strip().lower()
    otp_uuid = data.get('otp_uuid') or data.get('otpId')

    if not code:
        return JsonResponse({"success": False, "message": "Code required"}, status=400)

    qs = EmailOTP.objects.filter(is_used=False)
    if otp_uuid:
        qs = qs.filter(id=otp_uuid)
    elif email:
        qs = qs.filter(email__iexact=email)
    else:
        return JsonResponse({"success": False, "message": "Provide email or otp_uuid"}, status=400)

    # pick the most-recent matching OTP (single-use)
    otp_obj = qs.order_by('-created_at').first()
    if not otp_obj:
        return JsonResponse({"success": False, "message": "No OTP found or already used"}, status=404)

    if otp_obj.is_expired():
        return JsonResponse({"success": False, "message": "Code expired"}, status=400)

    if not otp_obj.check_otp(code):
        return JsonResponse({"success": False, "message": "Invalid code"}, status=400)

    # valid -> mark used
    otp_obj.mark_used()

    # if a user exists for this email, mark verified
    try:
        user = UserModel.objects.filter(email__iexact=otp_obj.email).first()
        if user:
            # set flag and save
            user.is_email_verified = True
            user.save(update_fields=['is_email_verified'])
    except Exception:
        # swallow user save errors (but OTP is used now)
        pass

    # on success prefer redirecting to login by default
    redirect_url = data.get('redirect_to') or '/login/'

    return JsonResponse({"success": True, "message": "Verified", "redirect": redirect_url}, status=200)


def enter_otp_page(request):
    """
    Renders templates/user/enter_otp.html
    Accepts ?email=... or ?token=...
    """
    email = request.GET.get('email', '')
    token = request.GET.get('token', '')
    # mask email for UX
    def mask_email(e):
        if not e or '@' not in e: return ''
        name, domain = e.split('@', 1)
        masked_name = name[:1] + '*'*(max(0, len(name)-2)) + (name[-1] if len(name)>1 else '')
        return f"{masked_name}@{domain}"

    masked = mask_email(email)
    return render(request, 'user/enter_otp.html', {'email': email, 'masked_email': masked, 'token': token})
