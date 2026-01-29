from django.urls import path
from . import views
from .views import alerts as alerts_views  # إذا وضعت الكود في user/views/alerts.py
from django.views.generic import TemplateView

app_name = "user"

urlpatterns = [
    path("", views.index, name="index"), 
    path('onboarding/', views.onboarding, name='onboarding'),
    path('login/', views.login_view, name='login'), 
    path('signup/', views.signup_view, name='signup'), 
    path('dashboard/', views.dashboard, name='dashboard'), 
    path('health-data/', views.healthdata, name='health-data'), 
    path('share-permissions/', views.sharepermission, name='share-permissions'), 
    path('alerts/', views.alerts, name='alerts'), 
    path('profile/', views.profile, name='profile'), 
    path('files-reports/', views.filesreports, name='files-reports'), 
    path('login_check/', views.login_check, name='login_check'),
    path("save_trends/", views.save_trends, name="save_trends"),  # form submission
    path('add_chronic/', views.add_chronic, name='add_chronic'),
    path('delete_chronic/<int:pk>/', views.delete_chronic, name='delete_chronic'),
    path('add_allergy/', views.add_allergy, name='add_allergy'),          # AJAX/form POST
    path('add_medication/', views.add_medication, name='add_medication'),
    path('delete_allergy/<int:pk>/', views.delete_allergy, name='delete_allergy'),
    path('api/allergies/<int:pk>/', views.allergy_detail, name='api-allergy-detail'),
    path('medications/add/', views.add_medication, name='add_medication'),
    path('medications/delete/<int:pk>/', views.delete_medication, name='delete_medication'),
    path('profile/edit/', views.edit_profile, name='edit_profile'),
    path('profile/editaddres/', views.edit_profile_adress, name='edit_profile_adress'),
    path('api/sharing-request/', views.handle_sharing_request, name='handle_sharing_request'),
    path("api/files/", views.api_files_list, name="api_files_list"),
    path("api/files/upload/", views.api_files_upload, name="api_files_upload"),
    path("api/files/<int:pk>/delete/", views.api_file_delete, name="api_file_delete"),
    path("api/files/<int:pk>/download/", views.api_file_download, name="api_file_download"),
    path('api/share/request/', views.share_request_by_email, name='share_request_by_email'),
    path('providers/<int:provider_id>/minimal/', views.provider_minimal_view, name='provider_minimal_view'),
    path('sharing-requests/<int:pk>/respond/', views.respond_sharing_request, name='respond_sharing_request'),
    path('api/my-sharing-requests/', views.my_sharing_requests, name='my_sharing_requests'),  # list user requests by status
    path("sharing-requests/<int:pk>/delete/", views.delete_sharing_request, name="delete_sharing_request"),
    path("api/emergency-contacts/", views.list_contacts, name="list_contacts"),
    path("api/emergency-contacts/add/", views.add_contact, name="add_contact"),
    path("api/emergency-contacts/<int:pk>/update/", views.update_contact, name="update_contact"),
    path("api/emergency-contacts/<int:pk>/delete/", views.delete_contact, name="delete_contact"),
    path("api/vitals/", views.vitals_api, name="vitals_api"),
    path('avatar/initial/<int:pk>/', views.initial_avatar, name='initial-avatar'),
    path('medications/<int:pk>/api/', views.medication_detail_api, name='medication_detail_api'),
    path('allergies/<int:pk>/api/', views.allergy_detail_api, name='allergy_detail_api'),
    path('chronic/<int:pk>/api/', views.chronic_detail_api, name='chronic_detail_api'),
    path("user/api/accessgrant/<int:pk>/", views.accessgrant_detail, name="api_accessgrant_detail"),
    path('profile/upload-photo/', views.upload_profile_picture, name='upload_profile_picture'),
    path("profile/change-password/", views.change_password, name="change_password"),
    path("profile/delete-account/", views.delete_account, name="delete_account"),
    path("logout/", views.user_logout, name="logout"),
    path('alerts/list/', views.reminders_list_json, name='alerts_list_json'),
    path('alerts/create/', views.create_reminder, name='alerts_create'),
    path('alerts/<int:reminder_id>/toggle/', views.toggle_reminder, name='alerts_toggle'),
    path('alerts/<int:reminder_id>/delete/', views.delete_reminder, name='alerts_delete'),
    path('alerts/<int:reminder_id>/edit/', views.edit_reminder, name='alerts_edit'),
    path("family/add-history/", views.add_family_history, name="add_family_history"),
    path("family/delete-history/<int:pk>/", views.delete_family_history, name="delete_family_history"),
    path("family/history/<int:pk>/", views.family_history_detail_api, name="family_history_detail_api"),
    path('user/api/signup/', views.api_signup, name='api_signup'),
    path('user/api/check-email/', views.check_email, name='check_email'),
    path("api/import-extracted-health/",views.import_extracted_health_data,name="import_extracted_health"),
    path('export/health/csv/<int:access_pk>/',views.export_health_csv,name='export_health_csv'),
    

    path("terms/", TemplateView.as_view(template_name="user/terms/service.html"), name="terms"),
    path("privacy/", TemplateView.as_view(template_name="user/terms/Policy.html"), name="privacy"),

    path('user/send-email-otp/', views.send_email_otp, name='send_email_otp'),
    path('user/verify-email-otp/', views.verify_email_otp, name='verify_email_otp'),
    path('enter-otp/', views.enter_otp_page, name='enter_otp'),




]