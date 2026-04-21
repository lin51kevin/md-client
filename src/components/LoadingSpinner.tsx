/**
 * LoadingSpinner — lightweight loading indicator for Suspense fallbacks.
 */
export function LoadingSpinner() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        minHeight: 120,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          border: '3px solid var(--border-color, #e0e0e0)',
          borderTopColor: 'var(--accent-color, #4a90d9)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
