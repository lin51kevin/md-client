import { Search } from 'lucide-react';
import { useI18n } from '../../i18n';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  const { t } = useI18n();

  return (
    <div className="shrink-0 px-2 py-1.5">
      <div
        className="flex items-center gap-1.5 px-2 py-1 rounded"
        style={{
          backgroundColor: 'var(--bg-primary)',
          border: '1px solid var(--border-color)',
        }}
      >
        <Search size={12} style={{ color: 'var(--text-tertiary)' }} />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('plugins.search')}
          className="w-full text-xs bg-transparent outline-none"
          style={{ color: 'var(--text-primary)' }}
        />
      </div>
    </div>
  );
}
