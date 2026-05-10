from __future__ import annotations

import asyncio
import copy
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models import ActionsLog
from app.models.schemas import (
    ActuatorEntry, ActuatorParams, ActuatorStates,
    ControlAck, ControlCommand, EmergencyStopAck,
    PendingCommand, PendingCommandsResponse, ActuatorId # Added PendingCommand and PendingCommandsResponse, ActuatorId
)

from sqlalchemy import select, update, desc # Import select, update, desc for querying

router = APIRouter(prefix="/controls", tags=["controls"])

# ─── Conflict rules ────────────────────────────────────────────────────────────
_CONFLICTS: dict[str, list[str]] = {
    'heater':      ['cooling_fan'],
    'cooling_fan': ['heater'],
}

# ─── Default actuator entries per zone ────────────────────────────────────────
_DEFAULTS: dict[str, dict] = {
    'cooling_fan':  {'state': False, 'mode': 'auto', 'params': {'speed': 50.0}},
    'water_pump':   {'state': False, 'mode': 'auto', 'params': {'duration_minutes': 5.0}},
    'heater':       {'state': False, 'mode': 'auto', 'params': {}},
    'dehumidifier': {'state': False, 'mode': 'auto', 'params': {}},
    'led_lights':   {'state': True,  'mode': 'auto', 'params': {'brightness': 80.0, 'color_spectrum': 'full'}},
    'ph_adjuster':  {'state': False, 'mode': 'auto', 'params': {'dose_amount': 1.0}},
}

# ─── Per-zone mutable state ────────────────────────────────────────────────────
_zone_states: dict[str, dict[str, dict]] = {}
_zone_timers: dict[str, dict[str, Optional[asyncio.Task]]] = {}


def _ensure_zone(zone_id: str) -> None:
    if zone_id not in _zone_states:
        _zone_states[zone_id] = copy.deepcopy(_DEFAULTS)
    if zone_id not in _zone_timers:
        _zone_timers[zone_id] = {k: None for k in _DEFAULTS}


def get_actuator_states(zone_id: str) -> ActuatorStates:
    """Called by the telemetry router to embed live actuator states in WS frames."""
    _ensure_zone(zone_id)
    entries = {
        key: ActuatorEntry(
            state=val['state'],
            mode=val['mode'],
            params=ActuatorParams(**val['params']),
        )
        for key, val in _zone_states[zone_id].items()
    }
    return ActuatorStates(**entries)


async def _auto_off_task(zone_id: str, actuator: str, delay: float) -> None:
    await asyncio.sleep(delay)
    if zone_id in _zone_states and actuator in _zone_states[zone_id]:
        _zone_states[zone_id][actuator]['state'] = False
        _zone_states[zone_id][actuator]['mode']  = 'auto'


def _cancel_timer(zone_id: str, actuator: str) -> None:
    task = _zone_timers.get(zone_id, {}).get(actuator)
    if task and not task.done():
        task.cancel()
    _zone_timers.setdefault(zone_id, {})[actuator] = None


