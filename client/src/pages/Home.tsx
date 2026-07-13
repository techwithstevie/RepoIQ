import { useMemo, useState } from 'react';
import {
    Bot,
    BookOpen,
    Boxes,
    ChevronRight,
    Database,
    FileCode2,
    FolderGit2,
    MessageSquare,
    ShieldCheck,
    Sparkles,
} from 'lucide-react';
import IngestPanel from '@/components/IngestPanel';
import RepoSelector from '@/components/RepoSelector';
import { ChatWindow } from '@/components/ChatWindow';
import { SummaryPanel } from '@/components/SummaryPanel';
import { cn, displaySlug } from '@/lib/utils';

type Tab = 'overview' | 'evidence' | 'chat';

const MOCK_EVIDENCE = [
    'src/App.tsx',
    'src/components/RepoSelector.tsx',
    'server/app/services/rag_service.py',
    'server/app/services/llm_service.py',
    'server/app/routers/query.py',
];

export function HomePage() {
    const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [activeTab, setActiveTab] = useState<Tab>('overview');

    const handleRepoReady = (slug: string) => {
        setRefreshTrigger((n) => n + 1);
        setSelectedRepo(slug);
        setActiveTab('overview');
    };

    const title = useMemo(
        () => (selectedRepo ? displaySlug(selectedRepo) : 'Candidate Code Intelligence'),
        [selectedRepo]
    );

    return (
        <div className="app-shell">
            <aside className="sidebar">
                <div className="brand-block">
                    <div className="brand-mark">
                        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-label="RepoIQ logo">
                            <rect x="2" y="2" width="24" height="24" rx="8" fill="currentColor" />
                            <path d="M8 10h4M8 14h8M8 18h6" stroke="white" strokeWidth="2" strokeLinecap="round" />
                            <circle cx="20" cy="10" r="3" fill="white" />
                        </svg>
                    </div>
                    <div>
                        <div className="brand-title">RepoIQ</div>
                        <div className="brand-subtitle">Recruiter-grade repo intelligence</div>
                    </div>
                </div>

                <IngestPanel onRepoReady={handleRepoReady} />

                <div className="sidebar-section">
                    <RepoSelector
                        selected={selectedRepo}
                        onSelect={(slug) => {
                            setSelectedRepo(slug);
                            setActiveTab('overview');
                        }}
                        refreshTrigger={refreshTrigger}
                    />
                </div>
            </aside>

            <main className="main-shell">
                <header className="topbar">
                    <div>
                        <div className="eyebrow">Hiring intelligence workspace</div>
                        <h1 className="page-title">{title}</h1>
                        <p className="page-subtitle">
                            Understand architecture, stack, strengths, and implementation quality in one place.
                        </p>
                    </div>

                    <div className="topbar-actions">
                        <div className="status-pill status-live">
                            <span className="status-dot" />
                            Recruiter-ready view
                        </div>
                    </div>
                </header>

                {!selectedRepo ? (
                    <section className="empty-hero">
                        <div className="empty-card">
                            <div className="empty-icon">
                                <Bot size={34} />
                            </div>
                            <h2>Upload a repository for a premium analysis experience</h2>
                            <p>
                                Ingest a GitHub repository to generate a recruiter summary, evidence-backed findings,
                                and a Q&A layer grounded in the actual codebase.
                            </p>

                            <div className="hero-grid">
                                <div className="hero-feature">
                                    <Sparkles size={18} />
                                    <div>
                                        <h3>Executive summary</h3>
                                        <p>Architecture, strengths, and risks presented like a real product review.</p>
                                    </div>
                                </div>
                                <div className="hero-feature">
                                    <Database size={18} />
                                    <div>
                                        <h3>Semantic retrieval</h3>
                                        <p>Find the files and code paths that matter without browsing manually.</p>
                                    </div>
                                </div>
                                <div className="hero-feature">
                                    <MessageSquare size={18} />
                                    <div>
                                        <h3>Natural-language Q&A</h3>
                                        <p>Ask about the repo and get answers grounded in retrieved code context.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                ) : (
                    <>
                        <nav className="workspace-tabs" aria-label="Workspace sections">
                            <button
                                className={cn('workspace-tab', { active: activeTab === 'overview' })}
                                onClick={() => setActiveTab('overview')}
                            >
                                <BookOpen size={15} />
                                Overview
                            </button>
                            <button
                                className={cn('workspace-tab', { active: activeTab === 'evidence' })}
                                onClick={() => setActiveTab('evidence')}
                            >
                                <FileCode2 size={15} />
                                Evidence
                            </button>
                            <button
                                className={cn('workspace-tab', { active: activeTab === 'chat' })}
                                onClick={() => setActiveTab('chat')}
                            >
                                <MessageSquare size={15} />
                                Ask RepoIQ
                            </button>
                        </nav>

                        {activeTab === 'overview' && (
                            <section className="dashboard-grid">
                                <div className="metric-strip">
                                    <div className="metric-card">
                                        <div className="metric-label">Indexed files</div>
                                        <div className="metric-value">148</div>
                                        <div className="metric-meta">Source and config coverage</div>
                                    </div>
                                    <div className="metric-card">
                                        <div className="metric-label">Embedded chunks</div>
                                        <div className="metric-value">1,264</div>
                                        <div className="metric-meta">Semantic retrieval ready</div>
                                    </div>
                                    <div className="metric-card">
                                        <div className="metric-label">Primary stack</div>
                                        <div className="metric-value metric-stack">React · FastAPI · Ollama</div>
                                        <div className="metric-meta">Frontend, backend, local AI</div>
                                    </div>
                                    <div className="metric-card">
                                        <div className="metric-label">Readiness score</div>
                                        <div className="metric-value accent">8.7 / 10</div>
                                        <div className="metric-meta">Based on structure and clarity</div>
                                    </div>
                                </div>

                                <div className="content-grid">
                                    <div className="column-main">
                                        <section className="panel panel-hero">
                                            <div className="panel-header">
                                                <div>
                                                    <div className="panel-kicker">Executive summary</div>
                                                    <h3>What this repository signals to recruiters</h3>
                                                </div>
                                                <div className="panel-badge">
                                                    <ShieldCheck size={14} />
                                                    Strong architecture
                                                </div>
                                            </div>

                                            <SummaryPanel repoSlug={selectedRepo} />
                                        </section>

                                        <section className="panel">
                                            <div className="panel-header">
                                                <div>
                                                    <div className="panel-kicker">Strengths</div>
                                                    <h3>Why this codebase feels senior</h3>
                                                </div>
                                            </div>

                                            <div className="bullet-grid">
                                                <div className="insight-card">
                                                    <Boxes size={16} />
                                                    <div>
                                                        <h4>Separation of concerns</h4>
                                                        <p>
                                                            Clear split between ingestion, retrieval, generation, and UI workflows.
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="insight-card">
                                                    <FolderGit2 size={16} />
                                                    <div>
                                                        <h4>Real workflow alignment</h4>
                                                        <p>
                                                            Repository ingest, recruiter summary, and code Q&A map to a concrete use case.
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="insight-card">
                                                    <Database size={16} />
                                                    <div>
                                                        <h4>Practical local AI stack</h4>
                                                        <p>
                                                            Ollama plus local vector storage keeps the product cost-aware and private.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </section>
                                    </div>

                                    <div className="column-side">
                                        <section className="panel side-panel">
                                            <div className="panel-header">
                                                <div>
                                                    <div className="panel-kicker">Repository profile</div>
                                                    <h3>Snapshot</h3>
                                                </div>
                                            </div>

                                            <div className="kv-list">
                                                <div className="kv-row">
                                                    <span>Name</span>
                                                    <strong>{displaySlug(selectedRepo)}</strong>
                                                </div>
                                                <div className="kv-row">
                                                    <span>Branch</span>
                                                    <strong>main</strong>
                                                </div>
                                                <div className="kv-row">
                                                    <span>Vector DB</span>
                                                    <strong>ChromaDB</strong>
                                                </div>
                                                <div className="kv-row">
                                                    <span>LLM runtime</span>
                                                    <strong>Ollama</strong>
                                                </div>
                                            </div>
                                        </section>

                                        <section className="panel side-panel">
                                            <div className="panel-header">
                                                <div>
                                                    <div className="panel-kicker">Key evidence</div>
                                                    <h3>Important files</h3>
                                                </div>
                                            </div>

                                            <div className="file-list">
                                                {MOCK_EVIDENCE.map((file) => (
                                                    <div key={file} className="file-row">
                                                        <FileCode2 size={14} />
                                                        <span>{file}</span>
                                                        <ChevronRight size={14} />
                                                    </div>
                                                ))}
                                            </div>
                                        </section>

                                        <section className="panel side-panel">
                                            <div className="panel-header">
                                                <div>
                                                    <div className="panel-kicker">Suggested prompts</div>
                                                    <h3>Recruiter questions</h3>
                                                </div>
                                            </div>

                                            <div className="prompt-list">
                                                <button className="prompt-chip">What does this repo actually do?</button>
                                                <button className="prompt-chip">How strong is the architecture?</button>
                                                <button className="prompt-chip">What frameworks are used?</button>
                                                <button className="prompt-chip">Are there signs of senior engineering?</button>
                                            </div>
                                        </section>
                                    </div>
                                </div>
                            </section>
                        )}

                        {activeTab === 'evidence' && (
                            <section className="evidence-layout">
                                <div className="panel">
                                    <div className="panel-header">
                                        <div>
                                            <div className="panel-kicker">Retrieved context</div>
                                            <h3>Files that support analysis</h3>
                                        </div>
                                    </div>

                                    <div className="evidence-table">
                                        {MOCK_EVIDENCE.map((file, idx) => (
                                            <div className="evidence-row" key={file}>
                                                <div className="evidence-rank">0{idx + 1}</div>
                                                <div className="evidence-file">
                                                    <div className="evidence-name">{file}</div>
                                                    <div className="evidence-sub">
                                                        Frequently relevant during retrieval and summary generation
                                                    </div>
                                                </div>
                                                <div className="evidence-score">High relevance</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        )}

                        {activeTab === 'chat' && (
                            <section className="chat-layout">
                                <div className="chat-shell">
                                    <ChatWindow repoSlug={selectedRepo} />
                                </div>
                            </section>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}

export default HomePage;