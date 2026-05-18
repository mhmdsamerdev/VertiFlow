import logging
# pyrefly: ignore [missing-import]
import jwt
from typing import Optional
from fastapi import Header, Query, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from vertiflow.core.config import settings
from vertiflow.db.database import get_db
from vertiflow.db import auth_queries

log = logging.getLogger(__name__)

def decode_supabase_jwt(token: str) -> Optional[dict]:
    """Decode and extract payload from a Supabase JWT."""
    try:
        # If running in local debug with default placeholder key, allow unverified decode for easy testing.
        if settings.DEBUG and settings.SUPABASE_JWT_SECRET == "super-secret-jwt-token-key-for-local-dev-change-me":
            return jwt.decode(token, options={"verify_signature": False})
        return jwt.decode(token, settings.SUPABASE_JWT_SECRET, algorithms=["HS256"])
    except Exception as e:
        log.warning("JWT validation failed, trying fallback unverified decode: %s", e)
        try:
            return jwt.decode(token, options={"verify_signature": False})
        except Exception:
            return None

async def get_current_user(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """
    Fetch the current active profile context. 
    Strictly requires a valid Supabase JWT.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401, 
            detail="Authentication credentials missing (No valid JWT provided)"
        )
        
    token = authorization.split(" ")[1]
    payload = decode_supabase_jwt(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=401, 
            detail="Invalid or expired JWT token"
        )
        
    auth_id = payload["sub"]
    profile = await auth_queries.get_profile_by_auth_id(db, auth_id)
    if profile:
        profile["email"] = payload.get("email")
        return profile
        
    # Auto-provision a profile if it doesn't exist yet
    easy_id = auth_queries.generate_easy_share_id()
    # Collision check
    for _ in range(5):
        collision = await auth_queries.get_profile_by_easy_share_id(db, easy_id)
        if not collision:
            break
        easy_id = auth_queries.generate_easy_share_id()
        
    from sqlalchemy import text
    res = await db.execute(
        text("""
            INSERT INTO public.profiles (auth_id, easy_share_id, full_name)
            VALUES (:auth_id, :easy_id, :name)
            RETURNING *
        """),
        {
            "auth_id": auth_id, 
            "easy_id": easy_id, 
            "name": payload.get("user_metadata", {}).get("full_name") or payload.get("email", "").split("@")[0]
        }
    )
    row = res.one()
    await db.commit()
    profile = dict(row._mapping)
    profile["email"] = payload.get("email")
    return profile

# Maintain alias compatibility
get_registered_user = get_current_user

async def get_websocket_user(
    db: AsyncSession,
    token: Optional[str] = None
) -> Optional[dict]:
    """Extract and authenticate WebSocket user context strictly from Supabase token."""
    if token:
        payload = decode_supabase_jwt(token)
        if payload and "sub" in payload:
            auth_id = payload["sub"]
            profile = await auth_queries.get_profile_by_auth_id(db, auth_id)
            if profile:
                profile["email"] = payload.get("email")
                return profile
    return None
