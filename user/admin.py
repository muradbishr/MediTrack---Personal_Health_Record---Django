from django.contrib import admin
from .models import AccessGrant, SharingRequest, Address, EmergencyContact, Medication, UserMedication, VitalSign, UserChronic, ChronicDisease, Allergy, UserAllergy, Reminder, MedicalFile, MedicalReport, ActivityLog
from django.contrib.auth import get_user_model
import json
from django.utils.safestring import mark_safe
from django.utils import timezone
from django.apps import apps
from django.urls import path, reverse
from django.http import HttpResponse
from django.utils.encoding import smart_str
import csv
from datetime import timedelta
from django.db.models import Count  # Import Count for aggregation

User = get_user_model()

# Register your models to appear in Django admin
admin.site.register(User)
admin.site.register(ActivityLog)
admin.site.register(Address)
admin.site.register(MedicalFile)
admin.site.register(MedicalReport)
admin.site.register(AccessGrant)
admin.site.register(SharingRequest)
admin.site.register(EmergencyContact)
admin.site.register(Medication)
admin.site.register(UserMedication)
admin.site.register(VitalSign)
admin.site.register(UserChronic)
admin.site.register(ChronicDisease)
admin.site.register(Allergy)
admin.site.register(UserAllergy)
admin.site.register(Reminder)
from django.contrib import admin
from django.contrib.admin.models import LogEntry

@admin.register(LogEntry)
class CustomLogEntryAdmin(admin.ModelAdmin):
    list_display = ('action_time', 'user', 'content_type', 'object_repr', 'action_flag')
    list_filter = ('action_flag', 'content_type', 'user')
    search_fields = ('object_repr', 'change_message', 'user__username')

# Proxy model for Activity Log admin
class ActivityLogProxy(ActivityLog):
    class Meta:
        proxy = True
        verbose_name = "Activity Log Dashboard"
        verbose_name_plural = "Activity Log Dashboard"

