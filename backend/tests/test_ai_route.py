import pytest
from httpx import AsyncClient
from backend.app.main import app


@pytest.mark.asyncio
async def test_ai_generate_monkeypatch(monkeypatch):
    async def fake_generate_text(model, messages, stream=False, temperature=0.0, timeout_seconds=600):
        return {"id": "resp-1", "choices": [{"message": {"role": "assistant", "content": "示例回复"}}], "model": model}

    monkeypatch.setattr("backend.app.ai.generate_text", fake_generate_text)

    async with AsyncClient(app=app, base_url="http://test") as ac:
        r = await ac.post("/ai/generate", json={"model": "deepseek-chat", "messages": [{"role":"user","content":"hi"}]})
        assert r.status_code == 200
        data = r.json()
        assert "raw" in data
        assert data["raw"]["model"] == "deepseek-chat"


