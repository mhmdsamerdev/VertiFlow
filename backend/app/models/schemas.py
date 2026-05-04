from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class SensorReadings(BaseModel):
    ph: float = Field(..., ge=0.0, le=14.0, description="pH level (0-14)")
    ec: float = Field(..., ge=0.0, description="Electrical conductivity (mS/cm)")
    water_temp: float = Field(..., description="Water temperature (°C)")
    air_temp: float = Field(..., description="Air temperature (°C)")
    humidity: float = Field(..., ge=0.0, le=100.0, description="Relative humidity (%)")
    water_level: float = Field(..., ge=0.0, le=100.0, description="Reservoir water level (%)")
    light_intensity: float = Field(..., ge=0.0, description="PPFD light intensity (µmol/m²/s)")
    dissolved_oxygen: float = Field(..., ge=0.0, description="Dissolved oxygen (mg/L)")


class ActuatorStates(BaseModel):
    oxygen_pump: bool = True
    led_array: bool = True
    nutrient_doser: bool = False


class TelemetryPayload(BaseModel):
    timestamp: datetime
    farm_id: str
    zone_id: str
    readings: SensorReadings
    actuators: ActuatorStates
