import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/shell/login-form'
import { getSessionContext } from '@/lib/data/session'

export const metadata: Metadata = { title: 'Connexion' }

export default async function LoginPage() {
  const session = await getSessionContext()
  if (session) redirect('/dashboard')

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-12">
      <div className="w-full max-w-[19rem]">
        <h1 className="text-[15px] font-semibold tracking-tight text-ink">Patrimoine</h1>
        <p className="mt-1 text-[13px] text-muted">
          Biens, véhicules et échéances.
        </p>
        <div className="mt-7">
          <LoginForm />
        </div>
      </div>
    </main>
  )
}
