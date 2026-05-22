#!/usr/bin/env python3
import argparse
import asyncio
import datetime
import random
import sys
import os

# Add src to python path so we can import app modules
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "src"))

from sqlalchemy import text
from vertiflow.db.database import AsyncSessionLocal

def get_target_or_default(thresholds, key, default):
    if key in thresholds:
        return thresholds[key]["target"]
    return default

async def main():
    parser = argparse.ArgumentParser(description="Seed database for VertiFlow Alert or Recovery moments.")
    parser.add_argument("--zone", type=str, default="zone-alpha", help="The target zone ID (e.g. zone-alpha)")
    parser.add_argument("--moment", type=str, choices=["alert", "recovery", "reset"], required=True, 
                        help="The moment to trigger ('alert' for Crisis, 'recovery' for Resolution, 'reset' to go back to normal)")
    
    args = parser.parse_args()
    zone_id = args.zone
    moment = args.moment

    async with AsyncSessionLocal() as db:
        # 1. Resolve farm and device
        print(f"[*] Querying details for zone '{zone_id}'...")
        res = await db.execute(
            text("SELECT farm_id, name FROM zones WHERE id = :zid"),
            {"zid": zone_id}
        )
        zone = res.fetchone()
        if not zone:
            print(f"[!] Error: Zone '{zone_id}' not found in database.")
            sys.exit(1)
        
        farm_id = zone._mapping["farm_id"]
        zone_name = zone._mapping["name"]
        print(f"[+] Found Zone: {zone_name} | Farm: {farm_id}")

        # Resolve device ID
        res = await db.execute(
            text("SELECT id FROM devices WHERE zone_id = :zid AND type = 'sensor' LIMIT 1"),
            {"zid": zone_id}
        )
        device = res.fetchone()
        device_id = device._mapping["id"] if device else f"{zone_id}-multi-sensor"
        print(f"[+] Using Device ID: {device_id}")

        # Query thresholds to respect user targets
        res = await db.execute(
            text("SELECT sensor_type, target, warn_min, warn_max, crit_min, crit_max FROM zone_thresholds WHERE zone_id = :zid"),
            {"zid": zone_id}
        )
        thresholds = {r._mapping["sensor_type"]: r._mapping for r in res.fetchall()}
        
        target_ph = get_target_or_default(thresholds, "ph", 6.0)
        target_temp = get_target_or_default(thresholds, "air_temp", 24.0)
        target_ec = get_target_or_default(thresholds, "ec", 1.8)
        target_humidity = get_target_or_default(thresholds, "humidity", 65.0)
        target_moisture = get_target_or_default(thresholds, "soil_moisture", 70.0)
        target_light = get_target_or_default(thresholds, "light_intensity", 400.0)
        target_co2 = get_target_or_default(thresholds, "co2", 800.0)

        # 2. Handle Reset Moment
        if moment == "reset":
            print("[*] Resetting zone telemetry to normal...")
            # Delete real sensor readings so WebSocket falls back to simulated random walk
            await db.execute(
                text("DELETE FROM sensor_readings WHERE zone_id = :zid AND data_source = 'real'"),
                {"zid": zone_id}
            )
            # Acknowledge all alerts
            await db.execute(
                text("""
                    UPDATE alerts_history 
                    SET acknowledged = TRUE, acknowledged_at = :now, acknowledged_by = 'demo_script'
                    WHERE zone_id = :zid AND acknowledged = FALSE
                """),
                {"zid": zone_id, "now": datetime.datetime.now(datetime.timezone.utc)}
            )
            await db.commit()
            print("[+] Reset complete! WebSocket will resume standard simulation.")
            return

        # 3. Clear simulated readings from database to prevent duplicate charts
        print("[*] Clearing previous simulated history for zone...")
        await db.execute(
            text("DELETE FROM sensor_readings WHERE zone_id = :zid AND data_source = 'simulated'"),
            {"zid": zone_id}
        )
        
        # Clear previous real readings from last 24 hours to prevent chart jumps
        await db.execute(
            text("DELETE FROM sensor_readings WHERE zone_id = :zid AND data_source = 'real' AND time >= :time"),
            {"zid": zone_id, "time": datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=24)}
        )

        # 4. Generate historical simulated readings (24 hours, 5-min intervals)
        print(f"[*] Seeding 24 hours of historical simulated data for moment: '{moment}'...")
        now_dt = datetime.datetime.now(datetime.timezone.utc)
        steps = 288
        step_duration = datetime.timedelta(minutes=5)

        for i in range(steps):
            record_time = now_dt - (steps - i) * step_duration
            
            # Default values (normal baseline with small Gaussian fluctuation)
            ph = target_ph + random.gauss(0, 0.03)
            air_temp = target_temp + random.gauss(0, 0.15)
            ec = target_ec + random.gauss(0, 0.02)
            humidity = target_humidity + random.gauss(0, 0.5)
            moisture = target_moisture + random.gauss(0, 0.5)
            light = target_light + random.gauss(0, 5)
            co2 = target_co2 + random.gauss(0, 10)

            if moment == "alert":
                # From index 264 (2 hours ago) to 287 (now): steady drop in pH and rise in temp
                if i >= 264:
                    progress = (i - 264) / 23.0 # 0 to 1
                    ph = target_ph - (target_ph - 4.5) * progress + random.gauss(0, 0.01)
                    air_temp = target_temp + (32.5 - target_temp) * progress + random.gauss(0, 0.05)
            
            elif moment == "recovery":
                # From index 240 (4 hours ago) to 275 (1 hour ago): sustained crisis
                if 240 <= i < 276:
                    ph = 4.5 + random.gauss(0, 0.02)
                    air_temp = 32.5 + random.gauss(0, 0.1)
                # From index 276 (1 hour ago) to 287 (now): sharp recovery
                elif i >= 276:
                    progress = (i - 276) / 11.0 # 0 to 1
                    ph = 4.5 + (target_ph - 4.5) * progress + random.gauss(0, 0.02)
                    air_temp = 32.5 - (32.5 - target_temp) * progress + random.gauss(0, 0.1)

            # Insert simulated reading
            await db.execute(
                text("""
                    INSERT INTO sensor_readings (
                        time, farm_id, zone_id, device_id, data_source, 
                        ph, ec, air_temp, humidity, soil_moisture, light_intensity, co2
                    ) VALUES (
                        :time, :farm_id, :zone_id, :device_id, 'simulated', 
                        :ph, :ec, :air_temp, :humidity, :soil_moisture, :light, :co2
                    )
                """),
                {
                    "time": record_time, "farm_id": farm_id, "zone_id": zone_id, "device_id": device_id,
                    "ph": ph, "ec": ec, "air_temp": air_temp, "humidity": humidity, 
                    "soil_moisture": moisture, "light": light, "co2": co2
                }
            )

        # 5. Handle Alert seeding / Acknowledgment
        if moment == "alert":
            print("[*] Injecting active alerts into alerts_history...")
            # Remove any duplicate unacknowledged demo alerts first
            await db.execute(
                text("DELETE FROM alerts_history WHERE zone_id = :zid AND acknowledged = FALSE"),
                {"zid": zone_id}
            )
            # Insert pH Critical alert
            await db.execute(
                text("""
                    INSERT INTO alerts_history (
                        time, farm_id, zone_id, device_id, alert_type, severity, message, acknowledged
                    ) VALUES (
                        :time, :farm_id, :zone_id, :device_id, 'SENSOR_ERROR', 'critical',
                        :msg, FALSE
                    )
                """),
                {
                    "time": now_dt, "farm_id": farm_id, "zone_id": zone_id, "device_id": f"{zone_id}:ph",
                    "msg": f"Critical: The pH level has dropped to 4.5 in {zone_name}. Action required."
                }
            )
            # Insert Temp Warning alert
            await db.execute(
                text("""
                    INSERT INTO alerts_history (
                        time, farm_id, zone_id, device_id, alert_type, severity, message, acknowledged
                    ) VALUES (
                        :time, :farm_id, :zone_id, :device_id, 'SYSTEM_CONFLICT', 'warning',
                        :msg, FALSE
                    )
                """),
                {
                    "time": now_dt, "farm_id": farm_id, "zone_id": zone_id, "device_id": f"{zone_id}:air_temp",
                    "msg": f"Warning: The Air Temperature is at 32.5°C in {zone_name}, approaching warning threshold limits."
                }
            )
        elif moment == "recovery":
            print("[*] Acknowledging active alerts in alerts_history...")
            await db.execute(
                text("""
                    UPDATE alerts_history 
                    SET acknowledged = TRUE, acknowledged_at = :now, acknowledged_by = 'demo_script'
                    WHERE zone_id = :zid AND acknowledged = FALSE
                """),
                {"zid": zone_id, "now": now_dt}
            )

        await db.commit()
        print("[+] Historical seed & alert settings committed successfully!")

        # 6. Real-Time Telemetry Stream Loop
        print("\n" + "="*60)
        print(f"[*] Starting live telemetry streaming loop for moment: '{moment.upper()}'")
        print("[*] Press Ctrl+C to terminate the stream and stop.")
        print("="*60 + "\n")

        try:
            while True:
                current_time = datetime.datetime.now(datetime.timezone.utc)
                
                # Define live stream values
                if moment == "alert":
                    ph = 4.5 + random.gauss(0, 0.01)
                    air_temp = 32.5 + random.gauss(0, 0.05)
                else: # recovery
                    ph = target_ph + random.gauss(0, 0.01)
                    air_temp = target_temp + random.gauss(0, 0.05)

                ec = target_ec + random.gauss(0, 0.01)
                humidity = target_humidity + random.gauss(0, 0.2)
                moisture = target_moisture + random.gauss(0, 0.2)
                light = target_light + random.gauss(0, 1.0)
                co2 = target_co2 + random.gauss(0, 2.0)

                async with AsyncSessionLocal() as loop_db:
                    # Write real reading
                    await loop_db.execute(
                        text("""
                            INSERT INTO sensor_readings (
                                time, farm_id, zone_id, device_id, data_source, 
                                ph, ec, air_temp, humidity, soil_moisture, light_intensity, co2
                            ) VALUES (
                                :time, :farm_id, :zone_id, :device_id, 'real', 
                                :ph, :ec, :air_temp, :humidity, :soil_moisture, :light, :co2
                            )
                        """),
                        {
                            "time": current_time, "farm_id": farm_id, "zone_id": zone_id, "device_id": device_id,
                            "ph": ph, "ec": ec, "air_temp": air_temp, "humidity": humidity, 
                            "soil_moisture": moisture, "light": light, "co2": co2
                        }
                    )
                    await loop_db.commit()

                print(f"[{current_time.strftime('%H:%M:%S')}] Pushed real reading: pH={ph:.2f}, Temp={air_temp:.1f}°C")
                await asyncio.sleep(3)
        except KeyboardInterrupt:
            print("\n[*] Live streaming terminated by user. Exiting.")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[*] Script interrupted. Exiting.")
