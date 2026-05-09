from __future__ import annotations

import json
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


def _jsonb(value: Any) -> Optional[str]:
    """Serialize a Python object to a JSON string for JSONB columns, or None."""
    return json.dumps(value) if value is not None else None


# ── 1. sensor_readings ────────────────────────────────────────────────────────

async def log_sensor_reading(
    db: AsyncSession,
    *,
    time: datetime,
    farm_id: str,
    zone_id: str,
    device_id: str,
    data_source: str = "simulated",
    ph: Optional[float] = None,
    ec: Optional[float] = None,
    air_temp: Optional[float] = None,
    humidity: Optional[float] = None,
    soil_moisture: Optional[float] = None,
    light_intensity: Optional[float] = None,
    co2: Optional[float] = None,
) -> None:
    await db.execute(
        text("""
            INSERT INTO sensor_readings
                (time, farm_id, zone_id, device_id, data_source,
                 ph, ec, air_temp, humidity, soil_moisture, light_intensity, co2)
            VALUES
                (:time, :farm_id, :zone_id, :device_id, :data_source,
                 :ph, :ec, :air_temp, :humidity, :soil_moisture, :light_intensity, :co2)
        """),
        dict(
            time=time, farm_id=farm_id, zone_id=zone_id, device_id=device_id, data_source=data_source,
            ph=ph, ec=ec, air_temp=air_temp, humidity=humidity,
            soil_moisture=soil_moisture, light_intensity=light_intensity, co2=co2,
        ),
    )


# ── 2. sensor_health ──────────────────────────────────────────────────────────

async def log_sensor_health(
    db: AsyncSession,
    *,
    time: datetime,
    farm_id: str,
    zone_id: str,
    device_id: str,
    sensor_type: str,
    battery_level: float,
    signal_strength: float,
    is_online: bool,
    uptime_seconds: Optional[int] = None,
) -> None:
    await db.execute(
        text("""
            INSERT INTO sensor_health
                (time, farm_id, zone_id, device_id, sensor_type,
                 battery_level, signal_strength, is_online, uptime_seconds)
            VALUES
                (:time, :farm_id, :zone_id, :device_id, :sensor_type,
                 :battery_level, :signal_strength, :is_online, :uptime_seconds)
        """),
        dict(
            time=time, farm_id=farm_id, zone_id=zone_id,
            device_id=device_id, sensor_type=sensor_type,
            battery_level=battery_level, signal_strength=signal_strength,
            is_online=is_online, uptime_seconds=uptime_seconds,
        ),
    )


# ── 3. actions_log ────────────────────────────────────────────────────────────

async def log_action(
    db: AsyncSession,
    *,
    time: datetime,
    farm_id: str,
    zone_id: str,
    actuator_id: str,
    action: str,
    mode: str,
    previous_state: bool,
    params: Optional[dict] = None,
    triggered_by: str = "system",
    auto_off_at: Optional[datetime] = None,
) -> None:
    await db.execute(
        text("""
            INSERT INTO actions_log
                (time, farm_id, zone_id, actuator_id, action, mode,
                 previous_state, params, triggered_by, auto_off_at)
            VALUES
                (:time, :farm_id, :zone_id, :actuator_id, :action, :mode,
                 :previous_state, :params::jsonb, :triggered_by, :auto_off_at)
        """),
        dict(
            time=time, farm_id=farm_id, zone_id=zone_id,
            actuator_id=actuator_id, action=action, mode=mode,
            previous_state=previous_state, params=_jsonb(params),
            triggered_by=triggered_by, auto_off_at=auto_off_at,
        ),
    )


# ── 4. alerts_history ─────────────────────────────────────────────────────────

async def log_alert(
    db: AsyncSession,
    *,
    time: datetime,
    farm_id: str,
    zone_id: str,
    device_id: str,
    alert_type: str,
    severity: str,
    message: Optional[str] = None,
    acknowledged: bool = False,
    acknowledged_at: Optional[datetime] = None,
    acknowledged_by: Optional[str] = None,
) -> None:
    await db.execute(
        text("""
            INSERT INTO alerts_history
                (time, farm_id, zone_id, device_id, alert_type, severity,
                 message, acknowledged, acknowledged_at, acknowledged_by)
            VALUES
                (:time, :farm_id, :zone_id, :device_id, :alert_type, :severity,
                 :message, :acknowledged, :acknowledged_at, :acknowledged_by)
        """),
        dict(
            time=time, farm_id=farm_id, zone_id=zone_id, device_id=device_id,
            alert_type=alert_type, severity=severity, message=message,
            acknowledged=acknowledged, acknowledged_at=acknowledged_at,
            acknowledged_by=acknowledged_by,
        ),
    )


