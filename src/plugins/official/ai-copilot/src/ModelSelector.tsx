import { createElement, useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import { PROVIDER_PRESETS, getModelLabel } from './providers/provider-registry';
import type { AIConfig } from './config-store';
import { useI18n } from '../../../../i18n';

interface ModelSelectorProps {
  config: AIConfig;
  activeProvider: string;
  onSelect: (provider: string) => void;
}

export function ModelSelectorView({ config, activeProvider, onSelect }: ModelSelectorProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activePreset = PROVIDER_PRESETS.find((p) => p.id === activeProvider);
  const activeUc = activePreset ? config.providerConfigs[activePreset.id] : undefined;
  const activeModel = activeUc?.model || activePreset?.defaultModel;
  const activeModelLabel = activePreset && activeModel
    ? getModelLabel(activeProvider, activeModel)
    : activeModel;
  const label = activePreset
    ? `${activePreset.label}${activeModelLabel ? ` (${activeModelLabel})` : ''}`
    : activeProvider;

  // Close on outside click
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open, handleClickOutside]);

  return createElement(
    'div',
    {
      ref: containerRef,
      style: { position: 'relative', display: 'inline-block' },
    },
    // Trigger button
    createElement(
      'button',
      {
        onClick: () => setOpen(!open),
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '3px',
          padding: '2px 4px',
          fontSize: '11px',
          border: 'none',
          borderRadius: '3px',
          background: 'transparent',
          color: 'var(--text-secondary, #aaa)',
          cursor: 'pointer',
          maxWidth: '180px',
          outline: 'none',
          whiteSpace: 'nowrap' as const,
        },
      },
      createElement('span', {
        style: {
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        },
      }, label),
      createElement(ChevronDown, { size: 12 }),
    ),
    // Dropdown menu (opens upward since it's at the bottom)
    open
      ? createElement(
          'div',
          {
            style: {
              position: 'absolute',
              bottom: '100%',
              left: 0,
              marginBottom: '4px',
              minWidth: '180px',
              maxWidth: '240px',
              background: 'var(--bg-tertiary, #2d2d2d)',
              border: '1px solid var(--border-color, #444)',
              borderRadius: '4px',
              boxShadow: '0 -2px 8px rgba(0,0,0,0.4)',
              zIndex: 1000,
              overflow: 'hidden',
            },
          },
          ...(() => {
            const verified = PROVIDER_PRESETS.filter(
              (p) => config.providerConfigs[p.id]?.verified === true,
            );
            if (verified.length === 0) {
              return [createElement('div', {
                key: '__empty',
                style: {
                  padding: '8px 10px',
                  fontSize: '11px',
                  color: 'var(--text-muted, #888)',
                  textAlign: 'center' as const,
                },
              }, t('aiCopilot.modelSelector.noVerifiedProviders'))];
            }
            return verified.map((p) => {
              const uc = config.providerConfigs[p.id];
              const m = uc?.model || p.defaultModel;
              const isActive = p.id === activeProvider;
              return createElement(
                'div',
                {
                  key: p.id,
                  onClick: () => {
                    onSelect(p.id);
                    setOpen(false);
                  },
                  style: {
                    padding: '6px 10px',
                    fontSize: '12px',
                    color: isActive
                      ? 'var(--accent-color, #4a9eff)'
                      : 'var(--text-primary, #e0e0e0)',
                    background: isActive
                      ? 'var(--bg-hover, rgba(255,255,255,0.06))'
                      : 'transparent',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap' as const,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  },
                  onMouseEnter: (e: React.MouseEvent<HTMLDivElement>) => {
                    (e.currentTarget as HTMLDivElement).style.background =
                      'var(--bg-hover, rgba(255,255,255,0.08))';
                  },
                  onMouseLeave: (e: React.MouseEvent<HTMLDivElement>) => {
                    (e.currentTarget as HTMLDivElement).style.background = isActive
                      ? 'var(--bg-hover, rgba(255,255,255,0.06))'
                      : 'transparent';
                  },
                },
                `${p.label}${m ? ` (${getModelLabel(p.id, m)})` : ''}`,
              );
            });
          })(),
        )
      : null,
  );
}
