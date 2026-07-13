from fastapi import APIRouter
import httpx
from config import settings

router = APIRouter()

@router.get("/")
async def health():
    ollama_ok = False
    try:
        async with httpx.AsyncClient(timeout=5) as c:
            r = await c.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
            ollama_ok = r.status_code == 200
    except Exception:
        pass
    return {"status": "ok", "ollama": ollama_ok, "model": settings.OLLAMA_MODEL}