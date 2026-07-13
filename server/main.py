from fastapi import FastAPI
from fastapi.responses import FileResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from config import settings
from routers import repos, query, health

app = FastAPI(
    title="RepoIQ API",
    description="RAG system for GitHub codebase analysis",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    path = Path(__file__).resolve().parent / "favicon.ico"
    if path.exists():
        return FileResponse(path)
    return Response(status_code=204)

app.include_router(health.router, tags=["Health"])
app.include_router(repos.router, prefix="/api/repos", tags=["Repositories"])
app.include_router(query.router, prefix="/api/query", tags=["Query"])