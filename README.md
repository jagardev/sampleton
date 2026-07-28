# Sampleton: Audio Library App

> A full-stack audio sample-sharing platform built with Django, React, and PostgreSQL.

Try the live demo: https://sampleton.vercel.app/

Users can upload, browse, and stream audio samples, organize them into playlists, leave comments, and like their favorite tracks. The application features JWT authentication, dark mode, responsive design, and a persistent audio player.

---

## Features

- **User authentication** — Register, log in, and manage profiles with JWT-based sessions.
- **Track management** — Upload audio samples with cover art, genre tags, and metadata.
- **Playlists** — Create, manage, and share playlists of curated tracks.
- **Social interactions** — Like tracks and leave comments.
- **Persistent player** — A global audio player with playback controls, progress seeking, and volume adjustment.
- **Dark mode** — Toggleable dark/light theme with local storage persistence.
- **Responsive layout** — Optimized for desktop and mobile viewports.

---

## Tech Stack

| Layer    | Technology                                 |
| -------- | ------------------------------------------ |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS   |
| Backend  | Django 6, Django REST Framework, SimpleJWT |
| Database | PostgreSQL 15 (via Docker Compose)         |
| Auth     | JWT (access + refresh tokens)              |

---

## Project Structure

```
Sampleton/
├── Backend/                 # Django REST API
│   ├── api/                 # Models, views, serializers, URLs, tests
│   ├── core/                # Django project settings and root URL config
│   ├── media/               # User-uploaded files (gitignored)
│   ├── .env.example         # Environment variable template
│   ├── manage.py
│   ├── pytest.ini
│   └── requirements.txt
├── Frontend/                # React SPA
│   ├── src/
│   │   ├── api/             # Axios instance and interceptors
│   │   ├── components/      # Shared components (Layout, player)
│   │   └── pages/           # Page-level components
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml       # PostgreSQL service
├── .editorconfig
└── README.md
```

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- Docker Desktop (optional, for the database)

### 1. Database

Start a PostgreSQL instance with Docker Compose:

```bash
docker-compose up -d
```

### 2. Backend

```bash
cd Backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS / Linux
pip install -r requirements.txt
```

Copy the environment template and fill in your values:

```bash
cp .env.example .env
```

Run migrations and start the development server:

```bash
python manage.py migrate
python manage.py runserver
```

The API will be available at `http://localhost:8000/api/`.

### 3. Frontend

```bash
cd Frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173/`.

---

## Demo Account

For quick testing and evaluation without creating a new user, you can use the pre-configured demo account (or click **Demo Account** on the login page):

- **Username:** `demo`
- **Password:** `demopassword123`

---

## Running Tests

The backend test suite uses **pytest** with `pytest-django`:

```bash
cd Backend
pytest
```

---

## API Endpoints

| Method | Endpoint                  | Description                    |
| ------ | ------------------------- | ------------------------------ |
| POST   | `/api/register/`          | Create a new user account      |
| POST   | `/api/token/`             | Obtain JWT token pair          |
| POST   | `/api/token/refresh/`     | Refresh an access token        |
| GET    | `/api/profile/me/`        | Retrieve authenticated profile |
| PATCH  | `/api/profile/me/`        | Update authenticated profile   |
| GET    | `/api/tracks/`            | List all tracks                |
| POST   | `/api/tracks/`            | Upload a new track             |
| GET    | `/api/playlists/`         | List playlists                 |
| POST   | `/api/playlists/`         | Create a new playlist          |
| GET    | `/api/comments/?track=ID` | List comments for a track      |
| POST   | `/api/comments/`          | Post a new comment             |
| GET    | `/api/likes/?track=ID`    | List likes for a track         |
| POST   | `/api/likes/`             | Like a track                   |
| DELETE | `/api/likes/ID/`          | Unlike a track                 |

---

## Environment Variables

See [`Backend/.env.example`](Backend/.env.example) for the full list. Key variables:

| Variable      | Description                                |
| ------------- | ------------------------------------------ |
| `SECRET_KEY`  | Django secret key (required in production) |
| `DEBUG`       | Enable/disable debug mode (`True`/`False`) |
| `DB_NAME`     | PostgreSQL database name                   |
| `DB_USER`     | PostgreSQL user                            |
| `DB_PASSWORD` | PostgreSQL password                        |
| `DB_HOST`     | Database host (default: `localhost`)       |
| `DB_PORT`     | Database port (default: `5432`)            |

---

## License

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT).
