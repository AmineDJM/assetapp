'use client'

/**
 * Dernier recours : une erreur survenue dans le layout racine, avant même que
 * les styles ne soient appliqués. Tout est donc en ligne.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          background: '#fafafa',
          color: '#18181b',
          fontFamily:
            'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div style={{ maxWidth: '24rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>
            Patrimoine n’a pas pu démarrer
          </h1>
          <p style={{ fontSize: '13px', color: '#63636b', lineHeight: 1.6, marginTop: '0.375rem' }}>
            Une erreur est survenue au chargement de l’application.
          </p>
          {error.digest ? (
            <p style={{ fontSize: '12px', color: '#6f6f78', fontFamily: 'ui-monospace, monospace' }}>
              Référence : {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: '1.25rem',
              padding: '0.5rem 1rem',
              fontSize: '13px',
              fontWeight: 500,
              color: '#ffffff',
              background: '#18181b',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
            }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  )
}
