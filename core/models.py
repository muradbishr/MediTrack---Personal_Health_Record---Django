from django.conf import settings
from django.db import models

try:
    from django.db.models import JSONField
except ImportError:
    from django.contrib.postgres.fields import JSONField


class Extraction(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='extractions',
        null=True,      # ← allow migration without breaking old rows
        blank=True
    )

    filename = models.CharField(max_length=255)
    file = models.FileField(upload_to="MedExtractor/", null=True, blank=True)
    
    ocr_text = models.TextField()
    parsed = JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Extraction {self.id} - {self.filename}"
