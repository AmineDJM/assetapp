import type { Metadata } from 'next'
import { ArchivedList } from '@/components/settings/archived-list'
import { DataExport } from '@/components/settings/data-export'
import { ProfileForm } from '@/components/settings/profile-form'
import { PushSettings } from '@/components/settings/push-settings'
import { SettingsSection } from '@/components/settings/section'
import { requireSession } from '@/lib/data/session'
import { getPushDevices } from '@/lib/data/queries'
import { createClient } from '@/lib/supabase/server'
import { isEmailConfigured } from '@/lib/reminders/email'
import type { Obligation } from '@/types/domain'

export const metadata: Metadata = { title: 'Paramètres' }

/** Un seul rôle : comment fonctionne mon application ? */
export default async function SettingsPage() {
  const { user, profile } = await requireSession()
  const supabase = await createClient()

  const [devices, archivedAssets, archivedObligations] = await Promise.all([
    getPushDevices(),
    supabase.from('assets').select('*').eq('is_active', false).order('name'),
    supabase
      .from('obligations')
      .select('*, asset:assets!inner (name)')
      .eq('is_active', false)
      .order('name'),
  ])

  // Le join Supabase imbrique le bien : on l'aplatit pour l'affichage.
  type ArchivedObligationRow = Obligation & { asset: { name: string } }

  const obligations = ((archivedObligations.data ?? []) as unknown as ArchivedObligationRow[]).map(
    ({ asset, ...obligation }) => ({ ...obligation, assetName: asset.name }),
  )

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Paramètres</h1>
      </header>

      <div className="space-y-4">
        <SettingsSection title="Profil">
          <ProfileForm
            profile={profile}
            email={user.email ?? ''}
            emailConfigured={isEmailConfigured()}
          />
        </SettingsSection>

        <SettingsSection
          title="Notifications sur cet appareil"
          description="Recevoir les rappels même lorsque l’application est fermée."
        >
          <PushSettings
            vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null}
            devices={devices}
            timezone={profile.timezone}
          />
        </SettingsSection>

        <SettingsSection
          title="Exporter les données"
          description="Tes données t’appartiennent : récupère-les à tout moment."
        >
          <DataExport />
        </SettingsSection>

        <SettingsSection
          title="Éléments archivés"
          description="Les éléments archivés n’apparaissent plus dans les écrans actifs, mais leur historique reste intact."
        >
          <ArchivedList assets={archivedAssets.data ?? []} obligations={obligations} />
        </SettingsSection>
      </div>
    </div>
  )
}
