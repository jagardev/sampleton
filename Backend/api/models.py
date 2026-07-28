"""
models.py
---------
Defines the data models for the Sampleton application.

Each class maps directly to a database table and represents a core entity of
the domain: users, audio tracks, playlists, comments, and likes.
"""

from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver


class UserProfile(models.Model):
    """
    Extends the built-in Django User model with additional profile information.

    Each user account has exactly one associated UserProfile. The profile stores
    public-facing data such as a display name, biography, location, and avatar,
    as well as the user's assigned role within the platform.

    Attributes:
        user (User): One-to-one link to Django's built-in User model.
        avatar_file (ImageField): Optional profile picture uploaded by the user.
        display_name (str): Public name shown across the interface.
        bio (str): Short personal description written by the user.
        location (str): Geographic location provided by the user.
        role (str): Permission level; either 'User' or 'Admin'.
    """

    user = models.OneToOneField(User, on_delete=models.CASCADE)
    avatar_file = models.ImageField(upload_to='avatars/', blank=True, null=True)

    display_name = models.CharField(max_length=100, blank=True)
    bio = models.TextField(max_length=500, blank=True)
    location = models.CharField(max_length=100, blank=True)

    ROLE_CHOICES = (
        ('User', 'Normal user'),
        ('Admin', 'Administrator')
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='User')

    def __str__(self):
        """Returns a readable string identifying the profile by username."""
        return f"Profile of {self.user.username}"


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """
    Signal handler that automatically creates a UserProfile for every new User.

    This function is connected to Django's post_save signal on the User model.
    It runs after a User instance is saved and, if the instance was just created,
    it initialises a corresponding UserProfile with default values.

    Args:
        sender: The model class that triggered the signal (User).
        instance: The actual User object that was saved.
        created (bool): True if this is a new record, False if it was updated.
        **kwargs: Additional keyword arguments passed by the signal dispatcher.
    """
    if kwargs.get('raw', False):
        return
    if created:
        UserProfile.objects.get_or_create(user=instance)


class Track(models.Model):
    """
    Represents an audio sample uploaded by a user.

    A track is the central content unit of the platform. It stores the audio
    file itself alongside descriptive metadata such as title, artist, genre,
    and an optional cover image. Visibility is controlled through the
    is_public flag.

    Attributes:
        title (str): The display title of the track.
        artist (str): The name of the artist or producer.
        audio_file (FileField): The uploaded audio file.
        cover_image (ImageField): Optional artwork associated with the track.
        duration (int): Duration of the track in seconds.
        play_count (int): Number of times the track has been played.
        is_public (bool): Whether the track is visible to all users.
        upload_date (datetime): Timestamp set automatically on creation.
        genre (str): Musical genre tag for the track.
        user (User): The user who uploaded the track. Deleting a user removes
                     all of their tracks through cascade deletion.
    """

    title = models.CharField(max_length=200)
    artist = models.CharField(max_length=200, default="Unknown Artist")
    audio_file = models.FileField(upload_to='tracks/')
    cover_image = models.ImageField(upload_to='covers/', blank=True, null=True)
    duration = models.IntegerField(default=0)
    play_count = models.IntegerField(default=0)
    is_public = models.BooleanField(default=True)
    upload_date = models.DateTimeField(auto_now_add=True)
    genre = models.CharField(max_length=50, blank=True)

    user = models.ForeignKey(User, on_delete=models.CASCADE)

    def __str__(self):
        """Returns the track title as its string representation."""
        return self.title


class Comment(models.Model):
    """
    Represents a comment left by a user on a specific track.

    Comments are tied to both a track and the user who wrote them. Deleting
    either the track or the user will remove the associated comments through
    cascade deletion.

    Attributes:
        track (Track): The track this comment refers to.
        user (User): The user who posted the comment.
        content (str): The body text of the comment.
        posted_at (datetime): Timestamp set automatically on creation.
    """

    track = models.ForeignKey(Track, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)

    content = models.TextField()
    posted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        """Returns a string identifying the comment by the author's username."""
        return f"Comment by {self.user.username}"


class Like(models.Model):
    """
    Represents a like given by a user to a specific track.

    The unique_together constraint on (user, track) enforces that a user can
    only like a given track once. Attempting a duplicate will raise an
    IntegrityError at the database level.

    Attributes:
        track (Track): The track that was liked.
        user (User): The user who liked the track.
        liked_at (datetime): Timestamp set automatically on creation.
    """

    track = models.ForeignKey(Track, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)

    liked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'track')

    def __str__(self):
        """Returns a string describing the like relationship."""
        return f"{self.user.username} likes {self.track.title}"


class Playlist(models.Model):
    """
    Represents a collection of tracks grouped by a user.

    Playlists belong to a single user and can optionally have a cover image.
    Tracks are associated through the PlaylistTrack intermediary model, which
    also stores the display order of each entry.

    Attributes:
        user (User): The owner of the playlist.
        title (str): The display title of the playlist.
        cover_image (ImageField): Optional artwork for the playlist.
        is_public (bool): Whether the playlist is visible to all users.
        tracks (ManyToManyField): The tracks contained in the playlist,
                                  managed through PlaylistTrack.
    """

    user = models.ForeignKey(User, on_delete=models.CASCADE)

    title = models.CharField(max_length=200)
    cover_image = models.ImageField(upload_to='playlist_covers/', blank=True, null=True)
    is_public = models.BooleanField(default=True)

    tracks = models.ManyToManyField(Track, through='PlaylistTrack')

    def __str__(self):
        """Returns the playlist title as its string representation."""
        return self.title


class PlaylistTrack(models.Model):
    """
    Intermediary model that links a Track to a Playlist with a defined order.

    This model is used by the ManyToManyField on Playlist to store additional
    metadata about each track-playlist relationship, specifically the position
    of the track within the playlist.

    Attributes:
        track (Track): The track included in the playlist.
        playlist (Playlist): The playlist that contains the track.
        order (int): The position of the track within the playlist (ascending).
    """

    track = models.ForeignKey(Track, on_delete=models.CASCADE)
    playlist = models.ForeignKey(Playlist, on_delete=models.CASCADE)

    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        """Returns a string identifying the track's position within its playlist."""
        return f"{self.playlist.title} - {self.track.title} #{self.order}"