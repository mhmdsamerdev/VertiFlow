import json
import time
import asyncio
import urllib.request
import logging
# pyrefly: ignore [missing-import]
import jwt
from typing import Optional
from fastapi import Header, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from vertiflow.core.config import settings
from vertiflow.db.database import get_db
from vertiflow.db import auth_queries

log = logging.getLogger(__name__)

# ── JWKS cache ──────────────────────────────────────────────────────────
_jwks_keys: list | None = None
_jwks_cache_time: float = 0
JWKS_CACHE_TTL: int = 3600


def _fetch_jwks_sync(url: str) -> list:
    """Synchronous JWKS fetch (runs in executor thread to avoid blocking)."""
    with urllib.request.urlopen(url, timeout=10) as resp:
        data = json.loads(resp.read().decode())
    jwks_set = jwt.PyJWKSet.from_dict(data)
    return list(jwks_set.keys)


async def _fetch_jwks() -> list:
    """Fetch JWKS from Supabase endpoint, cached for JWKS_CACHE_TTL seconds."""
    global _jwks_keys, _jwks_cache_time
    now = time.monotonic()
    if _jwks_keys is not None and now - _jwks_cache_time < JWKS_CACHE_TTL:
        return _jwks_keys

    jwks_url = settings.supabase_jwks_url
    if not jwks_url:
        log.critical("SUPABASE_URL_API not configured — JWKS unavailable. ES256 tokens cannot be verified.")
        _jwks_keys = []
        return _jwks_keys

    try:
        _jwks_keys = await asyncio.to_thread(_fetch_jwks_sync, jwks_url)
        _jwks_cache_time = time.monotonic()
        log.info("JWKS fetched: %d key(s) from %s", len(_jwks_keys), jwks_url)
    except Exception as e:
        log.critical("Failed to fetch JWKS from %s: %s", jwks_url, e)
        _jwks_keys = []
    return _jwks_keys


async def decode_supabase_jwt(token: str) -> dict:
    """
    Algorithm-aware JWT verification.

    ES256 → JWKS (mandatory, fail loud if unavailable)
    HS256 → SUPABASE_JWT_SECRET (symmetric)
    else  → reject

    No silent fallback between algorithm types.
    """
    try:
        unverified_header = jwt.get_unverified_header(token)
        alg = unverified_header.get("alg", "")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid JWT header: {e}")

    if alg == "ES256":
        keys = await _fetch_jwks()
        if not keys:
            raise HTTPException(
                status_code=401,
                detail="ES256 token requires JWKS, but no JWKS keys available. Check SUPABASE_URL_API configuration."
            )
        for key in keys:
            try:
                payload = jwt.decode(
                    token,
                    key.key,
                    algorithms=[key.algorithm_name],
                    audience=settings.SUPABASE_JWT_AUDIENCE,
                    options={"verify_exp": True},
                )
                return payload
            except jwt.ExpiredSignatureError:
                raise HTTPException(status_code=401, detail="Token has expired")
            except Exception:
                continue

        raise HTTPException(
            status_code=401,
            detail="ES256 token verification failed — no matching JWKS key found"
        )

    elif alg == "HS256":
        try:
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience=settings.SUPABASE_JWT_AUDIENCE,
            )
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token has expired")
        except Exception as e:
            raise HTTPException(status_code=401, detail=f"Invalid HS256 token: {e}")

    else:
        raise HTTPException(
            status_code=401,
            detail=f"Unsupported JWT algorithm: '{alg}'. Only ES256 and HS256 are accepted."
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
    payload = await decode_supabase_jwt(token)
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
        payload = await decode_supabase_jwt(token)
        if payload and "sub" in payload:
            auth_id = payload["sub"]
            profile = await auth_queries.get_profile_by_auth_id(db, auth_id)
            if profile:
                profile["email"] = payload.get("email")
                return profile
    return None
