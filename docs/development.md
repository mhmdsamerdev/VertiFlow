# VertiFlow - Development Guide

## Stack

| Layer    | Tech                                                      |
|----------|-----------------------------------------------------------|
| Backend  | FastAPI · Pydantic v2 · SQLAlchemy (Async) · WebSockets   |
| Frontend | React · Vite · Tailwind CSS |
| Packaging| Hatch · PyPI · Twine |

## Development Setup

### 1. Database
Run the database using Docker:
```bash
docker compose up -d
```

### 2. Backend Development
The backend is located in `src/vertiflow`. To run it in development mode with auto-reload:
```bash
# From the root directory
pip install -e .
vertiflow start --dev
```

### 3. Frontend Development
To run the frontend with Vite's HMR (Hot Module Replacement):

First Terminal
```bash
cd frontend
npm install
npm run dev
```
The frontend will be available at `http://localhost:5173`.

Second Terminal:
```bash
cd backend
.venv\Scripts\activate && uvicorn app.main:app --reload --port 8000
```

## Architecture

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

## Publishing to PyPI

Follow these steps to build and publish a new version of the VertiFlow package.

### 1. Build the Frontend
Ensure the React frontend is built and bundled.
```bash
cd frontend
npm run build
cd ..
```

### 2. Bundle Static Assets
Copy the built frontend files into the Python package source.

**Windows:**
```powershell
if (Test-Path src\vertiflow\static) { Remove-Item -Recurse -Force src\vertiflow\static }
New-Item -ItemType Directory -Path src\vertiflow\static
Copy-Item -Recurse -Force frontend\dist\* src\vertiflow\static\
```

### 3. Build the Python Package
Use the `build` module to create the source distribution and wheel.
```bash
python -m build
```

### 4. Upload to PyPI
Use `twine` to upload the generated files in `dist/`.
```bash
python -m twine upload dist/*
```

---

## Testing
### Database Checks
Verify database connectivity and initialization:
```bash
vertiflow check-db
```