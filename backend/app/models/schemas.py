from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

ActuatorId = Literal['oxygen_pump', 'led_array', 'nutrient_doser']


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


class ActuatorStates(BaseModel):
    oxygen_pump:    bool = True
    led_array:      bool = True
    nutrient_doser: bool = False


class ActuatorModes(BaseModel):
    oxygen_pump:    Literal['auto', 'manual'] = 'auto'
    led_array:      Literal['auto', 'manual'] = 'auto'
    nutrient_doser: Literal['auto', 'manual'] = 'auto'


class TelemetryPayload(BaseModel):
    timestamp:      datetime
    farm_id:        str
    zone_id:        str
    readings:       SensorReadings
    actuators:      ActuatorStates
    actuator_modes: ActuatorModes
    sensor_health:  SensorHealthMap


class ControlCommand(BaseModel):
    actuator: ActuatorId
    state:    bool
    mode:     Literal['auto', 'manual'] = 'manual'


class ControlAck(BaseModel):
    success:        bool
    zone_id:        str
    actuator:       str
    new_state:      bool
    new_mode:       str
    previous_state: bool
    acked_at:       datetime
