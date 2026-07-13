import { useRef, useState } from 'react';
import { repoSlugFromUrl } from '../lib/utils';
import { ingestRepo, pollIngestStatus } from '../services/api';
import type { RepoStatus } from '../types';

export function useIngest(onComplete: (slug: string) => void) {
    const [status, setStatus] = useState<RepoStatus | null>(null);
    const pollRef = useRef<number | null>(null);

    const stopPoll = () => {
        if (pollRef.current) {
            window.clearInterval(pollRef.current);
            pollRef.current = null;
        }
    };

    const startIngest = async (url: string) => {
        const slug = repoSlugFromUrl(url);
        setStatus({ slug, status: 'queued' });

        try {
            await ingestRepo(url);

            pollRef.current = window.setInterval(async () => {
                try {
                    const next: RepoStatus = await pollIngestStatus(slug);
                    setStatus(next);

                    if (next.status === 'done') {
                        stopPoll();
                        onComplete(slug);
                    }

                    if (next.status === 'error') {
                        stopPoll();
                    }
                } catch (err) {
                    const msg = err instanceof Error ? err.message : 'Polling failed';
                    // 404 means the server restarted and lost in-memory job state;
                    // check ChromaDB by hitting /repos list instead of treating as error
                    if (msg.includes('404') || msg.includes('Job not found')) {
                        return; // keep polling — server may still be indexing
                    }
                    stopPoll();
                    setStatus({ slug, status: 'error', error: msg });
                }
            }, 2000);
        } catch (err) {
            setStatus({
                slug,
                status: 'error',
                error: err instanceof Error ? err.message : 'Ingest failed',
            });
        }
    };

    return {
        status,
        startIngest,
        stopPoll,
    };
}