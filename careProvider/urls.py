from django.urls import path
from . import views

app_name = "careProvider"

urlpatterns = [

    path('careprovider/', views.careProvider, name='careprovider'),
        # Medication
    path('user/api/medication/', views.medication_create, name='api_medication_create'),
    path('user/api/medication/<int:pk>/', views.medication_detail, name='api_medication_detail'),

    # Chronic
    path('user/api/chronic/', views.chronic_create, name='api_chronic_create'),
    path('user/api/chronic/<int:pk>/', views.chronic_detail, name='api_chronic_detail'),
    # Allergy
    path('user/api/allergy/', views.allergy_create, name='api_allergy_create'),
    path('user/api/allergy/<int:pk>/', views.allergy_detail, name='api_allergy_detail'),


    path('avatar/initial/<int:pk>/', views.initial_avatar, name='initial-avatar'),

    path("api/family-history/", views.family_history_create, name="family_history_create"),
    path("api/family-history/<int:pk>/", views.family_history_detail, name="family_history_detail"),
    path("api/family-history/list/", views.family_history_list, name="family_history_list"),
    
    
    path("api/patient/<int:patient_id>/notes/",views.list_provider_notes,name="list_provider_notes"),
    path("api/patient/<int:patient_id>/notes/add/",views.add_provider_note,name="add_provider_note"),

    path("provider/api/remove-patient/", views.remove_patient, name="provider_remove_patient"),

]