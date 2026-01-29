from django.db import models
from django.db import models
from django.conf import settings
from django.utils import timezone
from crum import get_current_user
from django.apps import apps

from django.db import transaction
from django.utils import timezone
class AuditMixin(models.Model):
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

def save(self, *args, user=None, **kwargs):
        """
        Save the instance and create an ActivityLog entry.
        - If `user` not provided, try crum.get_current_user()
        - Use apps.get_model to avoid circular import problems
        """
        is_create = self.pk is None
        # determine user
        user = user or get_current_user() or None

        super().save(*args, **kwargs)  # save first so self.pk exists

        # safe import to avoid circular problems
        ActivityLog = apps.get_model('user', 'ActivityLog')  # <<-- replace your_app_name

        try:
            ActivityLog.objects.create(
                user=user if user and getattr(user, 'is_authenticated', True) else None,
                action="created" if is_create else "updated",
                model_name=self.__class__.__name__,
                object_id=str(self.pk),
                details=str(self),
            )
        except Exception:
            # don't crash the save if logging fails
            pass


from django.db import models, transaction
from django.conf import settings
from django.utils import timezone


class SharingRequest(AuditMixin):
    # -------- Statuses --------
    STATUS_PENDING  = "pending"
    STATUS_ACCEPTED = "accepted"
    STATUS_REJECTED = "rejected"
    STATUS_REVOKED  = "revoked"   # ✅ NEW

    STATUS_CHOICES = [
        (STATUS_PENDING,  "Pending"),
        (STATUS_ACCEPTED, "Accepted"),
        (STATUS_REJECTED, "Rejected"),
        (STATUS_REVOKED,  "Revoked"),   # ✅ NEW
    ]

    # -------- Data scope --------
    DATA_FULL = "full"
    DATA_CHOICES = [
        (DATA_FULL, "Full"),
    ]

    # -------- Fields --------
    reactivates_hidden = models.BooleanField(default=False)

    from_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="sharing_requests_sent",
        on_delete=models.CASCADE
    )
    to_provider = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="sharing_requests_received",
        on_delete=models.CASCADE
    )

    data_scope = models.CharField(max_length=32, choices=DATA_CHOICES, default=DATA_FULL)
    message = models.TextField(blank=True, null=True)

    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(blank=True, null=True)

    # permission flags carried in request (and copied to grant on accept)
    madactions = models.BooleanField(default=True)
    alergys    = models.BooleanField(default=True)
    fiels      = models.BooleanField(default=True)
    family     = models.BooleanField(default=True)
    desises    = models.BooleanField(default=True)

    class Meta:
        # ✅ Allow history rows (accepted/rejected/revoked) without blocking new ones
        # ✅ Only block duplicate *pending* requests per (from_user, to_provider, scope)
        constraints = [
            models.UniqueConstraint(
                fields=["from_user", "to_provider", "data_scope"],
                condition=models.Q(status="pending"),
                name="uniq_pending_request_per_scope"
            )
        ]

    def accept(self, accepted_by=None):
        """
        Mark accepted and create OR reactivate AccessGrant.
        Returns: (grant, reactivated_bool) OR (None, False) if not pending.
        """
        if self.status != self.STATUS_PENDING:
            return (None, False)

        from user.models import AccessGrant  # adjust import path if needed

        with transaction.atomic():
            grant = AccessGrant.objects.select_for_update().filter(
                user=self.from_user,
                provider=self.to_provider,
                data_scope=self.data_scope
            ).first()

            reactivated = False

            if grant:
                if not grant.active:
                    reactivated = True

                grant.active = True
                grant.revoked_at = None
                grant.granted_at = timezone.now()
                grant.granted_by = (accepted_by or self.to_provider)

                # copy permissions from request
                grant.madactions = self.madactions
                grant.alergys = self.alergys
                grant.fiels = self.fiels
                grant.family = self.family
                grant.desises = self.desises

                grant.save(update_fields=[
                    "active", "revoked_at", "granted_at", "granted_by",
                    "madactions", "alergys", "fiels", "family", "desises"
                ])
            else:
                grant = AccessGrant.objects.create(
                    user=self.from_user,
                    provider=self.to_provider,
                    granted_by=(accepted_by or self.to_provider),
                    data_scope=self.data_scope,
                    active=True,
                    madactions=self.madactions,
                    alergys=self.alergys,
                    fiels=self.fiels,
                    family=self.family,
                    desises=self.desises,
                )

            self.status = self.STATUS_ACCEPTED
            self.responded_at = timezone.now()
            self.reactivates_hidden = bool(reactivated)

            self.save(update_fields=["status", "responded_at", "reactivates_hidden"])

        return (grant, reactivated)

    def reject(self, rejected_by=None):
        if self.status != self.STATUS_PENDING:
            return False
        self.status = self.STATUS_REJECTED
        self.responded_at = timezone.now()
        self.save(update_fields=["status", "responded_at"])
        return True

    def mark_revoked(self, message=None):
        """
        Optional helper: log a revoked event as a new SharingRequest row.
        Useful when provider clicks "Remove Patient".
        """
        return SharingRequest.objects.create(
            from_user=self.from_user,
            to_provider=self.to_provider,
            data_scope=self.data_scope,
            message=message or "Access was revoked by the provider.",
            status=self.STATUS_REVOKED,
            responded_at=timezone.now(),
            reactivates_hidden=False,
            madactions=self.madactions,
            alergys=self.alergys,
            fiels=self.fiels,
            family=self.family,
            desises=self.desises,
        )

