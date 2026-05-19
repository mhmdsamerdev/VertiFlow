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
    """
    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False}
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401, 
            detail="Authentication token has expired"
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=401, 
            detail=f"Invalid authentication token: {str(e)}"
        )

async def get_current_user(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """
    Fetch the current active profile context. 
    Strictly requires a valid, verified Supabase JWT.
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
