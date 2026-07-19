<div align="center">

# 🚀 RepoIQ

### Recruiter-grade GitHub repository intelligence for faster, smarter hiring

[![Frontend](https://img.shields.io/badge/Frontend-React_%2B_Vite-61DAFB?style=for-the-badge&logo=react&logoColor=white)](#-tech-stack)
[![Backend](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](#-tech-stack)
[![AI Runtime](https://img.shields.io/badge/AI-Ollama-111111?style=for-the-badge)](#-tech-stack)
[![Vector DB](https://img.shields.io/badge/Vector-ChromaDB-7C3AED?style=for-the-badge)](#-tech-stack)

*Turn any GitHub repo into a recruiter-friendly, evidence-backed technical briefing.*

</div>

---

## ✨ Overview

RepoIQ is a premium GitHub repository analysis platform built for recruiters, hiring managers, and technical interview teams. It ingests a public codebase, indexes it into a local vector store, and uses retrieval-augmented generation to explain architecture, stack choices, implementation patterns, and engineering quality in plain English.[web:1][web:15]

The product is intentionally **dashboard-first** rather than chat-first. That direction aligns with the centralized insight patterns used by modern product tools, including the dashboard workflows described by Linear and the navigation clarity emphasized by Vercel's dashboard redesign materials.[page:1][page:2]

## 🎯 Why RepoIQ

Reviewing a GitHub link during hiring is usually slow, inconsistent, and highly dependent on who is reading the code. RepoIQ turns a repository into a structured hiring artifact by surfacing the stack, architecture, strengths, risks, and evidence trails without forcing every reviewer into a deep manual code walkthrough.[page:1]

### Ideal use cases

- 👀 Resume and portfolio review before screening calls.
- 🧠 Recruiter enablement for non-engineering stakeholders.
- 🎙️ Interview preparation for hiring managers.
- 🔍 Evidence-based candidate evaluation using real implementation details.

## 🪄 What it does

- Accepts a GitHub repository URL and clones the codebase for local analysis.[web:1]
- Splits source files into retrieval-friendly chunks for semantic search.[web:15]
- Stores embeddings in a persistent local ChromaDB collection for repeated repo queries.[web:15]
- Uses Ollama-hosted local models to generate grounded answers from retrieved code context.[web:1]
- Produces recruiter-friendly summaries, architecture explanations, and evidence-backed Q&A.[page:1]

## 🧱 Product experience

RepoIQ is designed as a polished dark dashboard with a sidebar-first layout, overview-first navigation, evidence surfaces, and guided chat. That UX direction fits the dashboard principles described by Linear for centralized insight surfaces and by Vercel for clearer navigation and workflow prioritization.[page:1][page:2]

### Main sections

| Section | Purpose |
|---|---|
| 📋 Overview | Executive summary, architecture signal, and recruiter-facing interpretation.[page:1] |
| 🧾 Evidence | Important files, retrieved context, and support for the analysis.[page:1] |
| 💬 Ask RepoIQ | Natural-language questioning over the indexed codebase with retrieval-backed answers.[web:1] |

## 🏗️ Architecture

RepoIQ uses a clean split between frontend and backend responsibilities. The backend handles repository ingestion, chunking, embedding, storage, and generation, while the frontend presents the recruiter workflow as a structured dashboard.[web:1][web:15][page:2]

```text
repoiq/
├── server/
│   ├── app/
│   │   ├── routers/
│   │   │   ├── health.py
│   │   │   ├── repos.py
│   │   │   └── query.py
│   │   ├── services/
│   │   │   ├── git_service.py
│   │   │   ├── rag_service.py
│   │   │   └── llm_service.py
│   │   └── config.py
│   ├── main.py
│   ├── requirements.txt
│   └── .env.example
└── client/
    ├── src/
    │   ├── components/
    │   ├── hooks/
    │   ├── pages/
    │   ├── services/
    │   ├── styles/
    │   └── types/
    ├── package.json
    ├── tsconfig.json
    └── vite.config.ts
```

## 🧰 Tech stack

| Layer | Technology | Why it fits |
|---|---|---|
| 🎨 Frontend | React + TypeScript + Vite | Fast iteration and a clean structure for a modern dashboard UI.[web:34] |
| ⚙️ Backend | FastAPI | High-performance Python API layer with async support and background task patterns.[web:1] |
| 🤖 Local AI runtime | Ollama | Keeps inference local, private, and cost-aware for repository analysis workflows.[web:1] |
| 🔎 Embeddings | Ollama embedding model | Enables semantic retrieval without a separate hosted embedding dependency.[web:1] |
| 🧠 Vector database | ChromaDB | Persistent local vector storage for semantic search and repeated repo queries.[web:15] |
| 🌿 Git integration | GitPython | Simplifies clone and refresh flows during ingestion. |

## 🔄 RAG workflow

RepoIQ uses a retrieval-augmented generation pipeline tailored for code understanding rather than generic chat.[web:1][web:15]

1. **📥 Ingest** — Clone the repository locally from GitHub.
2. **🧹 Filter** — Ignore irrelevant folders such as `node_modules`, build output, and caches.
3. **✂️ Chunk** — Split supported source files into overlapping chunks for better retrieval quality.[web:15]
4. **🧬 Embed** — Convert chunks into vectors using a local embedding model through Ollama.[web:1]
5. **🗂️ Store** — Save embeddings in a persistent ChromaDB collection for the repository.[web:15]
6. **🎯 Retrieve** — Embed the user question and fetch the most relevant chunks.
7. **🧾 Generate** — Ask the local LLM to answer using only the retrieved code context.[web:1]

## 🌐 API surface

The backend is organized around repository lifecycle and question-answering endpoints. FastAPI supports lightweight asynchronous follow-up work through background tasks, which makes it a practical starting point for repository ingestion flows.[web:1]

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Returns service health and Ollama availability.[web:1] |
| `POST` | `/api/repos/ingest` | Starts repository clone and indexing workflow.[web:1] |
| `GET` | `/api/repos/status/{slug}` | Polls ingest job progress. |
| `GET` | `/api/repos` | Lists indexed repositories. |
| `DELETE` | `/api/repos/{slug}` | Removes the local clone and vector index. |
| `POST` | `/api/query/ask` | Returns a full non-streaming answer for a repository question. |
| `POST` | `/api/query/stream` | Streams a retrieval-backed answer. |
| `POST` | `/api/query/summary` | Produces a recruiter-oriented summary. |

## ⚡ Quick start

### Prerequisites

- Python 3.11+
- Node.js 20+
- Ollama installed and running locally
- A local chat model and embedding model pulled into Ollama.[web:1]

### Pull required models

```bash
ollama pull llama3.2
ollama pull nomic-embed-text
```

### Start the backend

```bash
cd server
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8000
```

### Start the frontend

```bash
cd client
npm install
npm run dev
```

## 🔐 Environment variables

Example configuration lives in `server/.env.example`.

```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
OLLAMA_EMBED_MODEL=nomic-embed-text
CHROMA_PERSIST_DIR=./chroma_db
REPOS_DIR=./repos
CORS_ORIGINS=["http://localhost:5173"]
```

## 🎨 Design principles

A strong README should use clean headings, spacing, subtle emoji usage, and quick visual cues like badges without sacrificing professionalism, and GitHub Flavored Markdown supports emoji patterns that make this practical for polished repository documentation.[web:33][web:45][web:37]

RepoIQ follows those same principles in both product and documentation:

- ✨ Style should support clarity, not distract from it.[web:37]
- 🧭 Important information should be easy to scan quickly.[web:37]
- 🏢 The overall tone should feel credible to recruiters, founders, and technical teams.
- 🪶 Emojis should guide the eye, not overwhelm the page.[web:37]

## 🛣️ Roadmap

To make RepoIQ feel fully production-grade, the next milestones should include richer repository analytics, stronger evaluation signals, and better recruiter scoring. A dedicated repository overview endpoint that returns file counts, chunk totals, top languages, and indexing timestamps would make the dashboard behave more like a true operational intelligence surface.[page:1]

### Suggested next steps

- 📊 Add `GET /api/repos/{slug}/overview` for real metrics and evidence blocks.
- 🗺️ Add language detection and folder-level repository maps.
- 🧮 Add recruiter score components with explainable factors.
- 🔐 Add auth and per-user repository workspaces.
- 🧵 Add persistent background job tracking for larger ingest workloads.
- 📄 Add exportable candidate reports in Markdown or PDF.

## 💡 Example prompts

- What does this repository do in plain English?
- What technologies and frameworks are used here?
- Does this codebase suggest junior, mid-level, or senior engineering judgment?
- How is the RAG pipeline implemented?
- What are the strongest architectural choices in this project?
- What concerns should a hiring manager probe further?

## 📝 Notes

RepoIQ is currently best suited for public repositories and local development workflows. For larger-scale multi-user deployment, the ingestion layer, job orchestration, authentication, and storage model should evolve beyond lightweight local defaults.[web:1][web:15]

---

<div align="center">

**RepoIQ helps hiring teams understand code with speed, structure, and evidence.**

</div>
