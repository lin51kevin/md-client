/**
 * GlobalErrorBoundary — catches uncaught rendering errors across the entire app
 * and displays a friendly recovery UI instead of a white screen.
 */
import { Component, type ReactNode, type ErrorInfo } from 'react';
import { getT } from '../i18n';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[GlobalErrorBoundary] Uncaught error:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const t = getT();

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          padding: '2rem',
          backgroundColor: 'var(--bg-primary, #f9fafb)',
          color: 'var(--text-primary, #1f2937)',
          fontFamily: 'Segoe UI, system-ui, sans-serif',
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          {t('errorBoundary.title')}
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary, #6b7280)', marginBottom: '1.5rem', textAlign: 'center', maxWidth: '400px' }}>
          {t('errorBoundary.message')}
        </p>
        {this.state.error && (
          <pre
            style={{
              fontSize: '0.75rem',
              padding: '0.75rem 1rem',
              borderRadius: '0.375rem',
              backgroundColor: 'var(--bg-secondary, #f3f4f6)',
              border: '1px solid var(--border-color, #e5e7eb)',
              maxWidth: '500px',
              overflow: 'auto',
              marginBottom: '1.5rem',
              color: 'var(--text-secondary, #6b7280)',
            }}
          >
            {this.state.error.message}
          </pre>
        )}
        <button
          onClick={this.handleReload}
          style={{
            padding: '0.5rem 1.25rem',
            fontSize: '0.875rem',
            fontWeight: 500,
            borderRadius: '0.375rem',
            border: 'none',
            backgroundColor: 'var(--accent-color, #3b82f6)',
            color: '#ffffff',
            cursor: 'pointer',
          }}
        >
          {t('errorBoundary.reload')}
        </button>
      </div>
    );
  }
}
