from __future__ import annotations
import random
import string
import logging
from datetime import datetime, timezone
from typing import Any, Optional, Dict, List
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

log = logging.getLogger(__name__)

def generate_easy_share_id() -> str:
    """Generate a highly readable Easy Share ID, e.g. VF-A9B8C7"""
    chars = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"VF-{chars}"

async def get_profile_by_id(db: AsyncSession, profile_id: str) -> Optional[Dict[str, Any]]:
    res = await db.execute(
        text("SELECT * FROM public.profiles WHERE id = :id"),
        {"id": profile_id}
    )
    row = res.one_or_none()
    return dict(row._mapping) if row else None

async def get_profile_by_auth_id(db: AsyncSession, auth_id: str) -> Optional[Dict[str, Any]]:
    return await get_profile_by_id(db, auth_id)

async def get_profile_by_easy_share_id(db: AsyncSession, easy_share_id: str) -> Optional[Dict[str, Any]]:
    res = await db.execute(
        text("SELECT * FROM public.profiles WHERE easy_share_id = :easy_share_id"),
        {"easy_share_id": easy_share_id}
    )
    row = res.one_or_none()
    return dict(row._mapping) if row else None

async def update_profile(
    db: AsyncSession, 
    profile_id: str, 
    full_name: Optional[str] = None, 
    avatar_url: Optional[str] = None
) -> Dict[str, Any]:
    res = await db.execute(
        text("""
            UPDATE public.profiles
            SET full_name = COALESCE(:full_name, full_name),
                avatar_url = COALESCE(:avatar_url, avatar_url),
                updated_at = NOW()
            WHERE id = :profile_id
            RETURNING *
        """),
        {"profile_id": profile_id, "full_name": full_name, "avatar_url": avatar_url}
    )
    row = res.one()
    await db.commit()
    return dict(row._mapping)

async def get_user_farms(db: AsyncSession, profile_id: str) -> List[Dict[str, Any]]:
    res = await db.execute(
        text("""
            SELECT f.id, f.name, f.location, f.description, f.demo_mode, f.created_at, uf.role
            FROM public.farms f
            JOIN public.user_farms uf ON f.id = uf.farm_id
            WHERE uf.profile_id = :profile_id
        """),
        {"profile_id": profile_id}
    )
    return [dict(r._mapping) for r in res.fetchall()]

async def create_farm(
    db: AsyncSession, 
    profile_id: str, 
    farm_id: str, 
    name: str, 
    location: str, 
    description: str
) -> Dict[str, Any]:
    # 1. Create farm record
    await db.execute(
        text("""
            INSERT INTO public.farms (id, name, location, description, demo_mode)
            VALUES (:id, :name, :location, :description, TRUE)
        """),
        {"id": farm_id, "name": name, "location": location, "description": description}
    )
    # 2. Add owner to user_farms
    await db.execute(
        text("""
            INSERT INTO public.user_farms (profile_id, farm_id, role)
            VALUES (:profile_id, :farm_id, 'owner')
        """),
        {"profile_id": profile_id, "farm_id": farm_id}
    )
    await db.commit()
    
    # 3. Return created farm
    res = await db.execute(text("SELECT * FROM public.farms WHERE id = :id"), {"id": farm_id})
    row = res.one()
    return dict(row._mapping)

async def get_farm_members(db: AsyncSession, farm_id: str) -> List[Dict[str, Any]]:
    res = await db.execute(
        text("""
            SELECT p.id, p.easy_share_id, p.full_name, p.avatar_url, uf.role, uf.joined_at
            FROM public.profiles p
            JOIN public.user_farms uf ON p.id = uf.profile_id
            WHERE uf.farm_id = :farm_id
        """),
        {"farm_id": farm_id}
    )
    return [dict(r._mapping) for r in res.fetchall()]

async def create_invitation(
    db: AsyncSession, 
    farm_id: str, 
    invited_by: str, 
    target_easy_share_id: Optional[str], 
    target_email: Optional[str], 
    role: str
) -> Dict[str, Any]:
    res = await db.execute(
        text("""
            INSERT INTO public.invitations (farm_id, invited_by, target_easy_share_id, target_email, role, status)
            VALUES (:farm_id, :invited_by, :target_easy_share_id, :target_email, :role, 'pending')
            RETURNING *
        """),
        {
            "farm_id": farm_id,
            "invited_by": invited_by,
            "target_easy_share_id": target_easy_share_id,
            "target_email": target_email,
            "role": role
        }
    )
    row = res.one()
    await db.commit()
    return dict(row._mapping)

async def get_pending_invitations_for_user(
    db: AsyncSession, 
    easy_share_id: Optional[str], 
    email: Optional[str]
) -> List[Dict[str, Any]]:
    res = await db.execute(
        text("""
            SELECT i.*, f.name as farm_name, p.full_name as invited_by_name
            FROM public.invitations i
            JOIN public.farms f ON i.farm_id = f.id
            JOIN public.profiles p ON i.invited_by = p.id
            WHERE i.status = 'pending'
              AND (
                (i.target_easy_share_id = :easy_id AND :easy_id IS NOT NULL)
                OR (i.target_email = :email AND :email IS NOT NULL)
              )
        """),
        {"easy_id": easy_share_id, "email": email}
    )
    return [dict(r._mapping) for r in res.fetchall()]

async def accept_invitation(db: AsyncSession, invite_id: str, profile_id: str) -> bool:
    # 1. Fetch invitation details
    res = await db.execute(
        text("SELECT * FROM public.invitations WHERE id = :id AND status = 'pending'"),
        {"id": invite_id}
    )
    row = res.one_or_none()
    if not row:
        return False
    
    inv = row._mapping
    
    # 2. Add to user_farms
    await db.execute(
        text("""
            INSERT INTO public.user_farms (profile_id, farm_id, role)
            VALUES (:profile_id, :farm_id, :role)
            ON CONFLICT (profile_id, farm_id) DO UPDATE SET role = EXCLUDED.role
        """),
        {"profile_id": profile_id, "farm_id": inv["farm_id"], "role": inv["role"]}
    )
    
    # 3. Update invitation status
    await db.execute(
        text("UPDATE public.invitations SET status = 'accepted' WHERE id = :id"),
        {"id": invite_id}
    )
    await db.commit()
    return True

async def decline_invitation(db: AsyncSession, invite_id: str, profile_id: str) -> bool:
    # Mark invitation as declined
    res = await db.execute(
        text("""
            UPDATE public.invitations
            SET status = 'declined'
            WHERE id = :id AND status = 'pending'
            RETURNING id
        """),
        {"id": invite_id}
    )
    row = res.one_or_none()
    if row:
        await db.commit()
        return True
    return False
