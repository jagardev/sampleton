"""
permissions.py
--------------
Defines custom DRF permission classes for the Sampleton API.

These classes extend Django REST Framework's base permission system to enforce
ownership-based access control, ensuring that only the creator of a resource
can modify or delete it.
"""

from rest_framework import permissions


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission that grants write access exclusively to the owner of an object.

    Safe HTTP methods (GET, HEAD, OPTIONS) are permitted for any request,
    including unauthenticated ones. All other methods (PUT, PATCH, DELETE)
    are only allowed if the requesting user matches the 'user' field on the
    target object.

    This permission class assumes that the model being protected has a 'user'
    field that references the Django User model.
    """

    def has_object_permission(self, request, view, obj):
        """
        Checks whether the requesting user has permission to act on the given object.

        Read operations are always permitted. Write operations are only permitted
        if the requesting user is the owner of the object.

        Args:
            request: The incoming HTTP request.
            view: The view that is handling the request.
            obj: The model instance being accessed.

        Returns:
            bool: True if the request is allowed, False otherwise.
        """
        if request.method in permissions.SAFE_METHODS:
            return True

        return obj.user == request.user


DEMO_DENIED_MESSAGE = (
    "This is a read-only demo account for portfolio showcase purposes. "
    "Write operations are disabled to preserve a consistent experience for all visitors."
)


class BlockDemoWriteAccess(permissions.BasePermission):
    """
    Denies any write operation (POST, PUT, PATCH, DELETE) when the
    authenticated user is the public demo account.

    Read-only requests (GET, HEAD, OPTIONS) are always permitted.
    This ensures that recruiters can fully explore the UI while the
    underlying data remains untouched.
    """

    message = DEMO_DENIED_MESSAGE

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        if request.user and request.user.is_authenticated and request.user.username == 'demo':
            return False
        return True