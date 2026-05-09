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

# In-memory caches — keyed by zone_id
_alert_cache:   dict[str, list[dict[str, Any]]] = {}
_last_alerted:  dict[tuple[str, str], float]    = {}

_ALERT_COOLDOWN_S = 60  # minimum seconds between writes for the same alert config


# ── Cache management ──────────────────────────────────────────────────────────

async def refresh_alerts(zone_id: str) -> None:
    """Load all enabled alert configs from DB for *zone_id* into the cache.
    Called by telemetry.py at WebSocket connect time.
    """
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
        log.info(
            "Alert engine: loaded %d config(s) for zone %s",
            len(_alert_cache[zone_id]), zone_id,
        )
    except Exception as exc:
        log.debug("Alert engine: could not load configs for %s: %s", zone_id, exc)


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
    if val is None:
        return False
    fn = _OPS.get(operator)
    return fn(val, threshold) if fn else False


# ── Main evaluation entry-point ───────────────────────────────────────────────

async def check(
    zone_id:  str,
    farm_id:  str,
    readings: dict[str, float | None],
) -> None:
    """Evaluate all cached alert configs for *zone_id* against *readings*.

    Inserts a row into alerts_history whenever conditions are met and the
    cooldown has elapsed.  Must be awaited in the telemetry loop.
    """
    configs = _alert_cache.get(zone_id)
    if not configs:
        return

    now    = time.monotonic()
    now_dt = datetime.now(timezone.utc)

    for cfg in configs:
        cfg_id     = cfg["id"]
        cfg_name   = cfg.get("name", cfg_id)
        severity   = cfg.get("severity", "warning")
        conditions = cfg.get("conditions") or []

        # ── Condition check (ALL must pass) ───────────────────────────────
        try:
            all_met = all(
                _eval_condition(
                    readings,
                    c["sensor_type"],
                    c["operator"],
                    float(c["value"]),
                )
                for c in conditions
                if isinstance(c, dict)
            )
        except Exception as exc:
            log.debug("Alert %s condition error: %s", cfg_id, exc)
            continue

        if not all_met:
            continue

        # ── Cooldown check ────────────────────────────────────────────────
        key = (zone_id, cfg_id)
        if now - _last_alerted.get(key, 0.0) < _ALERT_COOLDOWN_S:
            continue
        _last_alerted[key] = now

        # ── Derive message ────────────────────────────────────────────────
        trig_sensor = conditions[0]["sensor_type"] if conditions else "unknown"
        trig_val    = readings.get(trig_sensor)
        message     = (
            f"Alert '{cfg_name}': {trig_sensor} = {trig_val} "
            f"(zone {zone_id})"
        )

        # ── Persist to alerts_history ─────────────────────────────────────
        try:
            async with AsyncSessionLocal() as db:
                await log_alert(
                    db,
                    time=now_dt,
                    farm_id=farm_id,
                    zone_id=zone_id,
                    device_id=f"{zone_id}:{trig_sensor}",
                    alert_type=cfg_id,
                    severity=severity,
                    message=message,
                )
                await db.commit()
            log.info(
                "Alert '%s' triggered (zone=%s, severity=%s, %s=%s)",
                cfg_name, zone_id, severity, trig_sensor, trig_val,
            )
        except Exception as exc:
            log.debug("Alert %s DB persist error: %s", cfg_id, exc)
