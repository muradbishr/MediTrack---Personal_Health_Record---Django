from django import forms

from django import forms
from django.contrib.auth import get_user_model
User = get_user_model()

class UserSignupForm(forms.ModelForm):
    password = forms.CharField(
        widget=forms.PasswordInput(attrs={
            'id':'password',
            'class': 'form-input',
            'placeholder': '••••••••',
            'required': True
        })
    )

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email', 'password']
        widgets = {
            'first_name': forms.TextInput(attrs={
                'class': 'form-input', 'placeholder': 'First name'
            }),
            'last_name': forms.TextInput(attrs={
                'class': 'form-input', 'placeholder': 'Last name'
            }),
            'email': forms.EmailInput(attrs={
                'class': 'form-input', 'placeholder': 'Email address'
            }),
        }
    
    def clean_email(self):
        email = self.cleaned_data['email'].strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise ValidationError("An account with this email already exists.")
        return email

# forms.py
from django import forms

# forms.py
from django import forms

from django import forms
from django.core.exceptions import ValidationError
from .models import FamilyHistory


RELATIONSHIP_CHOICES = [
    ('mother', 'Mother'),
    ('father', 'Father'),
    ('brother', 'Brother'),
    ('sister', 'Sister'),
    ('grandmother', 'Grandmother'),
    ('grandfather', 'Grandfather'),
    ('other', 'Other'),
]


class FamilyHistoryForm(forms.ModelForm):

    condition = forms.CharField(
        max_length=255,
        label="Condition",
        widget=forms.TextInput(attrs={
            'class': 'form-input',
            'placeholder': 'e.g., Heart Disease'
        })
    )

    relationship = forms.ChoiceField(
        choices=RELATIONSHIP_CHOICES,
        label="Relationship",
        widget=forms.Select(attrs={'class': 'form-select'})
    )

    age_of_onset = forms.IntegerField(
        required=False,
        min_value=0,
        max_value=120,
        label="Age of Onset",
        widget=forms.NumberInput(attrs={
            'class': 'form-input',
            'placeholder': 'e.g., 55'
        })
    )

    notes = forms.CharField(
        max_length=500,
        required=False,
        label="Notes",
        widget=forms.TextInput(attrs={
            'class': 'form-input',
            'placeholder': 'Additional details...'
        })
    )

    class Meta:
        model = FamilyHistory
        fields = ['condition', 'relationship', 'age_of_onset', 'notes']

    def __init__(self, *args, **kwargs):
        user = kwargs.pop('user', None)  # pass user for new entries
        super().__init__(*args, **kwargs)

        self.user = user

        # Auto-fill for edit mode (ModelForm already does most of this)
        if self.instance and self.instance.pk:
            self.fields['condition'].initial = self.instance.condition
            self.fields['relationship'].initial = self.instance.relationship
            self.fields['age_of_onset'].initial = self.instance.age_of_onset
            self.fields['notes'].initial = self.instance.notes

    def clean_condition(self):
        condition = self.cleaned_data.get('condition', '').strip()
        if not condition:
            raise ValidationError("Condition name is required.")
        return condition

    def save(self, user=None, commit=True):
        instance = super().save(commit=False)

        # set the user ONLY if creating
        if user is not None:
            instance.user = user

        if commit:
            instance.save()

        return instance

  

from .models import VitalSign

class HealthTrendForm(forms.ModelForm):
    class Meta:
        model = VitalSign
        fields = ['blood_pressure', 'heart_rate', 'weight', 'blood_sugar']
        widgets = {
            'blood_pressure': forms.TextInput(attrs={'class':'form-input', 'placeholder':'eg. 120/80'}),
            'heart_rate': forms.NumberInput(attrs={'class':'form-input', 'placeholder':'eg. 72'}),
            'weight': forms.TextInput(attrs={'class':'form-input', 'placeholder':'eg. 75.2/172'}),
            'blood_sugar': forms.NumberInput(attrs={'class':'form-input', 'placeholder':'eg. 95'}),
        }


# user/forms.py
from django import forms
from .models import UserChronic, ChronicDisease

STATUS_CHOICES = [
    ('active', 'Active'),
    ('controlled', 'Controlled'),
    ('resolved', 'Resolved'),
]

SEVERITY_CHOICES = [
    ('mild', 'Mild'),
    ('moderate', 'Moderate'),
    ('severe', 'Severe'),
]

from django import forms
# user/forms.py
from django import forms
from django.core.exceptions import ValidationError
from .models import (
    UserMedication, Medication,
    UserAllergy, Allergy,
    UserChronic, ChronicDisease,
)

