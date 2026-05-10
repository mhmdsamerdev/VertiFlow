import asyncio
from datetime import datetime, timezone
from sqlalchemy import text
from app.db.database import AsyncSessionLocal

async def inject_test_alerts():
    print("Connecting to database...")
    async with AsyncSessionLocal() as db:
        # 1. Find a zone_id
        res = await db.execute(text("SELECT id FROM zones LIMIT 1"))
        zone = res.fetchone()
        if not zone:
            print("No zones found in database. Please create a zone first.")
            return
        
        zone_id = zone[0]
        print(f"Injecting test alerts for zone: {zone_id}")

        # 2. Insert a Low Battery Alert
        await db.execute(
            text("""
                INSERT INTO alerts_history (time, farm_id, zone_id, device_id, alert_type, severity, message, acknowledged)
                VALUES (:ts, 'farm-001', :zid, :did, 'BATTERY_LOW', 'warning', 'Low Battery: air_temp sensor is at 15%. Consider charging soon.', FALSE)
            """),
            {
                "ts": datetime.now(timezone.utc),
                "zid": zone_id,
                "did": f"{zone_id}:air_temp"
            }
        )

        # 3. Insert a Connection Alert
        await db.execute(
            text("""
                INSERT INTO alerts_history (time, farm_id, zone_id, device_id, alert_type, severity, message, acknowledged)
                VALUES (:ts, 'farm-001', :zid, :did, 'DEVICE_OFFLINE', 'critical', 'Hardware Alert: The humidity sensor has stopped responding. Please check its connection.', FALSE)
            """),
            {
                "ts": datetime.now(timezone.utc),
                "zid": zone_id,
                "did": f"{zone_id}:humidity"
            }
        )

        await db.commit()
        print("Successfully injected 2 test alerts.")
        print("Check your dashboard 'THINGS YOU NEED TO DO' section!")

if __name__ == "__main__":
    asyncio.run(inject_test_alerts())
