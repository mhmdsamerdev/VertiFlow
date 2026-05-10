from __future__ import annotations

import asyncio
import json
import logging
import random
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import text

from vertiflow.db.database import AsyncSessionLocal
from vertiflow.db.queries import log_sensor_health, log_sensor_reading
from vertiflow.models.schemas import (
    SensorHealthEntry, SensorHealthMap, SensorReadings, TelemetryPayload
)
from vertiflow.routers.controls import get_actuator_states
from vertiflow.services import alert_engine, rule_engine

log = logging.getLogger(__name__)

# ─── DB-loaded threshold cache ────────────────────────────────────────────────
# Keyed by zone_id; refreshed each time a WS client connects.
_zone_db_params: dict[str, dict[str, tuple[float, float, float, float]]] = {}

# Drift std-dev defaults per sensor type (used when building sim params from DB thresholds)
_DRIFT_STD: dict[str, float] = {
    "ph": 0.018, "ec": 0.012, "air_temp": 0.060, "humidity": 0.220,
    "soil_moisture": 0.180, "light_intensity": 3.500, "co2": 6.000,
}

async def _load_db_params(zone_id: str) -> dict[str, tuple[float, float, float, float]] | None:
    """Load zone_thresholds from DB and convert to simulation-param tuples.
    Returns None if no thresholds configured for this zone."""
    try:
        async with AsyncSessionLocal() as db:
            rows = await db.execute(
                text("SELECT sensor_type, target, warn_min, warn_max, crit_min, crit_max "
                     "FROM zone_thresholds WHERE zone_id=:zid"),
                {"zid": zone_id},
            )
            result = rows.fetchall()
            if not result:
                return None
            params: dict[str, tuple[float, float, float, float]] = {}
            for r in result:
                st = r._mapping["sensor_type"]
                target  = float(r._mapping["target"])
                crit_min = float(r._mapping["crit_min"])
                crit_max = float(r._mapping["crit_max"])
                std = _DRIFT_STD.get(st, 0.1)
                params[st] = (target, std, crit_min, crit_max)
            return params
    except Exception as exc:
        log.debug("Could not load DB thresholds for %s: %s", zone_id, exc)
        return None


async def _load_zone_farm(zone_id: str) -> str:
    """Resolve the farm_id for a zone from the DB. Falls back to hardcoded map."""
    try:
        async with AsyncSessionLocal() as db:
            row = await db.execute(
                text("SELECT farm_id FROM zones WHERE id=:zid"),
                {"zid": zone_id},
            )
            r = row.one_or_none()
            if r:
                return str(r._mapping["farm_id"])
    except Exception:
        pass
    return _ZONE_FARM.get(zone_id, "farm-001")

_SENSOR_KEYS = ("ph", "ec", "air_temp", "humidity", "soil_moisture", "light_intensity", "co2")

router = APIRouter(prefix="/ws", tags=["telemetry"])

# ─── Per-zone sensor base parameters ─────────────────────────────────────────
# (base, drift_std, hard_min, hard_max) — Ornstein–Uhlenbeck mean-reverting walk
_ZONE_SENSOR_PARAMS: dict[str, dict[str, tuple[float, float, float, float]]] = {
    "zone-alpha": {  # Butterhead Lettuce
        "ph":               (6.20, 0.018,  4.00,   9.00),
        "ec":               (1.80, 0.012,  0.50,   3.50),
        "air_temp":         (24.0, 0.060, 15.0,   35.0),
        "humidity":         (65.0, 0.220, 30.0,   95.0),
        "soil_moisture":    (70.0, 0.180, 10.0,  100.0),
        "light_intensity":  (450., 3.500,  0.0,  1000.),
        "co2":              (900., 6.000, 300.0, 1500.0),
    },
    "zone-beta": {  # Sweet Basil
        "ph":               (6.50, 0.018,  4.00,   9.00),
        "ec":               (1.60, 0.012,  0.50,   3.50),
        "air_temp":         (26.0, 0.060, 15.0,   35.0),
        "humidity":         (60.0, 0.220, 30.0,   95.0),
        "soil_moisture":    (65.0, 0.180, 10.0,  100.0),
        "light_intensity":  (580., 3.500,  0.0,  1000.),
        "co2":              (1000., 6.000, 300.0, 1500.0),
    },
    "zone-gamma": {  # Baby Spinach
        "ph":               (6.30, 0.018,  4.00,   9.00),
        "ec":               (2.00, 0.012,  0.50,   3.50),
        "air_temp":         (22.0, 0.060, 15.0,   35.0),
        "humidity":         (70.0, 0.220, 30.0,   95.0),
        "soil_moisture":    (75.0, 0.180, 10.0,  100.0),
        "light_intensity":  (340., 3.500,  0.0,  1000.),
        "co2":              (800., 6.000, 300.0, 1500.0),
    },
    "zone-delta": {  # Strawberry
        "ph":               (6.00, 0.018,  4.00,   9.00),
        "ec":               (1.40, 0.012,  0.50,   3.50),
        "air_temp":         (20.0, 0.060, 15.0,   35.0),
        "humidity":         (70.0, 0.220, 30.0,   95.0),
        "soil_moisture":    (65.0, 0.180, 10.0,  100.0),
        "light_intensity":  (390., 3.500,  0.0,  1000.),
        "co2":              (850., 6.000, 300.0, 1500.0),
    },
    "zone-epsilon": {  # Microgreens
        "ph":               (6.00, 0.018,  4.00,   9.00),
        "ec":               (1.20, 0.012,  0.50,   3.50),
        "air_temp":         (23.0, 0.060, 15.0,   35.0),
        "humidity":         (75.0, 0.220, 30.0,   95.0),
        "soil_moisture":    (80.0, 0.180, 10.0,  100.0),
        "light_intensity":  (290., 3.500,  0.0,  1000.),
        "co2":              (800., 6.000, 300.0, 1500.0),
    },
}

