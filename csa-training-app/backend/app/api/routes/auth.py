"""
Auth routes — minimal stubs for personal mode.
No real auth needed; the app always uses user_id=1 (Manoharan).
These routes exist only to avoid import errors from legacy code.
"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/me")
async def me():
    return {"user_id": 1, "username": "Manoharan", "mode": "personal"}


@router.post("/logout")
async def logout():
    return {"success": True}
