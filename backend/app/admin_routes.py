from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from .auth import get_current_user
from .db import async_session
from . import crud
from .schemas import UserCreate, Token, BatchEncodeRequest, BatchEncodeResponse
from .schemas import MerchantCreateResponse, MerchantCredential
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


@router.post("/admin/merchants", response_model=MerchantCredential)
async def create_merchant(db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    # only platform admins can create merchant accounts
    if not getattr(user, "is_admin", 0):
        raise HTTPException(status_code=403, detail="Forbidden")

    from secrets import token_urlsafe
    import random
    import string

    # Generate random username and password
    username = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    password = ''.join(random.choices(string.ascii_letters + string.digits, k=12))

    # Create a new shop for this merchant
    shop_id = str(uuid.uuid4())
    await db.execute(
        "INSERT INTO shops (id, name, created_at) VALUES (:id, :name, now())",
        {"id": shop_id, "name": f"Shop {username}"}
    )

    # Create merchant user linked to the new shop
    created = await crud.create_user(db, f"{username}@merchant.local", password, shop_id=shop_id, is_admin=0)
    await db.commit()

    return {"username": username, "password": password, "shop_id": shop_id}


@router.get("/shops")
async def list_shops(db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    # Admins see all shops; merchant users see only their shop
    if getattr(user, "is_admin", 0):
        summaries = await crud.list_shops_with_metrics(db)
        return summaries
    # merchant view
    if not getattr(user, "shop_id", None):
        raise HTTPException(status_code=403, detail="No shop assigned")
    shops = await crud.list_shops_with_metrics(db)
    for s in shops:
        if s["id"] == user.shop_id:
            return [s]
    return []


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


@router.get("/merchant/{shop_id}")
async def get_merchant_dashboard(shop_id: str, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    # Only allow access if user is admin or belongs to this shop
    if not getattr(user, "is_admin", 0) and getattr(user, "shop_id", None) != shop_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    # Get shop info
    shop_result = await db.execute("SELECT id, name FROM shops WHERE id = :shop_id", {"shop_id": shop_id})
    shop_row = shop_result.fetchone()
    if not shop_row:
        raise HTTPException(status_code=404, detail="Shop not found")

    shop = {"id": shop_row[0], "name": shop_row[1]}

    # Get today's visits and reviews for this shop
    today = __import__('datetime').date.today()
    visits_result = await db.execute(
        "SELECT COUNT(*) FROM visits WHERE shop_id = :shop_id AND DATE(created_at) = :today",
        {"shop_id": shop_id, "today": today}
    )
    visits = visits_result.scalar() or 0

    reviews_result = await db.execute(
        "SELECT COUNT(*) FROM contents WHERE shop_id = :shop_id AND DATE(created_at) = :today",
        {"shop_id": shop_id, "today": today}
    )
    reviews = reviews_result.scalar() or 0

    # Get recent contents for this shop
    contents_result = await db.execute(
        "SELECT id, title, token, platform, created_at FROM contents WHERE shop_id = :shop_id ORDER BY created_at DESC LIMIT 50",
        {"shop_id": shop_id}
    )
    contents = [{"id": r[0], "title": r[1], "token": r[2], "platform": r[3] or "unknown", "created_at": r[4].isoformat() if r[4] else None} for r in contents_result.fetchall()]

    return {
        "shop": shop,
        "visits": visits,
        "reviews": reviews,
        "contents": contents
    }


