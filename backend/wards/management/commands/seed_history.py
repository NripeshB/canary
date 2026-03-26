"""
Seed 7 days of historical AQI data for comparison features.
Usage: python manage.py seed_history
"""
import random
from datetime import timedelta
from django.utils import timezone
from django.core.management.base import BaseCommand
from wards.models import Ward, AQIReading


class Command(BaseCommand):
    help = "Seed 7 days of historical AQI data for trend comparison"

    def handle(self, *args, **options):
        wards = list(Ward.objects.all())
        if not wards:
            self.stderr.write(self.style.ERROR("No wards found. Run seed_wards first."))
            return

        now = timezone.now()
        created = 0

        for day_offset in range(1, 8):  # 1 to 7 days ago
            ts = now - timedelta(days=day_offset)

            for ward in wards:
                # Get latest real reading as baseline
                latest = AQIReading.objects.filter(ward=ward).order_by('-timestamp').first()
                base_aqi = latest.aqi if latest else 150

                # Create believable historical variation
                # Older days tend to be slightly better (shows improvement narrative)
                day_factor = 1.0 + (day_offset * 0.02)  # older days slightly higher
                seasonal_noise = random.uniform(-0.15, 0.15)
                hist_aqi = max(15, min(500, round(base_aqi * (day_factor + seasonal_noise))))

                # Vary pollutants proportionally
                pm25_base = latest.pm25 if latest and latest.pm25 else 80
                pm10_base = latest.pm10 if latest and latest.pm10 else 200
                no2_base = latest.no2 if latest and latest.no2 else 40
                so2_base = latest.so2 if latest and latest.so2 else 20
                co_base = latest.co if latest and latest.co else 600
                o3_base = latest.o3 if latest and latest.o3 else 40

                factor = hist_aqi / base_aqi if base_aqi > 0 else 1.0

                reading = AQIReading(
                    ward=ward,
                    aqi=hist_aqi,
                    pm25=round(pm25_base * factor * random.uniform(0.8, 1.2), 1),
                    pm10=round(pm10_base * factor * random.uniform(0.8, 1.2), 1),
                    no2=round(no2_base * factor * random.uniform(0.7, 1.3), 1),
                    so2=round(so2_base * factor * random.uniform(0.7, 1.3), 1),
                    co=round(co_base * factor * random.uniform(0.8, 1.2), 1),
                    o3=round(o3_base * factor * random.uniform(0.7, 1.3), 1),
                    source="seeded",
                )
                reading.save()
                # Manually set timestamp to back-date
                AQIReading.objects.filter(pk=reading.pk).update(timestamp=ts)
                created += 1

            self.stdout.write(f"  Day -{day_offset}: {len(wards)} readings")

        self.stdout.write(self.style.SUCCESS(f"Done! Seeded {created} historical readings (7 days × {len(wards)} wards)"))
