import { cn } from '@/lib/utils';
import { compareResumeToJob } from '@/services/api';
import type { MatchResult } from '@/types';
import {
    AlertCircle,
    CheckCircle2,
    FileText,
    GitBranch,
    Globe,
    Loader2,
    Sparkles,
    Upload,
    XCircle,
} from 'lucide-react';
import { useRef, useState } from 'react';

function FileDrop({
    label,
    file,
    onChange,
    inputId,
}: {
    label: string;
    file: File | null;
    onChange: (f: File | null) => void;
    inputId: string;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        const dropped = e.dataTransfer.files[0];
        if (dropped?.type === 'application/pdf') onChange(dropped);
    };

    return (
        <div
            className={cn('file-drop-zone', { 'file-drop-zone--dragging': dragging, 'file-drop-zone--filled': !!file })}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        >
            <input
                id={inputId}
                ref={inputRef}
                type="file"
                accept=".pdf,application/pdf"
                style={{ display: 'none' }}
                onChange={(e) => onChange(e.target.files?.[0] ?? null)}
            />
            {file ? (
                <>
                    <FileText size={22} className="file-drop-icon file-drop-icon--filled" />
                    <div className="file-drop-name">{file.name}</div>
                    <button
                        className="file-drop-clear"
                        onClick={(e) => { e.stopPropagation(); onChange(null); }}
                        aria-label="Remove file"
                    >
                        <XCircle size={15} />
                    </button>
                </>
            ) : (
                <>
                    <Upload size={22} className="file-drop-icon" />
                    <div className="file-drop-label">{label}</div>
                    <div className="file-drop-hint">Drop a PDF or click to browse</div>
                </>
            )}
        </div>
    );
}

