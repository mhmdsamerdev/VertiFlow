from __future__ import annotations

import asyncio
import json
import random
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.models.schemas import (
    ActuatorStates, SensorHealthEntry, SensorHealthMap, SensorReadings, TelemetryPayload
)

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

# Fault injection: occasional frozen readings / spikes for validation demo
_fault: dict[str, dict] = {k: {"type": "none", "ticks": 0, "val": 0.0} for k in _SENSOR_PARAMS}

# Sensor health simulation — battery starts at varied levels for demo variety
_BATTERY_STARTS: dict[str, float] = {
    "ph": 72.0, "ec": 38.0, "air_temp": 91.0, "humidity": 85.0,
    "soil_moisture": 17.0, "light_intensity": 64.0, "co2": 79.0,
}
_SIGNAL_STARTS: dict[str, float] = {
    "ph": 82.0, "ec": 31.0, "air_temp": 75.0, "humidity": 88.0,
    "soil_moisture": 55.0, "light_intensity": 71.0, "co2": 45.0,
}
_health: dict[str, dict] = {
    k: {"battery": _BATTERY_STARTS[k], "signal": _SIGNAL_STARTS[k]}
    for k in _BATTERY_STARTS
}


def _next_value(key: str) -> float:
    base, std, lo, hi = _SENSOR_PARAMS[key]
    fs = _fault[key]

    if fs["ticks"] > 0:
        fs["ticks"] -= 1
        return fs["val"]

    # Ornstein–Uhlenbeck-style mean reversion
    _state[key] = _state[key] * 0.96 + base * 0.04 + random.gauss(0, std)
    val = round(max(lo, min(hi, _state[key])), 2)

    # Stochastic fault injection
    r = random.random()
    if r < 0.005:    # 0.5 %: freeze for 8–12 ticks
        fs.update({"type": "frozen", "ticks": random.randint(8, 12), "val": val})
    elif r < 0.008:  # 0.3 %: spike for 3–5 ticks
        factor = random.uniform(1.20, 1.40) if random.random() > 0.5 else random.uniform(0.60, 0.80)
        fs.update({"type": "spike", "ticks": random.randint(3, 5),
                   "val": round(max(lo, min(hi, val * factor)), 2)})
        val = fs["val"]

    return val


def _next_health(key: str) -> SensorHealthEntry:
    s = _health[key]
    s["battery"] = max(0.0, min(100.0, s["battery"] + random.gauss(-0.02, 0.06)))
    # Dead battery → sensor is offline and signal drops to zero
    if s["battery"] <= 0.0:
        s["signal"] = 0.0
        return SensorHealthEntry(battery=0.0, signal=0.0, online=False)
    s["signal"] = max(5.0, min(100.0, s["signal"] + random.gauss(0.0, 2.0)))
    return SensorHealthEntry(
        battery=round(s["battery"], 1),
        signal=round(s["signal"],   1),
        online=random.random() > 0.005,
    )


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
        sensor_health=SensorHealthMap(
            ph=_next_health("ph"),
            ec=_next_health("ec"),
            air_temp=_next_health("air_temp"),
            humidity=_next_health("humidity"),
            soil_moisture=_next_health("soil_moisture"),
            light_intensity=_next_health("light_intensity"),
            co2=_next_health("co2"),
        ),
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
