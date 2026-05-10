from __future__ import annotations

import logging
from typing import Final

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

log = logging.getLogger(__name__)

# ── Table DDL (CREATE TABLE IF NOT EXISTS) ────────────────────────────────────

_TABLE_DDL: Final[list[str]] = [
    # 1. sensor_readings — one row per telemetry tick per zone
    """
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
    )
    """,

    # 2. sensor_health — battery / signal / online per sensor per tick
    """
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
    )
    """,

    # 3. actions_log — actuator ON/OFF events with full context
    """
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
        auto_off_at       TIMESTAMPTZ
    )
    """,

    # 4. alerts_history — all alerts ever triggered
    """
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
    )
    """,

    # 5. automation_executions — every rule evaluation with its outcome
    """
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
    )
    """,

    # 6. user_actions — full audit trail for every manual user change
    """
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
    )
    """,

    # 7. harvest_records — crop harvest events per layer / zone
    """
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
    )
    """,

    # 8. maintenance_log — device maintenance tasks
    """
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
    )
    """,

    # ── Config / Entity tables (regular PostgreSQL, NOT hypertables) ──────────

    # 9. farms — user-defined farm entities
    """
    CREATE TABLE IF NOT EXISTS farms (
        id          VARCHAR(50)  PRIMARY KEY,
        name        VARCHAR(200) NOT NULL,
        location    VARCHAR(200) NOT NULL DEFAULT '',
        description TEXT         NOT NULL DEFAULT '',
        demo_mode   BOOLEAN      NOT NULL DEFAULT TRUE,
        created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
    """,

    # 10. zones — growing zones within farms
    """
    CREATE TABLE IF NOT EXISTS zones (
        id          VARCHAR(50)  PRIMARY KEY,
        farm_id     VARCHAR(50)  NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
        name        VARCHAR(200) NOT NULL,
        description VARCHAR(200) NOT NULL DEFAULT '',
        crop_name   VARCHAR(200) NOT NULL DEFAULT '',
        system_type VARCHAR(50)  NOT NULL DEFAULT 'nft',
        layer_index INTEGER      NOT NULL DEFAULT 0,
        created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
    """,

    # 11. zone_thresholds — per-sensor golden-state thresholds per zone
    """
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
    )
    """,

    # 12. devices — registered IoT sensors and actuators
    """
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
    )
    """,

    # 13. automation_rules — IF-THEN rules per zone
    """
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
    )
    """,

    # 14. alert_configs — user-defined alert rules per zone
    """
    CREATE TABLE IF NOT EXISTS alert_configs (
        id         VARCHAR(50)  PRIMARY KEY,
        zone_id    VARCHAR(50)  NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
        name       VARCHAR(200) NOT NULL,
        severity   VARCHAR(20)  NOT NULL DEFAULT 'warning',
        enabled    BOOLEAN      NOT NULL DEFAULT TRUE,
        conditions JSONB        NOT NULL DEFAULT '[]',
        channels   JSONB        NOT NULL DEFAULT '[]',
        created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
    """,

    # 15. grow_cycles — crop grow cycles per zone
    """
    CREATE TABLE IF NOT EXISTS grow_cycles (
        id             VARCHAR(50)  PRIMARY KEY,
        zone_id        VARCHAR(50)  NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
        crop_name      VARCHAR(200) NOT NULL,
        planted_at     TIMESTAMPTZ  NOT NULL,
        expected_days  INTEGER      NOT NULL,
        harvest_record JSONB,
        completed_at   TIMESTAMPTZ,
        created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
    """,

    # 16. report_schedules — automated report delivery schedules
    """
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
    )
    """,
]

# ── Hypertable list ───────────────────────────────────────────────────────────

_HYPERTABLES: Final[list[str]] = [
    "sensor_readings",
    "sensor_health",
    "actions_log",
    "alerts_history",
    "automation_executions",
    "user_actions",
    "harvest_records",
    "maintenance_log",
]

# ── Index DDL ─────────────────────────────────────────────────────────────────

