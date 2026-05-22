from contextlib import asynccontextmanager

import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from vertiflow.core.config import settings
from vertiflow.db.database import engine, AsyncSessionLocal
from vertiflow.db.timescale import init_timescale
from vertiflow.routers import analytics, auth, config, controls, ingest, telemetry


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_timescale(engine)

    # ── DEV MODE: seed demo user + user-farm link ──────────────────────
    if settings.DEBUG:
        try:
            async with AsyncSessionLocal() as db:
                await db.execute(text("""
                    INSERT INTO public.profiles (id, easy_share_id, full_name, created_at, updated_at)
                    VALUES ('dev-demo-user', 'VF-DEV001', 'Demo User', NOW(), NOW())
                    ON CONFLICT (id) DO NOTHING
                """))
                await db.execute(text("""
                    INSERT INTO public.user_farms (profile_id, farm_id, role)
                    VALUES ('dev-demo-user', 'farm-demo-01', 'owner')
                    ON CONFLICT (profile_id, farm_id) DO NOTHING
                """))
                await db.commit()
                logging.info("[DevMode] Demo user seeded successfully.")
        except Exception as exc:
            logging.warning("[DevMode] Failed to seed demo user (non-fatal): %s", exc)

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
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(analytics.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(config.router, prefix="/api")
app.include_router(controls.router, prefix="/api")
app.include_router(ingest.router, prefix="/api")
app.include_router(telemetry.router, prefix="/api")



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
    
    import sys
    return {
        "status": "ok" if db_status == "ok" else "degraded",
        "database": db_status,
        "database_host": db_host,
        "service": settings.APP_NAME,
        "version": "0.1.0",
        "env": {
            "python": sys.version.split()[0],
            "debug": settings.DEBUG,
            "has_supabase_url": bool(settings.SUPABASE_URL),
            "has_database_url": bool(settings.DATABASE_URL),
            "db_url_redacted": settings.effective_db_url.split('@')[-1] if '@' in settings.effective_db_url else "none"
        }
    }


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logging.exception("Unhandled server error on %s %s", request.method, request.url.path, exc_info=exc)
    return JSONResponse(
        status_code=500, 
        content={"detail": "Internal server error", "error": str(exc)},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*"
        }
    )
