# VertiFlow - Development Guide

## Stack

| Layer    | Tech                                                      |
|----------|-----------------------------------------------------------|
| Backend  | FastAPI · Pydantic v2 · SQLAlchemy (Async) · WebSockets   |
| Frontend | React · Vite · Tailwind CSS |
| Packaging| Hatch · PyPI · Twine |

## Self-hosted Development Setup

### 1. Database
Run the database using Docker:
```bash
docker compose up -d
```

### 2. Backend Development
The backend is located in `src/vertiflow`. To run it in development mode with auto-reload:
```bash
cd src/vertiflow
.\venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

### 3. Frontend Development
To run the frontend with Vite's HMR (Hot Module Replacement):

```bash
cd frontend
npm run dev
```
The frontend will be available at `http://localhost:5173`.

## Architecture

Outdated (being refactored):
```
VertiFlow/
├── src/vertiflow/       # Main Python Package
│   ├── cli.py           # CLI Entry Point
│   ├── main.py          # FastAPI App + Static Serving
│   ├── routers/         # API & WebSocket Endpoints
│   ├── models/          # Pydantic & SQLAlchemy Models
│   ├── db/              # Database Connection & Migrations
│   └── static/          # Bundled Frontend Assets (built)
├── frontend/            # React Application
└── pyproject.toml       # Package Configuration (Hatch)
```

## Testing

COMING SOON

## Missing Features

[] User Authentication
[] Role-based Access Control
[] Multi-Device Support
[] Yield Prediction