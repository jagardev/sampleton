"""
urls.py (core)
--------------
Root URL configuration for the Sampleton Django project.

This module wires together the admin panel, the REST API routes defined in
the api application, and the JWT authentication endpoints provided by
djangorestframework-simplejwt. Media file serving is enabled only in
development mode so that uploaded files are accessible during local testing.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path('admin/', admin.site.urls),

    # All application-specific API endpoints are defined in api/urls.py.
    path('api/', include('api.urls')),

    # Accepts a username and password and returns a pair of JWT tokens.
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),

    # Accepts a valid refresh token and issues a new access token.
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]

from django.views.static import serve
from django.urls import re_path

urlpatterns += [
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]
