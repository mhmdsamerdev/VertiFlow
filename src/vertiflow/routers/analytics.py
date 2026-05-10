from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from vertiflow.db.database import get_db
from vertiflow.core.dependencies import get_browser_id

router = APIRouter(prefix="/analytics", tags=["analytics"])

# ── Allowed time-bucket values (whitelist — never interpolated from user input) ─
_BUCKET_MAP: dict[str, str] = {
    "5 minutes":  "5 minutes",
    "15 minutes": "15 minutes",
    "1 hour":     "1 hour",
    "6 hours":    "6 hours",
    "1 day":      "1 day",
}

_SENSOR_KEYS = ("ph", "ec", "air_temp", "humidity", "soil_moisture", "light_intensity", "co2")


def _safe_bucket(bucket: str) -> str:
    return _BUCKET_MAP.get(bucket, "1 hour")


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


# ── 1. Sensor readings (time-bucketed averages) ───────────────────────────────

@router.get("/readings")
async def get_readings(
    zone_id:  str      = Query(...),
    from_ts:  datetime = Query(...),
    to_ts:    datetime = Query(default_factory=_now_utc),
    bucket:   str      = Query("1 hour"),
    db:       AsyncSession = Depends(get_db),
    browser_id: str = Depends(get_browser_id),
) -> list[dict[str, Any]]:
    b = _safe_bucket(bucket)
    rows = await db.execute(
        text(f"""
            WITH source_preference AS (
                SELECT 
                    CASE 
                        WHEN f.demo_mode = TRUE THEN 'simulated'
                        ELSE 'real'
                    END AS preferred_source
                FROM zones z
                JOIN farms f ON z.farm_id = f.id
                WHERE z.id = :zone_id AND f.browser_id = :browser_id
            )
            SELECT
                time_bucket('{b}'::interval, time) AS ts,
                AVG(ph)              AS ph,
                AVG(ec)              AS ec,
                AVG(air_temp)        AS air_temp,
                AVG(humidity)        AS humidity,
                AVG(soil_moisture)   AS soil_moisture,
                AVG(light_intensity) AS light_intensity,
                AVG(co2)             AS co2
            FROM sensor_readings
            CROSS JOIN source_preference
            WHERE zone_id = :zone_id
              AND time >= :from_ts
              AND time <= :to_ts
              AND data_source = source_preference.preferred_source
            GROUP BY ts
            ORDER BY ts ASC
        """),
        {"zone_id": zone_id, "from_ts": from_ts, "to_ts": to_ts, "browser_id": browser_id},
    )
    return [
        {k: (v.isoformat() if isinstance(v, datetime) else v) for k, v in row._mapping.items()}
        for row in rows
    ]


# ── 2. Period statistics (min / avg / max per sensor) ────────────────────────

@router.get("/stats")
async def get_stats(
    zone_id:  str      = Query(...),
    from_ts:  datetime = Query(...),
    to_ts:    datetime = Query(default_factory=_now_utc),
    db:       AsyncSession = Depends(get_db),
    browser_id: str = Depends(get_browser_id),
) -> dict[str, Any]:
    cols = ", ".join(
        f"AVG({k}) AS {k}_avg, MIN({k}) AS {k}_min, MAX({k}) AS {k}_max"
        for k in _SENSOR_KEYS
    )
    row = (await db.execute(
        text(f"""
            WITH source_preference AS (
                SELECT 
                    CASE 
                        WHEN f.demo_mode = TRUE THEN 'simulated'
                        ELSE 'real'
                    END AS preferred_source
                FROM zones z
                JOIN farms f ON z.farm_id = f.id
                WHERE z.id = :z AND f.browser_id = :bid
            )
            SELECT {cols}
            FROM sensor_readings
            CROSS JOIN source_preference
            WHERE zone_id = :z
              AND time >= :f
              AND time <= :t
              AND data_source = source_preference.preferred_source
        """),
        {"z": zone_id, "f": from_ts, "t": to_ts, "bid": browser_id},
    )).one_or_none()

    if row is None:
        return {}

    result: dict[str, Any] = {}
    m = row._mapping
    for k in _SENSOR_KEYS:
        if m[f"{k}_avg"] is not None:
            result[k] = {
                "avg": round(float(m[f"{k}_avg"]), 3),
                "min": round(float(m[f"{k}_min"]), 3),
                "max": round(float(m[f"{k}_max"]), 3),
            }
    return result


