import json
from pathlib import Path
from typing import Any, Optional
from config import settings

CACHE_DIR = Path(settings.CACHE_DIR)


def _path(slug: str, kind: str) -> Path:
    safe_slug = slug.replace("/", "_")
    return CACHE_DIR / f"{safe_slug}.{kind}.json"


def read_cache(slug: str, kind: str) -> Optional[Any]:
    path = _path(slug, kind)
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text())
    except (json.JSONDecodeError, OSError):
        return None


def write_cache(slug: str, kind: str, data: Any) -> None:
    path = _path(slug, kind)
    path.write_text(json.dumps(data))


def clear_cache(slug: str) -> None:
    for kind in ("summary", "evidence", "stats"):
        path = _path(slug, kind)
        if path.exists():
            path.unlink()
