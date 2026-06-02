import asyncio
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.content import ContentSource

async def test():
    async with AsyncSessionLocal() as db:
        try:
            res = await db.execute(select(ContentSource))
            print("OK", len(res.scalars().all()))
        except Exception as e:
            print("ERROR:", e)

if __name__ == "__main__":
    asyncio.run(test())
