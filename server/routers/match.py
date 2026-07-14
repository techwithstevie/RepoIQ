from fastapi import APIRouter, UploadFile, File, Form, HTTPException
import fitz  # PyMuPDF
import httpx
import re
import base64
import asyncio
from services.llm_service import get_match_analysis, analyze_resume

router = APIRouter()

# Matches a bare GitHub profile URL, e.g. https://github.com/octocat (not a repo path).
GITHUB_PROFILE_RE = re.compile(r'^https?://(?:www\.)?github\.com/([A-Za-z0-9-]+)/?$')

# Cap on the number of repos whose READMEs are fetched for in-depth analysis. This is
# intentionally high so that, in practice, ALL of a candidate's non-fork repos are
# analyzed rather than just a handful -- it only guards against pathological accounts
# with hundreds of repos (which would blow up GitHub API rate limits / prompt size).
MAX_REPOS_FOR_README = 100

# Limits how many README fetches run concurrently, to avoid tripping GitHub's secondary
# rate limits when a candidate has many repositories.
README_FETCH_CONCURRENCY = 8


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


def extract_urls(text: str) -> list:
    """Extract URLs from text using regex."""
    url_pattern = r'https?://[^\s<>"{}|\\^`\[\]]+'
    urls = re.findall(url_pattern, text)
    # Filter out common non-content URLs
    excluded_domains = ['mailto:', 'tel:', 'javascript:', '#']
    filtered_urls = [
        url for url in urls 
        if not any(excluded in url.lower() for excluded in excluded_domains)
        and len(url) > 10  # Minimum reasonable URL length
    ]
    return list(set(filtered_urls))  # Remove duplicates


async def fetch_link_contexts(urls: list, max_links: int = 5) -> list:
    """Fetch content from multiple URLs with a limit."""
    contexts = []
    if not urls:
        return contexts
    
    # Limit the number of links to visit
    urls_to_visit = urls[:max_links]
    
    for url in urls_to_visit:
        try:
            content = await fetch_url_text(url)
            # Basic text cleanup - remove HTML tags
            clean_content = re.sub(r'<[^>]+>', ' ', content)
            clean_content = re.sub(r'\s+', ' ', clean_content).strip()
            
            if clean_content:
                contexts.append({
                    "url": url,
                    "content": clean_content[:3000]  # Limit content length
                })
        except Exception:
            # Skip failed links silently
            continue
    
    return contexts


async def fetch_repo_readme(client: httpx.AsyncClient, full_name: str) -> str:
    """Fetch and decode a repo's README content. Returns '' if unavailable."""
    try:
        response = await client.get(f"https://api.github.com/repos/{full_name}/readme")
        if response.status_code != 200:
            return ""
        data = response.json()
        content = data.get("content", "")
        if not content:
            return ""
        decoded = base64.b64decode(content).decode("utf-8", errors="ignore")
        return decoded.strip()
    except Exception:
        return ""


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

            # Analyze all of the candidate's repos in depth (excluding forks, unless the
            # account has none), so gaps/strengths determinations are grounded in the
            # candidate's actual body of work rather than just a small sample.
            candidates = [r for r in repos_data if not r.get("fork")] or repos_data
            candidates = sorted(
                candidates,
                key=lambda r: (r.get("stargazers_count", 0), r.get("updated_at", "")),
                reverse=True,
            )[:MAX_REPOS_FOR_README]

            readme_semaphore = asyncio.Semaphore(README_FETCH_CONCURRENCY)

            async def fetch_readme_limited(full_name: str) -> str:
                async with readme_semaphore:
                    return await fetch_repo_readme(client, full_name)

            readmes = await asyncio.gather(
                *(fetch_readme_limited(r["full_name"]) for r in candidates if r.get("full_name"))
            )
            readme_by_repo = {
                r["full_name"]: readme
                for r, readme in zip(candidates, readmes)
                if readme
            }
            for repo in repos_data:
                repo["readme"] = readme_by_repo.get(repo.get("full_name", ""), "")

            return {
                "username": username,
                "name": user_data.get("name", username),
                "bio": user_data.get("bio", ""),
                "location": user_data.get("location", ""),
                "company": user_data.get("company", ""),
                "public_repos": user_data.get("public_repos", 0),
                "followers": user_data.get("followers", 0),
                "profile_url": f"https://github.com/{username}",
                "repos": repos_data,
                "repos_analyzed": [r["full_name"] for r in candidates if r.get("full_name")],
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


@router.post("/analyze-resume")
async def analyze_resume_endpoint(
    resume: UploadFile = File(...),
    visit_links: bool = Form(False),
    github_url: str = Form(None),
):
    """Analyze a resume, optionally visiting links found in it and/or a candidate's
    GitHub profile. When a GitHub profile is involved (either passed explicitly via
    `github_url` or discovered among the resume's links), the candidate's repositories
    -- not just their profile bio -- are fetched and analyzed for the determination."""
    resume_bytes = await resume.read()
    if not resume_bytes:
        raise HTTPException(status_code=400, detail="resume file is empty.")

    resume_text = extract_pdf_text(resume_bytes)
    if not resume_text:
        raise HTTPException(status_code=422, detail="Could not extract text from resume PDF.")

    link_contexts = []
    github_profile = None
    visited_urls = []

    if github_url:
        github_profile = await fetch_github_profile(github_url)
        visited_urls.append(github_profile["profile_url"])

    if visit_links:
        urls = extract_urls(resume_text)
        github_urls_in_text = [u for u in urls if GITHUB_PROFILE_RE.match(u)]
        other_urls = [u for u in urls if u not in github_urls_in_text]

        # If the resume itself links to a GitHub profile, analyze the candidate's
        # repos in depth rather than just scraping the profile page's HTML.
        if not github_profile and github_urls_in_text:
            github_profile = await fetch_github_profile(github_urls_in_text[0])
            visited_urls.append(github_profile["profile_url"])

        if other_urls:
            link_contexts = await fetch_link_contexts(other_urls, max_links=5)
            visited_urls.extend(c["url"] for c in link_contexts)

    try:
        result = await analyze_resume(
            resume_text,
            link_contexts if link_contexts else None,
            github_profile,
        )
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="Ollama is not running. Start it with: ollama serve")
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail=f"Ollama returned an error: {exc.response.status_code}")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Resume analysis failed: {exc}")

    if github_profile:
        visited_urls.extend(
            repo.get("html_url") for repo in github_profile.get("repos", []) if repo.get("html_url")
        )
    if visited_urls:
        # Reflect the URLs we actually fetched, rather than trusting the LLM's guess.
        result["links_visited"] = sorted(set(visited_urls))

    return result
