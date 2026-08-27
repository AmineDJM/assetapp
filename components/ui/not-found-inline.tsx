import Link from 'next/link'
import { Button } from '@/components/ui/button'

/** Écran « introuvable » à l'intérieur de la coque applicative. */
export function NotFoundInline({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="card px-6 py-14 text-center">
      <p className="text-sm font-medium text-ink">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-[13px] leading-relaxed text-muted">
        {description}
      </p>
      <div className="mt-5 flex justify-center">
        <Button variant="primary" asChild>
          <Link href="/assets">Voir mes biens</Link>
        </Button>
      </div>
    </div>
  )
}
