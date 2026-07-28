"""
tests.py
--------
Automated test suite for the Sampleton REST API.

Tests are organised by domain: authentication, track management, playlist
management, and like/unlike behaviour. Each test class uses pytest-django
fixtures to set up isolated database state and authenticated HTTP clients,
ensuring that tests do not interfere with one another.

All test methods follow the Arrange-Act-Assert pattern: the required data is
prepared first, the API endpoint is called, and the response is then verified
against the expected outcome.
"""

import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth.models import User
from .models import Track, Playlist, PlaylistTrack, UserProfile, Like
from django.core.files.uploadedfile import SimpleUploadedFile


@pytest.fixture
def api_client():
    """
    Returns an unauthenticated DRF APIClient instance.

    Use this fixture in tests that verify behaviour for guests or for
    endpoints that do not require authentication.

    Returns:
        APIClient: A fresh, unauthenticated client.
    """
    return APIClient()


@pytest.fixture
def test_user():
    """
    Creates and returns a standard user account for use in tests.

    Returns:
        User: A User instance with the username 'testuser'.
    """
    user = User.objects.create_user(username='testuser', password='testpassword123', email='test@test.com')
    return user


@pytest.fixture
def auth_client(test_user):
    """
    Returns a DRF APIClient pre-configured with a valid JWT Bearer token.

    Obtains a token by posting credentials to the token endpoint and attaches
    the resulting access token to all subsequent requests made by this client.

    Args:
        test_user: The test_user fixture, which provides the user credentials.

    Returns:
        APIClient: An authenticated client ready to make authorised requests.
    """
    client = APIClient()
    response = client.post('/api/token/', {'username': 'testuser', 'password': 'testpassword123'}, format='json')
    token = response.data['access']
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return client


