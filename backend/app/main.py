from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from .db import async_session
from . import crud
from sqlalchemy.ext.asyncio import AsyncSession
from . import ai
from .ai_utils import generate_text as generate_text_impl
from fastapi import Request
from typing import List, Dict, Any, Optional


class AIGenerateRequest(BaseModel):
    model: Optional[str] = "deepseek-chat"
    messages: Optional[List[Dict[str, Any]]] = None
    temperature: Optional[float] = 0.0
    stream: Optional[bool] = False
    # optional application-level fields
    shop_id: Optional[str] = None
    template_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = None


class AIGenerateResponse(BaseModel):
    raw: Dict[str, Any]

app = FastAPI(title="AllValue Link Backend (scaffold)")

app.add_middleware(
    CORSMiddleware,
    # Restrict to the known frontend origins in production; allow * for other envs if needed
    allow_origins=[
        "https://nfcfront3.vercel.app",
        "https://adminfrontend-six.vercel.app",
        "https://nfcfront3-git-main-kevinshuis-projects.vercel.app",
        "https://adminfrontend-git-main-kevinshuis-projects.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ContentResponse(BaseModel):
    type: str
    content_id: str | None = None
    title: str | None = None
    body: str | None = None
    shop: dict | None = None


async def get_db() -> AsyncSession:
    async with async_session() as session:
        yield session


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/")
async def root():
    return {
        "service": "Songzike Tool Backend",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/t/{token}", response_model=ContentResponse)
async def resolve_token(token: str, db: AsyncSession = Depends(get_db)):
    """
    Resolve a token stored in nfc_tags table and return content.
    """
    if not token:
        raise HTTPException(status_code=404, detail="Token not provided")

    tag = await crud.get_tag_by_token(db, token)
    if not tag:
        raise HTTPException(status_code=404, detail="Token not found")

    # record visit (best-effort, don't block response)
    try:
        await crud.create_visit(db, tag.id)
    except Exception:
        # swallow logging for scaffold
        pass

    # shape response
    content = await crud.get_content_for_tag(db, tag.id)
    response = {
        "type": "content" if content else "shop",
        "content_id": content.id if content else None,
        "title": content.title if content else None,
        "body": content.body if content else None,
        "shop": {"id": tag.shop_id, "name": getattr(tag, "shop_name", None)},
    }
    return response


@app.post("/ai/generate", response_model=AIGenerateResponse)
async def ai_generate(payload: AIGenerateRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """
    Proxy endpoint to call Silra (or other LLM) service.
    Reads SILRA_API_KEY from environment; do NOT commit keys to repo.
    """
    # Build messages: if API caller didn't pass messages, attempt to construct one
    messages = payload.messages
    if not messages:
        # Very small template: use context to create a prompt
        prompt_parts = []
        if payload.template_id:
            prompt_parts.append(f"Template: {payload.template_id}")
        if payload.context:
            prompt_parts.append(f"Context: {payload.context}")
        prompt_text = ";\n".join(prompt_parts) or "请根据提供的信息生成文案。"
        messages = [{"role": "user", "content": prompt_text}]

    try:
        client_ip = None
        try:
            client_ip = request.client.host
        except Exception:
            client_ip = None
        # prefer ai.generate_text if present (tests monkeypatch backend.app.ai.generate_text);
        # otherwise fall back to ai_utils implementation with rate-limiting
        try:
            # some test monkeypatches may supply a function that doesn't accept client_ip;
            # attempt with client_ip first, fallback to calling without it on TypeError.
            try:
                result = await ai.generate_text(
                    model=payload.model or "deepseek-chat",
                    messages=messages,
                    stream=payload.stream or False,
                    temperature=payload.temperature or 0.0,
                    client_ip=client_ip,
                )
            except TypeError:
                result = await ai.generate_text(
                    model=payload.model or "deepseek-chat",
                    messages=messages,
                    stream=payload.stream or False,
                    temperature=payload.temperature or 0.0,
                )
        except AttributeError:
            result = await generate_text_impl(
                model=payload.model or "deepseek-chat",
                messages=messages,
                stream=payload.stream or False,
                temperature=payload.temperature or 0.0,
                client_ip=client_ip,
            )
    except Exception as exc:
        # handle rate limit specifically
        msg = str(exc)
        if msg == "rate_limit_exceeded":
            raise HTTPException(status_code=429, detail="rate limit exceeded")
        # If AI provider key not configured, return a friendly mock response instead of 500
        if "SILRA_API_KEY" in msg or "not configured" in msg or "SILRA" in msg:
            mock_text = "这是模拟生成的文案（SILRA_API_KEY 未配置）。请在后台设置 SILRA_API_KEY 获取真实生成。"
            return {"raw": {"mock": True, "text": mock_text}}
        raise HTTPException(status_code=500, detail=msg)

    return {"raw": result}


# register admin routes
from .admin_routes import router as admin_router
app.include_router(admin_router, prefix="/api")

# Backwards-compatible quick endpoint to return current user info.
# Some deployments may not pick up admin router changes; expose /api/me directly here.
from .auth import get_current_user
from fastapi import Depends

@app.get("/api/me")
async def api_me(user=Depends(get_current_user)):
    return {"email": getattr(user, "email", None), "is_admin": getattr(user, "is_admin", 0), "shop_id": getattr(user, "shop_id", None)}

@app.get("/api/debug/users")
async def debug_users(db: AsyncSession = Depends(get_db)):
    if __import__('os').getenv("ENV", "dev") != "dev":
        raise HTTPException(status_code=404, detail="Not available")
    res = await db.execute("SELECT id, email, hashed_password FROM users")
    rows = res.fetchall()
    return [{"id": r[0], "email": r[1], "hashed": r[2]} for r in rows]


@app.post("/api/debug/reset_admin")
async def reset_admin(db: AsyncSession = Depends(get_db)):
    """
    Dev-only: reset admin@example.com password to 'password123' (hash stored).
    """
    if __import__('os').getenv("ENV", "dev") != "dev":
        raise HTTPException(status_code=404, detail="Not available")
    from .auth import get_password_hash
    hashed = get_password_hash("password123")
    # upsert user
    await db.execute(
        "INSERT OR REPLACE INTO users (id, email, hashed_password) VALUES ((SELECT id FROM users WHERE email='admin@example.com') , :email, :hp)",
        {"email": "admin@example.com", "hp": hashed},
    )
    await db.commit()
    return {"status": "ok", "email": "admin@example.com", "password": "password123"}


@app.post("/content")
async def create_content_public(payload: dict, db: AsyncSession = Depends(get_db)):
    """
    Public endpoint for NFC user submissions.
    Accepts: { token: 'demo-token' } or { shop_id: '...' }, plus title/body/created_by
    """
    token = payload.get("token")
    shop_id = payload.get("shop_id")
    title = payload.get("title") or payload.get("body", "").split("\n")[0][:80]
    body = payload.get("body") or ""
    created_by = payload.get("created_by")

    if token:
        tag = await crud.get_tag_by_token(db, token)
        if not tag:
            raise HTTPException(status_code=404, detail="Token not found")
        shop_id = tag.shop_id

    if not shop_id:
        raise HTTPException(status_code=400, detail="shop_id or token required")

    item = await crud.create_content(db, shop_id, title, body, created_by)
    return {"id": item.id, "shop_id": item.shop_id, "title": item.title}
