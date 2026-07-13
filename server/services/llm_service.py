from typing import AsyncGenerator, List, Dict, Any
import httpx, json
from config import settings

SYSTEM_PROMPT = """You are RepoIQ, an expert technical assistant. Your ONLY job is to answer questions about the specific repository code snippets provided to you in each prompt.

STRICT RULES — you must follow these without exception:
1. ONLY use information from the code snippets provided below. Do NOT use any prior knowledge, training data, or assumptions about what a project might be.
2. If the answer cannot be determined from the provided snippets, say exactly: "I don't have enough context from the indexed code to answer that."
3. Never describe, explain, or reference any project other than the one whose code is shown in the snippets.
4. Always cite the file name(s) your answer is drawn from."""

def build_prompt(question: str, chunks: List[Dict[str, Any]]) -> str:
    context = "\n\n".join(
        f"[{i}] File: {c['file']}\n```\n{c['content']}\n```"
        for i, c in enumerate(chunks, 1)
    )
    return (
        f"The following are code snippets retrieved from the indexed repository. "
        f"Answer ONLY based on these snippets — do not use any outside knowledge.\n\n"
        f"{context}\n\n"
        f"---\n"
        f"Question about the above repository: {question}\n\n"
        f"Answer (cite file names, use only the snippets above):"
    )

async def stream_answer(
    question: str, chunks: List[Dict[str, Any]]
) -> AsyncGenerator[str, None]:
    payload = {
        "model": settings.OLLAMA_MODEL,
        "prompt": build_prompt(question, chunks),
        "system": SYSTEM_PROMPT,
        "stream": True,
        "options": {"temperature": 0.2, "num_predict": 1024},
    }
    async with httpx.AsyncClient(timeout=120) as client:
        async with client.stream(
            "POST", f"{settings.OLLAMA_BASE_URL}/api/generate", json=payload
        ) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if line:
                    data = json.loads(line)
                    if token := data.get("response", ""):
                        yield token
                    if data.get("done"):
                        break

async def get_answer(question: str, chunks: List[Dict[str, Any]]) -> str:
    return "".join([t async for t in stream_answer(question, chunks)])