# Default choices (يمكنك استبدالها بالقيم الموجودة في models إن وُجدت هناك)
ALLERGY_TYPE_CHOICES = [
    ('drug', 'Drug'),
    ('food', 'Food'),
    ('environmental', 'Environmental'),
    ('other', 'Other'),
]

STATUS_CHOICES = [
    ('active', 'Active'),
    ('controlled', 'Controlled'),
    ('resolved', 'Resolved'),
]

SEVERITY_CHOICES = [
    ('mild', 'Mild'),
    ('moderate', 'Moderate'),
    ('severe', 'Severe'),
]


class UserMedicationForm(forms.ModelForm):
    medication_name = forms.CharField(
        max_length=100,
        label="Medication Name",
        widget=forms.TextInput(attrs={
            "class": "form-input",
            "placeholder": "e.g., Metformin",
            "required": True
        }),
    )
    dosage = forms.CharField(
        max_length=50,
        label="Dosage",
        widget=forms.TextInput(attrs={"class": "form-input", "placeholder": "e.g., 500 mg"})
    )
    frequency = forms.CharField(
        max_length=50,
        label="Frequency",
        widget=forms.TextInput(attrs={"class": "form-input", "placeholder": "e.g., Once daily"})
    )
    start_date = forms.DateField(
        required=False,
        label="Start date",
        widget=forms.DateInput(attrs={"class": "form-input", "type": "date"})
    )

    class Meta:
        model = UserMedication
        fields = ['medication_name', 'dosage', 'frequency', 'start_date']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # إذا كان لدينا instance مرتبط بـ medication نُملأ الحقل
        if self.instance and getattr(self.instance, 'medication', None):
            self.fields['medication_name'].initial = self.instance.medication.name

    def clean_medication_name(self):
        name = self.cleaned_data.get('medication_name', '').strip()
        if not name:
            raise ValidationError("Medication name is required.")
        return name

    def save(self, user=None, commit=True):
        med_name = self.cleaned_data.get('medication_name', '').strip()
        med = Medication.objects.filter(name__iexact=med_name).first()
        if not med:
            med = Medication.objects.create(name=med_name)
        instance = super().save(commit=False)
        instance.medication = med
        if user is not None:
            instance.user = user
        if commit:
            instance.save()
        return instance


class UserAllergyForm(forms.ModelForm):
    name = forms.CharField(
        max_length=100,
        label="Allergen",
        widget=forms.TextInput(attrs={"class": "form-input", "placeholder": "e.g., Penicillin", "required": True})
    )
    type = forms.ChoiceField(
        choices=ALLERGY_TYPE_CHOICES,
        label="Type",
        widget=forms.Select(attrs={"class": "form-select", "required": True})
    )
    severity = forms.ChoiceField(
        choices=SEVERITY_CHOICES,
        label="Severity",
        required=False,
        widget=forms.Select(attrs={"class": "form-select"})
    )
    reaction = forms.CharField(
        max_length=255,
        label="Reaction",
        required=False,
        widget=forms.TextInput(attrs={"class": "form-input", "placeholder": "e.g., Hives, Swelling"})
    )

    class Meta:
        model = UserAllergy
        fields = ['name', 'type', 'severity', 'reaction']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance and getattr(self.instance, 'allergy', None):
            self.fields['name'].initial = self.instance.allergy.name
            # إذا كان نموذج Allergy يملك حقل type
            try:
                self.fields['type'].initial = self.instance.allergy.type
            except Exception:
                pass
            self.fields['severity'].initial = getattr(self.instance, 'severity', '')
            self.fields['reaction'].initial = getattr(self.instance, 'reaction', '')

    def clean_name(self):
        name = self.cleaned_data.get('name', '').strip()
        if not name:
            raise ValidationError("Allergen name is required.")
        return name

    def save(self, user=None, commit=True):
        name = self.cleaned_data.get('name', '').strip()
        allergy_type = self.cleaned_data.get('type')
        allergy = Allergy.objects.filter(name__iexact=name).first()
        if not allergy:
            allergy = Allergy.objects.create(name=name, type=allergy_type)
        instance = super().save(commit=False)
        instance.allergy = allergy
        if user is not None:
            instance.user = user
        if commit:
            instance.save()
        return instance


