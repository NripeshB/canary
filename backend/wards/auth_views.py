"""
Authentication views for the AQI Intelligence Platform.
Session-based auth with login/logout/me endpoints.
"""
from django.contrib.auth import authenticate, login, logout
from django.middleware.csrf import get_token
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status


class LoginView(APIView):
    """POST /api/auth/login/ — Authenticate and create session."""
    authentication_classes = []  # Allow unauthenticated access to login

    def post(self, request):
        username = request.data.get("username", "")
        password = request.data.get("password", "")

        if not username or not password:
            return Response(
                {"error": "Username and password are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            return Response({
                "success": True,
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "is_staff": user.is_staff,
                    "is_superuser": user.is_superuser,
                    "role": "admin" if user.is_staff else "citizen",
                }
            })
        else:
            return Response(
                {"error": "Invalid credentials"},
                status=status.HTTP_401_UNAUTHORIZED
            )


class LogoutView(APIView):
    """POST /api/auth/logout/ — End session."""

    def post(self, request):
        logout(request)
        return Response({"success": True})


class MeView(APIView):
    """GET /api/auth/me/ — Current user info."""
    authentication_classes = []

    def get(self, request):
        if request.user and hasattr(request.user, 'id') and request.user.id:
            return Response({
                "authenticated": True,
                "user": {
                    "id": request.user.id,
                    "username": request.user.username,
                    "is_staff": request.user.is_staff,
                    "role": "admin" if request.user.is_staff else "citizen",
                }
            })
        return Response({"authenticated": False, "user": None})


class CSRFTokenView(APIView):
    """GET /api/auth/csrf/ — Get CSRF token for login forms."""
    authentication_classes = []

    def get(self, request):
        return Response({"csrfToken": get_token(request)})
