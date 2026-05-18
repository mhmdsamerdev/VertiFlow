# VertiFlow - Development Guide

## Deployment & Production

- Official URL: vertiflow.vercel.app (Primary deployed frontend, database through Render, database through Supabase)

## Tech Stack (*Outdated*)

| Layer    | Tech                                                      |
|----------|-----------------------------------------------------------|
| Backend  | FastAPI · Pydantic v2 · SQLAlchemy (Async) · WebSockets   |
| Frontend | React · Vite · Tailwind CSS |
| Packaging| Hatch · PyPI · Twine |

## Local Development Setup

### 1. Distrobox Environment Connection
```bash
distrobox enter node-env
```

### 2. Backend Setup & Run
```bash
cd src/vertiflow
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

### 3. Frontend Setup & Run
```bash
cd frontend
npm run dev
```
The local UI client mounts at http://localhost:5173


## Architecture (*Outdated*):

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