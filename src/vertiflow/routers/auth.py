from __future__ import annotations
import uuid
import logging
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from vertiflow.db.database import get_db
from vertiflow.db import auth_queries
from vertiflow.core.dependencies import get_current_user, get_registered_user
from vertiflow.models import schemas

log = logging.getLogger(__name__)

router = APIRouter(prefix="/v1", tags=["auth"])

def _uid() -> str:
    return uuid.uuid4().hex[:12]

# ═══════════════════════════════════════════════════════════════════════════════
# AUTHENTICATION & MERGING
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/auth/anonymous", response_model=schemas.Profile)
async def auth_anonymous(
    body: schemas.AnonymousAuthRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Initialize an anonymous profile for a browser session.
    Keeps browser sessions perfectly tracked prior to sign up.
    """
    try:
        profile = await auth_queries.create_anonymous_profile(db, body.browser_id)
        return profile
    except Exception as exc:
        log.error("Failed to create anonymous profile: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to initialize anonymous session")

@router.post("/auth/merge", response_model=schemas.Profile)
async def auth_merge(
    body: schemas.MergeAuthRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_registered_user)
):
    """
    Merge anonymous browser history and farms into the newly registered account.
    """
    # 1. Fetch anonymous profile
    anon_profile = await auth_queries.get_profile_by_browser_id(db, body.browser_id)
    if not anon_profile:
        # If no anonymous profile exists, there is nothing to merge, just return the registered profile
        return current_user

    # Prevent merging onto self
    if anon_profile["id"] == current_user["id"]:
        return current_user

    try:
        # 2. Find all farms owned/created by the anonymous profile
        anon_farms = await auth_queries.get_user_farms(db, anon_profile["id"])
        
        # 3. Transfer all farms from anonymous profile to registered profile in `user_farms`
        for farm in anon_farms:
            # Add registered user to the farm with same role (owner/viewer etc)
            await db.execute(
                text("""
                    INSERT INTO public.user_farms (profile_id, farm_id, role)
                    VALUES (:profile_id, :farm_id, :role)
                    ON CONFLICT (profile_id, farm_id) DO UPDATE SET role = EXCLUDED.role
                """),
                {
                    "profile_id": current_user["id"],
                    "farm_id": farm["id"],
                    "role": farm["role"]
                }
            )
            
            # Also update `browser_id` on the main `farms` table to null or registered auth_id if tracked
            await db.execute(
                text("UPDATE public.farms SET browser_id = NULL WHERE id = :farm_id"),
                {"farm_id": farm["id"]}
            )

        # 4. Remove anonymous profile to prevent duplication/orphans
        await db.execute(
            text("DELETE FROM public.profiles WHERE id = :anon_id"),
            {"anon_id": anon_profile["id"]}
        )
        
        await db.commit()
        return current_user
    except Exception as exc:
        log.error("Error during anonymous account merge: %s", exc)
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed to merge anonymous session data")


# ═══════════════════════════════════════════════════════════════════════════════
# PROFILE MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/profiles/me", response_model=schemas.Profile)
async def get_my_profile(current_user: dict = Depends(get_current_user)):
    """Fetch the active profile context (works for both anonymous and registered)."""
    return current_user

@router.put("/profiles/me", response_model=schemas.Profile)
async def update_my_profile(
    body: schemas.ProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update profile information (e.g. name, avatar)."""
    try:
        updated = await auth_queries.update_profile(
            db, 
            current_user["id"], 
            body.full_name, 
            body.avatar_url
        )
        return updated
    except Exception as exc:
        log.error("Failed to update profile: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to update profile")


# ═══════════════════════════════════════════════════════════════════════════════
# MULTI-TENANT FARMS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/farms", response_model=List[schemas.Farm])
async def list_user_farms(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """List all farms the current user belongs to (multi-tenant support)."""
    try:
        farms = await auth_queries.get_user_farms(db, current_user["id"])
        return farms
    except Exception as exc:
        log.error("Failed to list farms: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to load farms")

@router.post("/farms", response_model=schemas.Farm, status_code=201)
async def create_user_farm(
    body: schemas.FarmCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new farm and register the creator as 'owner'."""
    try:
        farm_id = f"farm-{_uid()}"
        farm = await auth_queries.create_farm(
            db,
            current_user["id"],
            farm_id,
            body.name,
            body.location,
            body.description
        )
        return farm
    except Exception as exc:
        log.error("Failed to create farm: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to create farm")

@router.get("/farms/{farm_id}/members", response_model=List[schemas.MemberProfile])
async def list_farm_members(
    farm_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """List all team members collaborating on a specific farm."""
    # Verify the current user belongs to this farm
    farms = await auth_queries.get_user_farms(db, current_user["id"])
    if not any(f["id"] == farm_id for f in farms):
        raise HTTPException(status_code=403, detail="Not authorized to access this farm's settings")

    try:
        members = await auth_queries.get_farm_members(db, farm_id)
        return members
    except Exception as exc:
        log.error("Failed to load farm members: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to load team members")


# ═══════════════════════════════════════════════════════════════════════════════
# INVITATIONS & COLLABORATION
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/invitations", response_model=schemas.Invitation, status_code=201)
async def invite_team_member(
    body: schemas.InvitationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_registered_user)
):
    """
    Invite a team member to a farm using either their Easy Share ID or email address.
    Requires the inviter to be registered and a member of the farm.
    """
    # Verify the inviter is a member of the farm
    farms = await auth_queries.get_user_farms(db, current_user["id"])
    farm_assoc = next((f for f in farms if f["id"] == body.farm_id), None)
    if not farm_assoc:
        raise HTTPException(status_code=403, detail="Not authorized to invite members to this farm")
    
    # Verify inviter is an 'owner' or 'admin' of the farm to invite others
    if farm_assoc["role"] not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Only owners and admins can invite team members")

    if not body.target_easy_share_id and not body.target_email:
        raise HTTPException(status_code=400, detail="Must provide either target Easy Share ID or email")

    try:
        # Create invitation record
        invite = await auth_queries.create_invitation(
            db,
            body.farm_id,
            current_user["id"],
            body.target_easy_share_id,
            body.target_email,
            body.role
        )
        return invite
    except Exception as exc:
        log.error("Failed to create invitation: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to create team invitation")

@router.get("/invitations/pending", response_model=List[schemas.Invitation])
async def list_my_pending_invitations(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_registered_user)
):
    """Retrieve all pending in-app team invitations for the logged-in user."""
    try:
        # Search by user's Easy Share ID or email
        email = current_user.get("email")
        easy_id = current_user.get("easy_share_id")
        
        invites = await auth_queries.get_pending_invitations_for_user(db, easy_id, email)
        return invites
    except Exception as exc:
        log.error("Failed to load invitations: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to load invitations")

@router.post("/invitations/{invite_id}/accept")
async def accept_farm_invitation(
    invite_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_registered_user)
):
    """Accept an invitation to join a farm team."""
    try:
        success = await auth_queries.accept_invitation(db, invite_id, current_user["id"])
        if not success:
            raise HTTPException(status_code=404, detail="Invitation not found or no longer active")
        return {"success": True, "message": "Invitation accepted successfully"}
    except HTTPException:
        raise
    except Exception as exc:
        log.error("Failed to accept invitation: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to accept invitation")

@router.post("/invitations/{invite_id}/decline")
async def decline_farm_invitation(
    invite_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_registered_user)
):
    """Decline an invitation to join a farm team."""
    try:
        success = await auth_queries.decline_invitation(db, invite_id, current_user["id"])
        if not success:
            raise HTTPException(status_code=404, detail="Invitation not found or no longer active")
        return {"success": True, "message": "Invitation declined successfully"}
    except Exception as exc:
        log.error("Failed to decline invitation: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to decline invitation")