class UserChronicForm(forms.ModelForm):
    disease_name = forms.CharField(
        max_length=100,
        label="Disease Name",
        widget=forms.TextInput(attrs={
            'class': 'form-input',
            'placeholder': 'e.g., Type 2 Diabetes',
            'required': True
        })
    )
    date_diagnosed = forms.DateField(
        required=False,
        label="Date Diagnosed",
        widget=forms.DateInput(attrs={'class': 'form-input', 'type': 'date'})
    )
    status = forms.ChoiceField(
        choices=STATUS_CHOICES,
        label="Status",
        widget=forms.Select(attrs={'class': 'form-select'})
    )
    severity = forms.ChoiceField(
        choices=SEVERITY_CHOICES,
        label="Severity",
        required=False,
        widget=forms.Select(attrs={'class': 'form-select'})
    )

    class Meta:
        model = UserChronic
        fields = ['disease_name', 'date_diagnosed', 'status', 'severity']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # ملء الحقول من instance إذا كنا نحرّر
        if self.instance and getattr(self.instance, 'chronic_disease', None):
            self.fields['disease_name'].initial = self.instance.chronic_disease.name
            self.fields['date_diagnosed'].initial = getattr(self.instance, 'date_diagnosed', None)
            self.fields['status'].initial = getattr(self.instance, 'status', '')
            self.fields['severity'].initial = getattr(self.instance, 'severity', '')

    def clean_disease_name(self):
        name = self.cleaned_data.get('disease_name', '').strip()
        if not name:
            raise ValidationError("Disease name is required.")
        return name

    def save(self, user=None, commit=True):
        disease_name = self.cleaned_data.get('disease_name', '').strip()
        chronic = ChronicDisease.objects.filter(name__iexact=disease_name).first()
        if not chronic:
            chronic = ChronicDisease.objects.create(name=disease_name)
        instance = super().save(commit=False)
        instance.chronic_disease = chronic
        if user is not None:
            instance.user = user
        if commit:
            instance.save()
        return instance

 
from django import forms

 


from django import forms
from .models import User

class ProPersonalFileForm(forms.ModelForm):
    GENDER_CHOICES = [
        ('male', 'Male'),
        ('female', 'Female'),
    ]

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

    # NOTE: field name must match model field names (phone_number instead of phone)
    first_name = forms.CharField(
        max_length=100,
        label="First Name",
        widget=forms.TextInput(attrs={'class': 'form-input'})
    )
    last_name = forms.CharField(
        max_length=100,
        label="Last Name",
        widget=forms.TextInput(attrs={'class': 'form-input'})
    )
    email = forms.EmailField(
        label="Email",
        widget=forms.EmailInput(attrs={'class': 'form-input'})
    )
    phone_number = forms.CharField(               # <-- model field name
        max_length=20,
        required=False,
        label="Phone",
        widget=forms.TextInput(attrs={'class': 'form-input'})
    )
    date_of_birth = forms.DateField(
        required=False,
        label="Date of Birth",
        widget=forms.DateInput(attrs={'class': 'form-input', 'type': 'date'})
    )
    gender = forms.ChoiceField(
        choices=GENDER_CHOICES,
        required=False,
        label="Gender",
        widget=forms.Select(attrs={'class': 'form-select'})
    )
    blood_type = forms.ChoiceField(
        choices=BLOOD_TYPES,
        required=False,
        label="Blood Type",
        widget=forms.Select(attrs={'class': 'form-select'})
    )

    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'email',
            'phone_number', 'date_of_birth', 'gender', 'blood_type'
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        instance = getattr(self, 'instance', None)
        if instance:
            # Put existing values into placeholders (so inputs display them as hints)
            for field_name in self.fields:
                # skip file fields if any, and don't override select blank option
                try:
                    value = getattr(instance, field_name)
                except AttributeError:
                    value = None
                if value not in (None, ''):
                    # convert to string for placeholder
                    self.fields[field_name].widget.attrs['placeholder'] = str(value)
 
    def save(self, commit=True):
        # For the User model we do NOT set instance.user (no such field).
        return super().save(commit=commit)


from django import forms
from .models import Address

class ProAddressFileForm(forms.ModelForm):
    COUNTRY_CHOICES = [
        ('yemen', 'Yemen'),
        ('saudi_arabia', 'Saudi Arabia'),
        ('qatar', 'Qatar'),
        ('uae', 'UAE'),
    ]

    street_address = forms.CharField(
        max_length=255,
        required=True,
        label='Street Address',
        widget=forms.TextInput(attrs={'class': 'form-input'})
    )
    city = forms.CharField(
        max_length=100,
        required=True,
        label='City',
        widget=forms.TextInput(attrs={'class': 'form-input'})
    )
    zip_code = forms.CharField(
        max_length=20,
        required=True,
        label='ZIP Code',
        widget=forms.TextInput(attrs={'class': 'form-input'})
    )
    country = forms.ChoiceField(
        choices=COUNTRY_CHOICES,
        required=True,
        label="Country",
        widget=forms.Select(attrs={'class': 'form-select'})
    )

    class Meta:
        model = Address
        fields = ['street_address', 'city', 'zip_code', 'country']


# forms.py
