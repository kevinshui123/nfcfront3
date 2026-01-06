import asyncio
import uuid
from sqlalchemy import select
from .db import engine, async_session, Base
from . import models


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # seed demo data
    async with async_session() as session:
        shop = models.Shop(id=str(uuid.uuid4()), name="Demo Shop", description="Demo shop for AllValue Link")
        await session.merge(shop)

        # create tag if not exists
        existing_tag = await session.execute(select(models.NFCTag).where(models.NFCTag.token == "demo-token"))
        if not existing_tag.scalars().first():
            tag = models.NFCTag(id=str(uuid.uuid4()), shop_id=shop.id, token="demo-token", ndef_payload={"uri": "https://example.com/t/demo-token"}, status=models.TagStatus.active)
            await session.merge(tag)

        content = models.ContentItem(id=str(uuid.uuid4()), shop_id=shop.id, title="Welcome", body="This is demo content for your NFC tag.", metadata_json={"source":"seed"})
        await session.merge(content)
        # create admin user
        # create admin user if not exists
        from .auth import get_password_hash
        try:
            res = await session.execute(select(models.User).where(models.User.email == "admin@example.com"))
            existing_user = res.scalars().first()
        except Exception:
            existing_user = None

        if not existing_user:
            from .auth import get_password_hash
            try:
                hashed = get_password_hash("password123")
            except Exception:
                # fallback simple hash for dev if bcrypt backend is not working
                import hashlib
                hashed = hashlib.sha256(b"password123").hexdigest()
            user = models.User(id=str(uuid.uuid4()), email="admin@example.com", hashed_password=hashed)
            await session.merge(user)

        await session.commit()

    print("Database initialized and demo data seeded.")


if __name__ == "__main__":
    asyncio.run(init_db())


