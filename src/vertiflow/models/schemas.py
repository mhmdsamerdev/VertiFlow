from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

ActuatorId = Literal[
    'cooling_fan', 'water_pump', 'heater', 'dehumidifier', 'led_lights', 'ph_adjuster'
]


class SensorReadings(BaseModel):
    ph: Optional[float] = Field(None, ge=0.0, le=14.0, description="pH level (0-14)")
    ec: Optional[float] = Field(None, ge=0.0, description="Electrical conductivity (mS/cm)")
    air_temp: Optional[float] = Field(None, description="Air temperature (°C)")
    humidity: Optional[float] = Field(None, ge=0.0, le=100.0, description="Ambient humidity (%)")
    soil_moisture: Optional[float] = Field(None, ge=0.0, le=100.0, description="Soil moisture (%)")
    light_intensity: Optional[float] = Field(None, ge=0.0, description="Light intensity (µmol/m²/s)")
    co2: Optional[float] = Field(None, ge=0.0, description="CO2 concentration (ppm)")


class SensorHealthEntry(BaseModel):
    battery: Optional[float] = Field(None, ge=0.0, le=100.0, description="Battery level (%)")
    signal:  Optional[float] = Field(None, ge=0.0, le=100.0, description="Signal strength (%)")
    online:  bool  = Field(False, description="Sensor online status")


class SensorHealthMap(BaseModel):
    ph:              SensorHealthEntry
    ec:              SensorHealthEntry
    air_temp:        SensorHealthEntry
    humidity:        SensorHealthEntry
    soil_moisture:   SensorHealthEntry
    light_intensity: SensorHealthEntry
    co2:             SensorHealthEntry


class ActuatorParams(BaseModel):
    speed:            Optional[float] = Field(None, ge=0.0, le=100.0, description="Fan speed (0-100%)")
    brightness:       Optional[float] = Field(None, ge=0.0, le=100.0, description="LED brightness (0-100%)")
    color_spectrum:   Optional[str]   = Field(None, description="LED color spectrum")
    duration_minutes: Optional[float] = Field(None, ge=0.0, description="Water pump run duration (min)")
    dose_amount:      Optional[float] = Field(None, ge=0.0, description="pH adjuster dose amount (mL)")


class ActuatorEntry(BaseModel):
    state:  bool                      = False
    mode:   Literal['auto', 'manual', 'rule'] = 'auto'
    params: ActuatorParams            = Field(default_factory=ActuatorParams)

    @field_validator("mode", mode="before")
    @classmethod
    def normalize_mode(cls, value: str) -> str:
        if value in {"auto", "manual", "rule"}:
            return value
        # Prevent telemetry crashes if a new/invalid mode appears unexpectedly.
        return "auto"


class ActuatorStates(BaseModel):
    cooling_fan:  ActuatorEntry = Field(default_factory=ActuatorEntry)
    water_pump:   ActuatorEntry = Field(default_factory=ActuatorEntry)
    heater:       ActuatorEntry = Field(default_factory=ActuatorEntry)
    dehumidifier: ActuatorEntry = Field(default_factory=ActuatorEntry)
    led_lights:   ActuatorEntry = Field(default_factory=ActuatorEntry)
    ph_adjuster:  ActuatorEntry = Field(default_factory=ActuatorEntry)


class TelemetryPayload(BaseModel):
    timestamp:     datetime
    farm_id:       str
    zone_id:       str
    readings:      SensorReadings
    actuators:     ActuatorStates
    sensor_health: SensorHealthMap
    is_demo:       bool = Field(True, description="Indicates if this telemetry is mock/demo data")


class ControlCommand(BaseModel):
    actuator:         ActuatorId
    state:            bool
    mode:             Literal['auto', 'manual'] = 'manual'
    params:           Optional[ActuatorParams]  = None
    auto_off_minutes: Optional[float]           = Field(None, ge=0.0, description="Auto-off timer (minutes)")


class ControlAck(BaseModel):
    success:        bool
    command_id:     Optional[str] = None
    zone_id:        str
    actuator:       str
    new_state:      bool
    new_mode:       str
    previous_state: bool
    auto_off_at:    Optional[datetime] = None
    acked_at:       datetime


class EmergencyStopAck(BaseModel):
    success:           bool
    zone_id:           str
    stopped_actuators: list[str]
    acked_at:          datetime


class PendingCommand(BaseModel):
    command_id: str = Field(..., description="Unique identifier for the command")
    actuator:   ActuatorId
    state:      bool
    mode:       Literal["auto", "manual"]
    params:     Optional[ActuatorParams] = None
    auto_off_at: Optional[datetime] = None
    created_at: datetime = Field(..., description="Timestamp when the command was created")


class PendingCommandsResponse(BaseModel):
    zone_id:  str
    commands: list[PendingCommand] = Field(default_factory=list)
    retrieved_at: datetime


# ── Multi-Tenant & Collaborative Platform Schemas ───────────────────────────

class Profile(BaseModel):
    id: str
    auth_id: Optional[str] = None
    easy_share_id: Optional[str] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


class Farm(BaseModel):
    id: str
    name: str
    location: str
    description: str
    demo_mode: bool = True
    created_at: datetime


class FarmCreate(BaseModel):
    name: str
    location: Optional[str] = ""
    description: Optional[str] = ""


class MemberProfile(BaseModel):
    id: str
    easy_share_id: Optional[str] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    role: str
    joined_at: datetime


class Invitation(BaseModel):
    id: str
    farm_id: str
    farm_name: Optional[str] = None
    invited_by_name: Optional[str] = None
    target_easy_share_id: Optional[str] = None
    target_email: Optional[str] = None
    role: str
    status: str
    created_at: datetime
    expires_at: datetime


class InvitationCreate(BaseModel):
    farm_id: str
    role: Literal['owner', 'admin', 'staff', 'consultant', 'viewer'] = 'viewer'
    target_easy_share_id: Optional[str] = None
    target_email: Optional[str] = None

