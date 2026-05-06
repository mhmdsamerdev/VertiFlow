from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class SensorReadings(BaseModel):
    ph: float = Field(..., ge=0.0, le=14.0, description="pH level (0-14)")
    ec: float = Field(..., ge=0.0, description="Electrical conductivity (mS/cm)")
    air_temp: float = Field(..., description="Air temperature (°C)")
    humidity: float = Field(..., ge=0.0, le=100.0, description="Ambient humidity (%)")
    soil_moisture: float = Field(..., ge=0.0, le=100.0, description="Soil moisture (%)")
    light_intensity: float = Field(..., ge=0.0, description="Light intensity (µmol/m²/s)")
    co2: float = Field(..., ge=0.0, description="CO2 concentration (ppm)")


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