@admin.register(ActivityLogProxy)
class ActivityLogAdmin(admin.ModelAdmin):
    change_list_template = "admin/user/activitylog_dashboard.html"
    list_display = ("created_at", "user", "action", "model_name", "object_id", "ip_address")
    list_filter = ("action", "model_name", "created_at")
    search_fields = ("action", "details", "model_name", "object_id", "ip_address", "user__email", "user__username")
    ordering = ("-created_at",)
    date_hierarchy = 'created_at'
    
    # Custom stats and analytics
    def changelist_view(self, request, extra_context=None):
        response = super().changelist_view(request, extra_context)
        
        # Calculate some statistics for the dashboard
        if hasattr(response, 'context_data'):
            qs = self.get_queryset(request)
            
            # Last 24 hours stats
            twenty_four_hours_ago = timezone.now() - timedelta(hours=24)
            recent_logs = qs.filter(created_at__gte=twenty_four_hours_ago)
            
            # Last 7 days
            seven_days_ago = timezone.now() - timedelta(days=7)
            weekly_logs = qs.filter(created_at__gte=seven_days_ago)
            
            # Stats - Fixed: Use Count from django.db.models
            stats = {
                'total_24h': recent_logs.count(),
                'total_7d': weekly_logs.count(),
                'total_all': qs.count(),
                'top_actions': list(qs.values('action').annotate(count=Count('action')).order_by('-count')),
                'top_users': list(qs.values('user__email').annotate(count=Count('user')).order_by('-count')),
                'top_models': list(qs.values('model_name').annotate(count=Count('model_name')).order_by('-count')),
            }
            
            response.context_data['stats'] = stats
            response.context_data['twenty_four_hours_ago'] = twenty_four_hours_ago
            response.context_data['seven_days_ago'] = seven_days_ago
            
            # Prepare logs data for JSON serialization
            logs = []
            for obj in qs.order_by("-created_at")[:1000]:  # Limit for performance
                # Get user display name
                user_disp = "—"
                user_id = None
                user_email = None
                try:
                    if obj.user:
                        user_obj = obj.user
                        user_id = getattr(user_obj, "id", None)
                        user_email = getattr(user_obj, "email", None)
                        
                        # Format user display name
                        fname = getattr(user_obj, "first_name", "") or ""
                        lname = getattr(user_obj, "last_name", "") or ""
                        if fname or lname:
                            user_disp = f"{fname} {lname}".strip()
                        elif user_email:
                            user_disp = user_email
                        else:
                            user_disp = str(user_obj)
                except Exception:
                    user_disp = "—"
                
                # Format action badge color
                action_color = self._get_action_color(obj.action or "")
                
                # Format model badge color
                model_color = self._get_model_color(obj.model_name or "")
                
                # Format timestamp
                created_at = obj.created_at
                time_ago = self._get_time_ago(created_at) if created_at else ""
                
                logs.append({
                    "id": obj.pk,
                    "created_at": created_at.isoformat() if created_at else "",
                    "created_at_display": timezone.localtime(created_at).strftime("%Y-%m-%d %H:%M:%S") if created_at else "",
                    "time_ago": time_ago,
                    "user_display": user_disp,
                    "user_id": user_id,
                    "user_email": user_email,
                    "action": obj.action or "",
                    "action_color": action_color,
                    "model_name": obj.model_name or "",
                    "model_color": model_color,
                    "object_id": obj.object_id or "",
                    "ip_address": obj.ip_address or "",
                    "details": obj.details or "",
                    "details_trunc": (obj.details or "")[:120] + ("…" if obj.details and len(obj.details) > 120 else ""),
                    "object_url": self._get_object_url(obj),
                    "severity": self._get_action_severity(obj.action or ""),
                })
            
            response.context_data['logs'] = logs
            response.context_data['logs_json'] = mark_safe(json.dumps(logs, default=str, ensure_ascii=False))
            
        return response
    
    def _get_action_color(self, action):
        """Return CSS class for action badge"""
        action = action.lower()
        if 'create' in action or 'add' in action:
            return 'badge-success'
        elif 'update' in action or 'edit' in action or 'change' in action:
            return 'badge-warning'
        elif 'delete' in action or 'remove' in action:
            return 'badge-danger'
        elif 'login' in action or 'logout' in action:
            return 'badge-info'
        elif 'view' in action or 'read' in action:
            return 'badge-primary'
        elif 'error' in action or 'fail' in action:
            return 'badge-error'
        else:
            return 'badge-secondary'
    
    def _get_model_color(self, model_name):
        """Return CSS class for model badge"""
        model_colors = {
            'user': 'model-user',
            'profile': 'model-profile',
            'order': 'model-order',
            'product': 'model-product',
            'payment': 'model-payment',
            'invoice': 'model-invoice',
            'customer': 'model-customer',
            'email': 'model-email',
            'file': 'model-file',
            'image': 'model-image',
            'document': 'model-document',
            'settings': 'model-settings',
            'config': 'model-config',
        }
        
        model_lower = model_name.lower()
        for key, color in model_colors.items():
            if key in model_lower:
                return color
        return 'model-default'
    
    def _get_action_severity(self, action):
        """Return severity level for action"""
        action = action.lower()
        if 'delete' in action or 'remove' in action or 'error' in action:
            return 'high'
        elif 'update' in action or 'change' in action or 'edit' in action:
            return 'medium'
        elif 'create' in action or 'add' in action:
            return 'low'
        else:
            return 'info'
    
    def _get_time_ago(self, dt):
        """Calculate time ago string"""
        now = timezone.now()
        diff = now - dt
        
        if diff.days > 365:
            return f"{diff.days // 365}y ago"
        elif diff.days > 30:
            return f"{diff.days // 30}mo ago"
        elif diff.days > 0:
            return f"{diff.days}d ago"
        elif diff.seconds > 3600:
            return f"{diff.seconds // 3600}h ago"
        elif diff.seconds > 60:
            return f"{diff.seconds // 60}m ago"
        else:
            return "just now"
    
    def _get_object_url(self, obj):
        """Generate admin URL for object"""
        if not obj.model_name or not obj.object_id:
            return None
        
        try:
            model_class = None
            if "." in obj.model_name:
                app_label, model_name = obj.model_name.split(".", 1)
                model_class = apps.get_model(app_label, model_name)
            else:
                for app_config in apps.get_app_configs():
                    try:
                        model_class = app_config.get_model(obj.model_name)
                        if model_class:
                            break
                    except LookupError:
                        continue
            
            if model_class:
                instance = model_class.objects.filter(pk=obj.object_id).first()
                if instance:
                    return reverse(
                        f"admin:{model_class._meta.app_label}_{model_class._meta.model_name}_change",
                        args=(instance.pk,)
                    )
        except Exception:
            pass
        return None
    
    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path("export-csv/", self.admin_site.admin_view(self.export_csv), name="activitylog-export-csv"),
            path("stats-data/", self.admin_site.admin_view(self.stats_data), name="activitylog-stats-data"),
        ]
        return custom_urls + urls
    
    def export_csv(self, request):
        """Export filtered logs to CSV"""
        qs = self.get_queryset(request)
        
        # Apply filters from request
        params = request.GET
        action = params.get("action")
        start_date = params.get("start_date")
        end_date = params.get("end_date")
        user_q = params.get("user")
        model_name = params.get("model_name")
        
        if action:
            qs = qs.filter(action__icontains=action)
        if start_date:
            qs = qs.filter(created_at__date__gte=start_date)
        if end_date:
            qs = qs.filter(created_at__date__lte=end_date)
        if user_q:
            if user_q.isdigit():
                qs = qs.filter(user__id=int(user_q))
            else:
                qs = qs.filter(user__email__icontains=user_q)
        if model_name:
            qs = qs.filter(model_name__icontains=model_name)
        
        qs = qs.order_by("-created_at")
        
        response = HttpResponse(content_type="text/csv; charset=utf-8")
        response.write("\ufeff")
        response['Content-Disposition'] = 'attachment; filename="activity_logs_export_{}.csv"'.format(
            timezone.now().strftime("%Y%m%d_%H%M%S")
        )
        
        writer = csv.writer(response)
        writer.writerow([
            "Timestamp", "User ID", "User Email", "Action", "Model", 
            "Object ID", "IP Address", "Details", "Severity"
        ])
        
        for obj in qs:
            user_id = getattr(obj.user, "id", "")
            user_email = getattr(obj.user, "email", "")
            writer.writerow([
                obj.created_at.isoformat(),
                user_id,
                smart_str(user_email),
                smart_str(obj.action),
                smart_str(obj.model_name),
                smart_str(obj.object_id),
                smart_str(obj.ip_address),
                smart_str(obj.details or ""),
                self._get_action_severity(obj.action or ""),
            ])
        
        return response
    
    def stats_data(self, request):
        """Return JSON stats data for charts"""
        from django.http import JsonResponse
        from django.utils import timezone
        from datetime import timedelta
        from django.db.models import Count
        
        qs = self.get_queryset(request)
        
        # Last 30 days data for charts
        thirty_days_ago = timezone.now() - timedelta(days=30)
        recent_logs = qs.filter(created_at__gte=thirty_days_ago)
        
        # Daily activity
        daily_data = list(recent_logs.extra(
            select={'day': "DATE(created_at)"}
        ).values('day').annotate(count=Count('id')).order_by('day'))
        
        # Action distribution
        action_data = list(qs.values('action').annotate(
            count=Count('action')
        ).order_by('-count')[:10])
        
        # Model distribution
        model_data = list(qs.values('model_name').annotate(
            count=Count('model_name')
        ).order_by('-count')[:10])
        
        return JsonResponse({
            'daily_activity': daily_data,
            'action_distribution': action_data,
            'model_distribution': model_data,
            'total_count': qs.count(),
        })