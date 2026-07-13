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