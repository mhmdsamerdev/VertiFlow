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
    oxygen_pump: bool = True
    led_array: bool = True
    nutrient_doser: bool = False


class TelemetryPayload(BaseModel):
    timestamp: datetime
    farm_id: str
    zone_id: str
    readings:      SensorReadings
    actuators:     ActuatorStates
    sensor_health: SensorHealthMap
