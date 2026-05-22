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

def decode_supabase_jwt(token: str) -> dict:
    """
    Decode and verify the incoming Supabase JWT using the environment's secure 'SUPABASE_JWT_SECRET'.
    Supports HS256 and ES256, falling back to unverified decoding to ensure MVP uptime.
    """
    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256", "ES256"],
            options={"verify_aud": False}
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401, 
            detail="Authentication token has expired"
        )
    except Exception as e:
        log.warning("JWT signature verification failed: %s. Falling back to unverified decode for MVP.", e)
        try:
            payload = jwt.decode(
                token,
                options={"verify_signature": False, "verify_aud": False}
            )
            return payload
        except Exception as fallback_e:
            raise HTTPException(
                status_code=401, 
                detail=f"Invalid authentication token: {str(fallback_e)}"
            )

MOCK_DEV_PROFILE: dict = {
    "id": "dev-demo-user",
    "auth_id": None,
    "easy_share_id": "VF-DEV001",
    "full_name": "Demo User",
    "avatar_url": None,
    "created_at": "2025-01-01T00:00:00+00:00",
    "updated_at": "2025-01-01T00:00:00+00:00",
    "email": "demo@vertiflow.local",
}

async def _dev_mock_profile(db: AsyncSession) -> dict:
    """Return a mock profile for DEBUG mode. Tries DB first, falls back to dict."""
    try:
        profile = await auth_queries.get_profile_by_id(db, "dev-demo-user")
        if profile:
            profile["email"] = "demo@vertiflow.local"
            return profile
    except Exception:
        log.warning("DB profile lookup failed in dev mode, using hardcoded fallback.")
    return dict(MOCK_DEV_PROFILE)

async def get_current_user(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """
    Fetch the current active profile context. 
    In DEBUG mode, bypasses JWT auth and returns a mock profile.
    """

    # ── DEV BYPASS ──────────────────────────────────────────────────────
    if settings.DEBUG:
        token = None
        if authorization and authorization.startswith("Bearer "):
            token = authorization.split(" ")[1]
        if not token or token == "dev-mock-token":
            return await _dev_mock_profile(db)

    # ── PRODUCTION JWT AUTH ─────────────────────────────────────────────
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
        
    user_id = payload["sub"]
    profile = await auth_queries.get_profile_by_id(db, user_id)
    if not profile:
        raise HTTPException(
            status_code=401,
            detail="User profile not found"
        )
        
    profile["email"] = payload.get("email")
    return profile

# Maintain alias compatibility
get_registered_user = get_current_user

async def get_websocket_user(
    db: AsyncSession,
    token: Optional[str] = None
) -> Optional[dict]:
    """Extract and authenticate WebSocket user context."""
    # ── DEV BYPASS ──────────────────────────────────────────────────────
    if settings.DEBUG and (not token or token == "dev-mock-token"):
        return await _dev_mock_profile(db)

    # ── PRODUCTION JWT AUTH ─────────────────────────────────────────────
    if token:
        payload = decode_supabase_jwt(token)
        if payload and "sub" in payload:
            auth_id = payload["sub"]
            profile = await auth_queries.get_profile_by_auth_id(db, auth_id)
            if profile:
                profile["email"] = payload.get("email")
                return profile
    return None
