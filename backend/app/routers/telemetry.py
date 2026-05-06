from __future__ import annotations

import asyncio
import json
import random
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.models.schemas import ActuatorStates, SensorReadings, TelemetryPayload

router = APIRouter(prefix="/ws", tags=["telemetry"])

# (base, drift_std, hard_min, hard_max) — mean-reverting random walk
_SENSOR_PARAMS: dict[str, tuple[float, float, float, float]] = {
    "ph":               (6.20, 0.10, 4.00,  9.00),
    "ec":               (1.80, 0.07, 0.50,  3.50),
    "air_temp":         (24.0, 0.35, 15.0,  35.0),
    "humidity":         (65.0, 1.20, 30.0,  95.0),
    "soil_moisture":    (70.0, 1.50, 10.0, 100.0),
    "light_intensity":  (450., 12.0,  0.0, 1000.),
    "co2":              (900., 20.0, 300.0, 1500.0),
}

# Mutable state — persists across messages to produce smooth drift
_state: dict[str, float] = {k: v[0] for k, v in _SENSOR_PARAMS.items()}


def _next_value(key: str) -> float:
    base, std, lo, hi = _SENSOR_PARAMS[key]
    # Ornstein–Uhlenbeck-style mean reversion
    _state[key] = _state[key] * 0.96 + base * 0.04 + random.gauss(0, std)
    return round(max(lo, min(hi, _state[key])), 2)


def _build_payload() -> dict:
    payload = TelemetryPayload(
        timestamp=datetime.now(timezone.utc),
        farm_id="farm-001",
        zone_id="zone-alpha",
        readings=SensorReadings(
            ph=_next_value("ph"),
            ec=_next_value("ec"),
            air_temp=_next_value("air_temp"),
            humidity=_next_value("humidity"),
            soil_moisture=_next_value("soil_moisture"),
            light_intensity=_next_value("light_intensity"),
            co2=_next_value("co2"),
        ),
        actuators=ActuatorStates(),
    )
    return json.loads(payload.model_dump_json())


@router.websocket("/telemetry")
async def ws_telemetry(websocket: WebSocket) -> None:
    await websocket.accept()
    try:
        while True:
            await websocket.send_json(_build_payload())
            await asyncio.sleep(2)
    except WebSocketDisconnect:
        pass
