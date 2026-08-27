'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { signIn, signUp } from '@/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/field'

type Mode = 'sign-in' | 'sign-up'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<Mode>('sign-in')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const formData = new FormData(event.currentTarget)
    const credentials = {
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
    }

    startTransition(async () => {
      const result =
        mode === 'sign-in' ? await signIn(credentials) : await signUp(credentials)

      if (!result.ok) {
        setError(result.error)
        return
      }

      if (mode === 'sign-up' && result.data?.needsConfirmation) {
        toast.success('Compte créé', {
          description: 'Confirme ton adresse email pour te connecter.',
        })
        setMode('sign-in')
        return
      }

      const next = searchParams.get('next')
      router.replace(next && next.startsWith('/') ? next : '/dashboard')
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <Field id="email" label="Email">
        <Input
          name="email"
          type="email"
          autoComplete="email"
          required
          autoFocus
          placeholder="prenom@exemple.com"
        />
      </Field>

      <Field id="password" label="Mot de passe">
        <Input
          name="password"
          type="password"
          autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
          required
          minLength={8}
        />
      </Field>

      {error ? (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      ) : null}

      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={pending}>
        {pending
          ? 'Un instant…'
          : mode === 'sign-in'
            ? 'Se connecter'
            : 'Créer le compte'}
      </Button>

      <button
        type="button"
        onClick={() => {
          setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')
          setError(null)
        }}
        className="w-full text-center text-[13px] text-muted transition-colors hover:text-ink"
      >
        {mode === 'sign-in' ? 'Créer un compte' : 'J’ai déjà un compte'}
      </button>
    </form>
  )
}
