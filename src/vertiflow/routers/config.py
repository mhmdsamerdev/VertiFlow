from __future__ import annotations

import uuid
import secrets
import hashlib
import logging
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from vertiflow.db.database import get_db
from vertiflow.core.dependencies import get_current_user

log = logging.getLogger(__name__)

router = APIRouter(prefix="/config", tags=["config"])

# ── helpers ───────────────────────────────────────────────────────────────────

def _now() -> datetime:
    return datetime.now(timezone.utc)

def _uid() -> str:
    return uuid.uuid4().hex[:12]

def _row(r: Any) -> dict:
    return dict(r._mapping)

def _rows(rs: Any) -> list[dict]:
    return [dict(r._mapping) for r in rs]

def _iso(v: Any) -> Any:
    return v.isoformat() if isinstance(v, datetime) else v

def _fmt(d: dict) -> dict:
    return {k: _iso(v) for k, v in d.items()}

# ═══════════════════════════════════════════════════════════════════════════════
# FARMS
# ═══════════════════════════════════════════════════════════════════════════════

class FarmCreate(BaseModel):
    name: str
    location: str = ""
    description: str = ""

class FarmUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    demo_mode: Optional[bool] = None

@router.get("/farms")
async def list_farms(db: AsyncSession = Depends(get_db), 
                     current_user: dict = Depends(get_current_user)) -> list[dict]:
    res = await db.execute(
        text("""
            SELECT DISTINCT f.* FROM public.farms f
            LEFT JOIN public.user_farms uf ON f.id = uf.farm_id AND uf.profile_id = :profile_id
            WHERE uf.profile_id IS NOT NULL OR f.browser_id = :bid
            ORDER BY f.created_at ASC
        """),
        {"profile_id": current_user["id"], "bid": current_user.get("browser_id")}
    )
    rows = res.all()
    return [_fmt(_row(r)) for r in rows]

@router.post("/farms", status_code=201)
async def create_farm(body: FarmCreate, db: AsyncSession = Depends(get_db),
                      current_user: dict = Depends(get_current_user)) -> dict:
    fid = f"farm-{_uid()}"
    bid = current_user.get("browser_id")
    await db.execute(text(
        "INSERT INTO farms (id, browser_id, name, location, description, created_at) "
        "VALUES (:id, :bid, :name, :location, :description, :ts)"
    ), {"id": fid, "bid": bid, "name": body.name, "location": body.location,
        "description": body.description, "ts": _now()})
    
    # Auto-associate the new farm in user_farms as well
    await db.execute(text(
        "INSERT INTO public.user_farms (profile_id, farm_id, role, joined_at) "
        "VALUES (:pid, :fid, 'owner', :ts)"
    ), {"pid": current_user["id"], "fid": fid, "ts": _now()})
    
    await db.commit()
    row = await db.execute(text("SELECT * FROM farms WHERE id = :id"), {"id": fid})
    return _fmt(_row(row.one()))

@router.put("/farms/{farm_id}")
async def update_farm(farm_id: str, body: FarmUpdate,
                      db: AsyncSession = Depends(get_db)) -> dict:
    sets, params = [], {"id": farm_id}
    if body.name is not None:        sets.append("name=:name");        params["name"] = body.name
    if body.location is not None:    sets.append("location=:location"); params["location"] = body.location
    if body.description is not None: sets.append("description=:desc");  params["desc"] = body.description
    if body.demo_mode is not None:   sets.append("demo_mode=:demo");      params["demo"] = body.demo_mode
    if not sets:
        raise HTTPException(400, "Nothing to update")
    await db.execute(text(f"UPDATE farms SET {', '.join(sets)} WHERE id=:id"), params)
    await db.commit()
    row = await db.execute(text("SELECT * FROM farms WHERE id=:id"), {"id": farm_id})
    r = row.one_or_none()
    if not r:
        raise HTTPException(404, "Farm not found")
    return _fmt(_row(r))

@router.delete("/farms/{farm_id}", status_code=204)
async def delete_farm(farm_id: str, db: AsyncSession = Depends(get_db)) -> None:
    await db.execute(text("DELETE FROM farms WHERE id=:id"), {"id": farm_id})
    await db.commit()

# ═══════════════════════════════════════════════════════════════════════════════
# ZONES
# ═══════════════════════════════════════════════════════════════════════════════

class ZoneCreate(BaseModel):
    farm_id: str
    name: str
    description: str = ""
    crop_name: str = ""
    system_type: str = "nft"
    layer_index: int = 0

class ZoneUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    crop_name: Optional[str] = None
    system_type: Optional[str] = None
    layer_index: Optional[int] = None

