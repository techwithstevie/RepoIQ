from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json
from app.services.rag_service import query_repo
from app.services.llm_service import stream_answer, get_answer

router = APIRouter()

class QueryRequest(BaseModel):
    repo_slug: str
    question: str

SUMMARY_QUESTIONS = [
    "What does this project do? Give a one-paragraph summary.",
    "What are the main technologies and frameworks used?",
    "What is the overall code architecture and folder structure?",
    "What are the strengths of this codebase from a senior engineer's perspective?",
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
    results = {}
    for q in SUMMARY_QUESTIONS:
        chunks = query_repo(req.repo_slug, q)
        results[q] = await get_answer(q, chunks) if chunks else "Not enough context."
    return {"repo": req.repo_slug, "summary": results}