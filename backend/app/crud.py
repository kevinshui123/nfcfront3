from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from . import models
import uuid
from sqlalchemy.exc import IntegrityError



async def create_user(db: AsyncSession, email: str, password: str, shop_id: str | None = None, is_admin: int = 0):
    # import hashing function locally to avoid circular import at module load
    from .auth import get_password_hash
    user = models.User(id=str(uuid.uuid4()), email=email, hashed_password=get_password_hash(password), shop_id=shop_id, is_admin=is_admin)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def get_user_by_email(db: AsyncSession, email: str):
    q = select(models.User).where(models.User.email == email)
    res = await db.execute(q)
    return res.scalars().first()


async def get_tag_by_token(db: AsyncSession, token: str):
    q = select(models.NFCTag).where(models.NFCTag.token == token)
    res = await db.execute(q)
    return res.scalars().first()


async def create_visit(db: AsyncSession, tag_id):
    visit = models.Visit(id=str(uuid.uuid4()), tag_id=tag_id)
    db.add(visit)
    await db.commit()
    return visit


async def get_content_for_tag(db: AsyncSession, tag_id):
    # Simple mapping: find a content item for the same shop
    q = (
        select(models.ContentItem)
        .where(models.ContentItem.shop_id == select(models.NFCTag.shop_id).where(models.NFCTag.id == tag_id).scalar_subquery())
        .limit(1)
    )
    res = await db.execute(q)
    return res.scalars().first()


async def create_content(db: AsyncSession, shop_id: str, title: str, body: str, created_by: str | None = None):
    from .models import ContentItem
    item = ContentItem(id=str(uuid.uuid4()), shop_id=shop_id, title=title, body=body, created_by=created_by)
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


async def create_nfc_tag(db: AsyncSession, shop_id: str, token: str, ndef_payload: dict | None = None, status: str = "unused"):
    tag = models.NFCTag(
        id=str(uuid.uuid4()),
        shop_id=shop_id if shop_id else None,
        token=token,
        ndef_payload=ndef_payload or {"uri": f"https://app.example.com/t/{token}"},
        status=getattr(models.TagStatus, status) if hasattr(models.TagStatus, status) else models.TagStatus.unused,
    )
    db.add(tag)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        # token collision; raise for caller to handle
        raise
    await db.refresh(tag)
    return tag


async def list_shops_with_metrics(db: AsyncSession):
    # Return simple shop summaries: id, name, visits_count, reviews_count
    # visits_count: count of visits via tags belonging to shop
    # reviews_count: count of content_items for shop
    q = select(models.Shop)
    res = await db.execute(q)
    shops = res.scalars().all()
    summaries = []
    for s in shops:
        # visits
        vq = select(models.Visit).where(models.Visit.tag_id.in_(select(models.NFCTag.id).where(models.NFCTag.shop_id == s.id).scalar_subquery()))
        vres = await db.execute(select(func.count()).select_from(models.Visit).where(models.Visit.tag_id.in_(select(models.NFCTag.id).where(models.NFCTag.shop_id == s.id).scalar_subquery())))
        visits = int(vres.scalar() or 0)
        # reviews/content count
        cres = await db.execute(select(func.count()).select_from(models.ContentItem).where(models.ContentItem.shop_id == s.id))
        reviews = int(cres.scalar() or 0)
        summaries.append({"id": s.id, "name": s.name, "visits": visits, "reviews": reviews})
    return summaries


