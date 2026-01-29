from celery import shared_task
from django.utils import timezone
from .models import Reminder
from datetime import timedelta

@shared_task
def send_reminder_emails():
    now = timezone.now()
    due_soon = now + timedelta(minutes=5)
    
    due_reminders = Reminder.objects.filter(
        enabled=True,
        next_due__lte=due_soon,
        next_due__gte=now - timedelta(minutes=5)
    )
    
    for reminder in due_reminders:
        try:
            reminder.send_reminder_email()
            # Update next due date
            reminder.calculate_next_due()
            reminder.save()
        except Exception as e:
            print(f"Error processing reminder {reminder.id}: {e}")
    
    return f"Processed {due_reminders.count()} reminders"