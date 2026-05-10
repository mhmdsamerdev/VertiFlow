from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
import hashlib

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from vertiflow.db.database import get_db
from vertiflow.db.queries import log_sensor_health, log_sensor_reading

router = APIRouter(prefix="/ingest", tags=["ingest"])


class SensorPayload(BaseModel):
    device_id: str
    api_key: str = Field(..., min_length=8)
    farm_id: str | None = None
    zone_id: str
    timestamp: datetime | None = None
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


def _pick_float(source: dict[str, Any], *keys: str) -> float | None:
    for key in keys:
        if key in source and source[key] is not None:
            return float(source[key])
    return None


def _normalize_payload(payload: dict[str, Any]) -> SensorPayload:
    readings = payload.get("readings", {}) if isinstance(payload.get("readings"), dict) else {}
    health = payload.get("health", {}) if isinstance(payload.get("health"), dict) else {}
    return SensorPayload(
        device_id=str(payload.get("device_id") or payload.get("deviceId") or ""),
        api_key=str(payload.get("api_key") or payload.get("apiKey") or ""),
        farm_id=payload.get("farm_id") or payload.get("farmId"),
        zone_id=str(payload.get("zone_id") or payload.get("zoneId") or ""),
        timestamp=payload.get("timestamp"),
        ph=_pick_float(payload, "ph") if _pick_float(payload, "ph") is not None else _pick_float(readings, "ph"),
        ec=_pick_float(payload, "ec") if _pick_float(payload, "ec") is not None else _pick_float(readings, "ec"),
        air_temp=_pick_float(payload, "air_temp", "airTemp", "temperature") if _pick_float(payload, "air_temp", "airTemp", "temperature") is not None else _pick_float(readings, "air_temp", "airTemp", "temperature"),
        humidity=_pick_float(payload, "humidity") if _pick_float(payload, "humidity") is not None else _pick_float(readings, "humidity"),
        soil_moisture=_pick_float(payload, "soil_moisture", "soilMoisture") if _pick_float(payload, "soil_moisture", "soilMoisture") is not None else _pick_float(readings, "soil_moisture", "soilMoisture"),
        light_intensity=_pick_float(payload, "light_intensity", "lightIntensity", "lux") if _pick_float(payload, "light_intensity", "lightIntensity", "lux") is not None else _pick_float(readings, "light_intensity", "lightIntensity", "lux"),
        co2=_pick_float(payload, "co2", "co_2") if _pick_float(payload, "co2", "co_2") is not None else _pick_float(readings, "co2", "co_2"),
        battery_level=float(payload.get("battery_level") or payload.get("batteryLevel") or health.get("battery") or 100.0),
        signal_strength=float(payload.get("signal_strength") or payload.get("signalStrength") or health.get("signal") or 100.0),
        is_online=bool(payload.get("is_online", payload.get("isOnline", health.get("online", True)))),
    )


@router.post("/telemetry", status_code=202)
async def ingest_telemetry(raw_payload: dict[str, Any],
                            db: AsyncSession = Depends(get_db)) -> dict:
    """Accept real sensor readings in flexible formats and normalize before storage."""
    payload = _normalize_payload(raw_payload)
    payload.timestamp = payload.timestamp or datetime.now(timezone.utc)
    if not payload.device_id or not payload.api_key or not payload.zone_id:
        raise HTTPException(400, "device_id, api_key, and zone_id are required")

    device_row = await db.execute(text("""
        SELECT d.id, d.zone_id, z.farm_id, d.api_key_hash, d.calibration_offset, d.calibration_slope
        FROM devices d
        JOIN zones z ON z.id = d.zone_id
        WHERE d.id = :id
    """), {"id": payload.device_id})
    device = device_row.one_or_none()
    if not device:
        raise HTTPException(404, "Unknown device_id")
    dm = device._mapping
    if dm["zone_id"] != payload.zone_id:
        raise HTTPException(400, "Device does not belong to provided zone_id")
    incoming_hash = hashlib.sha256(payload.api_key.encode("utf-8")).hexdigest()
    if dm["api_key_hash"] != incoming_hash:
        raise HTTPException(401, "Invalid API key")

    farm_id = payload.farm_id or dm["farm_id"]
    slope = float(dm["calibration_slope"] or 1.0)
    offset = float(dm["calibration_offset"] or 0.0)

    def calibrated(value: float | None) -> float | None:
        if value is None:
            return None
        return (value * slope) + offset

    await log_sensor_reading(
        db,
        time=payload.timestamp,
        farm_id=farm_id,
        zone_id=payload.zone_id,
        device_id=payload.device_id,
        data_source="real",
        ph=calibrated(payload.ph),
        ec=calibrated(payload.ec),
        air_temp=calibrated(payload.air_temp),
        humidity=calibrated(payload.humidity),
        soil_moisture=calibrated(payload.soil_moisture),
        light_intensity=calibrated(payload.light_intensity),
        co2=calibrated(payload.co2),
    )
    await log_sensor_health(
        db,
        time=payload.timestamp,
        farm_id=farm_id,
        zone_id=payload.zone_id,
        device_id=payload.device_id,
        sensor_type=payload.zone_id,
        battery_level=max(0.0, min(payload.battery_level, 100.0)),
        signal_strength=max(0.0, min(payload.signal_strength, 100.0)),
        is_online=payload.is_online,
    )

    await db.execute(
        text("""
            UPDATE devices
            SET last_seen=:ts,
                status=:status,
                signal_strength=:signal_strength
            WHERE id=:id
        """),
        {
            "ts": payload.timestamp,
            "id": payload.device_id,
            "status": "active" if payload.is_online else "offline",
            "signal_strength": max(0.0, min(payload.signal_strength, 100.0)),
        },
    )
    await db.commit()
    return {"accepted": True, "device_id": payload.device_id,
            "zone_id": payload.zone_id, "timestamp": payload.timestamp.isoformat()}
