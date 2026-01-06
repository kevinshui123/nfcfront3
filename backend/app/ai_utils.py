import os
from typing import List, Dict, Any, Optional
import httpx
import time

SILRA_API_URL = os.getenv("SILRA_API_URL", "https://api.silra.cn/v1/chat/completions")
SILRA_API_KEY = os.getenv("SILRA_API_KEY")

# In-memory per-IP rate limiter (suitable for dev/demo)
_rate_limit_store: Dict[str, List[float]] = {}
RATE_LIMIT_MAX = int(os.getenv("RATE_LIMIT_MAX", "60"))
RATE_LIMIT_WINDOW = int(os.getenv("RATE_LIMIT_WINDOW", "60"))


async def generate_text(
    model: str,
    messages: List[Dict[str, Any]],
    stream: bool = False,
    temperature: float = 0.0,
    timeout_seconds: int = 600,
    client_ip: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Call the Silra chat completions endpoint and return parsed JSON.
    Adds simple per-IP rate limiting and logs timing and short response summaries.
    """
    now = time.time()
    if client_ip:
        arr = _rate_limit_store.get(client_ip, [])
        arr = [t for t in arr if now - t < RATE_LIMIT_WINDOW]
        if len(arr) >= RATE_LIMIT_MAX:
            raise RuntimeError("rate_limit_exceeded")
        arr.append(now)
        _rate_limit_store[client_ip] = arr

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

    start = time.time()
    async with httpx.AsyncClient(timeout=timeout_seconds) as client:
        resp = await client.post(SILRA_API_URL, headers=headers, json=payload)
        resp.raise_for_status()
        result = resp.json()
    duration = time.time() - start

    # write audit log
    try:
        log_dir = os.path.join(os.getcwd(), "logs")
        os.makedirs(log_dir, exist_ok=True)
        ts = __import__("datetime").datetime.utcnow().isoformat()
        ip = client_ip or "-"
        with open(os.path.join(log_dir, "ai_calls.log"), "a", encoding="utf-8") as f:
            f.write(f"TIME:{ts} IP:{ip} MODEL:{model} DUR:{duration:.3f}s MSGS:{len(messages)} RES:{str(result)[:200]}\\n")
    except Exception:
        pass

    return result


