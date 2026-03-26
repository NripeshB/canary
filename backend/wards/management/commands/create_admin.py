"""
Create a default admin user for the platform.
Usage: python manage.py create_admin
"""
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User


class Command(BaseCommand):
    help = "Create a default admin user (admin/admin123)"

    def handle(self, *args, **options):
        username = "admin"
        password = "admin123"

        if User.objects.filter(username=username).exists():
            self.stdout.write(self.style.WARNING(f"User '{username}' already exists."))
            return

        User.objects.create_superuser(
            username=username,
            password=password,
            email="admin@delhiaqi.gov.in",
        )
        self.stdout.write(self.style.SUCCESS(
            f"Created admin user: {username} / {password}"
        ))
