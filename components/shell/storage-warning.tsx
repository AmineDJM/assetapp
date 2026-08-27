'use client'

import { AlertTriangle } from 'lucide-react'
import { useStore } from '@/lib/store/provider'

/**
 * Les données ne vivent que dans ce navigateur. Si le stockage est
 * indisponible — navigation privée, quota atteint, cookies bloqués — rien ne
 * sera conservé : mieux vaut le dire clairement que perdre une saisie.
 */
export function StorageWarning() {
  const { storageAvailable, hydrated } = useStore()
  if (!hydrated || storageAvailable) return null

  return (
    <div
      role="alert"
      className="mb-5 flex items-start gap-2.5 rounded-lg border border-warning-line bg-warning-soft px-3.5 py-3"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
      <p className="text-[13px] leading-relaxed text-ink">
        <span className="font-medium">Le stockage local n’est pas disponible.</span> Tes saisies
        ne seront pas conservées à la fermeture de l’onglet. Cela arrive en navigation privée ou
        si le stockage du site est bloqué.
      </p>
    </div>
  )
}
