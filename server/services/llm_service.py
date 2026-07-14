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

MATCH_SYSTEM_PROMPT = """You are a hiring AI agent. You will be given a Job Description and either a Candidate Resume or GitHub Profile.
Provide detailed, comprehensive, and FAIR analysis with specific examples and explanations.
When a GitHub profile is provided, you are given the candidate's FULL repository list along with README content for
their non-fork repositories -- this is not a partial sample. You must review ALL of the provided repositories before
listing any "gaps": only cite something as a gap if it is genuinely absent across the ENTIRE set of repos and the
rest of the provided context. Do not describe a skill or technology as missing if it is demonstrated in any repo's
description, language, topics, or README.

CRITICAL — avoid unfair or overly harsh assessments:
- Only list something in "gaps" if it maps to a requirement or responsibility ACTUALLY stated in the job description.
  Never invent requirements the job description doesn't mention, and never penalize the candidate for things the JD
  doesn't ask for.
- Do not pad the gaps list to hit a target count. Returning fewer than 5 gaps, or an empty list, is expected and
  correct when the candidate's evidence already covers the job's requirements -- that is a GOOD outcome, not a
  failure of analysis.
- Do not treat minor, easily-learned, or "nice to have" items as blocking gaps. Reserve "gaps" for requirements the
  candidate has no evidence of meeting at all. Phrase each gap constructively (e.g. as a topic to confirm in an
  interview) rather than as a disqualifying flaw.
- Weigh the fit_score and verdict holistically: a candidate who satisfies the core/must-have requirements should
  score well and receive "Strong Fit" or "Moderate Fit" even if one or two minor, trainable gaps exist. Reserve
  "Weak Fit" for candidates who are missing multiple core requirements with no compensating evidence anywhere in
  their resume or repositories. Be fair and evidence-based -- do not make the candidate look worse than the
  evidence supports, and do not default to negativity.

Respond ONLY with a single valid JSON object matching this schema exactly:
{
  "fit_score": <integer 0-100>,
  "verdict": "Strong Fit | Moderate Fit | Weak Fit",
  "strengths": ["<detailed reason with specific examples>", ...],
  "gaps": ["<constructive, evidence-based gap tied to an explicit JD requirement>", ...],
  "recommendation": "<comprehensive 3-4 sentence summary with specific reasoning>",
  "relevant_repos": [
    {
      "name": "<repo name>",
      "relevance_score": <integer 0-100>,
      "description": "<detailed explanation of what the candidate did in this repo, including technologies used and implementation details>",
      "fit_reason": "<detailed explanation of why this repo demonstrates they're a good fit, with specific connections to job requirements>"
    }
  ]
}
Provide as many detailed strengths as the evidence supports (typically 5-8). For "gaps", provide ONLY genuine,
well-evidenced gaps -- there is no minimum, and 0-3 is common and expected for a well-matched candidate. For
relevant_repos, provide 3-5 repos with extensive detail.
Do NOT include any text, markdown, or explanation outside the JSON object."""


def build_match_prompt(jd_text: str, resume_text: str = None, github_profile: dict = None) -> str:
    jd_trimmed = jd_text[:12000].strip()

    if github_profile:
        candidate_text = build_github_profile_section(github_profile)
        candidate_label = "CANDIDATE GITHUB PROFILE (full repository list + README content)"
    else:
        candidate_text = resume_text[:12000].strip()
        candidate_label = "CANDIDATE RESUME"
    
    prompt = (
        f"JOB DESCRIPTION:\n{jd_trimmed}\n\n"
        f"---\n\n"
        f"{candidate_label}:\n{candidate_text}\n\n"
        f"---\n\n"
    )
    
    if github_profile:
        prompt += (
            "Analyze ALL of the candidate's GitHub repositories listed above (not just a subset) to identify which "
            "ones are most relevant to the job description. For each relevant repo, explain what the candidate did "
            "and why it demonstrates they're a good fit. Before listing any gaps, double-check the full repo list "
            "and README content above to confirm the skill is truly absent, and confirm the gap corresponds to a "
            "requirement actually stated in the job description above -- not an assumed one. "
        )
    
    prompt += "Return ONLY the JSON object as specified."
    
    return prompt


