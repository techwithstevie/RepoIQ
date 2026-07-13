# RepoIQ

RepoIQ is a recruiter-ready repository intelligence tool that converts GitHub codebases into actionable insights, evidence-backed findings, and natural-language answers.

## What this project is

RepoIQ scans and indexes a repository, then builds a lightweight retrieval system so users can:

- ingest a GitHub repository URL
- generate an executive summary of the codebase
- surface the most important files and evidence
- ask natural questions about implementation, architecture, and stack choices

It is designed for technical recruiters, hiring managers, and engineering teams who need fast, reliable repo intelligence without reading every file manually.

## Problems it solves

- **Manual repo review is slow.** RepoIQ reduces the time needed to understand a repository by summarizing architecture, strengths, and risks.
- **Recruiter-facing code context is hard to produce.** It translates code and structure into easy-to-digest insights.
- **Important files are buried.** RepoIQ highlights the files with the highest relevance to the analysis.
- **Uncertain codebase quality.** It delivers readiness signals and stack profiles instead of raw repo metrics.
- **Contextless questions are unreliable.** The app answers questions using retrieval-augmented generation, grounding responses in indexed repository content.

## What it was built with

### Frontend
- **React 19** with **TypeScript**
- **Vite** for fast development and production builds
- **Lucide React** for iconography
- **React Markdown** for rich answer rendering
- Custom responsive UI with modern glassmorphism-inspired cards and panels

### Backend
- **FastAPI** for the API server and request routing
- **Uvicorn** for ASGI development
- **GitPython** to clone and manage repository source
- **ChromaDB** for vector persistence and semantic retrieval
- **LangChain** + **LangChain Ollama** for query and summary orchestration
- **Sentence Transformers** for embedding generation
- **Ollama** as the LLM runtime for embeddings and answer generation

### Infrastructure
- **Python 3.11+** for backend runtime
- **SQLite-backed ChromaDB** persistence
- background ingest tasks with FastAPI `BackgroundTasks`
- simple disk-based cache for summary and evidence payloads

## How it was built

RepoIQ is split into a frontend client and a backend API.

### Frontend architecture
- `client/src/pages/Home.tsx` contains the main workspace layout, tab navigation, and data-driven sections.
- `client/src/components/IngestPanel.tsx` handles repository ingestion and task state.
- `client/src/components/SummaryPanel.tsx` renders executive summary sections.
- `client/src/components/ChatWindow.tsx` provides a conversational interface for asking repo questions.
- `client/src/services/api.ts` defines API calls for ingest, status polling, summary, evidence, and streaming answers.
- `client/src/index.css` creates the polished UI theme, card styling, and responsive layout.

### Backend architecture
- `server/main.py` initializes FastAPI, registers CORS, and mounts routers.
- `server/routers/repos.py` manages ingestion, status, repo listing, stats, and deletion.
- `server/routers/query.py` powers evidence retrieval, summary generation, direct question answering, and streamed responses.
- `server/services/git_service.py` clones or pulls GitHub repos and extracts file metadata.
- `server/services/rag_service.py` indexes content and performs vector queries.
- `server/services/llm_service.py` interfaces with Ollama for answers and streaming text.
- `server/services/cache_service.py` caches summary, evidence, and stats payloads on disk.

### Engineered for usability
- The frontend is designed to work as a recruiter-grade dashboard with polished cards, metrics, and tabs.
- The backend uses incremental ingestion and cached results so repeated queries return quickly.
- The query layer is built for retrieval-augmented answers, not just generic LLM output.

## Getting started

### Prerequisites
- Node.js and npm
- Python 3.11+
- Ollama running locally or available via the configured `OLLAMA_BASE_URL`

### Install dependencies

```bash
cd repoiq/client
npm install

cd ../server
python -m pip install -r requirements.txt
```

### Configure environment

Create a `.env` file in `server/` if you need to override defaults:

```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gpt-oss:120b-cloud
OLLAMA_EMBED_MODEL=nomic-embed-text
CHROMA_PERSIST_DIR=./chroma_db
REPOS_DIR=./repos
CACHE_DIR=./cache
CORS_ORIGINS=["http://localhost:5173"]
```

### Run the backend

```bash
cd repoiq/server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Run the frontend

```bash
cd repoiq/client
npm run dev
```

Then open the app in your browser at `http://localhost:5173`.

## Usage

1. Enter a GitHub repository URL in the ingest panel.
2. Wait for the repo to clone, index, and produce status updates.
3. Explore the overview tab for summary, stats, and evidence.
4. Use the evidence tab to review the most relevant files.
5. Ask natural-language questions in the chat tab to get code-backed answers.

## Why this matters

RepoIQ helps teams move faster by turning large codebases into structured, recruiter-friendly knowledge. It bridges the gap between code and hiring decisions by combining repository analysis, semantic search, and conversational intelligence.

## Folder structure

- `client/` — React frontend UI and workflows
- `server/` — FastAPI backend, ingestion, retrieval, and LLM services
- `server/chroma_db/` — persisted vector database state
- `server/repos/` — cloned repositories and indexing artifacts
- `server/cache/` — stored JSON caches for summaries and evidence

## Notes

- The API expects the frontend to run on `http://localhost:5173` by default.
- The repo indexing pipeline is optimized for fast semantic retrieval and summary generation.
- The app is structured to make the frontend and backend independently testable and extensible.

## Roadmap

- Add user authentication and repo access controls.
- Support private repo ingestion via GitHub OAuth or token-based auth.
- Add richer repo diagnostics such as dependency health, test coverage, and CI config checks.
- Improve the summary pipeline with multi-question context and better section prioritization.
- Add exportable reports and shareable recruiter-ready summaries.
