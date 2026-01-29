from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('process/', views.process_file, name='process_file'),
    path('save/', views.save_parsed, name='save_parsed'),
    path('records/', views.records, name='records'),
    path('record/<int:pk>/', views.record_detail, name='record_detail'),
]
