import { AlertTriangle } from 'lucide-react'
import type { DatabaseDiagnosis, EnvRequirement } from '@/lib/config'

/**
 * Écran d'installation.
 *
 * S'affiche à la place de l'application quand elle ne peut pas fonctionner :
 * variables d'environnement absentes ou base non migrée. Il dit précisément ce
 * qui manque et où le corriger — bien plus utile qu'une erreur 500.
 */

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-5 flex items-center gap-2">
          <AlertTriangle className="size-4 text-warning" aria-hidden />
          <h1 className="text-[15px] font-semibold tracking-tight text-ink">{title}</h1>
        </div>
        <div className="card space-y-4 p-5 text-[13px] leading-relaxed text-ink-soft">
          {children}
        </div>
      </div>
    </main>
  )
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-surface-muted px-1 py-0.5 font-mono text-xs text-ink">
      {children}
    </code>
  )
}

export function MissingEnvScreen({ missing }: { missing: EnvRequirement[] }) {
  const hasPublic = missing.some((item) => item.public)

  return (
    <Shell title="Configuration incomplète">
      <p className="text-muted">
        Patrimoine ne peut pas démarrer : {missing.length === 1 ? 'une variable' : 'des variables'}{' '}
        d’environnement {missing.length === 1 ? 'est manquante' : 'sont manquantes'}.
      </p>

      <ul className="space-y-3 border-t border-line pt-4">
        {missing.map((item) => (
          <li key={item.name}>
            <Code>{item.name}</Code>
            <p className="mt-1 text-muted">{item.purpose}</p>
          </li>
        ))}
      </ul>

      <div className="space-y-2 border-t border-line pt-4">
        <p className="font-medium text-ink">Sur Vercel</p>
        <p className="text-muted">
          Settings → Environment Variables, puis renseigne ces valeurs pour Production, Preview et
          Development.
        </p>
        {hasPublic ? (
          <p className="text-muted">
            Ces variables sont lues par le navigateur : elles sont figées au moment du build.
            Après les avoir ajoutées, <span className="font-medium text-ink">redéploie</span> —
            enregistrer seul ne suffit pas.
          </p>
        ) : null}
      </div>

      <div className="space-y-2 border-t border-line pt-4">
        <p className="font-medium text-ink">En local</p>
        <p className="text-muted">
          Copie <Code>.env.example</Code> vers <Code>.env.local</Code>, remplis les valeurs, puis
          relance <Code>npm run dev</Code>.
        </p>
      </div>
    </Shell>
  )
}

export function DatabaseNotReadyScreen({ diagnosis }: { diagnosis: DatabaseDiagnosis }) {
  if (diagnosis === 'unreachable') {
    return (
      <Shell title="Base de données injoignable">
        <p className="text-muted">
          Le projet Supabase n’a pas répondu. Vérifie que <Code>NEXT_PUBLIC_SUPABASE_URL</Code>{' '}
          correspond bien à l’URL affichée dans Project Settings → API, et que le projet n’est pas
          en pause.
        </p>
        <p className="text-muted">
          Un projet Supabase gratuit se met en pause après une période d’inactivité : il se
          réveille depuis le dashboard.
        </p>
      </Shell>
    )
  }

  return (
    <Shell title="Base de données non initialisée">
      <p className="text-muted">
        La connexion à Supabase fonctionne, mais les tables n’existent pas encore. Les migrations
        n’ont pas été appliquées.
      </p>

      <div className="space-y-2 border-t border-line pt-4">
        <p className="font-medium text-ink">Dans le SQL Editor de Supabase</p>
        <p className="text-muted">Exécute les fichiers du dépôt, dans cet ordre :</p>
        <ol className="space-y-1 font-mono text-xs text-ink">
          <li>supabase/migrations/0001_initial_schema.sql</li>
          <li>supabase/migrations/0002_reminders_and_push.sql</li>
          <li>supabase/migrations/0003_row_level_security.sql</li>
          <li>supabase/migrations/0004_functions.sql</li>
        </ol>
        <p className="text-muted">
          Le cinquième, <Code>0005_documents.sql</Code>, est optionnel.
        </p>
      </div>

      <div className="space-y-2 border-t border-line pt-4">
        <p className="font-medium text-ink">Ou avec la CLI</p>
        <p className="font-mono text-xs text-ink">npx supabase link --project-ref &lt;ref&gt;</p>
        <p className="font-mono text-xs text-ink">npx supabase db push</p>
      </div>
    </Shell>
  )
}
