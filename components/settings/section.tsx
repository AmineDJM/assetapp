import * as React from 'react'

/** Bloc de réglages : titre, phrase d'explication, contenu. */
export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="card p-5">
      <h2 className="text-sm font-medium text-ink">{title}</h2>
      {description ? (
        <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{description}</p>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  )
}
