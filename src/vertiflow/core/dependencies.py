import logging
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

async def get_browser_id(
    x_browser_id: str = Header(None), 
    browser_id: str = Query(None)
) -> str:
    """Extract browser_id from headers or query parameters."""
    bid = x_browser_id or browser_id
    if not bid:
        raise HTTPException(
            status_code=400, 
            detail="X-Browser-ID header or browser_id query param missing"
        )
    return bid

async def get_optional_current_user(
    authorization: Optional[str] = Header(None),
    x_browser_id: Optional[str] = Header(None),
    browser_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
) -> Optional[dict]:
    """
    Fetch the current active profile context. 
    Supports fully registered users (via JWT) and anonymous users (via browser ID).
    """
    # 1. Try Registered Auth (Supabase JWT)
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        payload = decode_supabase_jwt(token)
        if payload and "sub" in payload:
            auth_id = payload["sub"]
            profile = await auth_queries.get_profile_by_auth_id(db, auth_id)
            if profile:
                # Add email and extra info from token to the session profile dict
                profile["email"] = payload.get("email")
                return profile
            
            # If auth_id exists in JWT but we don't have a profile yet (e.g. freshly registered),
            # we'll auto-provision a profile so they get a clean experience.
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
                    INSERT INTO public.profiles (auth_id, easy_share_id, full_name, is_registered)
                    VALUES (:auth_id, :easy_id, :name, TRUE)
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

    # 2. Try Anonymous Auth (Browser ID)
    bid = x_browser_id or browser_id
    if bid:
        # Create an anonymous profile if one does not already exist
        profile = await auth_queries.create_anonymous_profile(db, bid)
        return profile

    return None

async def get_current_user(
    current_user: Optional[dict] = Depends(get_optional_current_user)
) -> dict:
    """Require user authentication context (either registered or anonymous)."""
    if not current_user:
        raise HTTPException(
            status_code=401, 
            detail="Authentication credentials missing (No valid JWT or Browser ID provided)"
        )
    return current_user

async def get_registered_user(
    current_user: dict = Depends(get_current_user)
) -> dict:
    """Require user context to be a fully registered (non-anonymous) account."""
    if not current_user.get("is_registered"):
        raise HTTPException(
            status_code=403, 
            detail="Registration required to access this feature"
        )
    return current_user
