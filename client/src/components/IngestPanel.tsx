import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { type FormEvent, type SVGProps, useState } from 'react';
import { useIngest } from '../hooks/useIngest';
import { cn, displaySlug } from '../lib/utils';

type Props = {
  onRepoReady: (slug: string) => void;
};

function GitHubIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.302 3.438 9.8 8.205 11.387.6.113.82-.26.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 17.07 3.633 16.7 3.633 16.7c-1.087-.743.083-.728.083-.728 1.205.084 1.84 1.238 1.84 1.238 1.07 1.835 2.807 1.305 3.492.997.108-.776.42-1.305.763-1.605-2.665-.3-5.467-1.332-5.467-5.93 0-1.31.468-2.38 1.235-3.22-.123-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.289-1.552 3.295-1.23 3.295-1.23.653 1.653.241 2.873.118 3.176.77.84 1.233 1.91 1.233 3.22 0 4.61-2.807 5.625-5.48 5.92.431.372.815 1.103.815 2.222 0 1.606-.015 2.898-.015 3.293 0 .32.216.694.825.576C20.565 21.796 24 17.298 24 12c0-6.628-5.372-12-12-12z" />
    </svg>
  );
}

const STEPS = ['queued', 'cloning', 'indexing', 'done'] as const;

function IngestPanel({ onRepoReady }: Props) {
  const [url, setUrl] = useState('');
  const { status, startIngest } = useIngest(onRepoReady);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    startIngest(trimmed);
  };

  const stepIndex = status ? STEPS.indexOf(status.status as (typeof STEPS)[number]) : -1;
  const isWorking = status?.status === 'cloning' || status?.status === 'indexing';

  return (
    <section className="ingest-panel">
      <div className="ingest-header">
        <GitHubIcon width={18} height={18} />
        <span>Analyze a GitHub repository</span>
      </div>

      <form className="ingest-form" onSubmit={handleSubmit}>
        <input
          className="url-input"
          type="url"
          placeholder="https://github.com/username/repo"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={isWorking}
        />
        <button className="btn-primary" type="submit" disabled={!url || isWorking}>
          {isWorking ? (
            <>
              <Loader2 size={16} className="spin" />
              Indexing…
            </>
          ) : (
            'Ingest repo'
          )}
        </button>
      </form>

      {status && (
        <div className="ingest-progress">
          <div className="progress-steps">
            {STEPS.slice(0, 3).map((step, i) => (
              <div
                key={step}
                className={cn('progress-step', {
                  active: i === stepIndex,
                  done: i < stepIndex || status.status === 'done',
                  error: status.status === 'error',
                })}
              >
                {i < stepIndex || status.status === 'done' ? (
                  <CheckCircle2 size={14} />
                ) : i === stepIndex ? (
                  <Loader2 size={14} className="spin" />
                ) : (
                  <span className="step-dot" />
                )}
                <span>{step}</span>
              </div>
            ))}
          </div>

          {status.status === 'done' && (
            <div className="ingest-success">
              <CheckCircle2 size={16} />
              <span>
                <strong>{displaySlug(status.slug)}</strong> indexed with{' '}
                {status.chunks?.toLocaleString() ?? 0} chunks
              </span>
            </div>
          )}

          {status.status === 'error' && (
            <div className="ingest-error">
              <AlertCircle size={16} />
              <span>{status.error || 'Ingestion failed'}</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default IngestPanel;