_INDEX_DDL: Final[list[str]] = [
    # sensor_readings
    "CREATE INDEX IF NOT EXISTS idx_sr_device_time ON sensor_readings (device_id, time DESC)",
    "CREATE INDEX IF NOT EXISTS idx_sr_zone_time   ON sensor_readings (zone_id,   time DESC)",
    "CREATE INDEX IF NOT EXISTS idx_sr_farm_time   ON sensor_readings (farm_id,   time DESC)",
    "CREATE INDEX IF NOT EXISTS idx_sr_zone_source_time ON sensor_readings (zone_id, data_source, time DESC)",

    # sensor_health
    "CREATE INDEX IF NOT EXISTS idx_sh_device_time ON sensor_health (device_id,   time DESC)",
    "CREATE INDEX IF NOT EXISTS idx_sh_zone_time   ON sensor_health (zone_id,     time DESC)",
    "CREATE INDEX IF NOT EXISTS idx_sh_type_time   ON sensor_health (sensor_type, time DESC)",

    # actions_log
    "CREATE INDEX IF NOT EXISTS idx_al_actuator_time ON actions_log (actuator_id, time DESC)",
    "CREATE INDEX IF NOT EXISTS idx_al_zone_time     ON actions_log (zone_id,     time DESC)",

    # alerts_history
    "CREATE INDEX IF NOT EXISTS idx_ah_device_time ON alerts_history (device_id,    time DESC)",
    "CREATE INDEX IF NOT EXISTS idx_ah_zone_time   ON alerts_history (zone_id,      time DESC)",
    "CREATE INDEX IF NOT EXISTS idx_ah_type_time   ON alerts_history (alert_type,   time DESC)",
    "CREATE INDEX IF NOT EXISTS idx_ah_acked_time  ON alerts_history (acknowledged, time DESC)",

    # automation_executions
    "CREATE INDEX IF NOT EXISTS idx_ae_rule_time ON automation_executions (rule_id, time DESC)",
    "CREATE INDEX IF NOT EXISTS idx_ae_zone_time ON automation_executions (zone_id, time DESC)",

    # user_actions
    "CREATE INDEX IF NOT EXISTS idx_ua_user_time ON user_actions (user_id, time DESC)",
    "CREATE INDEX IF NOT EXISTS idx_ua_zone_time ON user_actions (zone_id, time DESC)",

    # harvest_records
    "CREATE INDEX IF NOT EXISTS idx_hr_zone_time ON harvest_records (zone_id,   time DESC)",
    "CREATE INDEX IF NOT EXISTS idx_hr_crop_time ON harvest_records (crop_type, time DESC)",

    # maintenance_log
    "CREATE INDEX IF NOT EXISTS idx_ml_device_time ON maintenance_log (device_id, time DESC)",
    "CREATE INDEX IF NOT EXISTS idx_ml_zone_time   ON maintenance_log (zone_id,   time DESC)",

    # config tables
    "CREATE INDEX IF NOT EXISTS idx_zones_farm    ON zones             (farm_id)",
    "CREATE INDEX IF NOT EXISTS idx_zt_zone       ON zone_thresholds   (zone_id)",
    "CREATE INDEX IF NOT EXISTS idx_dev_zone      ON devices           (zone_id)",
    "CREATE INDEX IF NOT EXISTS idx_rules_zone    ON automation_rules  (zone_id)",
    "CREATE INDEX IF NOT EXISTS idx_alerts_zone   ON alert_configs     (zone_id)",
    "CREATE INDEX IF NOT EXISTS idx_cycles_zone   ON grow_cycles       (zone_id)",
]

