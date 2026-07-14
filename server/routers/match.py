from fastapi import APIRouter, UploadFile, File, Form, HTTPException
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


async def fetch_url_text(url: str) -> str:
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            return response.text
    except httpx.TimeoutException:
        raise HTTPException(status_code=408, detail="Request to URL timed out.")
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {exc.response.status_code}")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {exc}")


async def fetch_github_profile(url: str) -> dict:
    try:
        # Extract username from GitHub URL
        if "github.com/" not in url:
            raise HTTPException(status_code=400, detail="Invalid GitHub URL. Must be a github.com profile URL.")
        
        username = url.split("github.com/")[-1].split("/")[0]
        if not username:
            raise HTTPException(status_code=400, detail="Could not extract username from GitHub URL.")
        
        # Fetch user profile and repos from GitHub API
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Get user profile
            user_response = await client.get(f"https://api.github.com/users/{username}")
            user_response.raise_for_status()
            user_data = user_response.json()
            
            # Get user repos (paginated to get all repos)
            repos_data = []
            page = 1
            per_page = 100
            while True:
                repos_response = await client.get(
                    f"https://api.github.com/users/{username}/repos?sort=updated&per_page={per_page}&page={page}"
                )
                repos_response.raise_for_status()
                page_repos = repos_response.json()
                if not page_repos:
                    break
                repos_data.extend(page_repos)
                if len(page_repos) < per_page:
                    break
                page += 1
            
            return {
                "username": username,
                "name": user_data.get("name", username),
                "bio": user_data.get("bio", ""),
                "location": user_data.get("location", ""),
                "company": user_data.get("company", ""),
                "public_repos": user_data.get("public_repos", 0),
                "followers": user_data.get("followers", 0),
                "repos": repos_data
            }
            
    except httpx.TimeoutException:
        raise HTTPException(status_code=408, detail="Request to GitHub API timed out.")
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code == 404:
            raise HTTPException(status_code=404, detail="GitHub user not found.")
        raise HTTPException(status_code=400, detail=f"Failed to fetch GitHub profile: {exc.response.status_code}")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to fetch GitHub profile: {exc}")


@router.post("/compare")
async def compare(
    job_description: UploadFile = File(None),
    job_description_url: str = Form(None),
    resume: UploadFile = File(None),
    github_url: str = Form(None),
):
    if not job_description and not job_description_url:
        raise HTTPException(status_code=400, detail="Either job_description file or job_description_url must be provided.")
    
    if job_description and job_description_url:
        raise HTTPException(status_code=400, detail="Provide either job_description file or job_description_url, not both.")

    if not resume and not github_url:
        raise HTTPException(status_code=400, detail="Either resume file or github_url must be provided.")
    
    if resume and github_url:
        raise HTTPException(status_code=400, detail="Provide either resume file or github_url, not both.")

    if resume:
        resume_bytes = await resume.read()
        if not resume_bytes:
            raise HTTPException(status_code=400, detail="resume file is empty.")
        resume_text = extract_pdf_text(resume_bytes)
        if not resume_text:
            raise HTTPException(status_code=422, detail="Could not extract text from resume PDF.")
        github_profile = None
    else:
        github_profile = await fetch_github_profile(github_url)
        if not github_profile:
            raise HTTPException(status_code=422, detail="Could not fetch GitHub profile data.")
        resume_text = None

    if job_description:
        jd_bytes = await job_description.read()
        if not jd_bytes:
            raise HTTPException(status_code=400, detail="job_description file is empty.")
        jd_text = extract_pdf_text(jd_bytes)
        if not jd_text:
            raise HTTPException(status_code=422, detail="Could not extract text from job description PDF.")
    else:
        jd_text = await fetch_url_text(job_description_url)
        if not jd_text:
            raise HTTPException(status_code=422, detail="Could not extract text from job description URL.")

    try:
        return await get_match_analysis(jd_text, resume_text, github_profile)
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="Ollama is not running. Start it with: ollama serve")
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail=f"Ollama returned an error: {exc.response.status_code}")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {exc}")
