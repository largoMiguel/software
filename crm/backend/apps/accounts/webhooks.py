from __future__ import annotations

import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.http import HttpResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework.views import APIView
from svix.webhooks import Webhook, WebhookVerificationError

logger = logging.getLogger(__name__)
User = get_user_model()


@method_decorator(csrf_exempt, name="dispatch")
class ClerkWebhookView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        secret = settings.CLERK_WEBHOOK_SIGNING_SECRET
        if not secret:
            return HttpResponse(status=501)

        payload = request.body
        headers = {
            "svix-id": request.headers.get("svix-id", ""),
            "svix-timestamp": request.headers.get("svix-timestamp", ""),
            "svix-signature": request.headers.get("svix-signature", ""),
        }
        try:
            wh = Webhook(secret)
            event = wh.verify(payload, headers)
        except WebhookVerificationError:
            return HttpResponse(status=400)

        event_type = event.get("type", "")
        data = event.get("data", {})

        if event_type in ("user.created", "user.updated"):
            clerk_id = data.get("id")
            emails = data.get("email_addresses") or []
            primary = next((e for e in emails if e.get("id") == data.get("primary_email_address_id")), None)
            if not primary and emails:
                primary = emails[0]
            email = (primary or {}).get("email_address", "").strip().lower()
            if clerk_id and email:
                first = (data.get("first_name") or "").strip()
                last = (data.get("last_name") or "").strip()
                full_name = f"{first} {last}".strip()
                user, created = User.objects.get_or_create(
                    email=email,
                    defaults={"full_name": full_name, "is_active": True, "clerk_id": clerk_id},
                )
                updates = []
                if user.clerk_id != clerk_id:
                    user.clerk_id = clerk_id
                    updates.append("clerk_id")
                if full_name and not user.full_name:
                    user.full_name = full_name
                    updates.append("full_name")
                if updates:
                    user.save(update_fields=updates)
                logger.info("Clerk webhook %s user %s created=%s", event_type, email, created)

        elif event_type == "user.deleted":
            clerk_id = data.get("id")
            if clerk_id:
                User.objects.filter(clerk_id=clerk_id).update(is_active=False, clerk_id=None)

        return HttpResponse(status=204)
