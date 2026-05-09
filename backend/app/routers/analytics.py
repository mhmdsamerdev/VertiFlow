from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db

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
) -> list[dict[str, Any]]:
    b = _safe_bucket(bucket)
    rows = await db.execute(
        text(f"""
            WITH source_preference AS (
                SELECT CASE
                    WHEN EXISTS (
                        SELECT 1
                        FROM sensor_readings
                        WHERE zone_id = :zone_id
                          AND time >= :from_ts
                          AND time <= :to_ts
                          AND data_source = 'real'
                    ) THEN 'real'
                    ELSE 'simulated'
                END AS preferred_source
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
        {"zone_id": zone_id, "from_ts": from_ts, "to_ts": to_ts},
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
) -> dict[str, Any]:
    cols = ", ".join(
        f"AVG({k}) AS {k}_avg, MIN({k}) AS {k}_min, MAX({k}) AS {k}_max"
        for k in _SENSOR_KEYS
    )
    row = (await db.execute(
        text(f"""
            WITH source_preference AS (
                SELECT CASE
                    WHEN EXISTS (
                        SELECT 1
                        FROM sensor_readings
                        WHERE zone_id = :z
                          AND time >= :f
                          AND time <= :t
                          AND data_source = 'real'
                    ) THEN 'real'
                    ELSE 'simulated'
                END AS preferred_source
            )
            SELECT {cols}
            FROM sensor_readings
            CROSS JOIN source_preference
            WHERE zone_id = :z
              AND time >= :f
              AND time <= :t
              AND data_source = source_preference.preferred_source
        """),
        {"z": zone_id, "f": from_ts, "t": to_ts},
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
) -> list[dict[str, Any]]:
    rows = await db.execute(
        text("""
            SELECT time, actuator_id, action, mode, triggered_by, params, auto_off_at
            FROM actions_log
            WHERE zone_id = :z AND time >= :f AND time <= :t
            ORDER BY time ASC
        """),
        {"z": zone_id, "f": from_ts, "t": to_ts},
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
) -> dict[str, Any]:
    by_day_rows = await db.execute(
        text("""
            SELECT
                time_bucket('1 day', time) AS day,
                severity,
                COUNT(*)::int              AS cnt
            FROM alerts_history
            WHERE zone_id = :z AND time >= :f AND time <= :t
            GROUP BY day, severity
            ORDER BY day ASC
        """),
        {"z": zone_id, "f": from_ts, "t": to_ts},
    )
    breakdown_rows = await db.execute(
        text("""
            SELECT severity, COUNT(*)::int AS cnt
            FROM alerts_history
            WHERE zone_id = :z AND time >= :f AND time <= :t
            GROUP BY severity
        """),
        {"z": zone_id, "f": from_ts, "t": to_ts},
    )
    recent_rows = await db.execute(
        text("""
            SELECT time, device_id, alert_type, severity, message, acknowledged, acknowledged_at
            FROM alerts_history
            WHERE zone_id = :z AND time >= :f AND time <= :t
            ORDER BY time DESC LIMIT 50
        """),
        {"z": zone_id, "f": from_ts, "t": to_ts},
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


# ── 5. Harvest records ────────────────────────────────────────────────────────

@router.get("/harvests")
async def get_harvests(
    zone_id:  str      = Query(...),
    from_ts:  datetime = Query(...),
    to_ts:    datetime = Query(default_factory=_now_utc),
    db:       AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    rows = await db.execute(
        text("""
            SELECT
                time_bucket('1 day', time)::date AS date,
                crop_type,
                SUM(quantity_kg)   AS quantity_kg,
                SUM(plants_harvested) AS plants,
                AVG(yield_per_plant_g) AS yield_per_plant_g
            FROM harvest_records
            WHERE zone_id = :z AND time >= :f AND time <= :t
            GROUP BY date, crop_type
            ORDER BY date ASC
        """),
        {"z": zone_id, "f": from_ts, "t": to_ts},
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
) -> list[dict[str, Any]]:
    rows = await db.execute(
        text("""
            SELECT time, device_id, task_type, description, performed_by,
                   cost, duration_minutes, notes
            FROM maintenance_log
            WHERE zone_id = :z AND time >= :f AND time <= :t
            ORDER BY time DESC
        """),
        {"z": zone_id, "f": from_ts, "t": to_ts},
    )
    return [
        {k: (v.isoformat() if isinstance(v, datetime) else v) for k, v in row._mapping.items()}
        for row in rows
    ]
