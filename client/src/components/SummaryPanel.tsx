import type { SummaryResult } from '@/types';
import { CheckCircle2, Loader2 } from 'lucide-react';

type Props = {
  repoSlug: string;
  data: SummaryResult | null;
  loading: boolean;
  error: string;
};

function SummaryPanel({ data, loading, error }: Props) {

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

  if (!data || data.sections.length === 0) {
    return <div className="summary-empty">No summary available.</div>;
  }

  return (
    <div className="summary-stack">
      {data.sections.map((section) => (
        <section key={section.id} className="summary-block">
          <h4>{section.title}</h4>
          <p className="summary-text">{section.summary}</p>
          {section.highlights.length > 0 && (
            <ul className="summary-highlights">
              {section.highlights.map((point, i) => (
                <li key={i}>
                  <CheckCircle2 size={14} />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

export default SummaryPanel;