@router.get("/zones")
async def list_zones(farm_id: Optional[str] = None,
                     db: AsyncSession = Depends(get_db),
                     current_user: dict = Depends(get_current_user)) -> list[dict]:
    if farm_id:
        # Verify farm ownership / access
        fr = await db.execute(
            text("""
                SELECT f.id FROM public.farms f
                LEFT JOIN public.user_farms uf ON f.id = uf.farm_id AND uf.profile_id = :profile_id
                WHERE f.id = :id AND (uf.profile_id IS NOT NULL OR f.browser_id = :bid)
            """), 
            {"id": farm_id, "profile_id": current_user["id"], "bid": current_user.get("browser_id")}
        )
        if not fr.one_or_none():
            raise HTTPException(403, "Not authorized for this farm")
            
        rows = await db.execute(
            text("SELECT * FROM zones WHERE farm_id=:fid ORDER BY layer_index, created_at"),
            {"fid": farm_id})
    else:
        # Return all zones for all farms accessible by this profile
        rows = await db.execute(
            text("""
                SELECT DISTINCT z.* FROM zones z 
                JOIN farms f ON z.farm_id = f.id 
                LEFT JOIN public.user_farms uf ON f.id = uf.farm_id AND uf.profile_id = :profile_id
                WHERE uf.profile_id IS NOT NULL OR f.browser_id = :bid
                ORDER BY z.layer_index, z.created_at
            """),
            {"profile_id": current_user["id"], "bid": current_user.get("browser_id")}
        )
    return [_fmt(_row(r)) for r in rows]

@router.post("/zones", status_code=201)
async def create_zone(body: ZoneCreate, 
                      db: AsyncSession = Depends(get_db),
                      current_user: dict = Depends(get_current_user)) -> dict:
    # verify farm exists and authorized
    fr = await db.execute(
        text("""
            SELECT f.id FROM public.farms f
            LEFT JOIN public.user_farms uf ON f.id = uf.farm_id AND uf.profile_id = :profile_id
            WHERE f.id = :id AND (uf.profile_id IS NOT NULL OR f.browser_id = :bid)
        """), 
        {"id": body.farm_id, "profile_id": current_user["id"], "bid": current_user.get("browser_id")}
    )
    if not fr.one_or_none():
        raise HTTPException(403, "Not authorized for this farm")
        
    zid = f"zone-{_uid()}"
    await db.execute(text(
        "INSERT INTO zones (id, farm_id, name, description, crop_name, system_type, layer_index, created_at) "
        "VALUES (:id, :fid, :name, :desc, :crop, :sys, :li, :ts)"
    ), {"id": zid, "fid": body.farm_id, "name": body.name, "desc": body.description,
        "crop": body.crop_name, "sys": body.system_type, "li": body.layer_index, "ts": _now()})
    await db.commit()
    row = await db.execute(text("SELECT * FROM zones WHERE id=:id"), {"id": zid})
    return _fmt(_row(row.one()))

@router.put("/zones/{zone_id}")
async def update_zone(zone_id: str, body: ZoneUpdate,
                      db: AsyncSession = Depends(get_db),
                      current_user: dict = Depends(get_current_user)) -> dict:
    # Verify zone/farm authorization
    chk = await db.execute(
        text("""
            SELECT z.id FROM zones z
            JOIN farms f ON z.farm_id = f.id
            LEFT JOIN public.user_farms uf ON f.id = uf.farm_id AND uf.profile_id = :profile_id
            WHERE z.id = :zid AND (uf.profile_id IS NOT NULL OR f.browser_id = :bid)
        """),
        {"zid": zone_id, "profile_id": current_user["id"], "bid": current_user.get("browser_id")}
    )
    if not chk.one_or_none():
        raise HTTPException(403, "Not authorized for this zone")

    sets, params = [], {"id": zone_id}
    if body.name is not None:        sets.append("name=:name");          params["name"] = body.name
    if body.description is not None: sets.append("description=:desc");   params["desc"] = body.description
    if body.crop_name is not None:   sets.append("crop_name=:crop");     params["crop"] = body.crop_name
    if body.system_type is not None: sets.append("system_type=:sys");    params["sys"] = body.system_type
    if body.layer_index is not None: sets.append("layer_index=:li");     params["li"] = body.layer_index
    if not sets:
        raise HTTPException(400, "Nothing to update")
    await db.execute(text(f"UPDATE zones SET {', '.join(sets)} WHERE id=:id"), params)
    await db.commit()
    row = await db.execute(text("SELECT * FROM zones WHERE id=:id"), {"id": zone_id})
    r = row.one_or_none()
    if not r:
        raise HTTPException(404, "Zone not found")
    return _fmt(_row(r))

@router.delete("/zones/{zone_id}", status_code=204)
async def delete_zone(zone_id: str, 
                      db: AsyncSession = Depends(get_db),
                      current_user: dict = Depends(get_current_user)) -> None:
    # Verify zone/farm authorization
    chk = await db.execute(
        text("""
            SELECT z.id FROM zones z
            JOIN farms f ON z.farm_id = f.id
            LEFT JOIN public.user_farms uf ON f.id = uf.farm_id AND uf.profile_id = :profile_id
            WHERE z.id = :zid AND (uf.profile_id IS NOT NULL OR f.browser_id = :bid)
        """),
        {"zid": zone_id, "profile_id": current_user["id"], "bid": current_user.get("browser_id")}
    )
    if not chk.one_or_none():
        raise HTTPException(403, "Not authorized for this zone")

    await db.execute(text("DELETE FROM zones WHERE id=:id"), {"id": zone_id})
    await db.commit()

