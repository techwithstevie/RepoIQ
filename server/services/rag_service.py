import hashlib
from pathlib import Path
from typing import List, Dict, Any
import chromadb
from chromadb.config import Settings as ChromaSettings
from langchain_ollama import OllamaEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from config import settings

CHUNK_SIZE = 800
CHUNK_OVERLAP = 120
TOP_K = 8

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

def index_repo(repo_path: Path, file_paths: List[Path], slug: str) -> int:
    client = _client()
    embedder = _embedder()
    col_name = _col_name(slug)
    try:
        client.delete_collection(col_name)
    except Exception:
        pass
    collection = client.create_collection(col_name)
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE, chunk_overlap=CHUNK_OVERLAP, add_start_index=True
    )
    docs, metadatas, ids = [], [], []
    for fpath in file_paths:
        try:
            text = fpath.read_text(errors="replace")
        except Exception:
            continue
        rel = str(fpath.relative_to(repo_path))
        for i, chunk in enumerate(splitter.split_text(text)):
            chunk_id = hashlib.md5(f"{rel}:{i}:{chunk[:50]}".encode()).hexdigest()
            docs.append(chunk)
            metadatas.append({"file": rel, "chunk_index": i, "repo": slug})
            ids.append(chunk_id)
    # Batch to avoid OOM
    BATCH = 64
    for start in range(0, len(docs), BATCH):
        embs = embedder.embed_documents(docs[start:start+BATCH])
        collection.add(
            documents=docs[start:start+BATCH],
            metadatas=metadatas[start:start+BATCH],
            ids=ids[start:start+BATCH],
            embeddings=embs,
        )
    return len(docs)

def query_repo(slug: str, question: str) -> List[Dict[str, Any]]:
    client = _client()
    embedder = _embedder()
    try:
        collection = client.get_collection(_col_name(slug))
    except Exception:
        return []
    q_emb = embedder.embed_query(question)
    results = collection.query(query_embeddings=[q_emb], n_results=TOP_K)
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