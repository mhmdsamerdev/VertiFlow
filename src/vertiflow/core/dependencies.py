from fastapi import Header, HTTPException

async def get_browser_id(x_browser_id: str = Header(None)) -> str:
    if not x_browser_id:
        # In a real production app, we might want to be stricter,
        # but for this dev stage, we'll allow it if we have to, 
        # though the frontend is now sending it.
        raise HTTPException(status_code=400, detail="X-Browser-ID header missing")
    return x_browser_id