# ═══════════════════════════════════════════════════════════════════════════════
# THRESHOLDS
# ═══════════════════════════════════════════════════════════════════════════════

class ThresholdEntry(BaseModel):
    sensor_type: str
    target: float
    warn_min: float
    warn_max: float
    crit_min: float
    crit_max: float

@router.get("/thresholds")
async def get_thresholds(zone_id: str, db: AsyncSession = Depends(get_db),
                         current_user: dict = Depends(get_current_user)) -> list[dict]:
    # Verify ownership / access
    fr = await db.execute(
        text("""
            SELECT z.id FROM zones z 
            JOIN farms f ON z.farm_id = f.id 
            LEFT JOIN public.user_farms uf ON f.id = uf.farm_id AND uf.profile_id = :profile_id
            WHERE z.id=:zid AND (uf.profile_id IS NOT NULL OR f.browser_id = :bid)
        """), 
        {"zid": zone_id, "profile_id": current_user["id"], "bid": current_user.get("browser_id")}
    )
    if not fr.one_or_none():
        raise HTTPException(403, "Not authorized for this zone")

    rows = await db.execute(
        text("SELECT * FROM zone_thresholds WHERE zone_id=:zid ORDER BY sensor_type"),
        {"zid": zone_id})
    return [_fmt(_row(r)) for r in rows]

@router.put("/thresholds/{zone_id}", status_code=200)
async def upsert_thresholds(zone_id: str, body: list[ThresholdEntry],
                             db: AsyncSession = Depends(get_db)) -> list[dict]:
    for t in body:
        await db.execute(text("""
            INSERT INTO zone_thresholds (zone_id, sensor_type, target, warn_min, warn_max, crit_min, crit_max, updated_at)
            VALUES (:zid, :st, :tgt, :wmin, :wmax, :cmin, :cmax, :ts)
            ON CONFLICT (zone_id, sensor_type) DO UPDATE
              SET target=EXCLUDED.target, warn_min=EXCLUDED.warn_min, warn_max=EXCLUDED.warn_max,
                  crit_min=EXCLUDED.crit_min, crit_max=EXCLUDED.crit_max, updated_at=EXCLUDED.updated_at
        """), {"zid": zone_id, "st": t.sensor_type, "tgt": t.target,
               "wmin": t.warn_min, "wmax": t.warn_max,
               "cmin": t.crit_min, "cmax": t.crit_max, "ts": _now()})
    await db.commit()
    rows = await db.execute(
        text("SELECT * FROM zone_thresholds WHERE zone_id=:zid ORDER BY sensor_type"),
        {"zid": zone_id})
    return [_fmt(_row(r)) for r in rows]

# ═══════════════════════════════════════════════════════════════════════════════
# DEVICES
# ═══════════════════════════════════════════════════════════════════════════════

class DeviceCreate(BaseModel):
    zone_id: str
    name: str
    type: str = "sensor"
    hardware_type: Optional[str] = None
    sensor_type: Optional[str] = None
    actuator_type: Optional[str] = None
    firmware_version: Optional[str] = None
    calibration_offset: float = 0.0
    calibration_slope: float = 1.0

class DeviceUpdate(BaseModel):
    zone_id: Optional[str] = None
    name: Optional[str] = None
    type: Optional[str] = None
    hardware_type: Optional[str] = None
    sensor_type: Optional[str] = None
    actuator_type: Optional[str] = None
    status: Optional[str] = None
    firmware_version: Optional[str] = None
    calibration_offset: Optional[float] = None
    calibration_slope: Optional[float] = None


def _device_api_key() -> str:
    return f"sk_farm_{secrets.token_urlsafe(16)}"


