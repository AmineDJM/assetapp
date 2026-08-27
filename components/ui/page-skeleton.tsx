/**
 * Attente d'hydratation.
 *
 * Les données vivant dans le navigateur, le rendu serveur ne peut rien
 * afficher. Ce squelette dure une image ou deux — juste assez pour éviter un
 * clignotement entre un écran vide et l'écran réel.
 */
export function PageSkeleton() {
  return (
    <div className="animate-pulse" aria-hidden>
      <div className="mb-6">
        <div className="h-6 w-40 rounded bg-line" />
        <div className="mt-2 h-3.5 w-56 rounded bg-line" />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="card h-[4.75rem]" />
        ))}
      </div>
      <div className="card mt-6 h-72" />
      <span className="sr-only">Chargement…</span>
    </div>
  )
}
