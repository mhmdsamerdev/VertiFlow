"""Rich mock data for DEBUG-mode fallback when DB is unreachable."""

import copy
from datetime import datetime, timezone, timedelta

_NOW = datetime.now(timezone.utc)

MOCK_FARMS = [
    {
        "id": "farm-demo-01",
        "name": "VertiFlow Research Lab",
        "location": "Singapore",
        "description": "R&D vertical farm testing NFT, aeroponic, and hybrid grow systems under controlled LED environments.",
        "demo_mode": True,
        "created_at": (_NOW - timedelta(days=187)).isoformat(),
    },
]

MOCK_ZONES = [
    {
        "id": "zone-alpha",
        "farm_id": "farm-demo-01",
        "name": "Main NFT Layer",
        "description": "24-tower nutrient film technique system. Butterhead Lettuce at day 14 of 28-day cycle.",
        "crop_name": "Butterhead Lettuce",
        "system_type": "nft",
        "layer_index": 0,
        "created_at": (_NOW - timedelta(days=180)).isoformat(),
    },
    {
        "id": "zone-beta",
        "farm_id": "farm-demo-01",
        "name": "Seedling Nursery",
        "description": "Ebb-and-flow propagation tray. Mixed herbs germinating. pH sensor showing intermittent drift \u2014 calibration recommended.",
        "crop_name": "Mixed Herbs",
        "system_type": "ebb_flow",
        "layer_index": 1,
        "created_at": (_NOW - timedelta(days=175)).isoformat(),
    },
]

MOCK_THRESHOLDS = {
    "zone-alpha": [
        {"zone_id": "zone-alpha", "sensor_type": "ph",               "target": 6.0, "warn_min": 5.5, "warn_max": 6.5, "crit_min": 5.0, "crit_max": 7.0, "updated_at": _NOW.isoformat()},
        {"zone_id": "zone-alpha", "sensor_type": "ec",               "target": 1.8, "warn_min": 1.5, "warn_max": 2.2, "crit_min": 1.2, "crit_max": 2.5, "updated_at": _NOW.isoformat()},
        {"zone_id": "zone-alpha", "sensor_type": "air_temp",         "target": 24.0,"warn_min": 20.0,"warn_max": 28.0,"crit_min": 18.0,"crit_max": 32.0,"updated_at": _NOW.isoformat()},
        {"zone_id": "zone-alpha", "sensor_type": "humidity",         "target": 65.0,"warn_min": 50.0,"warn_max": 80.0,"crit_min": 40.0,"crit_max": 90.0,"updated_at": _NOW.isoformat()},
        {"zone_id": "zone-alpha", "sensor_type": "soil_moisture",    "target": 70.0,"warn_min": 60.0,"warn_max": 80.0,"crit_min": 50.0,"crit_max": 90.0,"updated_at": _NOW.isoformat()},
        {"zone_id": "zone-alpha", "sensor_type": "light_intensity",  "target": 400.0,"warn_min": 300.0,"warn_max": 600.0,"crit_min": 200.0,"crit_max": 800.0,"updated_at": _NOW.isoformat()},
        {"zone_id": "zone-alpha", "sensor_type": "co2",              "target": 800.0,"warn_min": 600.0,"warn_max": 1200.0,"crit_min": 400.0,"crit_max": 1500.0,"updated_at": _NOW.isoformat()},
    ],
    "zone-beta": [
        {"zone_id": "zone-beta", "sensor_type": "ph",               "target": 6.2, "warn_min": 5.8, "warn_max": 6.8, "crit_min": 5.0, "crit_max": 7.5, "updated_at": _NOW.isoformat()},
        {"zone_id": "zone-beta", "sensor_type": "ec",               "target": 1.6, "warn_min": 1.3, "warn_max": 2.0, "crit_min": 1.0, "crit_max": 2.5, "updated_at": _NOW.isoformat()},
        {"zone_id": "zone-beta", "sensor_type": "air_temp",         "target": 26.0,"warn_min": 22.0,"warn_max": 30.0,"crit_min": 18.0,"crit_max": 34.0,"updated_at": _NOW.isoformat()},
        {"zone_id": "zone-beta", "sensor_type": "humidity",         "target": 70.0,"warn_min": 55.0,"warn_max": 85.0,"crit_min": 40.0,"crit_max": 95.0,"updated_at": _NOW.isoformat()},
        {"zone_id": "zone-beta", "sensor_type": "soil_moisture",    "target": 75.0,"warn_min": 60.0,"warn_max": 85.0,"crit_min": 40.0,"crit_max": 95.0,"updated_at": _NOW.isoformat()},
        {"zone_id": "zone-beta", "sensor_type": "light_intensity",  "target": 350.0,"warn_min": 250.0,"warn_max": 500.0,"crit_min": 150.0,"crit_max": 700.0,"updated_at": _NOW.isoformat()},
        {"zone_id": "zone-beta", "sensor_type": "co2",              "target": 900.0,"warn_min": 700.0,"warn_max": 1300.0,"crit_min": 400.0,"crit_max": 1600.0,"updated_at": _NOW.isoformat()},
    ],
}