_FALLBACK_ZONE = "zone-alpha"

# ─── Per-zone battery / signal seed values ────────────────────────────────────
_ZONE_BATTERY_STARTS: dict[str, dict[str, float]] = {
    "zone-alpha":   {"ph": 72.0, "ec": 38.0, "air_temp": 91.0, "humidity": 85.0, "soil_moisture": 17.0, "light_intensity": 64.0, "co2": 79.0},
    "zone-beta":    {"ph": 55.0, "ec": 81.0, "air_temp": 44.0, "humidity": 92.0, "soil_moisture": 68.0, "light_intensity": 33.0, "co2": 76.0},
    "zone-gamma":   {"ph": 89.0, "ec": 22.0, "air_temp": 67.0, "humidity": 78.0, "soil_moisture": 45.0, "light_intensity": 91.0, "co2": 14.0},
    "zone-delta":   {"ph": 43.0, "ec": 76.0, "air_temp": 58.0, "humidity": 31.0, "soil_moisture": 88.0, "light_intensity": 52.0, "co2": 95.0},
    "zone-epsilon": {"ph": 67.0, "ec": 48.0, "air_temp": 83.0, "humidity": 59.0, "soil_moisture": 71.0, "light_intensity": 25.0, "co2": 88.0},
}
_ZONE_SIGNAL_STARTS: dict[str, dict[str, float]] = {
    "zone-alpha":   {"ph": 82.0, "ec": 31.0, "air_temp": 75.0, "humidity": 88.0, "soil_moisture": 55.0, "light_intensity": 71.0, "co2": 45.0},
    "zone-beta":    {"ph": 65.0, "ec": 88.0, "air_temp": 42.0, "humidity": 75.0, "soil_moisture": 61.0, "light_intensity": 84.0, "co2": 52.0},
    "zone-gamma":   {"ph": 77.0, "ec": 54.0, "air_temp": 88.0, "humidity": 43.0, "soil_moisture": 69.0, "light_intensity": 36.0, "co2": 79.0},
    "zone-delta":   {"ph": 48.0, "ec": 72.0, "air_temp": 63.0, "humidity": 91.0, "soil_moisture": 78.0, "light_intensity": 57.0, "co2": 34.0},
    "zone-epsilon": {"ph": 85.0, "ec": 39.0, "air_temp": 71.0, "humidity": 66.0, "soil_moisture": 83.0, "light_intensity": 48.0, "co2": 92.0},
}

# ─── Farm mapping ─────────────────────────────────────────────────────────────
_ZONE_FARM: dict[str, str] = {
    "zone-alpha": "farm-001", "zone-beta": "farm-001", "zone-gamma": "farm-001",
    "zone-delta": "farm-002", "zone-epsilon": "farm-002",
}

# ─── Per-zone mutable state (lazy-initialised on first connection) ─────────────
_zone_state:  dict[str, dict[str, float]] = {}
_zone_fault:  dict[str, dict[str, dict]]  = {}
_zone_health: dict[str, dict[str, dict]]  = {}