@pytest.mark.django_db
class TestAuthAndProfile:
    """
    Tests covering user registration, login, and profile retrieval.

    These tests verify that the authentication flow works end-to-end:
    a new user can register, the registered user can obtain a JWT token,
    and an authenticated user can retrieve their own profile data.
    """

    def test_register_user(self, api_client):
        """
        Verifies that a new user can register through the public registration endpoint.

        Asserts that the response status is 201 Created and that the new
        user record exists in the database.
        """
        data = {'username': 'newuser', 'password': 'newpassword123', 'email': 'new@test.com'}
        response = api_client.post('/api/register/', data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert User.objects.filter(username='newuser').exists()

    def test_login_user(self, api_client, test_user):
        """
        Verifies that a registered user can obtain a JWT access token.

        Asserts that the token endpoint responds with 200 OK and that the
        response body includes an 'access' token field.
        """
        data = {'username': 'testuser', 'password': 'testpassword123'}
        response = api_client.post('/api/token/', data, format='json')
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data

    def test_get_profile(self, auth_client, test_user):
        """
        Verifies that an authenticated user can retrieve their own profile.

        Asserts that the response status is 200 OK and that the returned
        username matches the test user's credentials.
        """
        response = auth_client.get('/api/profile/me/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['username'] == 'testuser'


@pytest.mark.django_db
class TestTracks:
    """
    Tests covering track upload and retrieval.

    These tests verify that authenticated users can upload audio tracks and
    that the resulting records are correctly stored and accessible via the API.
    """

    def test_upload_track(self, auth_client, test_user):
        """
        Verifies that an authenticated user can upload a new audio track.

        Uses a simulated audio file to submit a multipart form request and
        asserts that the response status is 201 Created and that one track
        record exists in the database with the correct title.
        """
        audio_content = b'fake_audio_data'
        audio_file = SimpleUploadedFile("test.mp3", audio_content, content_type="audio/mpeg")

        data = {
            'title': 'Test Track',
            'artist': 'Test Artist',
            'audio_file': audio_file,
            'is_public': True
        }
        response = auth_client.post('/api/tracks/', data, format='multipart')
        assert response.status_code == status.HTTP_201_CREATED
        assert Track.objects.count() == 1
        assert Track.objects.first().title == 'Test Track'

    def test_get_tracks(self, api_client, test_user):
        """
        Verifies that the track list endpoint returns all available tracks.

        Creates one track directly in the database and asserts that the
        unauthenticated list endpoint returns it correctly.
        """
        Track.objects.create(title="Track 1", artist="Artist 1", user=test_user, is_public=True, audio_file='test.mp3')
        response = api_client.get('/api/tracks/')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1


@pytest.mark.django_db
class TestPlaylists:
    """
    Tests covering playlist creation and track assignment.

    These tests verify that authenticated users can create playlists and
    associate existing tracks with them through the playlist-track endpoint.
    """

    def test_create_playlist(self, auth_client, test_user):
        """
        Verifies that an authenticated user can create a new playlist.

        Asserts that the response status is 201 Created and that one playlist
        record exists in the database with the correct title.
        """
        data = {'title': 'My Playlist', 'is_public': True}
        response = auth_client.post('/api/playlists/', data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert Playlist.objects.count() == 1
        assert Playlist.objects.first().title == 'My Playlist'

    def test_add_track_to_playlist(self, auth_client, test_user):
        """
        Verifies that a track can be added to an existing playlist.

        Creates a track and a playlist directly in the database, then posts
        to the playlist-track endpoint to associate them. Asserts that the
        response status is 201 Created and that one PlaylistTrack record exists.
        """
        track = Track.objects.create(title="Track 1", artist="Artist 1", user=test_user, is_public=True, audio_file='test.mp3')
        playlist = Playlist.objects.create(title="My Playlist", user=test_user, is_public=True)

        data = {'playlist': playlist.id, 'track': track.id, 'order': 1}
        response = auth_client.post('/api/playlists-tracks/', data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert PlaylistTrack.objects.count() == 1


@pytest.mark.django_db
class TestLikes:
    """
    Tests covering the like and unlike actions on tracks.

    These tests verify that authenticated users can like a track and
    subsequently remove that like, with the database state reflecting each
    action correctly.
    """

    def test_like_track(self, auth_client, test_user):
        """
        Verifies that an authenticated user can like a track.

        Asserts that the response status is 201 Created and that one Like
        record exists in the database.
        """
        track = Track.objects.create(title="Track 1", artist="Artist 1", user=test_user, is_public=True, audio_file='test.mp3')
        data = {'track': track.id}
        response = auth_client.post('/api/likes/', data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert Like.objects.count() == 1

    def test_unlike_track(self, auth_client, test_user):
        """
        Verifies that an authenticated user can remove an existing like.

        Creates a Like record directly in the database and sends a DELETE
        request to remove it. Asserts that the response status is 204 No Content
        and that no Like records remain in the database.
        """
        track = Track.objects.create(title="Track 1", artist="Artist 1", user=test_user, is_public=True, audio_file='test.mp3')
        like = Like.objects.create(track=track, user=test_user)
        response = auth_client.delete(f'/api/likes/{like.id}/')
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert Like.objects.count() == 0


@pytest.mark.django_db
class TestDemoProtection:
    """
    Tests ensuring that the demo user cannot perform write operations
    on any resource, protecting the public portfolio showcase from vandalism.
    """

    @pytest.fixture
    def demo_client(self):
        demo_user = User.objects.create_user(username='demo', password='demopassword123', email='demo@test.com')
        client = APIClient()
        response = client.post('/api/token/', {'username': 'demo', 'password': 'demopassword123'}, format='json')
        token = response.data['access']
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        return client

    def test_demo_cannot_upload_track(self, demo_client):
        audio_file = SimpleUploadedFile("demo_track.mp3", b'content', content_type="audio/mpeg")
        data = {'title': 'Vandalism Track', 'artist': 'Bad Actor', 'audio_file': audio_file}
        response = demo_client.post('/api/tracks/', data, format='multipart')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_demo_cannot_create_playlist(self, demo_client):
        data = {'title': 'Vandalism Playlist', 'is_public': True}
        response = demo_client.post('/api/playlists/', data, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_demo_cannot_update_profile(self, demo_client):
        data = {'display_name': 'Vandalized Name'}
        response = demo_client.patch('/api/profile/me/', data, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_demo_can_read_tracks(self, demo_client):
        response = demo_client.get('/api/tracks/')
        assert response.status_code == status.HTTP_200_OK
