from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter

from app.models.schemas import (
    ActuatorModes, ActuatorStates, ControlAck, ControlCommand,
)

router = APIRouter(prefix="/controls", tags=["controls"])

# ─── Shared per-zone actuator state ───────────────────────────────────────────
_zone_states: dict[str, dict[str, bool]] = {}
_zone_modes:  dict[str, dict[str, str]]  = {}

_DEFAULTS: dict[str, bool] = {
    'oxygen_pump':    True,
    'led_array':      True,
    'nutrient_doser': False,
}


def _ensure_zone(zone_id: str) -> None:
    if zone_id not in _zone_states:
        _zone_states[zone_id] = dict(_DEFAULTS)
        _zone_modes[zone_id]  = {k: 'auto' for k in _DEFAULTS}


def get_actuator_states(zone_id: str) -> ActuatorStates:
    """Called by the telemetry router to embed live actuator states in WS frames."""
    _ensure_zone(zone_id)
    return ActuatorStates(**_zone_states[zone_id])


def get_actuator_modes(zone_id: str) -> ActuatorModes:
    """Called by the telemetry router to embed live actuator modes in WS frames."""
    _ensure_zone(zone_id)
    return ActuatorModes(**_zone_modes[zone_id])


@router.post("/{zone_id}/command", response_model=ControlAck)
async def send_command(zone_id: str, cmd: ControlCommand) -> ControlAck:
    _ensure_zone(zone_id)
    prev = _zone_states[zone_id][cmd.actuator]
    _zone_states[zone_id][cmd.actuator] = cmd.state
    _zone_modes[zone_id][cmd.actuator]  = cmd.mode
    return ControlAck(
        success=True,
        zone_id=zone_id,
        actuator=cmd.actuator,
        new_state=cmd.state,
        new_mode=cmd.mode,
        previous_state=prev,
        acked_at=datetime.now(timezone.utc),
    )