@router.post("/{zone_id}/command", response_model=ControlAck)
async def send_command(
    zone_id: str,
    cmd: ControlCommand,
    db: AsyncSession = Depends(get_db)
) -> ControlAck:
    _ensure_zone(zone_id)

    # ── Conflict detection ─────────────────────────────────────────────────────
    if cmd.state:
        for conflicting in _CONFLICTS.get(cmd.actuator, []):
            if _zone_states[zone_id].get(conflicting, {}).get("state", False):
                raise HTTPException(
                    status_code=409,
                    detail=f"Conflict: \'{cmd.actuator}\' cannot be ON while \'{conflicting}\' is ON.",
                )

    prev = _zone_states[zone_id][cmd.actuator]["state"]

    # We no longer apply state immediately. It will be applied upon acknowledgment.
    # We only cancel existing timers if we are sending a new command that might conflict or override.
    _cancel_timer(zone_id, cmd.actuator)

    # ── Check Demo Mode status for this farm ─────────────────────
    # Default to False (Live) unless explicitly confirmed as Demo
    demo_mode = False
    try:
        # Resolve farm_id for the zone
        row = await db.execute(text("SELECT farm_id FROM zones WHERE id=:zid"), {"zid": zone_id})
        r = row.one_or_none()
        if r:
            fid = r._mapping["farm_id"]
            row = await db.execute(text("SELECT demo_mode FROM farms WHERE id=:fid"), {"fid": fid})
            fr = row.one_or_none()
            if fr: 
                demo_mode = bool(fr._mapping["demo_mode"])
                log.info("[Controls] Mode resolved for zone %s: %s", zone_id, "DEMO" if demo_mode else "LIVE")
            else:
                log.warning("[Controls] Could not find farm %s for zone %s, defaulting to LIVE", fid, zone_id)
        else:
            log.warning("[Controls] Could not find zone %s in DB, defaulting to LIVE", zone_id)
    except Exception as e:
        log.error("[Controls] Error resolving mode for %s: %s. Defaulting to LIVE", zone_id, e)

    # ── Log the command to the database ────────────────────────────────────────
    actions_log_entry = ActionsLog(
        time=datetime.now(timezone.utc),
        farm_id="default_farm", # Placeholder
        zone_id=zone_id,
        actuator_id=cmd.actuator,
        action="ON" if cmd.state else "OFF",
        mode=cmd.mode,
        previous_state=prev,
        params=cmd.params.model_dump() if cmd.params else {},
        triggered_by="user",
        auto_off_at=None,
        status="completed" if demo_mode else "pending",
    )
    db.add(actions_log_entry)

    # ── If Demo Mode: Apply state immediately ──────────────────────────────────
    if demo_mode:
        _zone_states[zone_id][cmd.actuator]["state"] = cmd.state
        _zone_states[zone_id][cmd.actuator]["mode"]  = cmd.mode
        if cmd.params:
            _zone_states[zone_id][cmd.actuator]["params"].update(cmd.params.model_dump())

    await db.commit()
    await db.refresh(actions_log_entry)

    # ── Auto-off timer ─────────────────────────────────────────────────────────
    _cancel_timer(zone_id, cmd.actuator)
    auto_off_at: Optional[datetime] = None
    if cmd.state and cmd.auto_off_minutes:
        task = asyncio.create_task(
            _auto_off_task(zone_id, cmd.actuator, cmd.auto_off_minutes * 60)
        )
        _zone_timers[zone_id][cmd.actuator] = task
        auto_off_at = datetime.now(timezone.utc) + timedelta(minutes=cmd.auto_off_minutes)
        actions_log_entry.auto_off_at = auto_off_at
        await db.commit()
        await db.refresh(actions_log_entry)

    return ControlAck(
        success=True,
        command_id=f"{actions_log_entry.time.isoformat()}-{actions_log_entry.actuator_id}",
        zone_id=zone_id,
        actuator=cmd.actuator,
        new_state=cmd.state,
        new_mode=cmd.mode,
        previous_state=prev,
        auto_off_at=auto_off_at,
        acked_at=datetime.now(timezone.utc),
    )


@router.post("/{zone_id}/emergency-stop", response_model=EmergencyStopAck)
async def emergency_stop(zone_id: str) -> EmergencyStopAck:
    _ensure_zone(zone_id)
    stopped: list[str] = []
    for actuator in list(_zone_states[zone_id]):
        _cancel_timer(zone_id, actuator)
        if _zone_states[zone_id][actuator]['state']:
            _zone_states[zone_id][actuator]['state'] = False
            _zone_states[zone_id][actuator]['mode']  = 'auto'
            stopped.append(actuator)
    return EmergencyStopAck(
        success=True,
        zone_id=zone_id,
        stopped_actuators=stopped,
        acked_at=datetime.now(timezone.utc),
    )


@router.get("/{zone_id}/pending", response_model=PendingCommandsResponse)
async def get_pending_commands(
    zone_id: str,
    db: AsyncSession = Depends(get_db)
) -> PendingCommandsResponse:
    """Fetches pending commands for a given zone that devices can poll."""
    query = select(ActionsLog).where(
        ActionsLog.zone_id == zone_id,
        ActionsLog.status  == "pending",
    ).order_by(ActionsLog.time.asc())

    result = await db.execute(query)
    pending_actions = result.scalars().all()

    commands = []
    for action in pending_actions:
        # Assuming 'action' column stores 'ON' or 'OFF' and maps to 'state'
        state_bool = True if action.action == "ON" else False
        commands.append(PendingCommand(
            command_id=f"{action.time.isoformat()}-{action.actuator_id}", # More robust unique ID
            actuator=ActuatorId(action.actuator_id),
            state=state_bool,
            mode=action.mode, # Should be 'auto' or 'manual'
            params=ActuatorParams(**action.params) if action.params else None,
            auto_off_at=action.auto_off_at,
            created_at=action.time,
        ))

    return PendingCommandsResponse(
        zone_id=zone_id,
        commands=commands,
        retrieved_at=datetime.now(timezone.utc),
    )


