from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from .auth import get_current_user
from .db import async_session
from . import crud
from .schemas import UserCreate, Token, BatchEncodeRequest, BatchEncodeResponse
import uuid
from typing import List, Dict, Any
import json
import os
from .auth import create_access_token

router = APIRouter()


async def get_db() -> AsyncSession:
    async with async_session() as s:
        yield s


@router.post("/auth/register", response_model=Token)
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    existing = await crud.get_user_by_email(db, payload.email)
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")
    user = await crud.create_user(db, payload.email, payload.password)
    access_token = create_access_token({"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/auth/token", response_model=Token)
async def login(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    try:
        user = await crud.get_user_by_email(db, payload.email)
        if not user:
            raise HTTPException(status_code=400, detail="Incorrect email or password")
        # verify password via auth functions
        from .auth import verify_password, create_access_token
        try:
            ok = verify_password(payload.password, user.hashed_password)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"password_verify_error: {str(e)}")
        if not ok:
            raise HTTPException(status_code=400, detail="Incorrect email or password")
        token = create_access_token({"sub": user.email})
        return {"access_token": token, "token_type": "bearer"}
    except HTTPException:
        raise
    except Exception as exc:
        # return helpful error in dev for debugging
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/debug/users")
async def debug_list_users(db: AsyncSession = Depends(get_db)):
    """
    Dev-only: list users to help troubleshoot local login issues.
    Visible in non-production environments.
    """
    if os.getenv("ENV", "dev") != "dev":
        raise HTTPException(status_code=404, detail="Not available")
    users = await db.execute("SELECT id, email FROM users")
    rows = users.fetchall()
    return [{"id": r[0], "email": r[1]} for r in rows]


@router.post("/shops/{shop_id}/tags/batch_encode", response_model=BatchEncodeResponse)
async def batch_encode(shop_id: str, payload: BatchEncodeRequest, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    """
    Generate `count` tokens for a shop and persist NFCTag rows.
    Returns the list of tokens (and count). In production, you may want to store CSV on blob storage.
    """
    if payload.count <= 0 or payload.count > 10000:
        raise HTTPException(status_code=400, detail="Invalid count (1..10000)")

    tokens: List[str] = []
    for _ in range(payload.count):
        new_token = (payload.prefix or "") + uuid.uuid4().hex[:12]
        tagsql = {
            "id": uuid.uuid4(),
            "shop_id": shop_id,
            "token": new_token,
            "ndef_payload": {"uri": f"https://app.example.com/t/{new_token}"},
            "status": "unused",
        }
        # Insert via raw SQL or ORM model creation
        await db.execute(
            "INSERT INTO nfc_tags (id, shop_id, token, ndef_payload, status, created_at) VALUES (:id, :shop_id, :token, :ndef_payload::json, :status, now())",
            {
                "id": str(tagsql["id"]),
                "shop_id": str(tagsql["shop_id"]),
                "token": tagsql["token"],
                "ndef_payload": json.dumps(tagsql["ndef_payload"]),
                "status": tagsql["status"],
            },
        )
        tokens.append(new_token)

    await db.commit()
    return {"tokens": tokens, "count": len(tokens)}


@router.get("/shops")
async def list_shops(db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    summaries = await crud.list_shops_with_metrics(db)
    return summaries


@router.get("/social/{platform}/auth")
async def social_auth(platform: str):
    """
    Mock endpoint that returns a URL to start OAuth for a given platform.
    In production this would redirect to the platform's OAuth consent URL.
    """
    return {"auth_url": f"https://mock.auth/{platform}?client_id=mock&redirect_uri=https://app.example.com/social/callback"}


@router.post("/social/{platform}/publish")
async def social_publish(platform: str, payload: Dict[str, Any]):
    """
    Mock publish endpoint. In production this would accept an access token and content,
    then call the platform API to publish.
    """
    # Log the publish attempt (mock)
    try:
        log_dir = "logs"
        os.makedirs(log_dir, exist_ok=True)
        with open(os.path.join(log_dir, "social_publish.log"), "a", encoding="utf-8") as f:
            f.write(f"TIME:{__import__('datetime').datetime.utcnow().isoformat()} PLATFORM:{platform} PAYLOAD:{str(payload)[:200]}\\n")
    except Exception:
        pass
    # return a mock publish id for front-end to reference
    publish_id = str(uuid.uuid4())
    return {"status": "mocked", "platform": platform, "result": "success", "publish_id": publish_id}


