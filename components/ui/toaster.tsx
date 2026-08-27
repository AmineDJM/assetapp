'use client'

import { Toaster as SonnerToaster } from 'sonner'

/** Toasts sobres : fond blanc, bordure fine, action « Annuler » à droite. */
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      duration={7000}
      gap={8}
      toastOptions={{
        classNames: {
          toast:
            'group flex w-full items-center gap-3 rounded-xl border border-line bg-surface p-3.5 text-sm text-ink shadow-[0_1px_3px_rgba(0,0,0,0.04),0_12px_32px_-12px_rgba(0,0,0,0.12)]',
          title: 'text-[13px] font-medium text-ink',
          description: 'text-xs text-muted mt-0.5',
          actionButton:
            'ml-auto shrink-0 rounded-md border border-line-strong bg-surface px-2 py-1 text-xs font-medium text-ink transition-colors hover:bg-surface-muted',
          error: 'border-danger-line',
        },
      }}
    />
  )
}