class AccessGrant(AuditMixin):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="access_grants", on_delete=models.CASCADE)
    provider = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="granted_accesses", on_delete=models.CASCADE)
    data_scope = models.CharField(max_length=32, default=SharingRequest.DATA_FULL)
    granted_at = models.DateTimeField(auto_now_add=True)
    granted_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, related_name='grants_made', on_delete=models.SET_NULL)
    active = models.BooleanField(default=True)
    revoked_at = models.DateTimeField(blank=True, null=True)
    madactions = models.BooleanField(default=True)
    alergys = models.BooleanField(default=True)
    fiels = models.BooleanField(default=True)
    family = models.BooleanField(default=True)
    desises = models.BooleanField(default=True)
    class Meta:
        unique_together = ('user', 'provider', 'data_scope')

    def revoke(self, revoked_by=None):
        if not self.active:
            return False
        self.active = False
        self.revoked_at = timezone.now()
        self.save()
        # هنا يمكنك أيضاً تسجيل في AccessLog إن أردت
        return True

    def is_active(self):
        return self.active
   
class Address(AuditMixin):
    street_address = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    zip_code = models.CharField(max_length=20, blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True)

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models

import uuid
import hmac
import hashlib
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.contrib.auth import get_user_model


class EmailOTP(models.Model):
    """
    Stores a single-use OTP for an email or a user (OTP is hashed).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(db_index=True)  # keep email even if user not created
    otp_hash = models.CharField(max_length=128)  # HMAC-SHA256 hex
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    class Meta:
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['created_at']),
        ]

    def is_expired(self):
        return timezone.now() >= self.expires_at

    @staticmethod
    def make_otp_hash(otp: str) -> str:
        """
        HMAC-SHA256 using Django SECRET_KEY as key (server-side only).
        """
        key = settings.SECRET_KEY.encode('utf-8')
        hm = hmac.new(key, otp.encode('utf-8'), hashlib.sha256)
        return hm.hexdigest()

    def check_otp(self, candidate_otp: str) -> bool:
        candidate_hash = self.make_otp_hash(candidate_otp)
        return hmac.compare_digest(candidate_hash, self.otp_hash)

    def mark_used(self):
        self.is_used = True
        self.save(update_fields=['is_used'])

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Users must have an email address")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(email, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin):
    BLOOD_TYPES = [
        ('O+', 'O+'),
        ('O-', 'O-'),
        ('A+', 'A+'),
        ('A-', 'A-'),
        ('B+', 'B+'),
        ('B-', 'B-'),
        ('AB+', 'AB+'),
        ('AB-', 'AB-'),
    ]
    is_email_verified = models.BooleanField(default=False)
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=30)
    last_name = models.CharField(max_length=30)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=10, choices=[('male','Male'),('female','Female'),('other','Other')], null=True, blank=True)
    phone_number = models.CharField(max_length=20, null=True, blank=True)
    address = models.OneToOneField(Address, on_delete=models.SET_NULL, null=True, blank=True)
    emergency_contact = models.CharField(max_length=100, null=True, blank=True)
    medical_conditions = models.TextField(null=True, blank=True)
    profile_picture = models.ImageField(upload_to='profile_pics/', null=True, blank=True)
    blood_type = models.CharField(max_length=5, choices=BLOOD_TYPES, blank=True, null=True)

    # inside your custom User model
    provider_role = models.CharField(max_length=100, blank=True, null=True)
    provider_specialty = models.CharField(max_length=100, blank=True, null=True)
    provider_contact_info = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True,null=True)

    # Permissions
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_doctor = models.BooleanField(default=False)

    # Authentication
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    objects = UserManager()
    
    def send_sharing_request(self, to_provider, message=None, data_scope=SharingRequest.DATA_FULL):
        if not to_provider.is_doctor:
            raise ValueError("Target user is not a doctor (care provider).")

        # تحقق من وجود طلب سابق قيد الانتظار أو إذن
        existing = SharingRequest.objects.filter(from_user=self, to_provider=to_provider, data_scope=data_scope).first()
        if existing:
            if existing.status == SharingRequest.STATUS_PENDING:
                return existing
            if existing.status == SharingRequest.STATUS_ACCEPTED:
                # already accepted: ensure AccessGrant exists
                AccessGrant.objects.get_or_create(user=self, provider=to_provider, data_scope=data_scope, defaults={'granted_by': to_provider, 'active': True})
                return existing
        req = SharingRequest.objects.create(from_user=self, to_provider=to_provider, message=message, data_scope=data_scope)
        # هنا يمكنك استدعاء وظيفة لإرسال إشعار/بريد لمقدم الرعاية
        return req


    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.email})"
  
class EmergencyContact(AuditMixin):
    user = models.ForeignKey(User, related_name='emergency_contacts', on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=20)
    email = models.EmailField(blank=True, null=True)
    relationship = models.CharField(max_length=50)

    def __str__(self):
        return f"{self.name} - {self.phone_number}"

# models.py
from django.db import models
from django.conf import settings

# app/models.py
from django.db import models

class Medication(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name

class UserMedication(AuditMixin):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    medication = models.ForeignKey(Medication, on_delete=models.CASCADE)
    dosage = models.CharField(max_length=50)
    frequency = models.CharField(max_length=50)
    start_date = models.DateField(null=True, blank=True)  # make optional for ease

    def __str__(self):
        return f"{self.user} — {self.medication} ({self.dosage})"
  
class Allergy(models.Model):
    name = models.CharField(max_length=100)
    type = models.CharField(max_length=50)

class UserAllergy(AuditMixin):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    allergy = models.ForeignKey(Allergy, on_delete=models.CASCADE)
    severity = models.CharField(max_length=50)
    reaction = models.CharField(max_length=255, blank=True, null=True)   # <-- add this

class ChronicDisease(models.Model):
    name = models.CharField(max_length=100)

# models.py (update)
class UserChronic(AuditMixin):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    chronic_disease = models.ForeignKey(ChronicDisease, on_delete=models.CASCADE)
    status = models.CharField(max_length=50)
    date_diagnosed = models.DateField(null=True, blank=True)
    severity = models.CharField(max_length=50, null=True, blank=True)
    
    def __str__(self):
        return f"{self.id} - {self.chronic_disease}"
   # <-- new
 
# app/models.py (تعديل MedicalFile)

import os
from io import BytesIO
from PIL import Image

from django.db import models
from django.conf import settings
from django.core.files.base import ContentFile
from django.utils import timezone


def medical_file_upload_to(instance, filename):
    return f"medical_files/user_{instance.user.id}/{timezone.now().strftime('%Y/%m')}/{filename}"


class MedicalFile(AuditMixin):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='medical_files'
    )
    file = models.FileField(upload_to=medical_file_upload_to)
    file_name = models.CharField(max_length=255, blank=True)
    file_type = models.CharField(max_length=50, blank=True)
    size = models.BigIntegerField(null=True, blank=True)
    category = models.CharField(max_length=50, default='Document')
    upload_date = models.DateTimeField(auto_now_add=True)

    # 🔹 Thumbnail only for images
    thumbnail = models.ImageField(
        upload_to='medical_files/thumbnails/',
        blank=True,
        null=True
    )

    class Meta:
        ordering = ['-upload_date']

    def __str__(self):
        return f"{self.file_name or self.file.name} ({self.user})"

    def save(self, *args, **kwargs):
        is_new = self.pk is None

        if self.file:
            # ---------- File name ----------
            if not self.file_name:
                self.file_name = os.path.basename(self.file.name)

            # ---------- Size ----------
            try:
                self.size = self.file.size
            except Exception:
                self.size = None

            # ---------- Type & category ----------
            ext = (self.file_name.split('.')[-1] or '').lower()

            if ext in ['jpg', 'jpeg', 'png', 'gif', 'webp']:
                self.file_type = 'image'
                self.category = 'Imaging'
            elif ext == 'pdf':
                self.file_type = 'pdf'
                self.category = 'Document'
            elif ext == 'zip':
                self.file_type = 'zip'
                self.category = 'Imaging'
            elif ext in ['dcm', 'dicom']:
                self.file_type = 'dicom'
                self.category = 'Imaging'
            elif ext in ['doc', 'docx', 'txt']:
                self.file_type = 'document'
                self.category = 'Document'
            else:
                self.file_type = ext or 'other'
                self.category = 'Other'

        super().save(*args, **kwargs)

        # ---------- 🔥 Image thumbnail generation ----------
        if (
            self.file_type == 'image'
            and self.file
            and not self.thumbnail
        ):
            try:
                img = Image.open(self.file)
                img = img.convert('RGB')
                img.thumbnail((300, 300))

                thumb_io = BytesIO()
                img.save(thumb_io, format='JPEG', quality=85)

                thumb_name = f"thumb_{os.path.basename(self.file.name)}"
                self.thumbnail.save(
                    thumb_name,
                    ContentFile(thumb_io.getvalue()),
                    save=False
                )

                super().save(update_fields=['thumbnail'])

            except Exception:
                # Never crash uploads
                pass

        from pdf2image import convert_from_path


    # ---- PDF thumbnail (optional & safe) ----
        if self.file_type == 'pdf' and not self.thumbnail:
            try:
                pages = convert_from_path(
                self.file.path,
                dpi=150,
                poppler_path=getattr(settings, "POPPLER_PATH", None)
            )

                if pages:
                    img = pages[0]
                    img.thumbnail((300, 300))

                    thumb_io = BytesIO()
                    img.save(thumb_io, format='JPEG')

                    thumb_name = f"thumb_{os.path.basename(self.file.name)}.jpg"
                    self.thumbnail.save(
                    thumb_name,
                    ContentFile(thumb_io.getvalue()),
                    save=False
                )

                super().save(update_fields=['thumbnail'])

            except Exception as e:
                print("PDF thumbnail generation failed:", e)


    def size_display(self):
        b = self.size or 0
        if b == 0:
            return "0 Bytes"
        k = 1024.0
        sizes = ['Bytes', 'KB', 'MB', 'GB']
        i = int(__import__('math').floor(__import__('math').log(b, k)))
        return f"{(b / (k ** i)):.1f} {sizes[i]}"

class MedicalReport(AuditMixin):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    report_type = models.CharField(max_length=50)
    report_date = models.DateField()
    summary = models.TextField()



    
# models.py
from django.db import models
from django.conf import settings

class FamilyHistory(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='family_history')
    condition = models.CharField(max_length=200,null=True)
    relationship = models.CharField(max_length=50,null=True)
    age_of_onset = models.IntegerField(blank=True, null=True)
    notes = models.TextField(blank=True,null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.condition} - {self.relationship}"
    

from django.conf import settings
from django.utils import timezone

 
class VitalSign(AuditMixin):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    blood_pressure = models.CharField(max_length=20, blank=True, null=True)
    heart_rate = models.PositiveIntegerField(blank=True, null=True)
    weight = models.CharField(blank=True, null=True)
    blood_sugar = models.FloatField(blank=True, null=True)
    recorded_at = models.DateTimeField(default=timezone.now)
    def __str__(self):
        return f"{self.user.first_name} - {self.recorded_at.date()} - {self.heart_rate} - {self.blood_pressure} - {self.weight} - {self.blood_sugar}"
# models.py


# user/models.py
from django.db import models
from django.conf import settings
from django.utils import timezone

class Reminder(AuditMixin):
    TYPE_CHOICES = [
        ('medication', 'Medication'),
        ('monitoring', 'Health Monitoring'),
        ('appointment', 'Appointment'),
    ]

    FREQUENCY_CHOICES = [
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('once', 'One-time'),
    ]

    COLOR_MAP = {
        'medication': 'green',
        'monitoring': 'blue',
        'appointment': 'purple',
    }

    ICON_MAP = {
        'medication': 'pill',
        'monitoring': 'heart',
        'appointment': 'calendar',
    }

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reminders')
    title = models.CharField(max_length=255)
    type = models.CharField(max_length=32, choices=TYPE_CHOICES, default='medication')
    time = models.TimeField(null=True, blank=True)  # stored as time; JS expects "HH:MM"
    frequency = models.CharField(max_length=16, choices=FREQUENCY_CHOICES, default='daily')
    enabled = models.BooleanField(default=True)
    next_due = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['next_due', 'time', 'title']

    def get_icon(self):
        return self.ICON_MAP.get(self.type, 'pill')

    def get_color(self):
        return self.COLOR_MAP.get(self.type, 'green')

    def frequency_display(self):
        return dict(self.FREQUENCY_CHOICES).get(self.frequency, self.frequency)

    def type_display(self):
        return dict(self.TYPE_CHOICES).get(self.type, self.type)

    def time_str(self):
        if not self.time:
            return ''
        return self.time.strftime("%H:%M")  # JS can parse "HH:MM"

    def next_due_iso(self):
        if not self.next_due:
            return ''
        return self.next_due.isoformat()  # "YYYY-MM-DD"

    def to_dict(self):
        # return shape expected by the frontend JS (includes both snake and camel variants)
        return {
            'id': self.id,
            'title': self.title,
            'type': self.type,
            'type_display': self.type_display(),
            'time': self.time_str(),
            'frequency': self.frequency,
            'frequency_display': self.frequency_display(),
            'enabled': self.enabled,
            'next_due': self.next_due_iso(),    # used in many places in the JS
            'nextDue': self.next_due_iso(),     # some older snippets checked nextDue
            'icon': self.get_icon(),
            'color': self.get_color(),
        }

    def __str__(self):
        return f"{self.title} ({self.user})"


    
class ActivityLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=255)  # "added medication", "deleted family member", etc
    model_name = models.CharField(max_length=100, blank=True)
    object_id = models.CharField(max_length=100, blank=True)
    details = models.TextField(blank=True, null=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.created_at} - {self.user} - {self.action}"
  