@router.get("/{zone_id}/history", response_model=list[dict])
async def get_command_history(
    zone_id: str,
    limit: int = 20,
    db: AsyncSession = Depends(get_db)
) -> list[dict]:
    """Fetches the recent command history for a given zone."""
    query = select(ActionsLog).where(
        ActionsLog.zone_id == zone_id
    ).order_by(desc(ActionsLog.time)).limit(limit)

    result = await db.execute(query)
    history = result.scalars().all()

    return [action.to_dict() for action in history]


@router.post("/{zone_id}/acknowledge", response_model=ControlAck)
async def acknowledge_command(
    zone_id: str,
    command_id: str,
    db: AsyncSession = Depends(get_db)
) -> ControlAck:
    """Marks a pending command as completed when the device acknowledges it."""
    # The command_id we used in /pending was f"{action.time.isoformat()}-{action.actuator_id}"
    # This is a bit brittle, ideally we'd have a primary key ID that is a UUID or serial.
    # But let's stick to parsing it for now or just searching by time and actuator.
    try:
        time_str, actuator_id = command_id.rsplit("-", 1)
        cmd_time = datetime.fromisoformat(time_str)
    except (ValueError, IndexError):
        raise HTTPException(status_code=400, detail="Invalid command_id format")

    query = select(ActionsLog).where(
        ActionsLog.zone_id == zone_id,
        ActionsLog.actuator_id == actuator_id,
        ActionsLog.time == cmd_time,
        ActionsLog.status == "pending"
    )

    result = await db.execute(query)
    action = result.scalars().first()

    if not action:
        raise HTTPException(status_code=404, detail="Pending command not found")

    action.status = "completed"
    
    # Update the live state
    _ensure_zone(zone_id)
    state_bool = True if action.action == "ON" else False
    _zone_states[zone_id][action.actuator_id]["state"] = state_bool
    _zone_states[zone_id][action.actuator_id]["mode"]  = action.mode
    if action.params:
        _zone_states[zone_id][action.actuator_id]["params"].update(action.params)

    # ── Handle Auto-off timer on acknowledgment ──
    if state_bool and action.auto_off_at:
        # Calculate remaining time
        delay = (action.auto_off_at - datetime.now(timezone.utc)).total_seconds()
        if delay > 0:
            task = asyncio.create_task(
                _auto_off_task(zone_id, action.actuator_id, delay)
            )
            _zone_timers[zone_id][action.actuator_id] = task

    await db.commit()
    await db.refresh(action)

    return ControlAck(
        success=True,
        zone_id=zone_id,
        actuator=action.actuator_id,
        new_state=True if action.action == "ON" else False,
        new_mode=action.mode,
        previous_state=action.previous_state,
        auto_off_at=action.auto_off_at,
        acked_at=datetime.now(timezone.utc),
    )


@router.get("/{zone_id}/status/{command_id}")
async def get_command_status(
    zone_id: str,
    command_id: str,
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Checks the status of a specific command."""
    try:
        time_str, actuator_id = command_id.rsplit("-", 1)
        cmd_time = datetime.fromisoformat(time_str)
    except (ValueError, IndexError):
        raise HTTPException(status_code=400, detail="Invalid command_id format")

    query = select(ActionsLog).where(
        ActionsLog.zone_id == zone_id,
        ActionsLog.actuator_id == actuator_id,
        ActionsLog.time == cmd_time
    )

    result = await db.execute(query)
    action = result.scalars().first()

    if not action:
        raise HTTPException(status_code=404, detail="Command not found")

    return {
        "command_id": command_id,
        "status": action.status,
        "time": action.time,
    }
