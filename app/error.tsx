'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

/**
 * Filet de sécurité pour toute erreur serveur non prévue.
 *
 * En production, Next.js remplace le message par un identifiant : c'est
 * volontaire, un détail interne ne doit pas fuiter vers le navigateur. Le
 * `digest` permet de retrouver la trace complète dans les logs Vercel.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[app] Erreur non gérée :', error)
  }, [error])

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-[15px] font-semibold tracking-tight text-ink">
          Quelque chose s’est mal passé
        </h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
          L’écran n’a pas pu se charger. Réessaie — si le problème persiste, les journaux du
          déploiement contiennent le détail.
        </p>
        {error.digest ? (
          <p className="mt-3 font-mono text-xs text-subtle">Référence : {error.digest}</p>
        ) : null}
        <div className="mt-5 flex justify-center gap-2">
          <Button variant="primary" onClick={reset}>
            Réessayer
          </Button>
          <Button asChild>
            <a href="/dashboard">Retour au dashboard</a>
          </Button>
        </div>
      </div>
    </main>
  )
}
