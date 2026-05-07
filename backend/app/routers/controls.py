from __future__ import annotations

import asyncio
import copy
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException

from app.models.schemas import (
    ActuatorEntry, ActuatorParams, ActuatorStates,
    ControlAck, ControlCommand, EmergencyStopAck,
)

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
async def send_command(zone_id: str, cmd: ControlCommand) -> ControlAck:
    _ensure_zone(zone_id)

    # ── Conflict detection ─────────────────────────────────────────────────────
    if cmd.state:
        for conflicting in _CONFLICTS.get(cmd.actuator, []):
            if _zone_states[zone_id].get(conflicting, {}).get('state', False):
                raise HTTPException(
                    status_code=409,
                    detail=f"Conflict: '{cmd.actuator}' cannot be ON while '{conflicting}' is ON.",
                )

    prev = _zone_states[zone_id][cmd.actuator]['state']

    # ── Apply state + params ───────────────────────────────────────────────────
    _zone_states[zone_id][cmd.actuator]['state'] = cmd.state
    _zone_states[zone_id][cmd.actuator]['mode']  = cmd.mode
    if cmd.params:
        _zone_states[zone_id][cmd.actuator]['params'].update(
            cmd.params.model_dump(exclude_none=True)
        )

    # ── Auto-off timer ─────────────────────────────────────────────────────────
    _cancel_timer(zone_id, cmd.actuator)
    auto_off_at: Optional[datetime] = None
    if cmd.state and cmd.auto_off_minutes:
        task = asyncio.create_task(
            _auto_off_task(zone_id, cmd.actuator, cmd.auto_off_minutes * 60)
        )
        _zone_timers[zone_id][cmd.actuator] = task
        auto_off_at = datetime.now(timezone.utc) + timedelta(minutes=cmd.auto_off_minutes)

    return ControlAck(
        success=True,
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
