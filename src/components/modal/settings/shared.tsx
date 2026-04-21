export function SettingItem({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
          {label}
        </div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          {description}
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
      style={{
        backgroundColor: checked ? 'var(--accent-color)' : 'var(--bg-tertiary)',
      }}
    >
      <span
        className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform"
        style={{
          transform: checked ? 'translateX(18px)' : 'translateX(3px)',
        }}
      />
    </button>
  );
}
