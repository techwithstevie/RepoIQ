import { useEffect, useState } from 'react';
import { Database, RefreshCw, Trash2 } from 'lucide-react';
import { deleteRepo, listRepos } from '@/services/api';
import { cn, displaySlug } from '@/lib/utils';

type Props = {
  selected: string | null;
  onSelect: (slug: string) => void;
  refreshTrigger: number;
};

function RepoSelector({ selected, onSelect, refreshTrigger }: Props) {
  const [repos, setRepos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const loadRepos = async () => {
    setLoading(true);
    try {
      setRepos(await listRepos());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRepos();
  }, [refreshTrigger]);

  const handleDelete = async (slug: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteRepo(slug);
    setRepos((prev) => prev.filter((r) => r !== slug));
  };

  if (!repos.length && !loading) {
    return (
      <div className="repo-empty">
        <Database size={22} />
        <p>No repos indexed yet</p>
      </div>
    );
  }

  return (
    <section className="repo-list">
      <div className="repo-list-header">
        <span>Indexed repos</span>
        <button className="icon-btn" onClick={loadRepos} aria-label="Refresh repos">
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {repos.map((slug) => (
        <div
          key={slug}
          className={cn('repo-item', { selected: selected === slug })}
          onClick={() => onSelect(slug)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onSelect(slug)}
        >
          <Database size={14} />
          <span className="repo-name">{displaySlug(slug)}</span>
          <button
            className="icon-btn delete-btn"
            onClick={(e) => handleDelete(slug, e)}
            aria-label={`Delete ${slug}`}
          >
            <Trash2 size={13} />
          </button>
        </div>
      ))}
    </section>
  );
}

export default RepoSelector;