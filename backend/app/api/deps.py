from fastapi import Header, HTTPException, status


async def get_current_user_id(x_user_id: str | None = Header(None)) -> int:
    """
    Extract user ID from X-User-Id header.
    No JWT — frontend sends the header after login/register.
    Falls back to user 1 if header is missing (backward compat).
    """
    if x_user_id is None:
        return 1
    try:
        uid = int(x_user_id)
        if uid <= 0:
            raise ValueError
        return uid
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid X-User-Id header",
        )
