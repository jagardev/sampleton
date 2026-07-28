"""
middleware.py
-------------
Custom middleware for the Sampleton application.
"""

from django.http import HttpResponseForbidden

class DemoProtectionMiddleware:
    """
    Middleware that intercepts all incoming HTTP requests and blocks
    any write operations (POST, PUT, PATCH, DELETE) if the authenticated
    user is the public demo account.

    This provides a foolproof, global layer of protection that covers
    both the Django REST Framework API and the Django Admin panel,
    preventing any vandalism in the public portfolio showcase.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        SAFE_METHODS = ('GET', 'HEAD', 'OPTIONS')
        
        if request.method not in SAFE_METHODS:
            # Note: request.user is populated by Django's AuthenticationMiddleware
            # for session-based auth (e.g., Django Admin).
            # For DRF JWT Auth, request.user might be AnonymousUser here if JWT 
            # is only resolved in the DRF View. 
            
            # Let's check both session auth and JWT auth headers.
            is_demo = False
            
            if hasattr(request, 'user') and request.user.is_authenticated:
                if request.user.username.lower() == 'demo':
                    is_demo = True
            
            # Fallback for DRF JWT authentication if it hasn't resolved request.user yet
            if not is_demo and 'HTTP_AUTHORIZATION' in request.META:
                auth_header = request.META['HTTP_AUTHORIZATION']
                if auth_header.startswith('Bearer '):
                    token = auth_header.split(' ')[1]
                    try:
                        import jwt
                        from django.conf import settings
                        # Decode the token without verifying signature just to read the payload fast
                        # The actual view will verify the signature later.
                        payload = jwt.decode(token, options={"verify_signature": False})
                        user_id = payload.get('user_id')
                        if user_id:
                            from django.contrib.auth.models import User
                            user = User.objects.filter(id=user_id).first()
                            if user and user.username.lower() == 'demo':
                                is_demo = True
                    except Exception:
                        pass
            
            if is_demo:
                from django.http import JsonResponse
                return JsonResponse(
                    {"detail": "Action not allowed: You cannot perform this action from the demo account."},
                    status=403
                )

        response = self.get_response(request)
        return response
