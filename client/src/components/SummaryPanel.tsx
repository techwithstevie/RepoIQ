import { useEffect, useState } from 'react';
import { BookOpen, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { getRepoSummary } from '@/services/api';
import type { SummaryResult } from '@/types';
import { displaySlug } from '@/lib/utils';

type Props = {
  repoSlug: string;
};

function SummaryPanel({ repoSlug }: Props) {
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
      <div className="summary-loading">
        <Loader2 size={24} className="spin" />
        <p>Generating recruiter summary…</p>
      </div>
    );
  }

  if (error) {
    return <div className="summary-error">{error}</div>;
  }

  if (!data) return null;

  return (
    <section className="summary-panel">
      <div className="summary-header">
        <BookOpen size={18} />
        <span>
          Recruiter overview — <strong>{displaySlug(repoSlug)}</strong>
        </span>
      </div>

      {Object.entries(data.summary).map(([question, answer]) => (
        <div key={question} className="summary-section">
          <h4 className="summary-q">{question}</h4>
          <div className="summary-a">
            <ReactMarkdown>{answer}</ReactMarkdown>
          </div>
        </div>
      ))}
    </section>
  );
}

export default SummaryPanel;