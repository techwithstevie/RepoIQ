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

STRUCTURED_SYSTEM_PROMPT = """You are RepoIQ, an expert technical assistant. Your ONLY job is to answer questions about the specific repository code snippets provided to you in each prompt.

STRICT RULES — you must follow these without exception:
1. ONLY use information from the code snippets provided below. Do NOT use any prior knowledge, training data, or assumptions about what a project might be.
2. If the answer cannot be determined from the provided snippets, say so plainly inside the "summary" field.
3. Never describe, explain, or reference any project other than the one whose code is shown in the snippets.
4. Respond with ONLY a single valid JSON object matching exactly this schema, and nothing else:
{"summary": "1-3 plain sentences answering the question", "highlights": ["short plain-text point", "..."]}
5. "highlights" must have between 0 and 5 items, each under 140 characters, plain text only.
6. Do NOT use markdown, code fences, backticks, or any text outside the JSON object."""

async def get_structured_answer(question: str, chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
    payload = {
        "model": settings.OLLAMA_MODEL,
        "prompt": build_prompt(question, chunks),
        "system": STRUCTURED_SYSTEM_PROMPT,
        "stream": False,
        "format": "json",
        "options": {"temperature": 0.1, "num_predict": 512},
    }
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(f"{settings.OLLAMA_BASE_URL}/api/generate", json=payload)
        resp.raise_for_status()
        raw = resp.json().get("response", "")

    try:
        parsed = json.loads(raw)
        summary = str(parsed.get("summary", "")).strip()
        highlights = [str(h).strip() for h in parsed.get("highlights", []) if str(h).strip()]
        return {"summary": summary or "Not enough context.", "highlights": highlights[:5]}
    except (json.JSONDecodeError, AttributeError):
        return {"summary": raw.strip() or "Not enough context.", "highlights": []}

MATCH_SYSTEM_PROMPT = """You are a hiring AI agent. You will be given a Job Description and a Candidate Resume.
Respond ONLY with a single valid JSON object matching this schema exactly:
{
  "fit_score": <integer 0-100>,
  "verdict": "Strong Fit | Moderate Fit | Weak Fit",
  "strengths": ["<reason>", ...],
  "gaps": ["<reason>", ...],
  "recommendation": "<1-2 sentence summary>"
}
Do NOT include any text, markdown, or explanation outside the JSON object."""


def build_match_prompt(jd_text: str, resume_text: str) -> str:
    jd_trimmed = jd_text[:4000].strip()
    resume_trimmed = resume_text[:4000].strip()
    return (
        f"JOB DESCRIPTION:\n{jd_trimmed}\n\n"
        f"---\n\n"
        f"CANDIDATE RESUME:\n{resume_trimmed}\n\n"
        f"---\n\n"
        f"Evaluate how well the candidate fits the job. "
        f"Return ONLY the JSON object as specified."
    )


async def get_match_analysis(jd_text: str, resume_text: str) -> Dict[str, Any]:
    payload = {
        "model": settings.OLLAMA_MODEL,
        "prompt": build_match_prompt(jd_text, resume_text),
        "system": MATCH_SYSTEM_PROMPT,
        "stream": False,
        "format": "json",
        "options": {"temperature": 0.1, "num_predict": 1024},
    }
    async with httpx.AsyncClient(timeout=180) as client:
        resp = await client.post(f"{settings.OLLAMA_BASE_URL}/api/generate", json=payload)
        resp.raise_for_status()
        raw = resp.json().get("response", "")

    try:
        parsed = json.loads(raw)
        return {
            "fit_score": max(0, min(100, int(parsed.get("fit_score", 0)))),
            "verdict": str(parsed.get("verdict", "Unknown")).strip(),
            "strengths": [str(s).strip() for s in parsed.get("strengths", []) if str(s).strip()],
            "gaps": [str(g).strip() for g in parsed.get("gaps", []) if str(g).strip()],
            "recommendation": str(parsed.get("recommendation", "")).strip(),
        }
    except (json.JSONDecodeError, ValueError):
        return {
            "fit_score": 0,
            "verdict": "Unknown",
            "strengths": [],
            "gaps": [],
            "recommendation": raw.strip() or "Analysis failed.",
        }
