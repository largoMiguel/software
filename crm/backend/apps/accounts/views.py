from __future__ import annotations

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.serializers import MeSerializer, MembresiaBriefSerializer
from apps.empresas.models import Membresia


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = MeSerializer(request.user, context={"request": request})
        return Response(serializer.data)


class MembershipsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Membresia.objects.select_related("empresa").filter(
            user=request.user,
            empresa__is_active=True,
        )
        return Response(MembresiaBriefSerializer(qs, many=True).data)
