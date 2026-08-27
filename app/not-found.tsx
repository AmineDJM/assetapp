import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-[15px] font-semibold tracking-tight text-ink">Page introuvable</h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
          Ce bien ou cette page n’existe pas, ou a été archivé.
        </p>
        <div className="mt-5 flex justify-center">
          <Button variant="primary" asChild>
            <Link href="/dashboard">Retour au dashboard</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
