"""
Fetch real AQI data from AQICN + OpenMeteo APIs for all wards.
Usage: python manage.py fetch_aqi
"""
from django.core.management.base import BaseCommand
from wards.data_fetcher import fetch_all_wards


class Command(BaseCommand):
    help = "Fetch real AQI data from AQICN + OpenMeteo for all wards"

    def handle(self, *args, **options):
        def progress(msg):
            self.stdout.write(msg)

        self.stdout.write("Starting AQI data fetch...")
        count = fetch_all_wards(progress_callback=progress)
        self.stdout.write(self.style.SUCCESS(f"Done! Created {count} readings."))
