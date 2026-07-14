import { ChatWindow } from '@/components/ChatWindow';
import IngestPanel from '@/components/IngestPanel';
import RepoSelector from '@/components/RepoSelector';
import ResumeMatchPanel from '@/components/ResumeMatchPanel';
import SummaryPanel from '@/components/SummaryPanel';
import { cn, displaySlug } from '@/lib/utils';
import { getRepoEvidence, getRepoStats, getRepoSummary } from '@/services/api';
import type { EvidenceFile, RepoStats, SummaryResult } from '@/types';
import {
    BookOpen,
    Bot,
    Briefcase,
    ChevronRight,
    Database,
    FileCode2,
    GitBranch,
    Loader2,
    MessageSquare,
    ShieldCheck,
    Sparkles,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

type Tab = 'overview' | 'evidence' | 'chat';
type SidebarMode = 'repo' | 'match';


export function HomePage() {
    const [sidebarMode, setSidebarMode] = useState<SidebarMode>('repo');
    const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [summaryData, setSummaryData] = useState<SummaryResult | null>(null);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryError, setSummaryError] = useState('');
    const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([]);
    const [evidenceLoading, setEvidenceLoading] = useState(false);
    const [evidenceError, setEvidenceError] = useState('');
    const [stats, setStats] = useState<RepoStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(false);

    const handleRepoReady = (slug: string) => {
        setRefreshTrigger((n) => n + 1);
        setSelectedRepo(slug);
        setActiveTab('overview');
    };

    const summaryRepoRef = useRef<string | null>(null);

    useEffect(() => {
        if (!selectedRepo) {
            setSummaryData(null);
            setSummaryError('');
            setSummaryLoading(false);
            summaryRepoRef.current = null;
            return;
        }

        const currentRepo = selectedRepo;
        summaryRepoRef.current = currentRepo;
        setSummaryLoading(true);
        setSummaryError('');

        getRepoSummary(currentRepo)
            .then((data) => {
                if (summaryRepoRef.current !== currentRepo) return;
                setSummaryData(data);
            })
            .catch((err) => {
                if (summaryRepoRef.current !== currentRepo) return;
                setSummaryError(err instanceof Error ? err.message : 'Failed to load summary');
            })
            .finally(() => {
                if (summaryRepoRef.current === currentRepo) setSummaryLoading(false);
            });
    }, [selectedRepo]);

    const evidenceRepoRef = useRef<string | null>(null);

    useEffect(() => {
        if (!selectedRepo) {
            setEvidenceFiles([]);
            setEvidenceError('');
            setEvidenceLoading(false);
            evidenceRepoRef.current = null;
            return;
        }

        const currentRepo = selectedRepo;
        evidenceRepoRef.current = currentRepo;
        setEvidenceLoading(true);
        setEvidenceError('');

        getRepoEvidence(currentRepo)
            .then((files) => {
                if (evidenceRepoRef.current !== currentRepo) return;
                setEvidenceFiles(files);
            })
            .catch((err) => {
                if (evidenceRepoRef.current !== currentRepo) return;
                setEvidenceError(err instanceof Error ? err.message : 'Failed to load evidence');
            })
            .finally(() => {
                if (evidenceRepoRef.current === currentRepo) setEvidenceLoading(false);
            });
    }, [selectedRepo]);

    const statsRepoRef = useRef<string | null>(null);

    useEffect(() => {
        if (!selectedRepo) {
            setStats(null);
            setStatsLoading(false);
            statsRepoRef.current = null;
            return;
        }

        const currentRepo = selectedRepo;
        statsRepoRef.current = currentRepo;
        setStatsLoading(true);

        getRepoStats(currentRepo)
            .then((data) => {
                if (statsRepoRef.current !== currentRepo) return;
                setStats(data);
            })
            .catch(() => {
                if (statsRepoRef.current !== currentRepo) return;
                setStats(null);
            })
            .finally(() => {
                if (statsRepoRef.current === currentRepo) setStatsLoading(false);
            });
    }, [selectedRepo]);

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

                <nav className="sidebar-mode-tabs" aria-label="App mode">
                    <button
                        className={cn('sidebar-mode-tab', { active: sidebarMode === 'repo' })}
                        onClick={() => setSidebarMode('repo')}
                    >
                        <GitBranch size={14} />
                        Repo Analysis
                    </button>
                    <button
                        className={cn('sidebar-mode-tab', { active: sidebarMode === 'match' })}
                        onClick={() => setSidebarMode('match')}
                    >
                        <Briefcase size={14} />
                        Resume Match
                    </button>
                </nav>

                {sidebarMode === 'repo' && (
                    <>
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
                    </>
                )}
            </aside>

            <main className="main-shell">
                {sidebarMode === 'match' && <ResumeMatchPanel />}
                {sidebarMode === 'repo' && (
                    <>
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
                                                <div className="metric-value">
                                                    {statsLoading ? '—' : (stats?.files.toLocaleString() ?? '—')}
                                                </div>
                                                <div className="metric-meta">Source and config coverage</div>
                                            </div>
                                            <div className="metric-card">
                                                <div className="metric-label">Embedded chunks</div>
                                                <div className="metric-value">
                                                    {statsLoading ? '—' : (stats?.chunks.toLocaleString() ?? '—')}
                                                </div>
                                                <div className="metric-meta">Semantic retrieval ready</div>
                                            </div>
                                            <div className="metric-card">
                                                <div className="metric-label">Primary stack</div>
                                                <div className="metric-value metric-stack">
                                                    {statsLoading
                                                        ? '—'
                                                        : stats?.stack.length
                                                            ? stats.stack.join(' · ')
                                                            : 'Not detected'}
                                                </div>
                                                <div className="metric-meta">Detected from indexed file types</div>
                                            </div>
                                            <div className="metric-card">
                                                <div className="metric-label">Readiness score</div>
                                                <div className="metric-value accent">
                                                    {statsLoading ? '—' : stats ? `${stats.readiness} / 10` : '—'}
                                                </div>
                                                <div className="metric-meta">README, tests, CI &amp; config detected</div>
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

                                                    <SummaryPanel
                                                        repoSlug={selectedRepo}
                                                        data={summaryData}
                                                        loading={summaryLoading}
                                                        error={summaryError}
                                                    />
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
                                                        {evidenceLoading ? (
                                                            <div className="summary-loading-premium">
                                                                <Loader2 size={18} className="spin" />
                                                                <span>Loading evidence...</span>
                                                            </div>
                                                        ) : evidenceError ? (
                                                            <div className="summary-error-premium">{evidenceError}</div>
                                                        ) : evidenceFiles.length === 0 ? (
                                                            <div className="summary-empty">No evidence files found.</div>
                                                        ) : (
                                                            evidenceFiles.slice(0, 5).map((file) => (
                                                                <div
                                                                    key={file.file}
                                                                    className="file-row file-row-clickable"
                                                                    role="button"
                                                                    tabIndex={0}
                                                                    onClick={() => setActiveTab('evidence')}
                                                                    onKeyDown={(e) => e.key === 'Enter' && setActiveTab('evidence')}
                                                                >
                                                                    <FileCode2 size={14} />
                                                                    <div className="file-row-text">
                                                                        <span>{file.file}</span>
                                                                        <small>{file.count} chunks • {file.score}% relevance</small>
                                                                    </div>
                                                                    <span className="score-badge">{file.score}%</span>
                                                                    <ChevronRight size={14} />
                                                                </div>
                                                            ))
                                                        )}
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
                                                {evidenceLoading ? (
                                                    <div className="summary-loading-premium">
                                                        <Loader2 size={18} className="spin" />
                                                        <span>Loading evidence...</span>
                                                    </div>
                                                ) : evidenceError ? (
                                                    <div className="summary-error-premium">{evidenceError}</div>
                                                ) : evidenceFiles.length === 0 ? (
                                                    <div className="summary-empty">No evidence files found.</div>
                                                ) : (
                                                    evidenceFiles.map((file, idx) => (
                                                        <div
                                                            className="evidence-row evidence-row-clickable"
                                                            key={file.file}
                                                            role="button"
                                                            tabIndex={0}
                                                            onClick={() => setActiveTab('evidence')}
                                                            onKeyDown={(e) => e.key === 'Enter' && setActiveTab('evidence')}
                                                        >
                                                            <div className="evidence-rank">0{idx + 1}</div>
                                                            <div className="evidence-file">
                                                                <div className="evidence-name">{file.file}</div>
                                                                <div className="evidence-sub">
                                                                    {file.count} chunks · {file.score}% relevance
                                                                </div>
                                                            </div>
                                                            <div className="evidence-score badge">{file.score}%</div>
                                                        </div>
                                                    ))
                                                )}
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
                    </>
                )}
            </main>
        </div>
    );
}

export default HomePage;