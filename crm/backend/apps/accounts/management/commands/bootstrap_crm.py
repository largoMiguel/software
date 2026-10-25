from __future__ import annotations

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

User = get_user_model()


class Command(BaseCommand):
    help = "Crea el administrador de plataforma inicial si no existe."

    def handle(self, *args, **options):
        email = (settings.INITIAL_PLATFORM_ADMIN_EMAIL or "").strip().lower()
        if not email:
            self.stdout.write("INITIAL_PLATFORM_ADMIN_EMAIL vacío — omitiendo bootstrap.")
            return

        name = settings.INITIAL_PLATFORM_ADMIN_NAME or "Admin CRM"
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "full_name": name,
                "is_staff": True,
                "is_superuser": True,
                "is_platform_admin": True,
            },
        )
        if created:
            user.set_unusable_password()
            user.save()
            self.stdout.write(self.style.SUCCESS(f"Usuario plataforma creado: {email}"))
        elif not user.is_platform_admin:
            user.is_platform_admin = True
            user.is_staff = True
            user.save(update_fields=["is_platform_admin", "is_staff"])
            self.stdout.write(self.style.WARNING(f"Usuario existente promovido a plataforma: {email}"))
        else:
            self.stdout.write(f"Usuario plataforma ya existe: {email}")
