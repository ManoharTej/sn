"""
Shared dependencies for all API routes.

Personal mode: always returns user_id=1 (no auth required).
If you later want multi-user auth, swap get_current_user_id
to decode a JWT token instead.
"""
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db

DEFAULT_USER_ID = 1


async def get_current_user_id() -> int:
    """Returns the default personal user ID. No auth needed."""
    return DEFAULT_USER_ID


async def get_db_and_user(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Convenience dependency: yields (db, user_id)."""
    return db, user_id
