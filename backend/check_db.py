import asyncio
from app.db.database import AsyncSessionLocal
from sqlalchemy import text

async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(text('SELECT id, name, demo_mode FROM farms'))
        print('FARMS:', [dict(r._mapping) for r in res.fetchall()])
        res = await db.execute(text('SELECT id, name, farm_id FROM zones'))
        print('ZONES:', [dict(r._mapping) for r in res.fetchall()])

if __name__ == '__main__':
    asyncio.run(check())
