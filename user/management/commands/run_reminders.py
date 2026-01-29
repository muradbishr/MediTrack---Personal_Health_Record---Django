from django.core.management.base import BaseCommand
from django.utils import timezone
from user.models import Reminder
from user.utils.reminder_logic import (
    is_time_to_send,
    send_reminder_email,
    update_next_due,
)

class Command(BaseCommand):
    help = "Send reminder emails before 1 hour"

    def handle(self, *args, **kwargs):
        reminders = Reminder.objects.filter(enabled=True)

        for reminder in reminders:
            print(f"Checking reminder {reminder.id} for user {reminder.user.email}")
            if is_time_to_send(reminder):
                print(f"Sending reminder {reminder.id} to {reminder.user.email}")
                try:
                    send_reminder_email(reminder)
                    update_next_due(reminder)
                    print(f"Reminder {reminder.id} sent successfully!")
                except Exception as e:
                    print(f"Failed to send reminder {reminder.id}: {e}")
