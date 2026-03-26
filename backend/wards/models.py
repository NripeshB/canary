from django.db import models
from django.conf import settings


class Ward(models.Model):
    """A ward in Delhi. Seeded from GeoJSON."""
    ward_no = models.IntegerField(unique=True, primary_key=True)
    name = models.CharField(max_length=200)
    district = models.CharField(max_length=200, blank=True)
    population = models.IntegerField(default=0)
    centroid_lat = models.FloatField(default=0)
    centroid_lng = models.FloatField(default=0)

    class Meta:
        ordering = ['ward_no']

    def __str__(self):
        return f"Ward {self.ward_no}: {self.name}"


class AQIReading(models.Model):
    """A timestamped AQI + pollutant reading for a ward."""
    SOURCE_CHOICES = [
        ('aqicn', 'AQICN Station'),
        ('openmeteo', 'OpenMeteo'),
        ('interpolated', 'Interpolated'),
        ('seeded', 'Seeded/Fallback'),
    ]

    ward = models.ForeignKey(Ward, on_delete=models.CASCADE, related_name='readings')
    aqi = models.IntegerField()
    pm25 = models.FloatField(null=True, blank=True, help_text="PM2.5 µg/m³")
    pm10 = models.FloatField(null=True, blank=True, help_text="PM10 µg/m³")
    no2 = models.FloatField(null=True, blank=True, help_text="NO2 µg/m³")
    so2 = models.FloatField(null=True, blank=True, help_text="SO2 µg/m³")
    co = models.FloatField(null=True, blank=True, help_text="CO µg/m³")
    o3 = models.FloatField(null=True, blank=True, help_text="O3 µg/m³")
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='seeded')
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['ward', '-timestamp']),
        ]

    def __str__(self):
        return f"Ward {self.ward_id} AQI={self.aqi} @ {self.timestamp}"


class Report(models.Model):
    """A citizen pollution report."""
    CATEGORIES = [
        ('Garbage Burning', 'Garbage Burning'),
        ('Construction Dust', 'Construction Dust'),
        ('Traffic Congestion', 'Traffic Congestion'),
        ('Industrial Smoke', 'Industrial Smoke'),
        ('Other', 'Other'),
    ]

    ward = models.ForeignKey(Ward, on_delete=models.CASCADE, related_name='reports', null=True, blank=True)
    category = models.CharField(max_length=50, choices=CATEGORIES)
    description = models.TextField()
    severity = models.IntegerField(default=3)
    lat = models.FloatField(null=True, blank=True)
    lng = models.FloatField(null=True, blank=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.category} — Ward {self.ward_id} — Sev {self.severity}"