function ScoreRing({ score }: { score: number }) {
    const color = score >= 70 ? 'var(--accent)' : score >= 45 ? 'var(--amber)' : 'var(--danger)';
    return (
        <div className="score-ring" style={{ '--score-color': color } as React.CSSProperties}>
            <svg width="96" height="96" viewBox="0 0 96 96">
                <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                <circle
                    cx="48" cy="48" r="40"
                    fill="none"
                    stroke={color}
                    strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - score / 100)}`}
                    strokeLinecap="round"
                    transform="rotate(-90 48 48)"
                    style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)' }}
                />
            </svg>
            <div className="score-ring-label" style={{ color }}>
                <span className="score-ring-value">{score}</span>
                <span className="score-ring-denom">/100</span>
            </div>
        </div>
    );
}

function VerdictPill({ verdict }: { verdict: string }) {
    const isStrong = verdict.toLowerCase().includes('strong');
    const isModerate = verdict.toLowerCase().includes('moderate');
    return (
        <span
            className={cn('verdict-pill', {
                'verdict-pill--strong': isStrong,
                'verdict-pill--moderate': isModerate,
                'verdict-pill--weak': !isStrong && !isModerate,
            })}
        >
            {isStrong ? <CheckCircle2 size={13} /> : isModerate ? <AlertCircle size={13} /> : <XCircle size={13} />}
            {verdict}
        </span>
    );
}

export function ResumeMatchPanel() {
    const [jdFile, setJdFile] = useState<File | null>(null);
    const [jdUrl, setJdUrl] = useState('');
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [githubUrl, setGithubUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<MatchResult | null>(null);

    const canCompare = (!!jdFile || jdUrl) && (!!resumeFile || githubUrl) && !loading;

    const handleCompare = async () => {
        if (!resumeFile && !githubUrl) return;
        if (!jdFile && !jdUrl) return;
        setLoading(true);
        setError('');
        setResult(null);
        try {
            const data = await compareResumeToJob(jdFile, resumeFile, jdUrl, githubUrl);
            setResult(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Comparison failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="match-panel">
            <header className="topbar">
                <div>
                    <div className="eyebrow">AI-powered evaluation</div>
                    <h1 className="page-title">Resume Match</h1>
                    <p className="page-subtitle">
                        Upload a job description and a candidate resume to get an instant AI fit analysis.
                    </p>
                </div>
                <div className="topbar-actions">
                    <div className="status-pill status-live">
                        <span className="status-dot" />
                        Agent ready
                    </div>
                </div>
            </header>

            <div className="match-upload-grid">
                <div className="match-upload-card">
                    <div className="match-upload-label">
                        <Sparkles size={14} />
                        Job Description
                    </div>
                    <FileDrop
                        inputId="jd-upload"
                        label="Job Description PDF"
                        file={jdFile}
                        onChange={(f) => {
                            setJdFile(f);
                            if (f) setJdUrl('');
                        }}
                    />
                    <div className="match-url-divider">or</div>
                    <div className="match-url-input">
                        <Globe size={16} className="match-url-icon" />
                        <input
                            type="url"
                            placeholder="Paste job description URL"
                            value={jdUrl}
                            onChange={(e) => setJdUrl(e.target.value)}
                            disabled={!!jdFile}
                            className="match-url-field"
                        />
                        {jdUrl && (
                            <button
                                className="match-url-clear"
                                onClick={() => setJdUrl('')}
                                aria-label="Clear URL"
                            >
                                <XCircle size={14} />
                            </button>
                        )}
                    </div>
                </div>
                <div className="match-upload-card">
                    <div className="match-upload-label">
                        <FileText size={14} />
                        Candidate Resume
                    </div>
                    <FileDrop
                        inputId="resume-upload"
                        label="Resume PDF"
                        file={resumeFile}
                        onChange={(f) => {
                            setResumeFile(f);
                            if (f) setGithubUrl('');
                        }}
                    />
                    <div className="match-url-divider">or</div>
                    <div className="match-url-input">
                        <GitBranch size={16} className="match-url-icon" />
                        <input
                            type="url"
                            placeholder="Paste GitHub profile URL"
                            value={githubUrl}
                            onChange={(e) => setGithubUrl(e.target.value)}
                            disabled={!!resumeFile}
                            className="match-url-field"
                        />
                        {githubUrl && (
                            <button
                                className="match-url-clear"
                                onClick={() => setGithubUrl('')}
                                aria-label="Clear URL"
                            >
                                <XCircle size={14} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="match-actions">
                <button
                    className="match-compare-btn"
                    disabled={!canCompare}
                    onClick={handleCompare}
                >
                    {loading ? (
                        <>
                            <Loader2 size={16} className="spin" />
                            Analysing…
                        </>
                    ) : (
                        <>
                            <Sparkles size={16} />
                            Compare &amp; Analyse
                        </>
                    )}
                </button>
            </div>

            {error && (
                <div className="match-error">
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            {result && (
                <div className="match-results">
                    <div className="match-score-row">
                        <ScoreRing score={result.fit_score} />
                        <div className="match-score-meta">
                            <VerdictPill verdict={result.verdict} />
                            <p className="match-recommendation">{result.recommendation}</p>
                        </div>
                    </div>

                    <div className="match-findings-grid">
                        <section className="match-findings-card match-findings-card--green">
                            <h3 className="match-findings-title">
                                <CheckCircle2 size={15} />
                                Why they're a good fit
                            </h3>
                            {result.strengths.length === 0 ? (
                                <p className="match-findings-empty">No notable strengths identified.</p>
                            ) : (
                                <ul className="match-findings-list">
                                    {result.strengths.map((s, i) => (
                                        <li key={i}>{s}</li>
                                    ))}
                                </ul>
                            )}
                        </section>

                        <section className="match-findings-card match-findings-card--amber">
                            <h3 className="match-findings-title">
                                <AlertCircle size={15} />
                                Gaps &amp; concerns
                            </h3>
                            {result.gaps.length === 0 ? (
                                <p className="match-findings-empty">No significant gaps identified.</p>
                            ) : (
                                <ul className="match-findings-list">
                                    {result.gaps.map((g, i) => (
                                        <li key={i}>{g}</li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    </div>

                    {result.relevant_repos && result.relevant_repos.length > 0 && (
                        <section className="match-repos-section">
                            <h3 className="match-repos-title">
                                <GitBranch size={18} />
                                Relevant GitHub Repositories
                            </h3>
                            <div className="match-repos-list">
                                {result.relevant_repos.map((repo, i) => (
                                    <div key={i} className="match-repo-card">
                                        <div className="match-repo-header">
                                            <h4 className="match-repo-name">{repo.name}</h4>
                                            <div className="match-repo-score">
                                                <span className="match-repo-score-value">{repo.relevance_score}%</span>
                                                <span className="match-repo-score-label">relevant</span>
                                            </div>
                                        </div>
                                        <p className="match-repo-description">{repo.description}</p>
                                        <p className="match-repo-fit">
                                            <strong>Why it's a good fit:</strong> {repo.fit_reason}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            )}
        </div>
    );
}

export default ResumeMatchPanel;
