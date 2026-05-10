"""
Alert engine — checks sensor readings against user-defined alert configs
on every telemetry tick.

Alert configs are loaded from DB per-zone at WS connect time and cached.
A cooldown (_ALERT_COOLDOWN_S) prevents duplicate alerts being written
on every tick when a sensor is continuously out of range.
"""
from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import text

from app.db.database import AsyncSessionLocal
from app.db.queries import log_alert

log = logging.getLogger(__name__)

# In-memory caches
_alert_cache:      dict[str, list[dict[str, Any]]] = {}
_last_alerted:     dict[tuple[str, str], float]    = {}
_fault_start_times: dict[tuple[str, str], float]    = {}

# History for trends
_reading_history: dict[str, dict[str, list[tuple[float, float]]]] = {}

_ALERT_COOLDOWN_S = 300   # 5 mins cooldown for same alert
_HISTORY_LIMIT_S  = 28800 # 8 hours


# ── Cache management ──────────────────────────────────────────────────────────

async def refresh_alerts(zone_id: str) -> None:
    """Load all enabled alert configs from DB for *zone_id* into the cache."""
    try:
        async with AsyncSessionLocal() as db:
            rows = await db.execute(
                text(
                    "SELECT id, name, severity, conditions "
                    "FROM alert_configs "
                    "WHERE zone_id=:zid AND enabled=TRUE "
                    "ORDER BY created_at"
                ),
                {"zid": zone_id},
            )
            _alert_cache[zone_id] = [dict(r._mapping) for r in rows]
    except Exception: pass


# ── Condition evaluation (shared helper) ──────────────────────────────────────

_OPS = {
    ">":  lambda a, b: a > b,
    "<":  lambda a, b: a < b,
    ">=": lambda a, b: a >= b,
    "<=": lambda a, b: a <= b,
    "==": lambda a, b: abs(a - b) < 1e-6,
    "!=": lambda a, b: abs(a - b) >= 1e-6,
}


def _eval_condition(
    readings: dict[str, float | None],
    sensor_type: str,
    operator: str,
    threshold: float,
) -> bool:
    val = readings.get(sensor_type)
    if val is None: return False
    fn = _OPS.get(operator)
    return fn(val, threshold) if fn else False


# ── Helpers ──────────────────────────────────────────────────────────────────

def _get_fault_duration(key: tuple[str, str], is_fault: bool) -> float:
    now = time.monotonic()
    if is_fault:
        if key not in _fault_start_times:
            _fault_start_times[key] = now
        return now - _fault_start_times[key]
    else:
        _fault_start_times.pop(key, None)
        return 0.0


async def _trigger_system_alert(
    db: Any,
    zone_id: str,
    farm_id: str,
    alert_type: str,
    severity: str,
    message: str,
    device_id: str | None = None
) -> None:
    now = time.monotonic()
    did = device_id or zone_id
    key = (zone_id, alert_type, did) # Include device_id in cooldown key
    
    # Cooldown to prevent spam
    if now - _last_alerted.get(key, 0.0) < _ALERT_COOLDOWN_S:
        return
    
    _last_alerted[key] = now
    await log_alert(
        db,
        time=datetime.now(timezone.utc),
        farm_id=farm_id,
        zone_id=zone_id,
        device_id=device_id or zone_id,
        alert_type=alert_type,
        severity=severity,
        message=message,
    )
    log.info("Alert: %s", message)


# ── Main evaluation entry-point ───────────────────────────────────────────────

