import { cn } from '@/lib/utils';
import { analyzeResume } from '@/services/api';
import type { ResumeAnalysis } from '@/types';
import {
    AlertCircle,
    BookOpen,
    Briefcase,
    ExternalLink,
    GraduationCap,
    Loader2,
    Sparkles,
    Tag,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';

interface FileDropProps {
    file: File | null;
    onChange: (f: File | null) => void;
}

function FileDrop({ file, onChange }: FileDropProps) {
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
            onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.pdf,application/pdf';
                input.onchange = (e) => {
                    const target = e.target as HTMLInputElement;
                    if (target.files?.[0]) onChange(target.files[0]);
                };
                input.click();
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.pdf,application/pdf';
                    input.onchange = (ev) => {
                        const target = ev.target as HTMLInputElement;
                        if (target.files?.[0]) onChange(target.files[0]);
                    };
                    input.click();
                }
            }}
        >
            {file ? (
                <>
                    <Briefcase size={22} className="file-drop-icon file-drop-icon--filled" />
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
                    <Briefcase size={22} className="file-drop-icon" />
                    <div className="file-drop-label">Resume PDF</div>
                    <div className="file-drop-hint">Drop a PDF or click to browse</div>
                </>
            )}
        </div>
    );
}

export function ResumeAnalysisPanel() {
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [visitLinks, setVisitLinks] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);

    const canAnalyze = !!resumeFile && !loading;

    const handleAnalyze = async () => {
        if (!resumeFile) return;
        setLoading(true);
        setError('');
        setAnalysis(null);
        try {
            const data = await analyzeResume(resumeFile, visitLinks);
            setAnalysis(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Analysis failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="match-panel">
            <header className="topbar">
                <div>
                    <div className="eyebrow">AI-powered resume analysis</div>
                    <h1 className="page-title">Resume Analyzer</h1>
                    <p className="page-subtitle">
                        Upload a candidate resume to get detailed insights about their skills, experience, and projects.
                    </p>
                </div>
                <div className="topbar-actions">
                    <div className="status-pill status-live">
                        <span className="status-dot" />
                        Agent ready
                    </div>
                </div>
            </header>

            <div className="match-upload-card">
                <div className="match-upload-label">
                    <Sparkles size={14} />
                    Candidate Resume
                </div>
                <FileDrop file={resumeFile} onChange={setResumeFile} />
                
                <div className="match-url-input" style={{ marginTop: 'var(--space-3)' }}>
                    <label className="match-url-checkbox">
                        <input
                            type="checkbox"
                            checked={visitLinks}
                            onChange={(e) => setVisitLinks(e.target.checked)}
                            disabled={loading}
                        />
                        <span>Visit links found in resume for additional context</span>
                    </label>
                </div>
            </div>

            <div className="match-actions">
                <button
                    className="match-compare-btn"
                    disabled={!canAnalyze}
                    onClick={handleAnalyze}
                >
                    {loading ? (
                        <>
                            <Loader2 size={16} className="spin" />
                            Analyzing…
                        </>
                    ) : (
                        <>
                            <Sparkles size={16} />
                            Analyze Resume
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

            {analysis && (
                <div className="resume-analysis-results">
                    <section className="resume-analysis-section">
                        <h3 className="resume-analysis-title">
                            <BookOpen size={18} />
                            Summary
                        </h3>
                        <p className="resume-analysis-text">{analysis.summary}</p>
                    </section>

                    <section className="resume-analysis-section">
                        <h3 className="resume-analysis-title">
                            <Briefcase size={18} />
                            Current Title
                        </h3>
                        <p className="resume-analysis-text">{analysis.current_title}</p>
                    </section>

                    <section className="resume-analysis-section">
                        <h3 className="resume-analysis-title">
                            <GraduationCap size={18} />
                            Education
                        </h3>
                        {analysis.education.length === 0 ? (
                            <p className="resume-analysis-empty">No education information found.</p>
                        ) : (
                            <div className="resume-analysis-list">
                                {analysis.education.map((edu, i) => (
                                    <div key={i} className="resume-analysis-item">
                                        <div className="resume-analysis-item-header">
                                            <strong>{edu.institution}</strong>
                                            <span className="resume-analysis-item-year">{edu.year}</span>
                                        </div>
                                        <div>{edu.degree} in {edu.field}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="resume-analysis-section">
                        <h3 className="resume-analysis-title">
                            <Tag size={18} />
                            Skills
                        </h3>
                        {analysis.skills.length === 0 ? (
                            <p className="resume-analysis-empty">No skills identified.</p>
                        ) : (
                            <div className="resume-analysis-tags">
                                {analysis.skills.map((skill, i) => (
                                    <span key={i} className="resume-analysis-tag">{skill}</span>
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="resume-analysis-section">
                        <h3 className="resume-analysis-title">
                            <Sparkles size={18} />
                            Projects
                        </h3>
                        {analysis.projects.length === 0 ? (
                            <p className="resume-analysis-empty">No projects identified.</p>
                        ) : (
                            <div className="resume-analysis-list">
                                {analysis.projects.map((project, i) => (
                                    <div key={i} className="resume-analysis-item resume-analysis-item--project">
                                        <div className="resume-analysis-item-header">
                                            <strong>{project.name}</strong>
                                            <span className="resume-analysis-item-role">{project.role}</span>
                                        </div>
                                        <p className="resume-analysis-item-description">{project.description}</p>
                                        {project.technologies.length > 0 && (
                                            <div className="resume-analysis-item-tech">
                                                {project.technologies.map((tech, j) => (
                                                    <span key={j} className="resume-analysis-tag resume-analysis-tag--small">{tech}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="resume-analysis-section">
                        <h3 className="resume-analysis-title">
                            <Briefcase size={18} />
                            Experience Summary
                        </h3>
                        <p className="resume-analysis-text">{analysis.experience_summary}</p>
                    </section>

                    {analysis.links_visited.length > 0 && (
                        <section className="resume-analysis-section">
                            <h3 className="resume-analysis-title">
                                <ExternalLink size={18} />
                                Links Visited
                            </h3>
                            <div className="resume-analysis-links">
                                {analysis.links_visited.map((link, i) => (
                                    <a
                                        key={i}
                                        href={link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="resume-analysis-link"
                                    >
                                        {link}
                                        <ExternalLink size={12} />
                                    </a>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            )}
        </div>
    );
}

export default ResumeAnalysisPanel;