def _get_params(zone_id: str) -> dict[str, tuple[float, float, float, float]]:
    # Prefer DB-loaded params (set at WS connect time), fall back to hardcoded
    return (_zone_db_params.get(zone_id)
            or _ZONE_SENSOR_PARAMS.get(zone_id)
            or _ZONE_SENSOR_PARAMS[_FALLBACK_ZONE])


def _init_zone(zone_id: str) -> None:
    if zone_id in _zone_state:
        return
    params = _get_params(zone_id)
    _zone_state[zone_id]  = {k: v[0] for k, v in params.items()}
    _zone_fault[zone_id]  = {k: {"type": "none", "ticks": 0, "val": 0.0} for k in params}
    bat = _ZONE_BATTERY_STARTS.get(zone_id, _ZONE_BATTERY_STARTS[_FALLBACK_ZONE])
    sig = _ZONE_SIGNAL_STARTS.get(zone_id,  _ZONE_SIGNAL_STARTS[_FALLBACK_ZONE])
    _zone_health[zone_id] = {k: {"battery": bat[k], "signal": sig[k], "sig_target": sig[k]} for k in bat}


def _next_value(zone_id: str, key: str) -> float:
    base, std, lo, hi = _get_params(zone_id)[key]
    fs = _zone_fault[zone_id][key]

    if fs["ticks"] > 0:
        fs["ticks"] -= 1
        return fs["val"]

    # Ornstein–Uhlenbeck-style mean reversion
    _zone_state[zone_id][key] = _zone_state[zone_id][key] * 0.98 + base * 0.02 + random.gauss(0, std)
    val = round(max(lo, min(hi, _zone_state[zone_id][key])), 2)

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


def _next_health(zone_id: str, key: str) -> SensorHealthEntry:
    s = _zone_health[zone_id][key]
    # Battery only goes down during simulation to allow for consistent testing
    drain = abs(random.gauss(0.01, 0.02)) 
    s["battery"] = max(0.0, s["battery"] - drain)
    
    if s["battery"] <= 0.0:
        s["signal"] = 0.0
        return SensorHealthEntry(battery=0.0, signal=0.0, online=False)
    
    s["signal"] = max(5.0, min(100.0, s["signal"] * 0.97 + s["sig_target"] * 0.03 + random.gauss(0.0, 0.4)))
    return SensorHealthEntry(
        battery=round(s["battery"], 1),
        signal=round(s["signal"],   1),
        online=random.random() > 0.005,
    )


def _build_payload(zone_id: str, farm_id: str | None = None, demo_mode: bool = True) -> dict:
    _init_zone(zone_id)
    resolved_farm = farm_id or _ZONE_FARM.get(zone_id, "farm-001")
    
    readings = SensorReadings()
    sensor_health = SensorHealthMap(
        ph=SensorHealthEntry(), ec=SensorHealthEntry(), air_temp=SensorHealthEntry(),
        humidity=SensorHealthEntry(), soil_moisture=SensorHealthEntry(),
        light_intensity=SensorHealthEntry(), co2=SensorHealthEntry()
    )

    if demo_mode:
        readings = SensorReadings(
            ph=_next_value(zone_id, "ph"),
            ec=_next_value(zone_id, "ec"),
            air_temp=_next_value(zone_id, "air_temp"),
            humidity=_next_value(zone_id, "humidity"),
            soil_moisture=_next_value(zone_id, "soil_moisture"),
            light_intensity=_next_value(zone_id, "light_intensity"),
            co2=_next_value(zone_id, "co2"),
        )
        sensor_health = SensorHealthMap(
            ph=_next_health(zone_id, "ph"),
            ec=_next_health(zone_id, "ec"),
            air_temp=_next_health(zone_id, "air_temp"),
            humidity=_next_health(zone_id, "humidity"),
            soil_moisture=_next_health(zone_id, "soil_moisture"),
            light_intensity=_next_health(zone_id, "light_intensity"),
            co2=_next_health(zone_id, "co2"),
        )

    payload = TelemetryPayload(
        timestamp=datetime.now(timezone.utc),
        farm_id=resolved_farm,
        zone_id=zone_id,
        readings=readings,
        actuators=get_actuator_states(zone_id),
        sensor_health=sensor_health,
        is_demo=demo_mode
    )
    return json.loads(payload.model_dump_json())


