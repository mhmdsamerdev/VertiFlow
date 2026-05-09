from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.database import engine
from app.db.timescale import init_timescale
from app.routers import analytics, config, controls, ingest, telemetry


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

app.include_router(analytics.router)
app.include_router(config.router)
app.include_router(controls.router)
app.include_router(ingest.router)
app.include_router(telemetry.router)


@app.get("/health", tags=["system"])
async def health_check() -> dict:
    return {"status": "ok", "service": settings.APP_NAME, "version": "0.1.0"}
