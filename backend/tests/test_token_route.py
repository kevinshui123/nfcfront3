import pytest
from httpx import AsyncClient
from backend.app.main import app


@pytest.mark.asyncio
async def test_health():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        r = await ac.get("/health")
        assert r.status_code == 200
        assert r.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_token_route_monkeypatch(monkeypatch):
    async def fake_get_tag_by_token(db, token):
        class Tag:
            id = "tag-demo-id"
            shop_id = "shop-demo"
        return Tag()

    async def fake_get_content_for_tag(db, tag_id):
        class Content:
            id = "content-demo"
            title = "Demo Title"
            body = "Demo body"
        return Content()

    monkeypatch.setattr("backend.app.crud.get_tag_by_token", fake_get_tag_by_token)
    monkeypatch.setattr("backend.app.crud.get_content_for_tag", fake_get_content_for_tag)

    async with AsyncClient(app=app, base_url="http://test") as ac:
        r = await ac.get("/t/demo-token")
        assert r.status_code == 200
        data = r.json()
        assert data["type"] == "content"
        assert data["content_id"] == "content-demo"
        assert "shop" in data


