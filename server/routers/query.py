from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json
from services.rag_service import query_repo
from services.llm_service import stream_answer, get_answer, get_structured_answer
from services.cache_service import read_cache, write_cache

router = APIRouter()

class QueryRequest(BaseModel):
    repo_slug: str
    question: str

SUMMARY_SECTIONS = [
    {"id": "overview", "title": "What this project does", "question": "What does this project do? Give a one-paragraph summary."},
    {"id": "stack", "title": "Technologies & frameworks", "question": "What are the main technologies and frameworks used?"},
    {"id": "architecture", "title": "Architecture & structure", "question": "What is the overall code architecture and folder structure?"},
    {"id": "strengths", "title": "Senior engineering signals", "question": "What are the strengths of this codebase from a senior engineer's perspective?"},
]


@router.post("/ask")
async def ask(req: QueryRequest):
    chunks = query_repo(req.repo_slug, req.question)
    if not chunks:
        raise HTTPException(404, "No indexed content for this repo.")
    answer = await get_answer(req.question, chunks)
    return {"answer": answer, "sources": list({c["file"] for c in chunks})}

@router.post("/stream")
async def stream(req: QueryRequest):
    chunks = query_repo(req.repo_slug, req.question)
    if not chunks:
        raise HTTPException(404, "No indexed content for this repo.")
    sources = list({c["file"] for c in chunks})

    async def sse():
        yield f"data: {json.dumps({'type':'sources','data':sources})}\n\n"
        async for token in stream_answer(req.question, chunks):
            yield f"data: {json.dumps({'type':'token','data':token})}\n\n"
        yield f"data: {json.dumps({'type':'done'})}\n\n"

    return StreamingResponse(sse(), media_type="text/event-stream")

@router.post("/summary")
async def summary(req: QueryRequest):
    cached = read_cache(req.repo_slug, "summary")
    if cached:
        return cached

    sections = []
    for section in SUMMARY_SECTIONS:
        chunks = query_repo(req.repo_slug, section["question"])
        if chunks:
            result = await get_structured_answer(section["question"], chunks)
        else:
            result = {"summary": "Not enough context.", "highlights": []}
        sections.append({
            "id": section["id"],
            "title": section["title"],
            "summary": result["summary"],
            "highlights": result["highlights"],
        })
    payload = {"repo": req.repo_slug, "sections": sections}
    write_cache(req.repo_slug, "summary", payload)
    return payload

@router.get("/evidence/{repo_slug}")
async def evidence(repo_slug: str):
    cached = read_cache(repo_slug, "evidence")
    if cached:
        return cached

    chunks = query_repo(
        repo_slug,
        "List the most relevant files for understanding this repository.",
        n_results=50,
    )
    if not chunks:
        raise HTTPException(404, "No indexed content for this repo.")

    scores: dict[str, dict[str, float]] = {}
    for idx, chunk in enumerate(chunks):
        file = chunk.get("file", "")
        if not file:
            continue
        weight = 1 / (idx + 1)
        if file not in scores:
            scores[file] = {"score": 0.0, "count": 0}
        scores[file]["score"] += weight
        scores[file]["count"] += 1

    evidence = [
        {"file": file, "score": round(stats["score"] * 100, 1), "count": int(stats["count"])}
        for file, stats in scores.items()
    ]
    evidence.sort(key=lambda item: item["score"], reverse=True)
    payload = {"repo": repo_slug, "evidence": evidence[:20]}
    write_cache(repo_slug, "evidence", payload)
    return payload
