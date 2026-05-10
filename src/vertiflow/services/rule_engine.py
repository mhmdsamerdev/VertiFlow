"""
Rule engine — evaluates automation rules on each telemetry tick.

Rules are loaded from DB per-zone at WS connect time and cached in memory.
Each rule has JSON `conditions` (AND-logic) and `actions` (actuator commands).

Cooldown: a rule cannot re-fire within _COOLDOWN_S seconds to prevent thrashing.
"""
from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import text

from vertiflow.db.database import AsyncSessionLocal
from vertiflow.db.queries import log_automation_execution

log = logging.getLogger(__name__)

# In-memory caches — keyed by zone_id
_rule_cache: dict[str, list[dict[str, Any]]] = {}
_last_fired:  dict[tuple[str, str], float]   = {}

_COOLDOWN_S = 30  # seconds between re-fires of the same rule per zone


# ── Cache management ──────────────────────────────────────────────────────────

async def refresh_rules(zone_id: str) -> None:
    """Load all enabled rules from DB for *zone_id* into the in-memory cache.
    Called by telemetry.py at WebSocket connect time.
    """
    try:
        async with AsyncSessionLocal() as db:
            rows = await db.execute(
                text(
                    "SELECT id, name, conditions, actions "
                    "FROM automation_rules "
                    "WHERE zone_id=:zid AND enabled=TRUE "
                    "ORDER BY created_at"
                ),
                {"zid": zone_id},
            )
            _rule_cache[zone_id] = [dict(r._mapping) for r in rows]
        log.info(
            "Rule engine: loaded %d rule(s) for zone %s",
            len(_rule_cache[zone_id]), zone_id,
        )
    except Exception as exc:
        log.debug("Rule engine: could not load rules for %s: %s", zone_id, exc)


# ── Condition evaluation ──────────────────────────────────────────────────────

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

async def evaluate(zone_id: str, readings: dict[str, float | None]) -> None:
    """Evaluate all cached rules for *zone_id* against current *readings*.

    Must be awaited inside the telemetry loop after building the payload.
    """
    rules = _rule_cache.get(zone_id)
    if not rules:
        return

    now    = time.monotonic()
    now_dt = datetime.now(timezone.utc)

    # Lazy import to avoid circular dependency — controls owns _zone_states
    from vertiflow.routers.controls import _ensure_zone, _zone_states  # type: ignore[attr-defined]

    for rule in rules:
        rule_id    = rule["id"]
        rule_name  = rule.get("name", rule_id)
        conditions = rule.get("conditions") or []
        actions    = rule.get("actions")    or []

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
            log.debug("Rule %s condition error: %s", rule_id, exc)
            continue

        if not all_met:
            continue

        # ── Cooldown check ────────────────────────────────────────────────
        key = (zone_id, rule_id)
        if now - _last_fired.get(key, 0.0) < _COOLDOWN_S:
            continue
        _last_fired[key] = now

        # ── Fire actions ──────────────────────────────────────────────────
        fired: list[dict] = []
        try:
            _ensure_zone(zone_id)
            zone_acts = _zone_states.get(zone_id, {})

            for action in actions:
                if not isinstance(action, dict):
                    continue
                atype  = action.get("type", "")
                device = action.get("device_id", "")
                if device not in zone_acts:
                    continue
                if atype == "turn_on":
                    zone_acts[device]["state"] = True
                    zone_acts[device]["mode"]  = "rule"
                    fired.append(action)
                elif atype == "turn_off":
                    zone_acts[device]["state"] = False
                    zone_acts[device]["mode"]  = "rule"
                    fired.append(action)

            log.info(
                "Rule '%s' fired for zone %s → %s action(s)",
                rule_name, zone_id, len(fired),
            )
        except Exception as exc:
            log.warning("Rule %s action error: %s", rule_id, exc)

        # ── Persist: increment trigger_count + log execution ──────────────
        trig_sensor = conditions[0]["sensor_type"] if conditions else None
        trig_val    = readings.get(trig_sensor) if trig_sensor else None

        try:
            async with AsyncSessionLocal() as db:
                await db.execute(
                    text(
                        "UPDATE automation_rules "
                        "SET trigger_count = trigger_count + 1, "
                        "    last_triggered = :ts "
                        "WHERE id = :id"
                    ),
                    {"ts": now_dt, "id": rule_id},
                )
                await log_automation_execution(
                    db,
                    time=now_dt,
                    zone_id=zone_id,
                    rule_id=rule_id,
                    rule_name=rule_name,
                    trigger_sensor=trig_sensor,
                    trigger_value=trig_val,
                    actions_triggered=fired,
                    outcome="fired",
                )
                await db.commit()
        except Exception as exc:
            log.debug("Rule %s DB persist error: %s", rule_id, exc)
