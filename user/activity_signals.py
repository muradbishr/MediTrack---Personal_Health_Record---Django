from django.db.models.signals import post_save
from django.dispatch import receiver
from crum import get_current_user
from django.apps import apps
from .models import ActivityLog
from django.db.migrations.recorder import MigrationRecorder
from django.contrib.auth.models import AnonymousUser

@receiver(post_save)
def log_activity(sender, instance, created, **kwargs):
    # Skip logging for ActivityLog itself
    if sender.__name__ == "ActivityLog":
        return

    # Skip logging for migration recorder
    if sender == MigrationRecorder.Migration:
        return

    # Skip logging if models are not fully loaded (during migrations)
    if apps.get_app_config('user').models_module is None:
        return

    # Get the current user safely
    user = get_current_user()

    # Only log if user is authenticated
    if not user or isinstance(user, AnonymousUser):
        return

    # Create the log
    ActivityLog.objects.create(
        user=user,
        action="created" if created else "updated",
        model_name=sender.__name__,
        object_id=instance.pk,
        details=str(instance)
    )
