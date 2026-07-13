from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List
import shutil
from pathlib import Path
from services.git_service import clone_or_pull, list_files, repo_slug
from services.rag_service import index_repo, delete_repo_index, list_indexed_repos
from config import settings
import asyncio

router = APIRouter()
_jobs: dict = {}

class IngestRequest(BaseModel):
    url: str

class IngestStatus(BaseModel):
    slug: str
    status: str # queued | cloning | indexing | done | error
    chunks: int = 0
    error: str = ""

async def _run_ingest(url: str, slug: str):
    _jobs[slug] = IngestStatus(slug=slug, status="cloning")
    try:
        repo_path = await asyncio.to_thread(clone_or_pull, url)
        _jobs[slug].status = "indexing"
        n = await index_repo(repo_path, list_files(repo_path), slug)
        _jobs[slug] = IngestStatus(slug=slug, status="done", chunks=n)
    except Exception as e:
        _jobs[slug] = IngestStatus(slug=slug, status="error", error=str(e))

@router.post("/ingest", response_model=IngestStatus)
async def ingest_repo(req: IngestRequest, background_tasks: BackgroundTasks):
    slug = repo_slug(req.url)
    if slug in _jobs and _jobs[slug].status in ("cloning", "indexing"):
        return _jobs[slug]
    _jobs[slug] = IngestStatus(slug=slug, status="queued")
    background_tasks.add_task(_run_ingest, req.url, slug)
    return _jobs[slug]

@router.get("/status/{slug}", response_model=IngestStatus)
async def ingest_status(slug: str):
    if slug not in _jobs:
        # _col_name normalises dashes/dots to underscores, so compare accordingly
        normalized = slug.replace("-", "_").replace(".", "_")
        if normalized in list_indexed_repos():
            return IngestStatus(slug=slug, status="done")
        raise HTTPException(status_code=404, detail="Job not found")
    return _jobs[slug]

@router.get("", response_model=List[str])
async def list_repos():
    return list_indexed_repos()

@router.delete("/{slug}")
async def remove_repo(slug: str):
    dest = Path(settings.REPOS_DIR) / slug
    if dest.exists():
        shutil.rmtree(dest)
    ok = delete_repo_index(slug)
    _jobs.pop(slug, None)
    return {"deleted": ok, "slug": slug}