async def check(
    zone_id:  str,
    farm_id:  str,
    payload:  dict,
) -> None:
    readings      = payload.get("readings", {})
    sensor_health = payload.get("sensor_health", {})
    now_mono      = time.monotonic()
    now_dt        = datetime.now(timezone.utc)

    # ── 1. Track History ─────────────────────────────────────────────────────
    if zone_id not in _reading_history: _reading_history[zone_id] = {}
    for st, val in readings.items():
        if val is None: continue
        if st not in _reading_history[zone_id]: _reading_history[zone_id][st] = []
        hist = _reading_history[zone_id][st]
        hist.append((now_mono, val))
        while hist and (now_mono - hist[0][0]) > _HISTORY_LIMIT_S: hist.pop(0)

    async with AsyncSessionLocal() as db:
        # DEBUG: Log the structure of the incoming health data
        if sensor_health:
            log.info("[Alert Engine] Processing %d health entries for zone %s", len(sensor_health), zone_id)
            # Log first entry to check keys/values
            sample_key = next(iter(sensor_health))
            log.info("[Alert Engine] Sample Entry (%s): %s", sample_key, sensor_health[sample_key])

        # ── 2. Hardware Health (Test Mode: 10s soak) ────────────────────────
        for st, health in sensor_health.items():
            if not isinstance(health, dict): continue
            
            did = f"{zone_id}:{st}"
            batt = health.get("battery", 100.0)
            online = health.get("online", True)
            
            # DEBUG LOG - UNCOMMENTED FOR ACTIVE TROUBLESHOOTING
            if batt <= 20 or not online:
                log.info("[Alert Engine] Zone: %s | Sensor: %s | Batt: %s | Online: %s", zone_id, st, batt, online)

            # Offline
            if _get_fault_duration((zone_id, f"OFFLINE_{st}"), not online) > 10:
                await _trigger_system_alert(db, zone_id, farm_id, "DEVICE_OFFLINE", "critical", f"Hardware Alert: The {st} sensor has stopped responding.", did)
            
            # Battery
            if batt <= 5.0:
                await _trigger_system_alert(db, zone_id, farm_id, "BATTERY_CRITICAL", "critical", f"Critical: {st} battery is at {batt}%. Replace immediately.", did)
            elif batt <= 20.0:
                dur = _get_fault_duration((zone_id, f"BATT_LOW_{st}"), True)
                if dur > 10: # 10s soak for testing
                    log.info("[Alert Engine] !!! TRIGGERING BATTERY ALERT !!! for %s (Duration: %s)", st, dur)
                    await _trigger_system_alert(db, zone_id, farm_id, "BATTERY_LOW", "warning", f"Low Battery: The {st} sensor is running low ({batt}%).", did)
            else:
                _get_fault_duration((zone_id, f"BATT_LOW_{st}"), False)

        # ── 3. Automation Conflicts (Fast response: 10s) ─────────────────────
        from app.routers.controls import _zone_states, _ensure_zone
        _ensure_zone(zone_id)
        acts = _zone_states.get(zone_id, {})
        
        is_conflict = acts.get("heater", {}).get("state") and acts.get("cooling_fan", {}).get("state")
        if _get_fault_duration((zone_id, "CONFLICT"), is_conflict) > 10:
            await _trigger_system_alert(db, zone_id, farm_id, "SYSTEM_CONFLICT", "critical", "Safety Alert: Heater and Cooling Fan are both active!")

        # ── 4. Environment (Duration: 10 mins) ───────────────────────────────
        for st, val in readings.items():
            if val is None: continue
            
            # Implausible (Instant Alert)
            if st == "air_temp" and (val > 60 or val < -5):
                await _trigger_system_alert(db, zone_id, farm_id, "SENSOR_ERROR", "critical", f"Sensor Malfunction: {st} is reporting an impossible value ({val}). Hardware inspection required.")

        # ── 5. Standard User Alerts (Duration: 10 mins) ─────────────────────
        configs = _alert_cache.get(zone_id, [])
        for cfg in configs:
            try:
                all_met = all(_eval_condition(readings, c["sensor_type"], c["operator"], float(c["value"])) for c in cfg.get("conditions", []) if isinstance(c, dict))
                
                # REQUIRE 10 MINUTES OF SUSTAINED VIOLATION
                if _get_fault_duration((zone_id, f"USER_{cfg['id']}"), all_met) > 600:
                    name = cfg.get("name", "Environmental Issue")
                    await _trigger_system_alert(db, zone_id, farm_id, f"USER_{cfg['id']}", cfg.get("severity", "warning"), f"Sustained {name}: Environment has been outside limits for over 10 minutes.")
            except Exception: pass

        # ── 6. Growth Cycle ──────────────────────────────────────────────────
        try:
            res = await db.execute(text("SELECT crop_name, harvest_date FROM grow_cycles WHERE zone_id=:zid AND status='active' LIMIT 1"), {"zid": zone_id})
            cycle = res.fetchone()
            if cycle:
                h_date = cycle._mapping["harvest_date"]
                if isinstance(h_date, str): h_date = datetime.fromisoformat(h_date.replace('Z', '+00:00'))
                days_left = (h_date - now_dt).days
                if days_left == 0:
                    await _trigger_system_alert(db, zone_id, farm_id, "HARVEST_READY", "success", f"Success! Your {cycle._mapping['crop_name']} is ready for harvest today.")
                elif days_left < 0:
                    await _trigger_system_alert(db, zone_id, farm_id, "HARVEST_OVERDUE", "warning", f"Attention: The {cycle._mapping['crop_name']} harvest is overdue. Quality may decline.")
        except Exception: pass

        await db.commit()
