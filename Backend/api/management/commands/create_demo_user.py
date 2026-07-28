"""
create_demo_user.py
-------------------
Django management command to automatically create a demo user account
for quick testing and evaluation in portfolio environments.
"""

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from api.models import UserProfile


class Command(BaseCommand):
    help = 'Creates a demo user account for instant testing'

    def handle(self, *args, **kwargs):
        username = 'demo'
        password = 'demopassword123'
        email = 'demo@sampleton.com'

        if User.objects.filter(username=username).exists():
            self.stdout.write(self.style.WARNING(f"Demo user '{username}' already exists."))
            return

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password
        )

        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.display_name = 'Demo Producer'
        profile.bio = 'Official demo account for testing Sampleton features.'
        profile.location = 'Global'
        profile.save()

        self.stdout.write(self.style.SUCCESS(f"Successfully created demo user '{username}' (password: '{password}')"))
