import { useState } from 'react';
import { Bot, BookOpen, MessageSquare } from 'lucide-react';
import IngestPanel from '../components/IngestPanel';
import RepoSelector from '../components/RepoSelector';
import ChatWindow from '../components/ChatWindow';
import SummaryPanel from '../components/SummaryPanel';
import { cn } from '../lib/utils';

type Tab = 'chat' | 'summary';

function HomePage() {
    const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [activeTab, setActiveTab] = useState<Tab>('chat');

    const handleRepoReady = (slug: string) => {
        setRefreshTrigger((n) => n + 1);
        setSelectedRepo(slug);
    };

    return (
        <div className="app-layout">
            <aside className="sidebar">
                <div className="sidebar-brand">
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-label="RepoIQ logo">
                        <rect x="2" y="2" width="24" height="24" rx="6" fill="var(--color-primary)" />
                        <path d="M8 10h4M8 14h8M8 18h6" stroke="white" strokeWidth="2" strokeLinecap="round" />
                        <circle cx="20" cy="10" r="3" fill="white" />
                    </svg>
                    <span>RepoIQ</span>
                </div>

                <IngestPanel onRepoReady={handleRepoReady} />

                <RepoSelector
                    selected={selectedRepo}
                    onSelect={setSelectedRepo}
                    refreshTrigger={refreshTrigger}
                />
            </aside>

            <main className="main-content">
                {!selectedRepo ? (
                    <div className="welcome-state">
                        <Bot size={52} />
                        <h2>Welcome to RepoIQ</h2>
                        <p>Paste a GitHub URL to ingest and analyze a candidate codebase.</p>
                        <ul className="feature-list">
                            <li>Semantic retrieval over the whole repo.</li>
                            <li>Natural-language Q&A grounded in code.</li>
                            <li>Recruiter-friendly technical summaries.</li>
                            <li>Fast local inference with Ollama.</li>
                        </ul>
                    </div>
                ) : (
                    <>
                        <div className="tab-bar">
                            <button
                                className={cn('tab-btn', { active: activeTab === 'chat' })}
                                onClick={() => setActiveTab('chat')}
                            >
                                <MessageSquare size={15} />
                                Chat
                            </button>
                            <button
                                className={cn('tab-btn', { active: activeTab === 'summary' })}
                                onClick={() => setActiveTab('summary')}
                            >
                                <BookOpen size={15} />
                                Recruiter summary
                            </button>
                        </div>

                        {activeTab === 'chat' ? (
                            <ChatWindow repoSlug={selectedRepo} />
                        ) : (
                            <SummaryPanel repoSlug={selectedRepo} />
                        )}
                    </>
                )}
            </main>
        </div>
    );
}

export default HomePage;