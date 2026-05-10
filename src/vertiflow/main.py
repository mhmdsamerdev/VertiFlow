from contextlib import asynccontextmanager

import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import os
from pathlib import Path

from vertiflow.core.config import settings
from vertiflow.db.database import engine
from vertiflow.db.timescale import init_timescale
from vertiflow.routers import analytics, config, controls, ingest, telemetry


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_timescale(engine)
    yield


app = FastAPI(
    title=settings.APP_NAME,
    description="Smart Farm IoT Management Platform — Real-time hydroponics telemetry.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analytics.router, prefix="/api")
app.include_router(config.router, prefix="/api")
app.include_router(controls.router, prefix="/api")
app.include_router(ingest.router, prefix="/api")
app.include_router(telemetry.router, prefix="/api")


# ── Static File Serving ────────────────────────────────────────────────────────

# We resolve the path to the 'static' directory relative to this file
STATIC_DIR = Path(__file__).parent / "static"

if STATIC_DIR.exists():
    # Mount the /assets directory for direct file access (CSS, JS, images)
    assets_dir = STATIC_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        # 0. Prevent serving index.html for missing /api routes
        if full_path.startswith("api/"):
            return JSONResponse(status_code=404, content={"detail": f"API route not found: {full_path}"})

        # 1. Try to serve a specific file if it exists
        file_path = STATIC_DIR / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        
        # 2. Fallback to index.html for SPA routing (React Router)
        index_file = STATIC_DIR / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        
        return JSONResponse(status_code=404, content={"detail": "Not Found"})
else:
    logging.warning("Static directory not found at %s. Frontend will not be served.", STATIC_DIR)
@app.get("/")
@app.head("/")
async def root_path_redirect():
    return JSONResponse(status_code=200, content={"message": "VertiFlow API is running"})


@app.get("/api/health", tags=["system"], include_in_schema=True)
async def health_check() -> dict:
    from sqlalchemy import text
    from urllib.parse import urlparse
    db_status = "ok"
    db_host = "unknown"
    try:
        # Redact the password and user for security
        db_url = settings.effective_db_url
        parsed = urlparse(db_url)
        db_host = parsed.hostname or "none"
        
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
            
        if "127.0.0.1:54322" in db_url:
            db_status = "warning: using local default database instead of production"
    except Exception as e:
        db_status = f"error: {str(e)}"
        if "127.0.0.1:54322" in settings.effective_db_url:
            db_status += " (Check if SUPABASE_URL env var is set on Render)"
    
    return {
        "status": "ok" if db_status == "ok" else "degraded",
        "database": db_status,
        "database_host": db_host,
        "service": settings.APP_NAME,
        "version": "0.1.0"
    }


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logging.exception("Unhandled server error on %s %s", request.method, request.url.path, exc_info=exc)
    return JSONResponse(
        status_code=500, 
        content={"detail": "Internal server error", "error": str(exc)}
    )
