import { createElement, useState } from 'react';
import { X, Plug, Check, Save, ExternalLink } from 'lucide-react';
import type { ProviderConfig } from './providers/types';
import type { AIConfig, ProviderUserConfig } from './config-store';
import { buildProviderConfig } from './config-store';
import { PROVIDER_PRESETS, getPreset } from './providers/provider-registry';
import { useI18n } from '../../../../i18n';

interface SettingsViewProps {
  config: AIConfig;
  onSave: (config: AIConfig) => void;
  onTestConnection: (config: ProviderConfig) => Promise<{ success: boolean; error?: string }>;
  onClose: () => void;
}

export function SettingsViewComponent({ config, onSave, onTestConnection, onClose }: SettingsViewProps) {
  const { t } = useI18n();
  const [selectedId, setSelectedId] = useState(config.activeProvider);
  const [draft, setDraft] = useState<Record<string, ProviderUserConfig>>(
    JSON.parse(JSON.stringify(config.providerConfigs)),
  );
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<boolean | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  // Use the matched preset if known; fall back to 'custom' so the form always renders
  const preset = getPreset(selectedId) ?? getPreset('custom')!;

  const getUserConfig = (id: string): ProviderUserConfig => draft[id] ?? {};

  const updateField = (field: keyof ProviderUserConfig, value: string) => {
    const prev = getUserConfig(selectedId);
    setDraft({ ...draft, [selectedId]: { ...prev, [field]: value } });
    setTestResult(null);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    setTestError(null);
    try {
      const uc = getUserConfig(selectedId);
      const pc = buildProviderConfig(selectedId, uc);
      if (!pc) {
        setTestResult(false);
        setTestError(t('aiCopilot.settings.invalidConfig'));
        return;
      }
      const result = await onTestConnection(pc);
      setTestResult(result.success);
      setTestError(result.error || null);
    } catch (error) {
      setTestResult(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setTestError(`Test connection error: ${errorMessage}`);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    onSave({
      ...config,
      activeProvider: selectedId,
      providerConfigs: draft,
    });
  };

  const handleProviderChange = (id: string) => {
    setSelectedId(id);
    setTestResult(null);
    setTestError(null);
  };

  // ── Styles ───────────────────────────────────────────────
  const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    color: 'var(--text-muted, #888)',
    marginBottom: '4px',
    display: 'block',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '4px 8px',
    fontSize: '12px',
    border: '1px solid var(--border-color, #3c3c3c)',
    borderRadius: '3px',
    background: 'var(--bg-secondary, #3c3c3c)',
    color: 'var(--text-primary, #e0e0e0)',
    marginBottom: '10px',
    boxSizing: 'border-box',
    outline: 'none',
  };

  const btnBase: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    fontSize: '12px',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: '14px',
    padding: '10px',
    border: '1px solid var(--border-color, #3c3c3c)',
    borderRadius: '4px',
  };

  const currentUserConfig = getUserConfig(selectedId);
  // Find the matching known preset (if any) for label / apiKeyUrl display
  const knownPreset = getPreset(selectedId);

  return createElement(
    'div',
    {
      style: {
        padding: '12px',
        fontSize: '13px',
        color: 'var(--text-primary, #e0e0e0)',
        overflow: 'auto',
        height: '100%',
      },
    },

    // ── Header ─────────────────────────────────────────────
    createElement(
      'div',
      {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        },
      },
      createElement('span', { style: { fontWeight: 600, fontSize: '13px' } }, t('aiCopilot.settings.title')),
      createElement(
        'button',
        {
          onClick: onClose,
          style: { ...btnBase, background: 'transparent', color: 'var(--text-muted, #888)', padding: '2px' },
        },
        createElement(X, { size: 14 }),
      ),
    ),

    // ── Provider input (replaces dropdown) ────────────────
    createElement('span', { style: labelStyle }, t('aiCopilot.settings.provider')),
    createElement(
      'div',
      { style: { position: 'relative', marginBottom: '6px' } },
      createElement('input', {
        type: 'text',
        list: 'ai-provider-list',
        value: selectedId,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => handleProviderChange(e.target.value),
        style: { ...inputStyle, marginBottom: 0 },
        placeholder: t('aiCopilot.settings.providerHint'),
      }),
      createElement(
        'datalist',
        { id: 'ai-provider-list' },
        ...PROVIDER_PRESETS.map((p) =>
          createElement('option', { key: p.id, value: p.id }, p.label),
        ),
      ),
    ),

    // Provider label + description
    createElement(
      'div',
      {
        style: {
          fontSize: '11px',
          color: 'var(--text-muted, #888)',
          marginBottom: '14px',
          lineHeight: '1.5',
        },
      },
      knownPreset
        ? `${knownPreset.label}${knownPreset.description ? ' — ' + knownPreset.description : ''}`
        : t('aiCopilot.settings.providerHint'),
    ),

    // ── Provider-specific config ───────────────────────────
    createElement(
      'div',
      { style: sectionStyle },

      // API Key (cloud providers)
      preset.type === 'cloud'
        ? createElement(
            'div',
            null,
            createElement(
              'div',
              {
                style: {
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '4px',
                },
              },
              createElement('span', { style: labelStyle }, t('aiCopilot.settings.apiKey')),
              (knownPreset ?? preset).apiKeyUrl
                ? createElement(
                    'a',
                    {
                      href: (knownPreset ?? preset).apiKeyUrl,
                      target: '_blank',
                      rel: 'noopener noreferrer',
                      style: {
                        fontSize: '11px',
                        color: 'var(--accent-color, #4a9eff)',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                      },
                    },
                    t('aiCopilot.settings.getApiKey'),
                    createElement(ExternalLink, { size: 10 }),
                  )
                : null,
            ),
            createElement('input', {
              type: 'password',
              value: currentUserConfig.apiKey ?? '',
              onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                updateField('apiKey', e.target.value),
              style: inputStyle,
              placeholder: (knownPreset ?? preset).apiKeyPlaceholder ?? 'your-api-key',
            }),
          )
        : null,

      // Base URL
      createElement('span', { style: labelStyle }, t('aiCopilot.settings.baseUrl')),
      createElement('input', {
        type: 'text',
        value: currentUserConfig.baseUrl ?? (knownPreset ?? preset).baseUrl,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
          updateField('baseUrl', e.target.value),
        style: inputStyle,
        placeholder: (knownPreset ?? preset).baseUrl || 'https://api.example.com/v1',
      }),

      // Model
      createElement('span', { style: labelStyle }, t('aiCopilot.settings.model')),
      createElement(
        'div',
        { style: { position: 'relative', marginBottom: '10px' } },
        createElement('input', {
          type: 'text',
          list: `model-list-${selectedId}`,
          value: currentUserConfig.model ?? (knownPreset ?? preset).defaultModel,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
            updateField('model', e.target.value),
          style: { ...inputStyle, marginBottom: 0 },
          placeholder: (knownPreset ?? preset).defaultModel || 'model-name',
        }),
        (knownPreset ?? preset).models.length > 0
          ? createElement(
              'datalist',
              { id: `model-list-${selectedId}` },
              ...(knownPreset ?? preset).models.map((m) =>
                createElement('option', { key: m, value: m }),
              ),
            )
          : null,
      ),

      // Test connection
      createElement(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '4px',
          },
        },
        createElement(
          'button',
          {
            onClick: handleTest,
            disabled: testing,
            style: {
              ...btnBase,
              background: 'var(--bg-tertiary, #333)',
              color: 'var(--text-primary, #e0e0e0)',
              border: '1px solid var(--border-color, #3c3c3c)',
            },
          },
          createElement(Plug, { size: 12 }),
          testing ? t('aiCopilot.settings.testing') : t('aiCopilot.settings.testConnection'),
        ),
        testResult !== null
          ? createElement(
              'span',
              {
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  fontSize: '11px',
                  color: testResult
                    ? 'var(--success-color, #4caf50)'
                    : 'var(--error-color, #f44)',
                },
              },
              testResult
                ? createElement(Check, { size: 12 })
                : createElement(X, { size: 12 }),
              testResult ? t('aiCopilot.settings.connected') : t('aiCopilot.settings.failed'),
            )
          : null,
        testError && !testResult
          ? createElement(
              'span',
              {
                style: {
                  fontSize: '10px',
                  color: 'var(--error-color, #f44)',
                  background: 'var(--bg-secondary, #3c3c3c)',
                  padding: '2px 6px',
                  borderRadius: '2px',
                  border: '1px solid var(--border-color, #555)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '200px',
                },
                title: testError,
              },
              testError
            )
          : null,
      ),
    ),

    // ── Save / Cancel ──────────────────────────────────────
    createElement(
      'div',
      {
        style: {
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '6px',
          marginTop: '16px',
        },
      },
      createElement(
        'button',
        {
          onClick: onClose,
          style: {
            ...btnBase,
            background: 'transparent',
            border: '1px solid var(--border-color, #3c3c3c)',
            color: 'var(--text-secondary, #ccc)',
          },
        },
        t('common.cancel'),
      ),
      createElement(
        'button',
        {
          onClick: handleSave,
          style: {
            ...btnBase,
            background: 'var(--accent-color, #4a9eff)',
            color: '#fff',
          },
        },
        createElement(Save, { size: 12 }),
        t('common.save'),
      ),
    ),
  );
}
