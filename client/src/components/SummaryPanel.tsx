import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { getRepoSummary } from '@/services/api';
import type { SummaryResult } from '@/types';

type Props = {
  repoSlug: string;
};

export function SummaryPanel({ repoSlug }: Props) {
  const [data, setData] = useState<SummaryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!repoSlug) return;

    setLoading(true);
    setError('');
    setData(null);

    getRepoSummary(repoSlug)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load summary'))
      .finally(() => setLoading(false));
  }, [repoSlug]);

  if (loading) {
    return (
      <div className="summary-loading-premium">
        <Loader2 size={18} className="spin" />
        <span>Generating executive summary...</span>
      </div>
    );
  }

  if (error) {
    return <div className="summary-error-premium">{error}</div>;
  }

  if (!data) return null;

  return (
    <div className="summary-stack">
      {Object.entries(data.summary).map(([question, answer]) => (
        <section key={question} className="summary-block">
          <h4>{question}</h4>
          <div className="summary-content">
            <ReactMarkdown>{answer}</ReactMarkdown>
          </div>
        </section>
      ))}
    </div>
  );
}