_ALTER_DDL: Final[list[str]] = [
    "ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS data_source VARCHAR(20) NOT NULL DEFAULT 'simulated'",
    "ALTER TABLE devices ADD COLUMN IF NOT EXISTS api_key_hash VARCHAR(128)",
    "ALTER TABLE devices ADD COLUMN IF NOT EXISTS api_key_plaintext VARCHAR(128)",
    "ALTER TABLE devices ADD COLUMN IF NOT EXISTS api_key_updated_at TIMESTAMPTZ",
    "ALTER TABLE devices ADD COLUMN IF NOT EXISTS signal_strength DOUBLE PRECISION",
    "ALTER TABLE devices ADD COLUMN IF NOT EXISTS hardware_type VARCHAR(80)",
    "ALTER TABLE devices ADD COLUMN IF NOT EXISTS sensor_type VARCHAR(50)",
    "ALTER TABLE devices ADD COLUMN IF NOT EXISTS actuator_type VARCHAR(50)",
    "ALTER TABLE devices ADD COLUMN IF NOT EXISTS firmware_version VARCHAR(50)",
    "ALTER TABLE devices ADD COLUMN IF NOT EXISTS calibration_offset DOUBLE PRECISION NOT NULL DEFAULT 0.0",
    "ALTER TABLE devices ADD COLUMN IF NOT EXISTS calibration_slope DOUBLE PRECISION NOT NULL DEFAULT 1.0",
    "ALTER TABLE zones ADD COLUMN IF NOT EXISTS crop_name VARCHAR(200) NOT NULL DEFAULT ''",
    "ALTER TABLE zones ADD COLUMN IF NOT EXISTS system_type VARCHAR(50) NOT NULL DEFAULT 'nft'",
    "ALTER TABLE zones ADD COLUMN IF NOT EXISTS layer_index INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE actions_log ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending'",
    "ALTER TABLE farms ADD COLUMN IF NOT EXISTS demo_mode BOOLEAN NOT NULL DEFAULT TRUE"
]


# ── Initialisation ────────────────────────────────────────────────────────────

async def init_timescale(engine: AsyncEngine) -> None:
    """Idempotent startup routine: extension → tables → hypertables → indexes → retention.

    Each phase runs in its own transaction so a TimescaleDB-unavailable environment
    degrades gracefully to plain PostgreSQL tables with composite indexes.
    """

    # Phase 1 — Enable extension (isolated tx; failure is non-fatal)
    _ts_available = False
    try:
        async with engine.begin() as conn:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE"))
        _ts_available = True
        log.info("TimescaleDB extension ready")
    except Exception as exc:
        log.warning(
            "TimescaleDB extension unavailable or permission denied (%s) — "
            "tables will be created as plain PostgreSQL relations",
            exc,
        )

    # Phase 2 — Create all tables and apply alters
    try:
        async with engine.begin() as conn:
            for stmt in _TABLE_DDL:
                await conn.execute(text(stmt))
        
        # Phase 2.1 — Apply alters individually to avoid transaction failure
        for stmt in _ALTER_DDL:
            try:
                async with engine.begin() as conn:
                    await conn.execute(text(stmt))
            except Exception as exc:
                log.debug("Migration statement failed or skipped: %s", exc)
    except Exception as exc:
        log.error("Failed to initialize database tables: %s", exc)
        return

    log.info("Schema migrations and table checks complete")

    # Phase 3 — Convert to hypertables (TimescaleDB only)
    if _ts_available:
        async with engine.begin() as conn:
            for table in _HYPERTABLES:
                try:
                    await conn.execute(text(
                        f"SELECT create_hypertable('{table}', 'time', "
                        f"if_not_exists => TRUE, migrate_data => TRUE)"
                    ))
                except Exception as exc:
                    log.warning("Could not create hypertable for %s: %s", table, exc)
        log.info("Hypertables check complete")

    # Phase 4 — Create composite indexes
    async with engine.begin() as conn:
        for stmt in _INDEX_DDL:
            try:
                await conn.execute(text(stmt))
            except Exception:
                pass
    log.info("Composite indexes verified")

    # Phase 5 — Add 1-year retention policies (TimescaleDB only)
    if _ts_available:
        async with engine.begin() as conn:
            for table in _HYPERTABLES:
                try:
                    await conn.execute(text(
                        f"SELECT add_retention_policy('{table}', "
                        f"INTERVAL '1 year', if_not_exists => TRUE)"
                    ))
                except Exception:
                    pass
        log.info("Retention policies verified")