def _hash_api_key(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()

@router.get("/devices")
async def list_devices(zone_id: Optional[str] = None,
                       db: AsyncSession = Depends(get_db),
                       current_user: dict = Depends(get_current_user)) -> list[dict]:
    if zone_id:
        # Verify ownership
        fr = await db.execute(
            text("""
                SELECT z.id FROM zones z 
                JOIN farms f ON z.farm_id = f.id 
                LEFT JOIN public.user_farms uf ON f.id = uf.farm_id AND uf.profile_id = :profile_id
                WHERE z.id=:zid AND (uf.profile_id IS NOT NULL OR f.browser_id = :bid)
            """), 
            {"zid": zone_id, "profile_id": current_user["id"], "bid": current_user.get("browser_id")}
        )
        if not fr.one_or_none():
            raise HTTPException(403, "Not authorized for this zone")

        rows = await db.execute(
            text("SELECT * FROM devices WHERE zone_id=:zid ORDER BY created_at"),
            {"zid": zone_id})
    else:
        rows = await db.execute(
            text("""
                SELECT DISTINCT d.* FROM devices d
                JOIN zones z ON d.zone_id = z.id
                JOIN farms f ON z.farm_id = f.id
                LEFT JOIN public.user_farms uf ON f.id = uf.farm_id AND uf.profile_id = :profile_id
                WHERE uf.profile_id IS NOT NULL OR f.browser_id = :bid
                ORDER BY d.zone_id, d.created_at
            """),
            {"profile_id": current_user["id"], "bid": current_user.get("browser_id")}
        )
    return [_fmt(_row(r)) for r in rows]

@router.post("/devices", status_code=201)
async def create_device(body: DeviceCreate, db: AsyncSession = Depends(get_db)) -> dict:
    zone_row = await db.execute(text("SELECT id FROM zones WHERE id=:id"), {"id": body.zone_id})
    if not zone_row.one_or_none():
        raise HTTPException(404, "Zone not found")

    did = f"device_{_uid()}"
    api_key = _device_api_key()
    
    query = text("""
        INSERT INTO devices (
            id, zone_id, name, type, hardware_type, sensor_type, actuator_type, status,
            api_key_hash, api_key_plaintext, api_key_updated_at, firmware_version,
            calibration_offset, calibration_slope, created_at
        )
        VALUES (
            :id, :zid, :name, :type, :hwtype, :stype, :atype, 'pending',
            :api_key_hash, :api_key_plaintext, :key_updated, :fw,
            :offset, :slope, :ts
        )
    """)

    params = {
        "id": did,
        "zid": body.zone_id,
        "name": body.name,
        "type": body.type,
        "hwtype": body.hardware_type,
        "stype": body.sensor_type,
        "atype": body.actuator_type,
        "api_key_hash": _hash_api_key(api_key),
        "api_key_plaintext": api_key,
        "key_updated": _now(),
        "fw": body.firmware_version,
        "offset": body.calibration_offset,
        "slope": body.calibration_slope,
        "ts": _now()
    }

    try:
        await db.execute(query, params)
        await db.commit()
    except Exception as exc:
        log.error("Failed to insert device %s: %s", did, exc)
        await db.rollback()
        raise HTTPException(500, f"Database error during device creation: {exc}")

    row = await db.execute(text("SELECT * FROM devices WHERE id=:id"), {"id": did})
    r = row.mappings().first()
    if not r:
        raise HTTPException(500, "Device was created but could not be retrieved")

    response = _fmt(dict(r))
    response["api_key"] = api_key
    return response

@router.put("/devices/{device_id}")
async def update_device(device_id: str, body: DeviceUpdate,
                        db: AsyncSession = Depends(get_db)) -> dict:
    sets, params = [], {"id": device_id}
    if body.zone_id is not None:
        zone_row = await db.execute(text("SELECT id FROM zones WHERE id=:id"), {"id": body.zone_id})
        if not zone_row.one_or_none():
            raise HTTPException(404, "Zone not found")
        sets.append("zone_id=:zid");                params["zid"] = body.zone_id
    if body.name is not None:               sets.append("name=:name");                    params["name"] = body.name
    if body.type is not None:               sets.append("type=:type");                    params["type"] = body.type
    if body.hardware_type is not None:      sets.append("hardware_type=:hwtype");         params["hwtype"] = body.hardware_type
    if body.sensor_type is not None:        sets.append("sensor_type=:stype");            params["stype"] = body.sensor_type
    if body.actuator_type is not None:      sets.append("actuator_type=:atype");          params["atype"] = body.actuator_type
    if body.status is not None:             sets.append("status=:status");                params["status"] = body.status
    if body.firmware_version is not None:   sets.append("firmware_version=:fw");          params["fw"] = body.firmware_version
    if body.calibration_offset is not None: sets.append("calibration_offset=:offset");    params["offset"] = body.calibration_offset
    if body.calibration_slope is not None:  sets.append("calibration_slope=:slope");      params["slope"] = body.calibration_slope
    if not sets:
        raise HTTPException(400, "Nothing to update")
    await db.execute(text(f"UPDATE devices SET {', '.join(sets)} WHERE id=:id"), params)
    await db.commit()
    row = await db.execute(text("SELECT * FROM devices WHERE id=:id"), {"id": device_id})
    r = row.one_or_none()
    if not r:
        raise HTTPException(404, "Device not found")
    return _fmt(_row(r))

@router.delete("/devices/{device_id}", status_code=204)
async def delete_device(device_id: str, db: AsyncSession = Depends(get_db)) -> None:
    await db.execute(text("DELETE FROM devices WHERE id=:id"), {"id": device_id})
    await db.commit()


@router.get("/devices/{device_id}/credentials")
async def get_device_credentials(device_id: str, db: AsyncSession = Depends(get_db)) -> dict:
    row = await db.execute(text(
        "SELECT id, name, api_key_plaintext, api_key_updated_at FROM devices WHERE id=:id"
    ), {"id": device_id})
    device = row.one_or_none()
    if not device:
        raise HTTPException(404, "Device not found")
    m = _fmt(_row(device))
    return {
        "device_id": m["id"],
        "name": m["name"],
        "api_key": m.get("api_key_plaintext"),
        "api_key_updated_at": m.get("api_key_updated_at"),
    }


@router.post("/devices/{device_id}/reset-key")
async def reset_device_api_key(device_id: str, db: AsyncSession = Depends(get_db)) -> dict:
    row = await db.execute(text("SELECT id FROM devices WHERE id=:id"), {"id": device_id})
    if not row.one_or_none():
        raise HTTPException(404, "Device not found")
    new_key = _device_api_key()
    now = _now()
    await db.execute(text("""
        UPDATE devices
        SET api_key_hash=:key,
            api_key_plaintext=:key_plaintext,
            api_key_updated_at=:ts,
            status='inactive'
        WHERE id=:id
    """), {"id": device_id, "key": _hash_api_key(new_key), "key_plaintext": new_key, "ts": now})
    await db.commit()
    return {"device_id": device_id, "api_key": new_key, "api_key_updated_at": now.isoformat()}

# ═══════════════════════════════════════════════════════════════════════════════
# AUTOMATION RULES
# ═══════════════════════════════════════════════════════════════════════════════

class RuleCreate(BaseModel):
    zone_id: str
    name: str
    description: str = ""
    enabled: bool = True
    conditions: list[dict] = []
    actions: list[dict] = []

class RuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    enabled: Optional[bool] = None
    conditions: Optional[list[dict]] = None
    actions: Optional[list[dict]] = None

import json as _json

@router.get("/rules")
async def list_rules(zone_id: Optional[str] = None,
                     db: AsyncSession = Depends(get_db),
                     current_user: dict = Depends(get_current_user)) -> list[dict]:
    if zone_id:
        # Verify ownership
        fr = await db.execute(
            text("""
                SELECT z.id FROM zones z 
                JOIN farms f ON z.farm_id = f.id 
                LEFT JOIN public.user_farms uf ON f.id = uf.farm_id AND uf.profile_id = :profile_id
                WHERE z.id=:zid AND (uf.profile_id IS NOT NULL OR f.browser_id = :bid)
            """), 
            {"zid": zone_id, "profile_id": current_user["id"], "bid": current_user.get("browser_id")}
        )
        if not fr.one_or_none():
            raise HTTPException(403, "Not authorized for this zone")

        rows = await db.execute(
            text("SELECT * FROM automation_rules WHERE zone_id=:zid ORDER BY created_at"),
            {"zid": zone_id})
    else:
        rows = await db.execute(
            text("""
                SELECT DISTINCT r.* FROM automation_rules r
                JOIN zones z ON r.zone_id = z.id
                JOIN farms f ON z.farm_id = f.id
                LEFT JOIN public.user_farms uf ON f.id = uf.farm_id AND uf.profile_id = :profile_id
                WHERE uf.profile_id IS NOT NULL OR f.browser_id = :bid
                ORDER BY r.zone_id, r.created_at
            """),
            {"profile_id": current_user["id"], "bid": current_user.get("browser_id")}
        )
    return [_fmt(_row(r)) for r in rows]

@router.post("/rules", status_code=201)
async def create_rule(body: RuleCreate, db: AsyncSession = Depends(get_db)) -> dict:
    rid = f"rule-{_uid()}"
    await db.execute(text("""
        INSERT INTO automation_rules (id, zone_id, name, description, enabled,
                                     conditions, actions, trigger_count, created_at)
        VALUES (:id, :zid, :name, :desc, :enabled,
                CAST(:cond AS jsonb), CAST(:acts AS jsonb), 0, :ts)
    """), {"id": rid, "zid": body.zone_id, "name": body.name, "desc": body.description,
           "enabled": body.enabled, "cond": _json.dumps(body.conditions),
           "acts": _json.dumps(body.actions), "ts": _now()})
    await db.commit()
    row = await db.execute(text("SELECT * FROM automation_rules WHERE id=:id"), {"id": rid})
    return _fmt(_row(row.one()))

@router.put("/rules/{rule_id}")
async def update_rule(rule_id: str, body: RuleUpdate,
                      db: AsyncSession = Depends(get_db)) -> dict:
    sets, params = [], {"id": rule_id}
    if body.name is not None:        sets.append("name=:name");               params["name"] = body.name
    if body.description is not None: sets.append("description=:desc");        params["desc"] = body.description
    if body.enabled is not None:     sets.append("enabled=:enabled");         params["enabled"] = body.enabled
    if body.conditions is not None:  sets.append("conditions=CAST(:cond AS jsonb)");  params["cond"] = _json.dumps(body.conditions)
    if body.actions is not None:     sets.append("actions=CAST(:acts AS jsonb)");     params["acts"] = _json.dumps(body.actions)
    if not sets:
        raise HTTPException(400, "Nothing to update")
    await db.execute(text(f"UPDATE automation_rules SET {', '.join(sets)} WHERE id=:id"), params)
    await db.commit()
    row = await db.execute(text("SELECT * FROM automation_rules WHERE id=:id"), {"id": rule_id})
    r = row.one_or_none()
    if not r: raise HTTPException(404, "Rule not found")
    return _fmt(_row(r))

@router.patch("/rules/{rule_id}/toggle")
async def toggle_rule(rule_id: str, db: AsyncSession = Depends(get_db)) -> dict:
    await db.execute(text(
        "UPDATE automation_rules SET enabled = NOT enabled WHERE id=:id"), {"id": rule_id})
    await db.commit()
    row = await db.execute(text("SELECT * FROM automation_rules WHERE id=:id"), {"id": rule_id})
    r = row.one_or_none()
    if not r: raise HTTPException(404, "Rule not found")
    return _fmt(_row(r))

@router.delete("/rules/{rule_id}", status_code=204)
async def delete_rule(rule_id: str, db: AsyncSession = Depends(get_db)) -> None:
    await db.execute(text("DELETE FROM automation_rules WHERE id=:id"), {"id": rule_id})
    await db.commit()

# ═══════════════════════════════════════════════════════════════════════════════
# ALERT CONFIGS
# ═══════════════════════════════════════════════════════════════════════════════

class AlertConfigCreate(BaseModel):
    zone_id: str
    name: str
    severity: str = "warning"
    enabled: bool = True
    conditions: list[dict] = []
    channels: list[str] = []

class AlertConfigUpdate(BaseModel):
    name: Optional[str] = None
    severity: Optional[str] = None
    enabled: Optional[bool] = None
    conditions: Optional[list[dict]] = None
    channels: Optional[list[str]] = None

@router.get("/alerts")
async def list_alert_configs(zone_id: Optional[str] = None,
                              db: AsyncSession = Depends(get_db),
                              current_user: dict = Depends(get_current_user)) -> list[dict]:
    if zone_id:
        # Verify ownership
        fr = await db.execute(
            text("""
                SELECT z.id FROM zones z 
                JOIN farms f ON z.farm_id = f.id 
                LEFT JOIN public.user_farms uf ON f.id = uf.farm_id AND uf.profile_id = :profile_id
                WHERE z.id=:zid AND (uf.profile_id IS NOT NULL OR f.browser_id = :bid)
            """), 
            {"zid": zone_id, "profile_id": current_user["id"], "bid": current_user.get("browser_id")}
        )
        if not fr.one_or_none():
            raise HTTPException(403, "Not authorized for this zone")

        rows = await db.execute(
            text("SELECT * FROM alert_configs WHERE zone_id=:zid ORDER BY created_at"),
            {"zid": zone_id})
    else:
        rows = await db.execute(
            text("""
                SELECT DISTINCT a.* FROM alert_configs a
                JOIN zones z ON a.zone_id = z.id
                JOIN farms f ON z.farm_id = f.id
                LEFT JOIN public.user_farms uf ON f.id = uf.farm_id AND uf.profile_id = :profile_id
                WHERE uf.profile_id IS NOT NULL OR f.browser_id = :bid
                ORDER BY a.zone_id, a.created_at
            """),
            {"profile_id": current_user["id"], "bid": current_user.get("browser_id")}
        )
    return [_fmt(_row(r)) for r in rows]

@router.post("/alerts", status_code=201)
async def create_alert_config(body: AlertConfigCreate,
                               db: AsyncSession = Depends(get_db)) -> dict:
    aid = f"alert-{_uid()}"
    await db.execute(text("""
        INSERT INTO alert_configs (id, zone_id, name, severity, enabled, conditions, channels, created_at)
        VALUES (:id, :zid, :name, :sev, :enabled, CAST(:cond AS jsonb), CAST(:ch AS jsonb), :ts)
    """), {"id": aid, "zid": body.zone_id, "name": body.name, "sev": body.severity,
           "enabled": body.enabled, "cond": _json.dumps(body.conditions),
           "ch": _json.dumps(body.channels), "ts": _now()})
    await db.commit()
    row = await db.execute(text("SELECT * FROM alert_configs WHERE id=:id"), {"id": aid})
    return _fmt(_row(row.one()))

@router.put("/alerts/{alert_id}")
async def update_alert_config(alert_id: str, body: AlertConfigUpdate,
                               db: AsyncSession = Depends(get_db)) -> dict:
    sets, params = [], {"id": alert_id}
    if body.name is not None:       sets.append("name=:name");             params["name"] = body.name
    if body.severity is not None:   sets.append("severity=:sev");          params["sev"] = body.severity
    if body.enabled is not None:    sets.append("enabled=:enabled");       params["enabled"] = body.enabled
    if body.conditions is not None: sets.append("conditions=CAST(:cond AS jsonb)"); params["cond"] = _json.dumps(body.conditions)
    if body.channels is not None:   sets.append("channels=CAST(:ch AS jsonb)");    params["ch"] = _json.dumps(body.channels)
    if not sets:
        raise HTTPException(400, "Nothing to update")
    await db.execute(text(f"UPDATE alert_configs SET {', '.join(sets)} WHERE id=:id"), params)
    await db.commit()
    row = await db.execute(text("SELECT * FROM alert_configs WHERE id=:id"), {"id": alert_id})
    r = row.one_or_none()
    if not r: raise HTTPException(404, "Alert config not found")
    return _fmt(_row(r))

@router.delete("/alerts/{alert_id}", status_code=204)
async def delete_alert_config(alert_id: str, db: AsyncSession = Depends(get_db)) -> None:
    await db.execute(text("DELETE FROM alert_configs WHERE id=:id"), {"id": alert_id})
    await db.commit()

# ═══════════════════════════════════════════════════════════════════════════════
# GROW CYCLES
# ═══════════════════════════════════════════════════════════════════════════════

class CycleCreate(BaseModel):
    zone_id: str
    crop_name: str
    planted_at: datetime
    expected_days: int

class HarvestPayload(BaseModel):
    yield_kg: float
    quality_grade: str
    notes: str = ""

@router.get("/cycles")
async def list_cycles(zone_id: Optional[str] = None,
                      db: AsyncSession = Depends(get_db),
                      current_user: dict = Depends(get_current_user)) -> list[dict]:
    if zone_id:
        # Verify ownership
        fr = await db.execute(
            text("""
                SELECT z.id FROM zones z 
                JOIN farms f ON z.farm_id = f.id 
                LEFT JOIN public.user_farms uf ON f.id = uf.farm_id AND uf.profile_id = :profile_id
                WHERE z.id=:zid AND (uf.profile_id IS NOT NULL OR f.browser_id = :bid)
            """), 
            {"zid": zone_id, "profile_id": current_user["id"], "bid": current_user.get("browser_id")}
        )
        if not fr.one_or_none():
            raise HTTPException(403, "Not authorized for this zone")

        rows = await db.execute(
            text("SELECT * FROM grow_cycles WHERE zone_id=:zid ORDER BY planted_at DESC"),
            {"zid": zone_id})
    else:
        rows = await db.execute(
            text("""
                SELECT DISTINCT c.* FROM grow_cycles c
                JOIN zones z ON c.zone_id = z.id
                JOIN farms f ON z.farm_id = f.id
                LEFT JOIN public.user_farms uf ON f.id = uf.farm_id AND uf.profile_id = :profile_id
                WHERE uf.profile_id IS NOT NULL OR f.browser_id = :bid
                ORDER BY c.planted_at DESC
            """),
            {"profile_id": current_user["id"], "bid": current_user.get("browser_id")}
        )
    return [_fmt(_row(r)) for r in rows]

@router.post("/cycles", status_code=201)
async def create_cycle(body: CycleCreate, db: AsyncSession = Depends(get_db)) -> dict:
    cid = f"cyc-{_uid()}"
    await db.execute(text("""
        INSERT INTO grow_cycles (id, zone_id, crop_name, planted_at, expected_days, created_at)
        VALUES (:id, :zid, :crop, :planted, :days, :ts)
    """), {"id": cid, "zid": body.zone_id, "crop": body.crop_name,
           "planted": body.planted_at, "days": body.expected_days, "ts": _now()})
    await db.commit()
    row = await db.execute(text("SELECT * FROM grow_cycles WHERE id=:id"), {"id": cid})
    return _fmt(_row(row.one()))

@router.post("/cycles/{cycle_id}/harvest")
async def log_harvest_on_cycle(cycle_id: str, body: HarvestPayload,
                                db: AsyncSession = Depends(get_db)) -> dict:
    now = _now()
    record = _json.dumps({"harvested_at": now.isoformat(),
                          "yield_kg": body.yield_kg,
                          "quality_grade": body.quality_grade,
                          "notes": body.notes})
    await db.execute(text("""
        UPDATE grow_cycles SET harvest_record=CAST(:rec AS jsonb), completed_at=:ts WHERE id=:id
    """), {"rec": record, "ts": now, "id": cycle_id})
    await db.commit()
    row = await db.execute(text("SELECT * FROM grow_cycles WHERE id=:id"), {"id": cycle_id})
    r = row.one_or_none()
    if not r: raise HTTPException(404, "Cycle not found")
    return _fmt(_row(r))

@router.delete("/cycles/{cycle_id}", status_code=204)
async def delete_cycle(cycle_id: str, db: AsyncSession = Depends(get_db)) -> None:
    await db.execute(text("DELETE FROM grow_cycles WHERE id=:id"), {"id": cycle_id})
    await db.commit()

# ═══════════════════════════════════════════════════════════════════════════════
# REPORT SCHEDULES
# ═══════════════════════════════════════════════════════════════════════════════

class ReportScheduleCreate(BaseModel):
    name: str
    enabled: bool = True
    frequency: str = "weekly"
    report_type: str = "summary"
    recipients: list[str] = []
    metrics: list[str] = []

class ReportScheduleUpdate(BaseModel):
    name: Optional[str] = None
    enabled: Optional[bool] = None
    frequency: Optional[str] = None
    report_type: Optional[str] = None
    recipients: Optional[list[str]] = None
    metrics: Optional[list[str]] = None

@router.get("/reports/schedules")
async def list_report_schedules(db: AsyncSession = Depends(get_db),
                                 current_user: dict = Depends(get_current_user)) -> list[dict]:
    rows = await db.execute(
        text("""
            SELECT DISTINCT rs.* FROM report_schedules rs
            LEFT JOIN public.profiles p ON rs.browser_id = p.browser_id
            WHERE rs.browser_id = :bid OR p.id = :profile_id
            ORDER BY rs.created_at ASC
        """),
        {"bid": current_user.get("browser_id"), "profile_id": current_user["id"]}
    )
    return [_fmt(_row(r)) for r in rows]

@router.post("/reports/schedules", status_code=201)
async def create_report_schedule(body: ReportScheduleCreate,
                                  db: AsyncSession = Depends(get_db),
                                  current_user: dict = Depends(get_current_user)) -> dict:
    sid = f"rep-{_uid()}"
    bid = current_user.get("browser_id")
    await db.execute(text("""
        INSERT INTO report_schedules
            (id, browser_id, name, enabled, frequency, report_type, recipients, metrics, created_at)
        VALUES (:id, :bid, :name, :enabled, :freq, :rtype, CAST(:rec AS jsonb), CAST(:met AS jsonb), :ts)
    """), {"id": sid, "bid": bid, "name": body.name, "enabled": body.enabled,
           "freq": body.frequency, "rtype": body.report_type,
           "rec": _json.dumps(body.recipients), "met": _json.dumps(body.metrics),
           "ts": _now()})
    await db.commit()
    row = await db.execute(text("SELECT * FROM report_schedules WHERE id=:id"), {"id": sid})
    return _fmt(_row(row.one()))

@router.put("/reports/schedules/{schedule_id}")
async def update_report_schedule(schedule_id: str, body: ReportScheduleUpdate,
                                  db: AsyncSession = Depends(get_db),
                                  current_user: dict = Depends(get_current_user)) -> dict:
    # Verify ownership
    chk = await db.execute(
        text("""
            SELECT rs.id FROM report_schedules rs
            LEFT JOIN public.profiles p ON rs.browser_id = p.browser_id
            WHERE rs.id=:id AND (rs.browser_id=:bid OR p.id=:profile_id)
        """),
        {"id": schedule_id, "bid": current_user.get("browser_id"), "profile_id": current_user["id"]}
    )
    if not chk.one_or_none():
        raise HTTPException(403, "Not authorized for this schedule")

    sets, params = [], {"id": schedule_id}
    if body.name is not None:        sets.append("name=:name");               params["name"] = body.name
    if body.enabled is not None:     sets.append("enabled=:enabled");         params["enabled"] = body.enabled
    if body.frequency is not None:   sets.append("frequency=:freq");          params["freq"] = body.frequency
    if body.report_type is not None: sets.append("report_type=:rtype");       params["rtype"] = body.report_type
    if body.recipients is not None:  sets.append("recipients=CAST(:rec AS jsonb)");   params["rec"] = _json.dumps(body.recipients)
    if body.metrics is not None:     sets.append("metrics=CAST(:met AS jsonb)");      params["met"] = _json.dumps(body.metrics)
    if not sets:
        raise HTTPException(400, "Nothing to update")
    await db.execute(text(f"UPDATE report_schedules SET {', '.join(sets)} WHERE id=:id"), params)
    await db.commit()
    row = await db.execute(text("SELECT * FROM report_schedules WHERE id=:id"), {"id": schedule_id})
    r = row.one_or_none()
    if not r: raise HTTPException(404, "Schedule not found")
    return _fmt(_row(r))

@router.patch("/reports/schedules/{schedule_id}/toggle")
async def toggle_report_schedule(schedule_id: str, db: AsyncSession = Depends(get_db),
                                  current_user: dict = Depends(get_current_user)) -> dict:
    # Verify ownership
    chk = await db.execute(
        text("""
            SELECT rs.id FROM report_schedules rs
            LEFT JOIN public.profiles p ON rs.browser_id = p.browser_id
            WHERE rs.id=:id AND (rs.browser_id=:bid OR p.id=:profile_id)
        """),
        {"id": schedule_id, "bid": current_user.get("browser_id"), "profile_id": current_user["id"]}
    )
    if not chk.one_or_none():
        raise HTTPException(403, "Not authorized for this schedule")

    await db.execute(
        text("UPDATE report_schedules SET enabled = NOT enabled WHERE id=:id"),
        {"id": schedule_id})
    await db.commit()
    row = await db.execute(text("SELECT * FROM report_schedules WHERE id=:id"), {"id": schedule_id})
    r = row.one_or_none()
    if not r: raise HTTPException(404, "Schedule not found")
    return _fmt(_row(r))

@router.get("/reports/history")
async def list_report_history(db: AsyncSession = Depends(get_db),
                              current_user: dict = Depends(get_current_user)) -> list[dict]:
    # Placeholder for history isolation (currently history is not implemented but endpoints exist)
    return []

@router.delete("/reports/schedules/{schedule_id}", status_code=204)
async def delete_report_schedule(schedule_id: str, db: AsyncSession = Depends(get_db),
                                  current_user: dict = Depends(get_current_user)) -> None:
    # Verify ownership
    chk = await db.execute(
        text("""
            SELECT rs.id FROM report_schedules rs
            LEFT JOIN public.profiles p ON rs.browser_id = p.browser_id
            WHERE rs.id=:id AND (rs.browser_id=:bid OR p.id=:profile_id)
        """),
        {"id": schedule_id, "bid": current_user.get("browser_id"), "profile_id": current_user["id"]}
    )
    if not chk.one_or_none():
        raise HTTPException(403, "Not authorized for this schedule")

    await db.execute(text("DELETE FROM report_schedules WHERE id=:id"), {"id": schedule_id})
    await db.commit()


