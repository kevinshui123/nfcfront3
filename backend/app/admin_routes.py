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
            "INSERT INTO nfc_tags (id, shop_id, token, ndef_payload, status, created_at) VALUES (:id, :shop_id, :token, :ndef_payload, :status, CURRENT_TIMESTAMP)",
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

    # Create a new shop for this merchant (use CURRENT_TIMESTAMP for compatibility)
    shop_id = str(uuid.uuid4())
    await db.execute(
        "INSERT INTO shops (id, name, created_at) VALUES (:id, :name, CURRENT_TIMESTAMP)",
        {"id": shop_id, "name": f"Shop {username}"}
    )

    # Create merchant user linked to the new shop
    created = await crud.create_user(db, f"{username}@merchant.local", password, shop_id=shop_id, is_admin=0)
    await db.commit()

    return {"username": username, "password": password, "shop_id": shop_id}


@router.get("/me")
async def get_me(user=Depends(get_current_user)):
    """
    Return current authenticated user's basic info.
    """
    return {"email": getattr(user, "email", None), "is_admin": getattr(user, "is_admin", 0), "shop_id": getattr(user, "shop_id", None)}


@router.post("/admin/migrate_tag_uris")
async def migrate_tag_uris(db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    """
    Admin-only: migrate stored ndef_payload.uri for all nfc_tags to point to the frontend SPA domain.
    This updates each tag's ndef_payload.uri to: https://nfcfront3.vercel.app/t/{token}
    """
    if not getattr(user, "is_admin", 0):
        raise HTTPException(status_code=403, detail="Forbidden")
    migrated = 0
    try:
        res = await db.execute("SELECT id, token, ndef_payload FROM nfc_tags")
        rows = res.fetchall()
        for r in rows:
            id_, token_, payload = r[0], r[1], r[2]
            try:
                # payload may be a dict or JSON string
                if isinstance(payload, str):
                    p = json.loads(payload)
                else:
                    p = payload or {}
            except Exception:
                p = {}
            p['uri'] = f"https://nfcfront3.vercel.app/t/{token_}"
            await db.execute("UPDATE nfc_tags SET ndef_payload = :np WHERE id = :id", {"np": json.dumps(p), "id": str(id_)})
            migrated += 1
        await db.commit()
    except Exception as exc:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(exc))
    return {"migrated": migrated}


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
    # Defensive: try each DB step and fall back to empty/default data on failure
    try:
        shop_result = await db.execute("SELECT id, name FROM shops WHERE id = :shop_id", {"shop_id": shop_id})
        shop_row = shop_result.fetchone()
        if not shop_row:
            return {"shop": {"id": shop_id, "name": "Unknown Shop"}, "visits": 0, "reviews": 0, "contents": []}
        shop = {"id": shop_row[0], "name": shop_row[1]}
    except Exception:
        return {"shop": {"id": shop_id, "name": "Unknown Shop"}, "visits": 0, "reviews": 0, "contents": []}

    try:
        today = __import__('datetime').date.today()
        visits_result = await db.execute(
            "SELECT COUNT(*) FROM visits WHERE shop_id = :shop_id AND DATE(created_at) = :today",
            {"shop_id": shop_id, "today": today}
        )
        visits = visits_result.scalar() or 0
    except Exception:
        visits = 0

    try:
        reviews_result = await db.execute(
            "SELECT COUNT(*) FROM contents WHERE shop_id = :shop_id AND DATE(created_at) = :today",
            {"shop_id": shop_id, "today": today}
        )
        reviews = reviews_result.scalar() or 0
    except Exception:
        reviews = 0

    try:
        contents_result = await db.execute(
            "SELECT id, title, token, platform, created_at FROM contents WHERE shop_id = :shop_id ORDER BY created_at DESC LIMIT 50",
            {"shop_id": shop_id}
        )
        contents = [{"id": r[0], "title": r[1], "token": r[2], "platform": r[3] or "unknown", "created_at": r[4].isoformat() if r[4] else None} for r in contents_result.fetchall()]
    except Exception:
        contents = []

    return {"shop": shop, "visits": visits, "reviews": reviews, "contents": contents}