MOCK_DEVICES = [
    {
        "id": "dev-sensor-01",
        "zone_id": "zone-alpha",
        "name": "Alpha Multi-Sensor",
        "type": "sensor",
        "hardware_type": "esp32-th",
        "sensor_type": "multi",
        "actuator_type": None,
        "status": "online",
        "signal_strength": 87.0,
        "firmware_version": "2.3.1",
        "calibration_offset": 0.0,
        "calibration_slope": 1.0,
        "last_seen": _NOW.isoformat(),
        "created_at": (_NOW - timedelta(days=180)).isoformat(),
    },
    {
        "id": "dev-pump-01",
        "zone_id": "zone-alpha",
        "name": "Nutrient Pump",
        "type": "actuator",
        "hardware_type": "relay-01",
        "sensor_type": None,
        "actuator_type": "pump",
        "status": "online",
        "signal_strength": 92.0,
        "firmware_version": "1.2.0",
        "calibration_offset": 0.0,
        "calibration_slope": 1.0,
        "last_seen": _NOW.isoformat(),
        "created_at": (_NOW - timedelta(days=180)).isoformat(),
    },
    {
        "id": "dev-sensor-02",
        "zone_id": "zone-beta",
        "name": "Beta pH Probe",
        "type": "sensor",
        "hardware_type": "atlas-scientific",
        "sensor_type": "ph",
        "actuator_type": None,
        "status": "degraded",
        "signal_strength": 63.0,
        "firmware_version": "1.8.4",
        "calibration_offset": 0.15,
        "calibration_slope": 1.02,
        "last_seen": (_NOW - timedelta(minutes=45)).isoformat(),
        "created_at": (_NOW - timedelta(days=175)).isoformat(),
    },
]

MOCK_RULES = [
    {
        "id": "rule-auto-ph",
        "zone_id": "zone-alpha",
        "name": "pH Low Recovery",
        "description": "Activates pH up pump if pH drops below 5.5",
        "enabled": True,
        "conditions": [{"sensor_type": "ph", "operator": "<", "value": 5.5}],
        "actions": [{"type": "activate", "device_id": "dev-pump-01", "params": {"duration": 30}}],
        "trigger_count": 12,
        "last_triggered": (_NOW - timedelta(hours=6)).isoformat(),
        "created_at": (_NOW - timedelta(days=170)).isoformat(),
    },
]

MOCK_ALERT_CONFIGS = [
    {
        "id": "alert-ec-drift",
        "zone_id": "zone-alpha",
        "name": "EC Drift Warning",
        "severity": "warning",
        "enabled": True,
        "conditions": [{"sensor_type": "ec", "operator": ">", "value": 2.2}],
        "channels": ["dashboard", "email"],
        "created_at": (_NOW - timedelta(days=170)).isoformat(),
    },
    {
        "id": "alert-ph-drift",
        "zone_id": "zone-beta",
        "name": "pH Sensor Degradation",
        "severity": "info",
        "enabled": True,
        "conditions": [
            {"sensor_type": "ph", "operator": "<", "value": 5.5},
            {"sensor_type": "ph", "operator": ">", "value": 7.0},
        ],
        "channels": ["dashboard"],
        "created_at": (_NOW - timedelta(days=160)).isoformat(),
    },
]

MOCK_CYCLES = [
    {
        "id": "cyc-alpha-01",
        "zone_id": "zone-alpha",
        "crop_name": "Butterhead Lettuce",
        "planted_at": (_NOW - timedelta(days=14)).isoformat(),
        "expected_days": 28,
        "harvest_record": None,
        "completed_at": None,
        "created_at": (_NOW - timedelta(days=14)).isoformat(),
    },
    {
        "id": "cyc-beta-01",
        "zone_id": "zone-beta",
        "crop_name": "Mixed Herbs",
        "planted_at": (_NOW - timedelta(days=7)).isoformat(),
        "expected_days": 21,
        "harvest_record": None,
        "completed_at": None,
        "created_at": (_NOW - timedelta(days=7)).isoformat(),
    },
    {
        "id": "cyc-alpha-prev",
        "zone_id": "zone-alpha",
        "crop_name": "Romaine Lettuce",
        "planted_at": (_NOW - timedelta(days=70)).isoformat(),
        "expected_days": 35,
        "harvest_record": {
            "harvested_at": (_NOW - timedelta(days=35)).isoformat(),
            "yield_kg": 12.4,
            "quality_grade": "A",
            "notes": "Consistent growth, good color.",
        },
        "completed_at": (_NOW - timedelta(days=35)).isoformat(),
        "created_at": (_NOW - timedelta(days=70)).isoformat(),
    },
]

MOCK_FARM_MEMBERS = [
    {
        "id": "dev-demo-user",
        "easy_share_id": "VF-DEV001",
        "full_name": "Demo User",
        "avatar_url": None,
        "role": "owner",
        "joined_at": (_NOW - timedelta(days=187)).isoformat(),
    },
]


# ── Analytics ──────────────────────────────────────────────────────────────────

MOCK_READINGS = {
    "zone-alpha": [
        {"ts": (_NOW - timedelta(hours=h, minutes=m)).isoformat(),
         "ph": round(6.0 + 0.08 * (h % 3) - 0.04 * (m // 15), 2),
         "ec": round(1.8 + 0.03 * (h % 5) + 0.02 * (m // 30), 2),
         "air_temp": round(24.0 + 0.5 * ((h * 7 + m) % 11 - 5), 1),
         "humidity": round(65.0 + 2.0 * ((h * 3 + m) % 7 - 3), 1),
         "soil_moisture": round(70.0 + 1.5 * ((h * 11 + m) % 9 - 4), 1),
         "light_intensity": round(400.0 + 15.0 * ((h * 5 + m) % 13 - 6), 0),
         "co2": round(800.0 + 20.0 * ((h * 7 + m) % 9 - 4), 0),
        }
        for h in range(24) for m in (0, 15, 30, 45)
    ],
    "zone-beta": [
        {"ts": (_NOW - timedelta(hours=h, minutes=m)).isoformat(),
         "ph": round(6.2 - 0.15 * ((h * 3 + m) % 7 - 3) + 0.1 * ((h + m) % 2), 2),
         "ec": round(1.6 + 0.03 * (h % 4) - 0.02 * (m // 20), 2),
         "air_temp": round(26.0 + 0.4 * ((h * 5 + m) % 9 - 4), 1),
         "humidity": round(70.0 + 1.8 * ((h * 7 + m) % 11 - 5), 1),
         "soil_moisture": round(75.0 + 2.0 * ((h * 13 + m) % 7 - 3), 1),
         "light_intensity": round(350.0 + 12.0 * ((h * 3 + m) % 11 - 5), 0),
         "co2": round(900.0 + 25.0 * ((h * 11 + m) % 13 - 6), 0),
        }
        for h in range(24) for m in (0, 15, 30, 45)
    ],
}

def _generate_stats(readings):
    sensors = {}
    for k in ("ph", "ec", "air_temp", "humidity", "soil_moisture", "light_intensity", "co2"):
        vals = [r[k] for r in readings if r.get(k) is not None]
        if vals:
            sensors[k] = {
                "avg": round(sum(vals) / len(vals), 3),
                "min": round(min(vals), 3),
                "max": round(max(vals), 3),
            }
    return sensors

MOCK_STATS = {
    "zone-alpha": _generate_stats(MOCK_READINGS["zone-alpha"]),
    "zone-beta": _generate_stats(MOCK_READINGS["zone-beta"]),
}

MOCK_ACTIONS = [
    {
        "time": (_NOW - timedelta(hours=6, minutes=12)).isoformat(),
        "actuator_id": "dev-pump-01",
        "action": "ON",
        "mode": "auto",
        "triggered_by": "system",
        "params": {"duration": 30, "reason": "pH low recovery"},
        "auto_off_at": (_NOW - timedelta(hours=6, minutes=12, seconds=-30)).isoformat(),
    },
    {
        "time": (_NOW - timedelta(hours=6, minutes=12, seconds=-30)).isoformat(),
        "actuator_id": "dev-pump-01",
        "action": "OFF",
        "mode": "auto",
        "triggered_by": "system",
        "params": {"reason": "timer_expired"},
        "auto_off_at": None,
    },
    {
        "time": (_NOW - timedelta(hours=3, minutes=45)).isoformat(),
        "actuator_id": "dev-pump-01",
        "action": "ON",
        "mode": "manual",
        "triggered_by": "user",
        "params": {"duration": 15, "reason": "Manual nutrient top-up"},
        "auto_off_at": (_NOW - timedelta(hours=3, minutes=30)).isoformat(),
    },
    {
        "time": (_NOW - timedelta(hours=3, minutes=30)).isoformat(),
        "actuator_id": "dev-pump-01",
        "action": "OFF",
        "mode": "manual",
        "triggered_by": "user",
        "params": {"reason": "manual_off"},
        "auto_off_at": None,
    },
]

MOCK_ALERTS_HISTORY = {
    "zone-alpha": {
        "by_day": [
            {"day": (_NOW - timedelta(days=2)).date().isoformat(), "critical": 0, "warning": 2, "info": 1},
            {"day": (_NOW - timedelta(days=1)).date().isoformat(), "critical": 0, "warning": 1, "info": 0},
            {"day": _NOW.date().isoformat(), "critical": 0, "warning": 1, "info": 0},
        ],
        "breakdown": {"critical": 0, "warning": 4, "info": 1},
        "recent": [
            {
                "time": (_NOW - timedelta(hours=2)).isoformat(),
                "device_id": "dev-sensor-01",
                "alert_type": "ec_drift",
                "severity": "warning",
                "message": "EC reading 2.15 exceeds warn_max 2.0 in zone-alpha",
                "acknowledged": False,
                "acknowledged_at": None,
            },
            {
                "time": (_NOW - timedelta(hours=6, minutes=15)).isoformat(),
                "device_id": "dev-sensor-01",
                "alert_type": "ph_low",
                "severity": "warning",
                "message": "pH dropped to 5.32 (below warn_min 5.5) — pump activated",
                "acknowledged": True,
                "acknowledged_at": (_NOW - timedelta(hours=5, minutes=30)).isoformat(),
            },
            {
                "time": (_NOW - timedelta(days=1, hours=3)).isoformat(),
                "device_id": "dev-sensor-01",
                "alert_type": "temp_high",
                "severity": "warning",
                "message": "Air temperature reached 29.1°C (warn_max 28°C)",
                "acknowledged": False,
                "acknowledged_at": None,
            },
            {
                "time": (_NOW - timedelta(days=2, hours=8)).isoformat(),
                "device_id": "dev-sensor-01",
                "alert_type": "co2_low",
                "severity": "info",
                "message": "CO2 level below 600ppm — enrichment recommended",
                "acknowledged": True,
                "acknowledged_at": (_NOW - timedelta(days=1, hours=12)).isoformat(),
            },
        ],
    },
    "zone-beta": {
        "by_day": [
            {"day": (_NOW - timedelta(days=2)).date().isoformat(), "critical": 0, "warning": 0, "info": 1},
            {"day": (_NOW - timedelta(days=1)).date().isoformat(), "critical": 0, "warning": 1, "info": 1},
            {"day": _NOW.date().isoformat(), "critical": 0, "warning": 1, "info": 0},
        ],
        "breakdown": {"critical": 0, "warning": 2, "info": 2},
        "recent": [
            {
                "time": (_NOW - timedelta(hours=1, minutes=20)).isoformat(),
                "device_id": "dev-sensor-02",
                "alert_type": "ph_drift",
                "severity": "warning",
                "message": "pH sensor dev-sensor-02 showing intermittent readings (5.8–6.1 vs target 6.2)",
                "acknowledged": False,
                "acknowledged_at": None,
            },
            {
                "time": (_NOW - timedelta(hours=12)).isoformat(),
                "device_id": "dev-sensor-02",
                "alert_type": "signal_low",
                "severity": "info",
                "message": "Signal strength for dev-sensor-02 at 63% — check battery or range",
                "acknowledged": False,
                "acknowledged_at": None,
            },
        ],
    },
}

MOCK_HARVESTS = {
    "zone-alpha": {
        "buckets": [
            {"date": (_NOW - timedelta(days=35)).date().isoformat(), "Romaine Lettuce": 12.4},
        ],
        "crop_types": ["Romaine Lettuce"],
    },
    "zone-beta": {
        "buckets": [],
        "crop_types": [],
    },
}

MOCK_MAINTENANCE = [
    {
        "time": (_NOW - timedelta(days=7, hours=2)).isoformat(),
        "device_id": "dev-sensor-01",
        "task_type": "calibration",
        "description": "Routine multi-sensor calibration check",
        "performed_by": "Demo User",
        "cost": 0.0,
        "duration_minutes": 15,
        "notes": "All sensors within spec. pH offset adjusted by +0.02.",
    },
    {
        "time": (_NOW - timedelta(days=14, hours=3)).isoformat(),
        "device_id": "dev-pump-01",
        "task_type": "inspection",
        "description": "Nutrient pump impeller inspection and cleaning",
        "performed_by": "Demo User",
        "cost": 0.0,
        "duration_minutes": 30,
        "notes": "Minor debris found. Impeller cleaned, flow restored to nominal.",
    },
]

MOCK_AUTOMATION = [
    {
        "time": (_NOW - timedelta(hours=6, minutes=12)).isoformat(),
        "rule_id": "rule-auto-ph",
        "rule_name": "pH Low Recovery",
        "trigger_sensor": "ph",
        "trigger_value": 5.32,
        "actions_triggered": [{"type": "activate", "device_id": "dev-pump-01", "params": {"duration": 30}}],
        "outcome": "success",
    },
    {
        "time": (_NOW - timedelta(days=1, hours=3, minutes=45)).isoformat(),
        "rule_id": "rule-auto-ph",
        "rule_name": "pH Low Recovery",
        "trigger_sensor": "ph",
        "trigger_value": 5.28,
        "actions_triggered": [{"type": "activate", "device_id": "dev-pump-01", "params": {"duration": 30}}],
        "outcome": "success",
    },
    {
        "time": (_NOW - timedelta(days=3, hours=8, minutes=22)).isoformat(),
        "rule_id": "rule-auto-ph",
        "rule_name": "pH Low Recovery",
        "trigger_sensor": "ph",
        "trigger_value": 5.41,
        "actions_triggered": [{"type": "activate", "device_id": "dev-pump-01", "params": {"duration": 30}}],
        "outcome": "success",
    },
]


def deep_copy(obj):
    return copy.deepcopy(obj)
