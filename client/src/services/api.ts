const BASE = '/api';

export async function ingestRepo(url: string) {
    const r = await fetch(`${BASE}/repos/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
}

export async function pollIngestStatus(slug: string) {
    const r = await fetch(`${BASE}/repos/status/${slug}`);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
}

export async function listRepos(): Promise<string[]> {
    const r = await fetch(`${BASE}/repos`);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
}

export async function deleteRepo(slug: string) {
    const r = await fetch(`${BASE}/repos/${slug}`, { method: 'DELETE' });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
}

export async function getRepoSummary(repoSlug: string) {
    const r = await fetch(`${BASE}/query/summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_slug: repoSlug, question: 'overview' }),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
}

import type { EvidenceFile, RepoStats } from '@/types';

export async function getRepoEvidence(repoSlug: string) {
    const r = await fetch(`${BASE}/query/evidence/${repoSlug}`);
    if (!r.ok) throw new Error(await r.text());
    const data = await r.json();
    return data.evidence as EvidenceFile[];
}

export async function getRepoStats(repoSlug: string): Promise<RepoStats> {
    const r = await fetch(`${BASE}/repos/${repoSlug}/stats`);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
}

export function streamQuestion(
    repoSlug: string,
    question: string,
    onToken: (t: string) => void,
    onSources: (s: string[]) => void,
    onDone: () => void,
    onError: (e: Error) => void,
): AbortController {
    const ctrl = new AbortController();
    (async () => {
        try {
            const r = await fetch(`${BASE}/query/stream`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repo_slug: repoSlug, question }),
                signal: ctrl.signal,
            });
            if (!r.ok) throw new Error(await r.text());
            const reader = r.body!.getReader();
            const decoder = new TextDecoder();
            let buf = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buf += decoder.decode(value, { stream: true });
                const lines = buf.split('\n');
                buf = lines.pop() ?? '';
                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    const payload = JSON.parse(line.slice(6));
                    if (payload.type === 'token') onToken(payload.data);
                    else if (payload.type === 'sources') onSources(payload.data);
                    else if (payload.type === 'done') onDone();
                }
            }
        } catch (e: unknown) {
            if ((e as Error).name !== 'AbortError') onError(e as Error);
        }
    })();
    return ctrl;
}

export async function compareResumeToJob(jdFile: File, resumeFile: File) {
    const form = new FormData();
    form.append('job_description', jdFile);
    form.append('resume', resumeFile);
    const r = await fetch('/api/match/compare', { method: 'POST', body: form });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
}