export interface RepoStatus {
    slug: string;
    status: 'queued' | 'cloning' | 'indexing' | 'done' | 'error';
    chunks?: number;
    error?: string;
}

export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    sources?: string[];
    loading?: boolean;
}

export interface SummarySection {
    id: string;
    title: string;
    summary: string;
    highlights: string[];
}

export interface SummaryResult {
    repo: string;
    sections: SummarySection[];
}

export interface EvidenceFile {
    file: string;
    score: number;
    count: number;
}

export interface RepoStats {
    files: number;
    chunks: number;
    stack: string[];
    readiness: number;
}

export interface RelevantRepo {
    name: string;
    relevance_score: number;
    description: string;
    fit_reason: string;
}

export interface MatchResult {
    fit_score: number;
    verdict: string;
    strengths: string[];
    gaps: string[];
    recommendation: string;
    relevant_repos?: RelevantRepo[];
}

export interface Education {
    institution: string;
    degree: string;
    field: string;
    year: string;
}

export interface Project {
    name: string;
    description: string;
    technologies: string[];
    role: string;
}

export interface ResumeAnalysis {
    summary: string;
    current_title: string;
    education: Education[];
    skills: string[];
    projects: Project[];
    experience_summary: string;
    links_visited: string[];
}