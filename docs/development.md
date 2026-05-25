# VertiFlow - Development Guide

## Deployment & Production

- Official URL: vertiflow.vercel.app (Backend on Render, frontend on Vercel, database on Supabase)

## Tech Stack

| Layer    | Tech                                                      |
|----------|-----------------------------------------------------------|
| Backend  | FastAPI · Pydantic v2 · SQLAlchemy (Async) · WebSockets   |
| Frontend | React · Vite · Tailwind CSS                               |
| Database | PostgreSQL                                                |

## Local Development Setup

### 1. Backend Setup & Run (Bare-Metal)
Create a Python virtual environment, install the backend in editable mode, and run it:
```bash
# Create a virtual environment and activate it
python -m venv venv
source venv/bin/activate

# Install the package in editable mode with dependencies
pip install -e .

# Copy environment template and configure local DB url
cp .env.example .env

# Boot the ASGI backend server
uvicorn vertiflow.main:app --reload --port 8000
```
The local API server runs at http://localhost:8000

### 2. Frontend Setup & Run
Run the frontend locally (proxies API requests via Vercel dev rewrites or local config):
```bash
cd frontend
npm install
npm run dev
```
The local UI client runs at http://localhost:5173


## Clean SaaS Architecture:

```
VertiFlow/
├── src/vertiflow/       # Main Python Backend Package
│   ├── main.py          # Pure FastAPI REST & WebSocket API Entry Point
│   ├── core/            # Settings and configuration
│   ├── db/              # Database connection logic
│   ├── routers/         # API & WebSocket endpoints
│   ├── models/          # Pydantic & SQLAlchemy models
│   └── services/        # Alert & rule engines
├── frontend/            # React Client Application
├── supabase/            # Database schema & migrations
├── pyproject.toml       # Backend package configuration
└── render.yaml          # Render production web service deployment setup
```