async def get_match_analysis(jd_text: str, resume_text: str = None, github_profile: dict = None) -> Dict[str, Any]:
    payload = {
        "model": settings.OLLAMA_MODEL,
        "prompt": build_match_prompt(jd_text, resume_text, github_profile),
        "system": MATCH_SYSTEM_PROMPT,
        "stream": False,
        "format": "json",
        "options": {"temperature": 0.1, "num_predict": 4096},
    }
    # Larger timeout since full-repo (including README) analysis prompts take longer to process.
    async with httpx.AsyncClient(timeout=300) as client:
        resp = await client.post(f"{settings.OLLAMA_BASE_URL}/api/generate", json=payload)
        resp.raise_for_status()
        raw = resp.json().get("response", "")

    try:
        parsed = json.loads(raw)
        result = {
            "fit_score": max(0, min(100, int(parsed.get("fit_score", 0)))),
            "verdict": str(parsed.get("verdict", "Unknown")).strip(),
            "strengths": [str(s).strip() for s in parsed.get("strengths", []) if str(s).strip()],
            "gaps": [str(g).strip() for g in parsed.get("gaps", []) if str(g).strip()],
            "recommendation": str(parsed.get("recommendation", "")).strip(),
        }
        
        # Handle relevant_repos if present
        if github_profile and "relevant_repos" in parsed:
            relevant_repos = parsed.get("relevant_repos", [])
            result["relevant_repos"] = [
                {
                    "name": str(repo.get("name", "")).strip(),
                    "relevance_score": max(0, min(100, int(repo.get("relevance_score", 0)))),
                    "description": str(repo.get("description", "")).strip(),
                    "fit_reason": str(repo.get("fit_reason", "")).strip(),
                }
                for repo in relevant_repos
                if repo.get("name") and str(repo.get("name")).strip()
            ]
        else:
            result["relevant_repos"] = []
        
        return result
    except (json.JSONDecodeError, ValueError):
        return {
            "fit_score": 0,
            "verdict": "Unknown",
            "strengths": [],
            "gaps": [],
            "recommendation": raw.strip() or "Analysis failed.",
            "relevant_repos": [],
        }


RESUME_ANALYSIS_SYSTEM_PROMPT = """You are a resume analysis AI. You will be given a candidate's resume text and optionally additional context from links in their resume and/or their GitHub profile and repositories.
Provide detailed, comprehensive analysis with specific examples and explanations.
When GitHub repository data (including README content) is provided, use it as a primary source of truth about the
candidate's real-world skills and projects -- do not rely solely on the profile bio. Cross-reference repos against
the resume to corroborate or expand on claimed skills and projects.
Respond ONLY with a single valid JSON object matching this schema exactly:
{
  "summary": "<comprehensive 4-5 sentence overview of the candidate's background, expertise, and key qualifications>",
  "current_title": "<current job title or 'Not specified'>",
  "education": [
    {
      "institution": "<school name>",
      "degree": "<degree obtained>",
      "field": "<field of study>",
      "year": "<graduation year or date range>"
    }
  ],
  "skills": ["<detailed skill with context of experience level>", ...],
  "projects": [
    {
      "name": "<project name>",
      "description": "<detailed explanation of what the project does, its purpose, and technical implementation>",
      "technologies": ["<tech1>", "<tech2>"],
      "role": "<detailed explanation of the candidate's specific role and contributions>"
    }
  ],
  "experience_summary": "<comprehensive summary of work experience with specific roles, responsibilities, and achievements>",
  "links_visited": ["<url1>", "<url2>"]
}
Provide 10-15 detailed skills when possible. For projects, provide 5-8 projects with extensive detail about implementation and
contributions -- include notable GitHub repositories as projects when repo data is provided.
Do NOT include any text, markdown, or explanation outside the JSON object."""


# Total character budget for README excerpts across all repos combined, so accounts with
# many/large repos still produce a well-formed prompt instead of one that keeps growing
# without bound. This is generous enough to cover a typical candidate's entire portfolio.
MAX_README_SECTION_CHARS = 60000