# ── 5. automation_executions ──────────────────────────────────────────────────

async def log_automation_execution(
    db: AsyncSession,
    *,
    time: datetime,
    zone_id: str,
    rule_id: str,
    rule_name: Optional[str] = None,
    trigger_sensor: Optional[str] = None,
    trigger_value: Optional[float] = None,
    actions_triggered: Optional[list] = None,
    outcome: str,
    duration_ms: Optional[int] = None,
    error_message: Optional[str] = None,
) -> None:
    await db.execute(
        text("""
            INSERT INTO automation_executions
                (time, zone_id, rule_id, rule_name, trigger_sensor, trigger_value,
                 actions_triggered, outcome, duration_ms, error_message)
            VALUES
                (:time, :zone_id, :rule_id, :rule_name, :trigger_sensor, :trigger_value,
                 :actions_triggered::jsonb, :outcome, :duration_ms, :error_message)
        """),
        dict(
            time=time, zone_id=zone_id, rule_id=rule_id, rule_name=rule_name,
            trigger_sensor=trigger_sensor, trigger_value=trigger_value,
            actions_triggered=_jsonb(actions_triggered or []),
            outcome=outcome, duration_ms=duration_ms, error_message=error_message,
        ),
    )


# ── 6. user_actions ───────────────────────────────────────────────────────────

async def log_user_action(
    db: AsyncSession,
    *,
    time: datetime,
    user_id: str,
    username: Optional[str] = None,
    zone_id: Optional[str] = None,
    entity_type: str,
    entity_id: str,
    action: str,
    old_value: Optional[Any] = None,
    new_value: Optional[Any] = None,
    ip_address: Optional[str] = None,
) -> None:
    await db.execute(
        text("""
            INSERT INTO user_actions
                (time, user_id, username, zone_id, entity_type, entity_id,
                 action, old_value, new_value, ip_address)
            VALUES
                (:time, :user_id, :username, :zone_id, :entity_type, :entity_id,
                 :action, :old_value::jsonb, :new_value::jsonb, :ip_address)
        """),
        dict(
            time=time, user_id=user_id, username=username, zone_id=zone_id,
            entity_type=entity_type, entity_id=entity_id, action=action,
            old_value=_jsonb(old_value), new_value=_jsonb(new_value),
            ip_address=ip_address,
        ),
    )


# ── 7. harvest_records ────────────────────────────────────────────────────────

async def log_harvest(
    db: AsyncSession,
    *,
    time: datetime,
    farm_id: str,
    zone_id: str,
    layer_id: Optional[str] = None,
    crop_type: str,
    quantity_kg: float,
    yield_per_plant_g: Optional[float] = None,
    plants_harvested: Optional[int] = None,
    notes: Optional[str] = None,
) -> None:
    await db.execute(
        text("""
            INSERT INTO harvest_records
                (time, farm_id, zone_id, layer_id, crop_type,
                 quantity_kg, yield_per_plant_g, plants_harvested, notes)
            VALUES
                (:time, :farm_id, :zone_id, :layer_id, :crop_type,
                 :quantity_kg, :yield_per_plant_g, :plants_harvested, :notes)
        """),
        dict(
            time=time, farm_id=farm_id, zone_id=zone_id, layer_id=layer_id,
            crop_type=crop_type, quantity_kg=quantity_kg,
            yield_per_plant_g=yield_per_plant_g,
            plants_harvested=plants_harvested, notes=notes,
        ),
    )


# ── 8. maintenance_log ────────────────────────────────────────────────────────

async def log_maintenance(
    db: AsyncSession,
    *,
    time: datetime,
    farm_id: str,
    zone_id: str,
    device_id: Optional[str] = None,
    task_type: str,
    description: str,
    performed_by: str,
    cost: Optional[float] = None,
    duration_minutes: Optional[int] = None,
    notes: Optional[str] = None,
) -> None:
    await db.execute(
        text("""
            INSERT INTO maintenance_log
                (time, farm_id, zone_id, device_id, task_type, description,
                 performed_by, cost, duration_minutes, notes)
            VALUES
                (:time, :farm_id, :zone_id, :device_id, :task_type, :description,
                 :performed_by, :cost, :duration_minutes, :notes)
        """),
        dict(
            time=time, farm_id=farm_id, zone_id=zone_id, device_id=device_id,
            task_type=task_type, description=description, performed_by=performed_by,
            cost=cost, duration_minutes=duration_minutes, notes=notes,
        ),
    )
