import os
from typing import List, Dict, Any, Optional
import httpx

SILRA_API_URL = os.getenv("SILRA_API_URL", "https://api.silra.cn/v1/chat/completions")
SILRA_API_KEY = os.getenv("SILRA_API_KEY")


async def generate_text(
    model: str,
    messages: List[Dict[str, Any]],
    stream: bool = False,
    temperature: float = 0.0,
    timeout_seconds: int = 600,
) -> Dict[str, Any]:
    """
    Call the Silra chat completions endpoint and return parsed JSON.
    Expects `SILRA_API_KEY` to be set in environment.
    """
    if not SILRA_API_KEY:
        raise RuntimeError("SILRA_API_KEY not configured in environment")

    headers = {
        "Authorization": f"Bearer {SILRA_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": model,
        "messages": messages,
        "stream": stream,
        "temperature": temperature,
    }

    async with httpx.AsyncClient(timeout=timeout_seconds) as client:
        resp = await client.post(SILRA_API_URL, headers=headers, json=payload)
        resp.raise_for_status()
        # If stream=True the response will be streamed; for scaffold we expect non-stream JSON.
        result = resp.json()
        # simple logging of AI calls for auditing
        try:
            log_dir = os.path.join(os.getcwd(), "logs")
            os.makedirs(log_dir, exist_ok=True)
            with open(os.path.join(log_dir, "ai_calls.log"), "a", encoding="utf-8") as f:
                f.write(f"TIME:{__import__('datetime').datetime.utcnow().isoformat()} MODEL:{model} MESSAGES:{messages} RESPONSE_SUMMARY:{str(result)[:100]}\\n")
        except Exception:
            pass
        return result


