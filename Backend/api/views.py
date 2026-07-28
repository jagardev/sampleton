"""
views.py
--------
Defines the API views for the Sampleton application.

Each class in this module is a Django REST Framework ViewSet or generic view
that handles a specific resource. Business logic such as ownership enforcement
and queryset filtering is concentrated here, keeping the serializers focused
purely on data transformation.
"""

from rest_framework import viewsets, generics, permissions
from .models import Track, UserProfile, Playlist, Comment, Like, PlaylistTrack
from django.contrib.auth.models import User
from .serializers import *
from .permissions import BlockDemoWriteAccess


class TrackViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing audio tracks.

    Provides the standard list, create, retrieve, update, and destroy actions.
    Unauthenticated users may read track data, but creating, updating, or
    deleting a track requires authentication. Additionally, destructive and
    update operations are restricted to the track's owner by filtering the
    queryset to only the requesting user's tracks.
    """

    serializer_class = TrackSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, BlockDemoWriteAccess]

    def get_queryset(self):
        """
        Returns the appropriate queryset based on the current action.

        For write operations (destroy, update, partial_update), only the
        tracks belonging to the authenticated user are returned. For list and
        other read operations, all uploaded tracks are returned so guests can
        browse the complete catalog.

        Returns:
            QuerySet: A filtered or unfiltered queryset of Track objects.
        """
        action = getattr(self, 'action', None)
        if action in ['destroy', 'update', 'partial_update']:
            return Track.objects.filter(user=self.request.user)
        return Track.objects.all()

    def perform_create(self, serializer):
        """
        Saves a new track and automatically assigns the authenticated user as its owner.

        Args:
            serializer: The validated TrackSerializer instance ready to be saved.
        """
        serializer.save(user=self.request.user)


class PlaylistViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing playlists.

    Read operations (list, retrieve) are open to all users including guests.
    All write operations require the user to be authenticated. When listing
    playlists, authenticated users see their own private playlists in addition
    to all public ones, while guests only see public playlists.
    """

    serializer_class = PlaylistSerializer

    def get_permissions(self):
        """
        Returns the permission classes applicable to the current action.

        Read actions (retrieve, list) are unrestricted. All other actions
        require the user to be authenticated and not be the demo user.

        Returns:
            list: A list of instantiated permission objects.
        """
        if self.action in ['retrieve', 'list']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), BlockDemoWriteAccess()]

    def get_queryset(self):
        """
        Returns the appropriate playlist queryset based on the current action and user.

        For the list action, authenticated users receive their own playlists
        combined with all public playlists. Guests receive only public playlists.
        For all other actions, the full queryset is returned to support
        object-level permission checks.

        Returns:
            QuerySet: A filtered or unfiltered queryset of Playlist objects.
        """
        if self.action in ['list']:
            user = self.request.user
            if user.is_authenticated:
                from django.db.models import Q
                return Playlist.objects.filter(Q(user=user) | Q(is_public=True))
            return Playlist.objects.filter(is_public=True)
        return Playlist.objects.all()

    def perform_create(self, serializer):
        """
        Saves a new playlist and assigns the authenticated user as its owner.

        Args:
            serializer: The validated PlaylistSerializer instance ready to be saved.
        """
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        """
        Updates a playlist after verifying that the requester is its owner.

        Raises a PermissionDenied exception if the authenticated user does not
        own the playlist being modified.

        Args:
            serializer: The validated PlaylistSerializer instance ready to be saved.

        Raises:
            PermissionDenied: If the requesting user does not own the playlist.
        """
        if serializer.instance.user != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied()
        serializer.save()


class MyProfileView(generics.RetrieveUpdateAPIView):
    """
    View for retrieving and updating the authenticated user's own profile.

    This endpoint always operates on the profile of the currently logged-in
    user, so no ID is required in the URL. If a profile does not yet exist
    for the user, one is created on the first access.
    """

    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated, BlockDemoWriteAccess]

    def get_object(self):
        """
        Retrieves the UserProfile for the authenticated user, creating it if necessary.

        Returns:
            UserProfile: The profile associated with the current request's user.
        """
        profile, created = UserProfile.objects.get_or_create(user=self.request.user)
        return profile

    def perform_update(self, serializer):
        """
        Protects the public demo account profile from permanent modification.
        """
        if self.request.user.username == 'demo':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("The demo account profile is protected in public showcase mode.")
        serializer.save()


class CommentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing comments on tracks.

    Supports filtering by track ID via a query parameter so that the frontend
    can retrieve only the comments relevant to a specific track. Authentication
    is required for posting or modifying comments; reading is open to all.
    """

    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, BlockDemoWriteAccess]

    def get_queryset(self):
        """
        Returns comments ordered by date, optionally filtered by track ID.

        If a 'track' query parameter is present in the request, the queryset
        is restricted to comments belonging to that track.

        Returns:
            QuerySet: A queryset of Comment objects, most recent first.
        """
        queryset = Comment.objects.all().order_by('-posted_at')
        request = getattr(self, 'request', None)
        track_id = request.query_params.get('track') if request else None
        if track_id:
            queryset = queryset.filter(track_id=track_id)
        return queryset

    def perform_create(self, serializer):
        """
        Saves a new comment and assigns the authenticated user as its author.

        Args:
            serializer: The validated CommentSerializer instance ready to be saved.
        """
        serializer.save(user=self.request.user)


class LikeViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing likes on tracks.

    Supports filtering by track ID or by the authenticated user. When a track
    ID is provided as a query parameter, all likes for that track are returned.
    When no track ID is given and the user is authenticated, only that user's
    likes are returned. Unauthenticated requests without a track filter receive
    an empty queryset.
    """

    serializer_class = LikeSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, BlockDemoWriteAccess]

    def get_queryset(self):
        """
        Returns a filtered queryset of likes based on query parameters and authentication.

        Returns:
            QuerySet: A queryset of Like objects matching the current filter criteria.
        """
        queryset = Like.objects.all()
        request = getattr(self, 'request', None)
        track_id = request.query_params.get('track') if request else None
        if track_id:
            return queryset.filter(track_id=track_id)

        if request and request.user.is_authenticated:
            return queryset.filter(user=request.user)

        return queryset.none()

    def perform_create(self, serializer):
        """
        Saves a new like and assigns the authenticated user as its author.

        Args:
            serializer: The validated LikeSerializer instance ready to be saved.
        """
        serializer.save(user=self.request.user)


class UserProfileViewSet(viewsets.ModelViewSet):
    """
    ViewSet for accessing and managing all user profiles.

    Provides standard CRUD operations over the UserProfile model. This endpoint
    is intended for administrative use or for fetching public profile data.
    """

    queryset = UserProfile.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, BlockDemoWriteAccess]


class PlaylistTrackViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing the track-playlist relationships.

    Provides standard CRUD operations over the PlaylistTrack intermediary model,
    which controls which tracks belong to which playlists and in what order.
    """

    queryset = PlaylistTrack.objects.all()
    serializer_class = PlaylistTrackSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, BlockDemoWriteAccess]


class RegisterView(generics.CreateAPIView):
    """
    View for creating new user accounts.

    This endpoint is publicly accessible and does not require authentication.
    It delegates to the RegisterSerializer, which handles password hashing
    through Django's create_user method.
    """

    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer