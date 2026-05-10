-- VertiFlow Database Schema for Supabase (PostgreSQL)
-- This script sets up all necessary tables, indexes, and initial seed data.

-- 1. sensor_readings — one row per telemetry tick per zone
CREATE TABLE IF NOT EXISTS sensor_readings (
    time              TIMESTAMPTZ      NOT NULL,
    farm_id           VARCHAR(50)      NOT NULL,
    zone_id           VARCHAR(50)      NOT NULL,
    device_id         VARCHAR(50)      NOT NULL,
    data_source       VARCHAR(20)      NOT NULL DEFAULT 'simulated',
    ph                DOUBLE PRECISION,
    ec                DOUBLE PRECISION,
    air_temp          DOUBLE PRECISION,
    humidity          DOUBLE PRECISION,
    soil_moisture     DOUBLE PRECISION,
    light_intensity   DOUBLE PRECISION,
    co2               DOUBLE PRECISION
);

-- 2. sensor_health — battery / signal / online per sensor per tick
CREATE TABLE IF NOT EXISTS sensor_health (
    time              TIMESTAMPTZ      NOT NULL,
    farm_id           VARCHAR(50)      NOT NULL,
    zone_id           VARCHAR(50)      NOT NULL,
    device_id         VARCHAR(50)      NOT NULL,
    sensor_type       VARCHAR(30)      NOT NULL,
    battery_level     DOUBLE PRECISION NOT NULL,
    signal_strength   DOUBLE PRECISION NOT NULL,
    is_online         BOOLEAN          NOT NULL,
    uptime_seconds    BIGINT
);

-- 3. actions_log — actuator ON/OFF events with full context
CREATE TABLE IF NOT EXISTS actions_log (
    time              TIMESTAMPTZ      NOT NULL,
    farm_id           VARCHAR(50)      NOT NULL,
    zone_id           VARCHAR(50)      NOT NULL,
    actuator_id       VARCHAR(50)      NOT NULL,
    action            VARCHAR(10)      NOT NULL,
    mode              VARCHAR(10)      NOT NULL,
    previous_state    BOOLEAN          NOT NULL,
    params            JSONB,
    triggered_by      VARCHAR(20)      NOT NULL DEFAULT 'system',
    auto_off_at       TIMESTAMPTZ,
    status            VARCHAR(20)      NOT NULL DEFAULT 'pending'
);

-- 4. alerts_history — all alerts ever triggered
CREATE TABLE IF NOT EXISTS alerts_history (
    time              TIMESTAMPTZ      NOT NULL,
    farm_id           VARCHAR(50)      NOT NULL,
    zone_id           VARCHAR(50)      NOT NULL,
    device_id         VARCHAR(50)      NOT NULL,
    alert_type        VARCHAR(50)      NOT NULL,
    severity          VARCHAR(10)      NOT NULL,
    message           TEXT,
    acknowledged      BOOLEAN          NOT NULL DEFAULT FALSE,
    acknowledged_at   TIMESTAMPTZ,
    acknowledged_by   VARCHAR(100)
);

-- 5. automation_executions — every rule evaluation with its outcome
CREATE TABLE IF NOT EXISTS automation_executions (
    time              TIMESTAMPTZ      NOT NULL,
    zone_id           VARCHAR(50)      NOT NULL,
    rule_id           VARCHAR(100)     NOT NULL,
    rule_name         VARCHAR(200),
    trigger_sensor    VARCHAR(50),
    trigger_value     DOUBLE PRECISION,
    actions_triggered JSONB            NOT NULL DEFAULT '[]',
    outcome           VARCHAR(20)      NOT NULL,
    duration_ms       INTEGER,
    error_message     TEXT
);

-- 6. user_actions — full audit trail for every manual user change
CREATE TABLE IF NOT EXISTS user_actions (
    time              TIMESTAMPTZ      NOT NULL,
    user_id           VARCHAR(100)     NOT NULL,
    username          VARCHAR(100),
    zone_id           VARCHAR(50),
    entity_type       VARCHAR(50)      NOT NULL,
    entity_id         VARCHAR(100)     NOT NULL,
    action            VARCHAR(50)      NOT NULL,
    old_value         JSONB,
    new_value         JSONB,
    ip_address        VARCHAR(45)
);

-- 7. harvest_records — crop harvest events per layer / zone
CREATE TABLE IF NOT EXISTS harvest_records (
    time              TIMESTAMPTZ      NOT NULL,
    farm_id           VARCHAR(50)      NOT NULL,
    zone_id           VARCHAR(50)      NOT NULL,
    layer_id          VARCHAR(50),
    crop_type         VARCHAR(100)     NOT NULL,
    quantity_kg       DOUBLE PRECISION NOT NULL,
    yield_per_plant_g DOUBLE PRECISION,
    plants_harvested  INTEGER,
    notes             TEXT
);

-- 8. maintenance_log — device maintenance tasks
CREATE TABLE IF NOT EXISTS maintenance_log (
    time              TIMESTAMPTZ      NOT NULL,
    farm_id           VARCHAR(50)      NOT NULL,
    zone_id           VARCHAR(50)      NOT NULL,
    device_id         VARCHAR(50),
    task_type         VARCHAR(50)      NOT NULL,
    description       TEXT             NOT NULL,
    performed_by      VARCHAR(100)     NOT NULL,
    cost              NUMERIC(10, 2),
    duration_minutes  INTEGER,
    notes             TEXT
);

-- 9. farms — user-defined farm entities
CREATE TABLE IF NOT EXISTS farms (
    id          VARCHAR(50)  PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    location    VARCHAR(200) NOT NULL DEFAULT '',
    description TEXT         NOT NULL DEFAULT '',
    demo_mode   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 10. zones — growing zones within farms
CREATE TABLE IF NOT EXISTS zones (
    id          VARCHAR(50)  PRIMARY KEY,
    farm_id     VARCHAR(50)  NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    name        VARCHAR(200) NOT NULL,
    description VARCHAR(200) NOT NULL DEFAULT '',
    crop_name   VARCHAR(200) NOT NULL DEFAULT '',
    system_type VARCHAR(50)  NOT NULL DEFAULT 'nft',
    layer_index INTEGER      NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 11. zone_thresholds — per-sensor golden-state thresholds per zone
CREATE TABLE IF NOT EXISTS zone_thresholds (
    zone_id     VARCHAR(50)      NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    sensor_type VARCHAR(50)      NOT NULL,
    target      DOUBLE PRECISION NOT NULL,
    warn_min    DOUBLE PRECISION NOT NULL,
    warn_max    DOUBLE PRECISION NOT NULL,
    crit_min    DOUBLE PRECISION NOT NULL,
    crit_max    DOUBLE PRECISION NOT NULL,
    updated_at  TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    PRIMARY KEY (zone_id, sensor_type)
);

-- 12. devices — registered IoT sensors and actuators
CREATE TABLE IF NOT EXISTS devices (
    id                  VARCHAR(50)      PRIMARY KEY,
    zone_id             VARCHAR(50)      NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    name                VARCHAR(200)     NOT NULL,
    type                VARCHAR(30)      NOT NULL DEFAULT 'sensor',
    hardware_type       VARCHAR(80),
    sensor_type         VARCHAR(50),
    actuator_type       VARCHAR(50),
    status              VARCHAR(20)      NOT NULL DEFAULT 'offline',
    api_key_hash        VARCHAR(128),
    api_key_plaintext   VARCHAR(128),
    api_key_updated_at  TIMESTAMPTZ,
    signal_strength     DOUBLE PRECISION,
    firmware_version    VARCHAR(50),
    calibration_offset  DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    calibration_slope   DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    last_seen           TIMESTAMPTZ,
    created_at          TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

-- 13. automation_rules — IF-THEN rules per zone
CREATE TABLE IF NOT EXISTS automation_rules (
    id             VARCHAR(50)  PRIMARY KEY,
    zone_id        VARCHAR(50)  NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    name           VARCHAR(200) NOT NULL,
    description    TEXT         NOT NULL DEFAULT '',
    enabled        BOOLEAN      NOT NULL DEFAULT TRUE,
    conditions     JSONB        NOT NULL DEFAULT '[]',
    actions        JSONB        NOT NULL DEFAULT '[]',
    trigger_count  INTEGER      NOT NULL DEFAULT 0,
    last_triggered TIMESTAMPTZ,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 14. alert_configs — user-defined alert rules per zone
CREATE TABLE IF NOT EXISTS alert_configs (
    id         VARCHAR(50)  PRIMARY KEY,
    zone_id    VARCHAR(50)  NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    name       VARCHAR(200) NOT NULL,
    severity   VARCHAR(20)  NOT NULL DEFAULT 'warning',
    enabled    BOOLEAN      NOT NULL DEFAULT TRUE,
    conditions JSONB        NOT NULL DEFAULT '[]',
    channels   JSONB        NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 15. grow_cycles — crop grow cycles per zone
CREATE TABLE IF NOT EXISTS grow_cycles (
    id             VARCHAR(50)  PRIMARY KEY,
    zone_id        VARCHAR(50)  NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    crop_name      VARCHAR(200) NOT NULL,
    planted_at     TIMESTAMPTZ  NOT NULL,
    expected_days  INTEGER      NOT NULL,
    harvest_record JSONB,
    completed_at   TIMESTAMPTZ,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 16. report_schedules — automated report delivery schedules
CREATE TABLE IF NOT EXISTS report_schedules (
    id          VARCHAR(50)  PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    enabled     BOOLEAN      NOT NULL DEFAULT TRUE,
    frequency   VARCHAR(20)  NOT NULL DEFAULT 'weekly',
    report_type VARCHAR(20)  NOT NULL DEFAULT 'summary',
    recipients  JSONB        NOT NULL DEFAULT '[]',
    metrics     JSONB        NOT NULL DEFAULT '[]',
    last_sent   TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_sr_device_time ON sensor_readings (device_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_sr_zone_time   ON sensor_readings (zone_id,   time DESC);
CREATE INDEX IF NOT EXISTS idx_sr_farm_time   ON sensor_readings (farm_id,   time DESC);
CREATE INDEX IF NOT EXISTS idx_sr_zone_source_time ON sensor_readings (zone_id, data_source, time DESC);

CREATE INDEX IF NOT EXISTS idx_sh_device_time ON sensor_health (device_id,   time DESC);
CREATE INDEX IF NOT EXISTS idx_sh_zone_time   ON sensor_health (zone_id,     time DESC);
CREATE INDEX IF NOT EXISTS idx_sh_type_time   ON sensor_health (sensor_type, time DESC);

CREATE INDEX IF NOT EXISTS idx_al_actuator_time ON actions_log (actuator_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_al_zone_time     ON actions_log (zone_id,     time DESC);

CREATE INDEX IF NOT EXISTS idx_ah_device_time ON alerts_history (device_id,    time DESC);
CREATE INDEX IF NOT EXISTS idx_ah_zone_time   ON alerts_history (zone_id,      time DESC);
CREATE INDEX IF NOT EXISTS idx_ah_type_time   ON alerts_history (alert_type,   time DESC);
CREATE INDEX IF NOT EXISTS idx_ah_acked_time  ON alerts_history (acknowledged, time DESC);

CREATE INDEX IF NOT EXISTS idx_ae_rule_time ON automation_executions (rule_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_ae_zone_time ON automation_executions (zone_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_ua_user_time ON user_actions (user_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_ua_zone_time ON user_actions (zone_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_hr_zone_time ON harvest_records (zone_id,   time DESC);
CREATE INDEX IF NOT EXISTS idx_hr_crop_time ON harvest_records (crop_type, time DESC);

CREATE INDEX IF NOT EXISTS idx_ml_device_time ON maintenance_log (device_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_ml_zone_time   ON maintenance_log (zone_id,   time DESC);

CREATE INDEX IF NOT EXISTS idx_zones_farm    ON zones             (farm_id);
CREATE INDEX IF NOT EXISTS idx_zt_zone       ON zone_thresholds   (zone_id);
CREATE INDEX IF NOT EXISTS idx_dev_zone      ON devices           (zone_id);
CREATE INDEX IF NOT EXISTS idx_rules_zone    ON automation_rules  (zone_id);
CREATE INDEX IF NOT EXISTS idx_alerts_zone   ON alert_configs     (zone_id);
CREATE INDEX IF NOT EXISTS idx_cycles_zone   ON grow_cycles       (zone_id);

-- ── Seed Data ────────────────────────────────────────────────────────────────

INSERT INTO farms (id, name, location, description, created_at, demo_mode) 
VALUES ('farm-demo-01', 'VertiFlow Research Lab', 'Singapore', 'Official demonstration and testing environment.', NOW(), TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO zones (id, farm_id, name, description, crop_name, system_type, layer_index, created_at) 
VALUES 
    ('zone-alpha', 'farm-demo-01', 'Main NFT Layer', 'High-density leafy green production', 'Butterhead Lettuce', 'nft', 0, NOW()),
    ('zone-beta', 'farm-demo-01', 'Seedling Nursery', 'Initial germination and seedling growth', 'Mixed Herbs', 'ebb_flow', 1, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO zone_thresholds (zone_id, sensor_type, target, warn_min, warn_max, crit_min, crit_max, updated_at)
VALUES 
    ('zone-alpha', 'ph', 6.0, 5.5, 6.5, 5.0, 7.0, NOW()),
    ('zone-alpha', 'ec', 1.8, 1.5, 2.2, 1.2, 2.5, NOW()),
    ('zone-alpha', 'air_temp', 24.0, 20.0, 28.0, 18.0, 32.0, NOW()),
    ('zone-alpha', 'humidity', 65.0, 50.0, 80.0, 40.0, 90.0, NOW()),
    ('zone-alpha', 'soil_moisture', 70.0, 60.0, 80.0, 50.0, 90.0, NOW()),
    ('zone-alpha', 'light_intensity', 400.0, 300.0, 600.0, 200.0, 800.0, NOW()),
    ('zone-alpha', 'co2', 800.0, 600.0, 1200.0, 400.0, 1500.0, NOW())
ON CONFLICT (zone_id, sensor_type) DO NOTHING;

INSERT INTO devices (id, zone_id, name, type, hardware_type, sensor_type, status, created_at)
VALUES ('dev-sensor-01', 'zone-alpha', 'Alpha-Multi-Sensor', 'sensor', 'esp32-th', 'multi', 'online', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO devices (id, zone_id, name, type, hardware_type, actuator_type, status, created_at)
VALUES ('dev-pump-01', 'zone-alpha', 'Nutrient Pump', 'actuator', 'relay-01', 'pump', 'online', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO automation_rules (id, zone_id, name, description, enabled, conditions, actions, created_at)
VALUES ('rule-auto-ph', 'zone-alpha', 'pH Low Recovery', 'Activate pH up pump if pH drops below 5.5', TRUE, '[{"sensor_type": "ph", "operator": "<", "value": 5.5}]', '[{"type": "activate", "device_id": "dev-pump-01", "params": {"duration": 30}}]', NOW())
ON CONFLICT (id) DO NOTHING;