async def _latest_real_payload(zone_id: str) -> dict | None:
    """Return the most recent real telemetry point for a zone, if any."""
    try:
        async with AsyncSessionLocal() as db:
            row = await db.execute(text("""
                SELECT time, farm_id, ph, ec, air_temp, humidity, soil_moisture, light_intensity, co2
                FROM sensor_readings
                WHERE zone_id = :zid
                  AND data_source = 'real'
                ORDER BY time DESC
                LIMIT 1
            """), {"zid": zone_id})
            latest = row.one_or_none()
            if not latest:
                return None
            m = latest._mapping
            return {
                "timestamp": m["time"].isoformat(),
                "farm_id": m["farm_id"],
                "zone_id": zone_id,
                "readings": {
                    "ph": m["ph"],
                    "ec": m["ec"],
                    "air_temp": m["air_temp"],
                    "humidity": m["humidity"],
                    "soil_moisture": m["soil_moisture"],
                    "light_intensity": m["light_intensity"],
                    "co2": m["co2"],
                },
            }
    except Exception as exc:
        log.debug("Could not fetch latest real payload for %s: %s", zone_id, exc)
        return None


@router.websocket("/telemetry/{zone_id}")
async def ws_telemetry(websocket: WebSocket, zone_id: str) -> None:
    await websocket.accept()
    
    # ── Phase 1: Immediate first payload (low latency) ──────────────────────
    # We send an initial packet using hardcoded defaults or cached params
    # so the frontend loading screen disappears instantly.
    initial_payload = _build_payload(zone_id, demo_mode=True)
    await websocket.send_json(initial_payload)

    # ── Phase 2: Background initialization ──────────────────────────────────
    # Now we do the heavy lifting (DB lookups, cache refreshes)
    db_params = await _load_db_params(zone_id)
    if db_params:
        _zone_db_params[zone_id] = db_params
        log.info("Loaded %d threshold(s) from DB for %s", len(db_params), zone_id)

    farm_id = await _load_zone_farm(zone_id)

    await rule_engine.refresh_rules(zone_id)
    await alert_engine.refresh_alerts(zone_id)

    try:
        while True:
            # ── Check Demo Mode status for this farm ─────────────────────
            demo_mode = False
            async with AsyncSessionLocal() as db:
                row = await db.execute(text("SELECT demo_mode FROM farms WHERE id=:fid"), {"fid": farm_id})
                r = row.one_or_none()
                if r: demo_mode = bool(r._mapping["demo_mode"])

            payload_dict = _build_payload(zone_id, farm_id, demo_mode=demo_mode)
            latest_real = await _latest_real_payload(zone_id)
            if latest_real:
                # If we are in Live Mode (demo_mode=False), real data is mandatory.
                # If we are in Demo Mode, real data can still overwrite simulated if user wants.
                payload_dict["timestamp"] = latest_real["timestamp"]
                payload_dict["readings"] = latest_real["readings"]
                # In a real system, we'd also fetch real sensor_health here.
            
            await websocket.send_json(payload_dict)
            if demo_mode:
                await _persist_telemetry(zone_id, payload_dict)

            # ── Run engines on every tick ─────────────────────────────────
            await rule_engine.evaluate(zone_id, payload_dict.get("readings", {}))
            await alert_engine.check(zone_id, farm_id, payload_dict)

            await asyncio.sleep(3)
    except WebSocketDisconnect:
        pass


async def _persist_telemetry(zone_id: str, payload: dict) -> None:
    """Fire-and-forget: persist readings + health to TimescaleDB."""
    try:
        farm_id  = payload["farm_id"]
        ts       = datetime.fromisoformat(payload["timestamp"])
        readings = payload["readings"]
        health   = payload["sensor_health"]

        async with AsyncSessionLocal() as db:
            await log_sensor_reading(
                db,
                time=ts, farm_id=farm_id, zone_id=zone_id,
                device_id=zone_id,
                data_source="simulated",
                ph=readings.get("ph"), ec=readings.get("ec"),
                air_temp=readings.get("air_temp"), humidity=readings.get("humidity"),
                soil_moisture=readings.get("soil_moisture"),
                light_intensity=readings.get("light_intensity"), co2=readings.get("co2"),
            )
            for sk in _SENSOR_KEYS:
                h = health.get(sk, {})
                await log_sensor_health(
                    db,
                    time=ts, farm_id=farm_id, zone_id=zone_id,
                    device_id=f"{zone_id}:{sk}", sensor_type=sk,
                    battery_level=h.get("battery", 0.0),
                    signal_strength=h.get("signal", 0.0),
                    is_online=h.get("online", False),
                )
            await db.commit()
    except Exception as exc:
        log.debug("DB persist skipped: %s", exc)
