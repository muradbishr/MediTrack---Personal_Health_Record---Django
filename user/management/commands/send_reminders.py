from django.core.management.base import BaseCommand
from django.utils import timezone
from user.models import Reminder
from datetime import timedelta

class Command(BaseCommand):
    help = 'Send email notifications for due reminders'

    def handle(self, *args, **options):
        now = timezone.now()
        # Look for reminders due in the next 5 minutes
        due_soon = now + timedelta(minutes=5)
        
        due_reminders = Reminder.objects.filter(
            enabled=True,
            next_due__lte=due_soon,
            next_due__gte=now - timedelta(minutes=5)  # Also include slightly past due
        )
        
        sent_count = 0
        for reminder in due_reminders:
            try:
                if reminder.send_reminder_email():
                    self.stdout.write(
                        self.style.SUCCESS(f'Sent reminder email for: {reminder.title}')
                    )
                    sent_count += 1
                    
                    # Update next due date
                    reminder.calculate_next_due()
                    reminder.save()
                    
                else:
                    self.stdout.write(
                        self.style.ERROR(f'Failed to send email for: {reminder.title}')
                    )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error processing reminder {reminder.id}: {str(e)}')
                )
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully sent {sent_count} reminder emails')
        )
