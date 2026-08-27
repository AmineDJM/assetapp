'use client'

import { ArchivedList } from '@/components/settings/archived-list'
import { DataManagement } from '@/components/settings/data-management'
import { NotificationsSettings } from '@/components/settings/notifications-settings'
import { ProfileForm } from '@/components/settings/profile-form'
import { SettingsSection } from '@/components/settings/section'
import { PageSkeleton } from '@/components/ui/page-skeleton'
import { useStore } from '@/lib/store/provider'
import { selectArchived } from '@/lib/store/selectors'

/** Un seul rôle : comment fonctionne mon application ? */
export default function SettingsPage() {
  const { data, hydrated } = useStore()

  if (!hydrated) return <PageSkeleton />

  const archived = selectArchived(data)

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Paramètres</h1>
      </header>

      <div className="space-y-4">
        <SettingsSection title="Profil">
          <ProfileForm profile={data.profile} />
        </SettingsSection>

        <SettingsSection
          title="Notifications"
          description="Patrimoine fonctionne sans serveur : les rappels s’affichent à l’ouverture de l’application, jamais quand elle est fermée."
        >
          <NotificationsSettings />
        </SettingsSection>

        <SettingsSection
          title="Mes données"
          description="Tout est stocké dans ce navigateur, rien n’est envoyé nulle part."
        >
          <DataManagement />
        </SettingsSection>

        <SettingsSection
          title="Éléments archivés"
          description="Les éléments archivés n’apparaissent plus dans les écrans actifs, mais leur historique reste intact."
        >
          <ArchivedList assets={archived.assets} obligations={archived.obligations} />
        </SettingsSection>
      </div>
    </div>
  )
}
