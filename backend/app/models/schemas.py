from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

ActuatorId = Literal[
    'cooling_fan', 'water_pump', 'heater', 'dehumidifier', 'led_lights', 'ph_adjuster'
]


class SensorReadings(BaseModel):
    ph: float = Field(..., ge=0.0, le=14.0, description="pH level (0-14)")
    ec: float = Field(..., ge=0.0, description="Electrical conductivity (mS/cm)")
    air_temp: float = Field(..., description="Air temperature (°C)")
    humidity: float = Field(..., ge=0.0, le=100.0, description="Ambient humidity (%)")
    soil_moisture: float = Field(..., ge=0.0, le=100.0, description="Soil moisture (%)")
    light_intensity: float = Field(..., ge=0.0, description="Light intensity (µmol/m²/s)")
    co2: float = Field(..., ge=0.0, description="CO2 concentration (ppm)")


class SensorHealthEntry(BaseModel):
    battery: float = Field(..., ge=0.0, le=100.0, description="Battery level (%)")
    signal:  float = Field(..., ge=0.0, le=100.0, description="Signal strength (%)")
    online:  bool  = Field(..., description="Sensor online status")


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
