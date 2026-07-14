from fastapi import APIRouter, UploadFile, File, HTTPException
import fitz  # PyMuPDF
import httpx
from services.llm_service import get_match_analysis

router = APIRouter()


def extract_pdf_text(file_bytes: bytes) -> str:
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        return "\n".join(page.get_text() for page in doc).strip()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not parse PDF: {exc}")


@router.post("/compare")
async def compare(
    job_description: UploadFile = File(...),
    resume: UploadFile = File(...),
):
    jd_bytes = await job_description.read()
    resume_bytes = await resume.read()

    if not jd_bytes:
        raise HTTPException(status_code=400, detail="job_description file is empty.")
    if not resume_bytes:
        raise HTTPException(status_code=400, detail="resume file is empty.")

    jd_text = extract_pdf_text(jd_bytes)
    resume_text = extract_pdf_text(resume_bytes)

    if not jd_text:
        raise HTTPException(status_code=422, detail="Could not extract text from job description PDF.")
    if not resume_text:
        raise HTTPException(status_code=422, detail="Could not extract text from resume PDF.")

    try:
        return await get_match_analysis(jd_text, resume_text)
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="Ollama is not running. Start it with: ollama serve")
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail=f"Ollama returned an error: {exc.response.status_code}")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {exc}")