def build_github_profile_section(github_profile: dict) -> str:
    parts = [
        f"GitHub Profile: {github_profile.get('name', github_profile.get('username', 'Unknown'))}",
        f"Username: {github_profile.get('username', 'Unknown')}",
        f"Bio: {github_profile.get('bio') or 'No bio'}",
        f"Location: {github_profile.get('location') or 'Not specified'}",
        f"Company: {github_profile.get('company') or 'Not specified'}",
        f"Public Repositories: {github_profile.get('public_repos', 0)}",
        f"Followers: {github_profile.get('followers', 0)}",
    ]

    repos = github_profile.get('repos', [])
    if repos:
        parts.append(f"\nRepositories (all {len(repos)} repos listed below):")
        for repo in repos:
            parts.append(
                f"- {repo.get('name', 'N/A')}: {repo.get('description') or 'No description'} "
                f"(Language: {repo.get('language') or 'N/A'}, Stars: {repo.get('stargazers_count', 0)}, "
                f"Forks: {repo.get('forks_count', 0)})"
            )

    # Deep-dive: include README content for every analyzed repo so the analysis is
    # grounded in what the candidate actually built, not just profile-level metadata.
    # A total character budget keeps the prompt bounded even for large portfolios.
    repos_with_readme = [r for r in repos if r.get('readme')]
    if repos_with_readme:
        parts.append(f"\nIn-depth Repository Content (README excerpts, {len(repos_with_readme)} repos):")
        budget = MAX_README_SECTION_CHARS
        per_repo_cap = max(500, budget // len(repos_with_readme))
        for repo in repos_with_readme:
            if budget <= 0:
                parts.append(f"\n[Remaining repos' READMEs omitted to stay within prompt size limits.]")
                break
            excerpt_len = min(per_repo_cap, budget)
            readme_excerpt = repo['readme'][:excerpt_len]
            parts.append(f"\n[Repo: {repo.get('full_name', repo.get('name', 'N/A'))}]\n{readme_excerpt}")
            budget -= len(readme_excerpt)

    return "\n".join(parts)


def build_resume_analysis_prompt(resume_text: str, link_contexts: list = None, github_profile: dict = None) -> str:
    prompt = f"RESUME TEXT:\n{resume_text[:15000]}\n\n"

    if github_profile:
        prompt += "CANDIDATE GITHUB PROFILE AND REPOSITORIES:\n"
        prompt += build_github_profile_section(github_profile)
        prompt += "\n\n"

    if link_contexts:
        prompt += "ADDITIONAL CONTEXT FROM LINKS:\n"
        for i, context in enumerate(link_contexts, 1):
            prompt += f"\n[Link {i} - {context.get('url', 'Unknown')}]\n"
            prompt += f"{context.get('content', 'No content available')[:5000]}\n"
        prompt += "\n"

    prompt += (
        "Analyze this resume and extract the key information with extensive detail. "
        "If additional context from links was provided, incorporate that information into your analysis. "
        "If GitHub repository data was provided, analyze the actual repositories (not just the profile bio) "
        "to determine the candidate's real skills and notable projects, and factor this into your determination. "
        "Return ONLY the JSON object as specified."
    )

    return prompt


async def analyze_resume(resume_text: str, link_contexts: list = None, github_profile: dict = None) -> Dict[str, Any]:
    payload = {
        "model": settings.OLLAMA_MODEL,
        "prompt": build_resume_analysis_prompt(resume_text, link_contexts, github_profile),
        "system": RESUME_ANALYSIS_SYSTEM_PROMPT,
        "stream": False,
        "format": "json",
        "options": {"temperature": 0.1, "num_predict": 4096},
    }
    # Larger timeout since full-repo (including README) analysis prompts take longer to process.
    async with httpx.AsyncClient(timeout=300) as client:
        resp = await client.post(f"{settings.OLLAMA_BASE_URL}/api/generate", json=payload)
        resp.raise_for_status()
        raw = resp.json().get("response", "")

    try:
        parsed = json.loads(raw)
        return {
            "summary": str(parsed.get("summary", "")).strip(),
            "current_title": str(parsed.get("current_title", "Not specified")).strip(),
            "education": [
                {
                    "institution": str(edu.get("institution", "")).strip(),
                    "degree": str(edu.get("degree", "")).strip(),
                    "field": str(edu.get("field", "")).strip(),
                    "year": str(edu.get("year", "")).strip(),
                }
                for edu in parsed.get("education", [])
                if edu.get("institution")
            ],
            "skills": [str(skill).strip() for skill in parsed.get("skills", []) if str(skill).strip()],
            "projects": [
                {
                    "name": str(proj.get("name", "")).strip(),
                    "description": str(proj.get("description", "")).strip(),
                    "technologies": [str(tech).strip() for tech in proj.get("technologies", []) if str(tech).strip()],
                    "role": str(proj.get("role", "")).strip(),
                }
                for proj in parsed.get("projects", [])
                if proj.get("name")
            ],
            "experience_summary": str(parsed.get("experience_summary", "")).strip(),
            "links_visited": [str(url).strip() for url in parsed.get("links_visited", []) if str(url).strip()],
        }
    except (json.JSONDecodeError, ValueError):
        return {
            "summary": raw.strip() or "Analysis failed.",
            "current_title": "Unknown",
            "education": [],
            "skills": [],
            "projects": [],
            "experience_summary": "",
            "links_visited": [],
        }
