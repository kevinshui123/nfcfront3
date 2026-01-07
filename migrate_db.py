#!/usr/bin/env python3
import asyncio
from sqlalchemy import text
from app.db import engine

async def migrate():
    async with engine.begin() as conn:
        # Add shop_id column if it doesn't exist
        await conn.execute(text('ALTER TABLE users ADD COLUMN IF NOT EXISTS shop_id VARCHAR(255);'))
        print("Added shop_id column")

        # Add is_admin column if it doesn't exist
        await conn.execute(text('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin INTEGER DEFAULT 0;'))
        print("Added is_admin column")

        await conn.commit()
        print('Migration completed successfully!')

if __name__ == "__main__":
    asyncio.run(migrate())