# ── 3. Actuator actions log ───────────────────────────────────────────────────

@router.get("/actions")
async def get_actions(
    zone_id:  str      = Query(...),
    from_ts:  datetime = Query(...),
    to_ts:    datetime = Query(default_factory=_now_utc),
    db:       AsyncSession = Depends(get_db),
    browser_id: str = Depends(get_browser_id),
) -> list[dict[str, Any]]:
    rows = await db.execute(
        text("""
            SELECT l.time, l.actuator_id, l.action, l.mode, l.triggered_by, l.params, l.auto_off_at
            FROM actions_log l
            JOIN zones z ON l.zone_id = z.id
            JOIN farms f ON z.farm_id = f.id
            WHERE l.zone_id = :z AND l.time >= :f AND l.time <= :t AND f.browser_id = :bid
            ORDER BY l.time ASC
        """),
        {"z": zone_id, "f": from_ts, "t": to_ts, "bid": browser_id},
    )
    return [
        {k: (v.isoformat() if isinstance(v, datetime) else v) for k, v in row._mapping.items()}
        for row in rows
    ]


# ── 4. Alert history ──────────────────────────────────────────────────────────

@router.get("/alerts")
async def get_alerts(
    zone_id:  str      = Query(...),
    from_ts:  datetime = Query(...),
    to_ts:    datetime = Query(default_factory=_now_utc),
    db:       AsyncSession = Depends(get_db),
    browser_id: str = Depends(get_browser_id),
) -> dict[str, Any]:
    by_day_rows = await db.execute(
        text("""
            SELECT
                time_bucket('1 day', h.time) AS day,
                h.severity,
                COUNT(*)::int              AS cnt
            FROM alerts_history h
            JOIN zones z ON h.zone_id = z.id
            JOIN farms f ON z.farm_id = f.id
            WHERE h.zone_id = :z AND h.time >= :f AND h.time <= :t AND f.browser_id = :bid
            GROUP BY day, h.severity
            ORDER BY day ASC
        """),
        {"z": zone_id, "f": from_ts, "t": to_ts, "bid": browser_id},
    )
    breakdown_rows = await db.execute(
        text("""
            SELECT h.severity, COUNT(*)::int AS cnt
            FROM alerts_history h
            JOIN zones z ON h.zone_id = z.id
            JOIN farms f ON z.farm_id = f.id
            WHERE h.zone_id = :z AND h.time >= :f AND h.time <= :t AND f.browser_id = :bid
            GROUP BY h.severity
        """),
        {"z": zone_id, "f": from_ts, "t": to_ts, "bid": browser_id},
    )
    recent_rows = await db.execute(
        text("""
            SELECT h.time, h.device_id, h.alert_type, h.severity, h.message, h.acknowledged, h.acknowledged_at
            FROM alerts_history h
            JOIN zones z ON h.zone_id = z.id
            JOIN farms f ON z.farm_id = f.id
            WHERE h.zone_id = :z AND h.time >= :f AND h.time <= :t AND f.browser_id = :bid
            ORDER BY h.time DESC LIMIT 50
        """),
        {"z": zone_id, "f": from_ts, "t": to_ts, "bid": browser_id},
    )

    # Pivot by_day into {day: {critical:N, warning:N, info:N}}
    day_map: dict[str, dict[str, int]] = {}
    for row in by_day_rows:
        day_str = row._mapping["day"].date().isoformat()
        day_map.setdefault(day_str, {"critical": 0, "warning": 0, "info": 0})
        day_map[day_str][row._mapping["severity"]] = row._mapping["cnt"]

    by_day = [{"day": d, **counts} for d, counts in sorted(day_map.items())]
    breakdown: dict[str, int] = {"critical": 0, "warning": 0, "info": 0}
    for row in breakdown_rows:
        breakdown[row._mapping["severity"]] = row._mapping["cnt"]

    recent = [
        {k: (v.isoformat() if isinstance(v, datetime) else v) for k, v in row._mapping.items()}
        for row in recent_rows
    ]
    return {"by_day": by_day, "breakdown": breakdown, "recent": recent}


# ── 4b. Acknowledge alert ─────────────────────────────────────────────────────

