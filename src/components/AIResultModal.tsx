/**
 * AIResultModal — displays AI processing result with apply/copy actions.
 *
 * Supports streaming display (result builds up incrementally while loading).
 */
import { useEffect, useRef, useCallback } from 'react';
import { AI_ACTION_LABELS, type AIAction } from '../lib/ai-prompts';
import { useI18n } from '../i18n';

interface AIResultModalProps {
  action: AIAction;
  originalText: string;
  result: string;
  loading: boolean;
  onApply: (replacement: string) => void;
  onCopy: () => void;
  onClose: () => void;
}

export function AIResultModal({
  action,
  originalText,
  result,
  loading,
  onApply,
  onCopy,
  onClose,
}: AIResultModalProps) {
  const { locale } = useI18n();
  const resultRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom during streaming
  useEffect(() => {
    if (loading && resultRef.current) {
      resultRef.current.scrollTop = resultRef.current.scrollHeight;
    }
  }, [result, loading]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(result).catch(() => {});
    onCopy();
  }, [result, onCopy]);

  const label = AI_ACTION_LABELS[action];
  const title = locale.startsWith('zh') ? label.zh : label.en;

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content" style={{ maxWidth: 640, width: '90vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>✨ {title}</h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 18, lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          {/* Original text */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {locale.startsWith('zh') ? '原文' : 'Original'}
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--text-secondary)',
                background: 'var(--bg-tertiary)',
                borderRadius: 6,
                padding: 10,
                maxHeight: 100,
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {originalText}
            </div>
          </div>

          {/* AI result */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {locale.startsWith('zh') ? 'AI 结果' : 'AI Result'}
            </div>
            <div
              ref={resultRef}
              style={{
                fontSize: 13,
                lineHeight: 1.6,
                background: 'var(--bg-tertiary)',
                borderRadius: 6,
                padding: 12,
                maxHeight: 240,
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {loading && !result ? (
                <span style={{ color: 'var(--text-tertiary)' }}>
                  {locale.startsWith('zh') ? 'AI 处理中...' : 'Processing...'}
                  <span className="ai-cursor-blink" style={{ display: 'inline-block', width: 2, height: 14, background: 'var(--accent)', marginLeft: 2, verticalAlign: 'text-bottom', animation: 'blink 1s infinite' }} />
                </span>
              ) : result ? (
                <>
                  {result}
                  {loading && (
                    <span className="ai-cursor-blink" style={{ display: 'inline-block', width: 2, height: 14, background: 'var(--accent)', marginLeft: 2, verticalAlign: 'text-bottom', animation: 'blink 1s infinite' }} />
                  )}
                </>
              ) : null}
            </div>
          </div>

          {/* Error */}
          {!loading && !result && null}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '12px 16px', borderTop: '1px solid var(--border-color)' }}>
          {result && (
            <>
              <button
                className="btn btn-primary"
                style={{ fontSize: 12, padding: '6px 14px' }}
                onClick={() => onApply(result)}
              >
                {locale.startsWith('zh') ? '应用替换' : 'Apply'}
              </button>
              <button
                className="btn btn-secondary"
                style={{ fontSize: 12, padding: '6px 14px' }}
                onClick={handleCopy}
              >
                {locale.startsWith('zh') ? '复制结果' : 'Copy'}
              </button>
            </>
          )}
          <button
            className="btn btn-secondary"
            style={{ fontSize: 12, padding: '6px 14px' }}
            onClick={onClose}
          >
            {locale.startsWith('zh') ? '关闭' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
