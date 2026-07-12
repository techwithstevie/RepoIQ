import { useRef, useState } from 'react';
import type { RepoStatus } from '../types';
import { ingestRepo, pollIngestStatus } from '../services/api';
import { repoSlugFromUrl } from '../lib/utils';

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
                    stopPoll();
                    setStatus({
                        slug,
                        status: 'error',
                        error: err instanceof Error ? err.message : 'Polling failed',
                    });
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