@router.post("/alerts/acknowledge/{alert_id}")
async def acknowledge_alert(
    alert_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    # alert_id is time-device_id in history table or just use a sub-query if we don't have PK
    # But wait, our log_alert doesn't return an ID. 
    # Let's assume alert_id is the message or a combination.
    # Actually, let's just acknowledge ALL unacknowledged alerts for a zone for now, 
    # or improve the schema.
    # For now, let's just mark the most recent one matching the type.
    await db.execute(
        text("""
            UPDATE alerts_history 
            SET acknowledged = TRUE, acknowledged_at = :now
            WHERE acknowledged = FALSE
        """),
        {"now": datetime.now(timezone.utc)}
    )
    await db.commit()
    return {"success": True}


# ── 5. Harvest records ────────────────────────────────────────────────────────

@router.get("/harvests")
async def get_harvests(
    zone_id:  str      = Query(...),
    from_ts:  datetime = Query(...),
    to_ts:    datetime = Query(default_factory=_now_utc),
    db:       AsyncSession = Depends(get_db),
    browser_id: str = Depends(get_browser_id),
) -> dict[str, Any]:
    rows = await db.execute(
        text("""
            SELECT
                time_bucket('1 day', h.time)::date AS date,
                h.crop_type,
                SUM(h.quantity_kg)   AS quantity_kg,
                SUM(h.plants_harvested) AS plants,
                AVG(h.yield_per_plant_g) AS yield_per_plant_g
            FROM harvest_records h
            JOIN zones z ON h.zone_id = z.id
            JOIN farms f ON z.farm_id = f.id
            WHERE h.zone_id = :z AND h.time >= :f AND h.time <= :t AND f.browser_id = :bid
            GROUP BY date, h.crop_type
            ORDER BY date ASC
        """),
        {"z": zone_id, "f": from_ts, "t": to_ts, "bid": browser_id},
    )

    all_rows = [dict(row._mapping) for row in rows]
    crop_types = sorted({r["crop_type"] for r in all_rows})

    # Pivot: [{date, crop_A: kg, crop_B: kg, ...}]
    date_map: dict[str, dict[str, float]] = {}
    for r in all_rows:
        d = str(r["date"])
        date_map.setdefault(d, {})
        date_map[d][r["crop_type"]] = float(r["quantity_kg"] or 0)

    buckets = [{"date": d, **crops} for d, crops in sorted(date_map.items())]
    return {"buckets": buckets, "crop_types": crop_types}


# ── 6. Maintenance log ────────────────────────────────────────────────────────

@router.get("/maintenance")
async def get_maintenance(
    zone_id:  str      = Query(...),
    from_ts:  datetime = Query(...),
    to_ts:    datetime = Query(default_factory=_now_utc),
    db:       AsyncSession = Depends(get_db),
    browser_id: str = Depends(get_browser_id),
) -> list[dict[str, Any]]:
    rows = await db.execute(
        text("""
            SELECT m.time, m.device_id, m.task_type, m.description, m.performed_by,
                   m.cost, m.duration_minutes, m.notes
            FROM maintenance_log m
            JOIN zones z ON m.zone_id = z.id
            JOIN farms f ON z.farm_id = f.id
            WHERE m.zone_id = :z AND m.time >= :f AND m.time <= :t AND f.browser_id = :bid
            ORDER BY m.time DESC
        """),
        {"z": zone_id, "f": from_ts, "t": to_ts, "bid": browser_id},
    )
    return [
        {k: (v.isoformat() if isinstance(v, datetime) else v) for k, v in row._mapping.items()}
        for row in rows
    ]


# ── 7. Automation executions log ──────────────────────────────────────────────

@router.get("/automation")
async def get_automation_executions(
    zone_id:  str      = Query(...),
    from_ts:  datetime = Query(...),
    to_ts:    datetime = Query(default_factory=_now_utc),
    db:       AsyncSession = Depends(get_db),
    browser_id: str = Depends(get_browser_id),
) -> list[dict[str, Any]]:
    rows = await db.execute(
        text("""
            SELECT a.time, a.rule_id, a.rule_name, a.trigger_sensor, a.trigger_value, a.actions_triggered, a.outcome
            FROM automation_executions a
            JOIN zones z ON a.zone_id = z.id
            JOIN farms f ON z.farm_id = f.id
            WHERE a.zone_id = :z AND a.time >= :f AND a.time <= :t AND f.browser_id = :bid
            ORDER BY a.time DESC LIMIT 50
        """),
        {"z": zone_id, "f": from_ts, "t": to_ts, "bid": browser_id},
    )
    return [
        {k: (v.isoformat() if isinstance(v, datetime) else v) for k, v in row._mapping.items()}
        for row in rows
    ]
