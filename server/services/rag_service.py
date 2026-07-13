import asyncio
import hashlib
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import List, Dict, Any, Tuple
import chromadb
from chromadb.config import Settings as ChromaSettings
from langchain_ollama import OllamaEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from config import settings
from services.stats_service import compute_repo_stats
from services.cache_service import write_cache

CHUNK_SIZE = 800
CHUNK_OVERLAP = 120
TOP_K = 8
BATCH = 200
MAX_EMBED_CONCURRENCY = 4

def _col_name(slug: str) -> str:
    return "repo_" + slug.replace("-", "_").replace(".", "_")[:60]

def _client() -> chromadb.PersistentClient:
    return chromadb.PersistentClient(
        path=settings.CHROMA_PERSIST_DIR,
        settings=ChromaSettings(anonymized_telemetry=False),
    )

def _embedder() -> OllamaEmbeddings:
    return OllamaEmbeddings(
        model=settings.OLLAMA_EMBED_MODEL,
        base_url=settings.OLLAMA_BASE_URL,
    )

def _read_and_chunk(args: Tuple[Path, Path]) -> Tuple[str, List[str]]:
    fpath, repo_path = args
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE, chunk_overlap=CHUNK_OVERLAP, add_start_index=True
    )
    try:
        text = fpath.read_text(errors="replace")
        rel = str(fpath.relative_to(repo_path))
        return rel, splitter.split_text(text)
    except Exception:
        return "", []

async def index_repo(repo_path: Path, file_paths: List[Path], slug: str) -> int:
    client = _client()
    embedder = _embedder()
    col_name = _col_name(slug)
    try:
        client.delete_collection(col_name)
    except Exception:
        pass
    collection = client.create_collection(col_name)

    # Read + chunk all files in parallel
    loop = asyncio.get_running_loop()
    with ThreadPoolExecutor(max_workers=8) as pool:
        results = await asyncio.gather(
            *[loop.run_in_executor(pool, _read_and_chunk, (fp, repo_path)) for fp in file_paths]
        )

    docs, metadatas, ids = [], [], []
    indexed_files = []
    for rel, chunks in results:
        if not rel:
            continue
        indexed_files.append(rel)
        for i, chunk in enumerate(chunks):
            chunk_id = hashlib.md5(f"{rel}:{i}:{chunk[:50]}".encode()).hexdigest()
            docs.append(chunk)
            metadatas.append({"file": rel, "chunk_index": i, "repo": slug})
            ids.append(chunk_id)

    # Embed all batches concurrently, capped to avoid overwhelming Ollama
    sem = asyncio.Semaphore(MAX_EMBED_CONCURRENCY)
    batches = [
        (docs[i:i+BATCH], metadatas[i:i+BATCH], ids[i:i+BATCH])
        for i in range(0, len(docs), BATCH)
    ]

    async def _embed_and_store(b_docs, b_meta, b_ids):
        async with sem:
            embs = await asyncio.to_thread(embedder.embed_documents, b_docs)
        collection.add(documents=b_docs, metadatas=b_meta, ids=b_ids, embeddings=embs)

    await asyncio.gather(*[_embed_and_store(d, m, i) for d, m, i in batches])

    stats = compute_repo_stats(indexed_files, len(docs))
    write_cache(slug, "stats", stats)

    return len(docs)

def query_repo(slug: str, question: str, n_results: int = TOP_K) -> List[Dict[str, Any]]:
    client = _client()
    embedder = _embedder()
    try:
        collection = client.get_collection(_col_name(slug))
    except Exception:
        return []
    q_emb = embedder.embed_query(question)
    results = collection.query(query_embeddings=[q_emb], n_results=n_results)
    return [
        {"content": doc, "file": meta.get("file", ""), "repo": meta.get("repo", "")}
        for doc, meta in zip(results["documents"][0], results["metadatas"][0])
    ]

def delete_repo_index(slug: str) -> bool:
    try:
        _client().delete_collection(_col_name(slug))
        return True
    except Exception:
        return False

def list_indexed_repos() -> List[str]:
    cols = _client().list_collections()
    return [c.name.replace("repo_", "", 1) for c in cols if c.name.startswith("repo_")]