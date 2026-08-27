import * as React from 'react'
import { cn } from '@/lib/utils/cn'

const fieldClasses =
  'w-full rounded-lg border border-line-strong bg-surface px-3 text-sm text-ink transition-colors placeholder:text-subtle hover:border-subtle focus:border-ink focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-danger'

export function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return <input type={type ?? 'text'} className={cn(fieldClasses, 'h-9', className)} {...props} />
}

export function Textarea({ className, rows, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      rows={rows ?? 3}
      className={cn(fieldClasses, 'resize-y py-2 leading-relaxed', className)}
      {...props}
    />
  )
}

export { fieldClasses }
