from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import controls, telemetry

app = FastAPI(
    title=settings.APP_NAME,
    description="Smart Farm IoT Management Platform — Real-time hydroponics telemetry.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(controls.router)
app.include_router(telemetry.router)


@app.get("/health", tags=["system"])
async def health_check() -> dict:
    return {"status": "ok", "service": settings.APP_NAME, "version": "0.1.0"}
