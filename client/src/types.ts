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

export interface SummaryResult {
    repo: string;
    summary: Record<string, string>;
}