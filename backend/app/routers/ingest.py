from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.queries import log_sensor_health, log_sensor_reading

router = APIRouter(prefix="/ingest", tags=["ingest"])


class SensorPayload(BaseModel):
    device_id: str
    farm_id: str
    zone_id: str
    timestamp: datetime
    ph: float | None = None
    ec: float | None = None
    air_temp: float | None = None
    humidity: float | None = None
    soil_moisture: float | None = None
    light_intensity: float | None = None
    co2: float | None = None
    battery_level: float = 100.0
    signal_strength: float = 100.0
    is_online: bool = True


@router.post("/telemetry", status_code=202)
async def ingest_telemetry(payload: SensorPayload,
                            db: AsyncSession = Depends(get_db)) -> dict:
    """Accept a real sensor reading from an IoT device and persist it."""
    await log_sensor_reading(
        db,
        time=payload.timestamp,
        farm_id=payload.farm_id,
        zone_id=payload.zone_id,
        device_id=payload.device_id,
        ph=payload.ph,
        ec=payload.ec,
        air_temp=payload.air_temp,
        humidity=payload.humidity,
        soil_moisture=payload.soil_moisture,
        light_intensity=payload.light_intensity,
        co2=payload.co2,
    )
    # Update device last_seen + status
    await db.execute(
        text("UPDATE devices SET last_seen=:ts, status='online' WHERE id=:id"),
        {"ts": payload.timestamp, "id": payload.device_id},
    )
    await db.commit()
    return {"accepted": True, "device_id": payload.device_id,
            "zone_id": payload.zone_id, "timestamp": payload.timestamp.isoformat()}
