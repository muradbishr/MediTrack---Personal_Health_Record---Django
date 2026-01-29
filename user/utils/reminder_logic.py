# utils/reminder_logic.py
from datetime import datetime, timedelta
from django.utils import timezone
from dateutil.relativedelta import relativedelta
def reminder_datetime(reminder):
    if not reminder.next_due or not reminder.time:
        return None

    dt = datetime.combine(reminder.next_due, reminder.time)
    return timezone.make_aware(dt)
from datetime import timedelta
from django.utils import timezone

def is_time_to_send(reminder, now=None):
    # كل Reminder مفعّل سيتم إرساله
    return reminder.enabled

from django.core.mail import send_mail
from django.conf import settings

def send_reminder_email(reminder):
    send_mail(
        subject=f"Reminder: {reminder.title}",
        message=f"It is time for: {reminder.title}",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[reminder.user.email],
        fail_silently=False,
    )
from datetime import timedelta

def update_next_due(reminder):
    if reminder.frequency == 'once':
        reminder.enabled = False
        reminder.next_due = None
    elif reminder.frequency == 'daily':
        reminder.next_due += timedelta(days=1)
    elif reminder.frequency == 'weekly':
        reminder.next_due += timedelta(weeks=1)

    elif reminder.frequency == 'monthly':
        reminder.next_due += relativedelta(months=1)
    reminder.save()
