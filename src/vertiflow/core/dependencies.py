from fastapi import Header, Query, HTTPException

async def get_browser_id(
    x_browser_id: str = Header(None), 
    browser_id: str = Query(None)
) -> str:
    bid = x_browser_id or browser_id
    if not bid:
        raise HTTPException(status_code=400, detail="X-Browser-ID header or browser_id query param missing")
    return bid
