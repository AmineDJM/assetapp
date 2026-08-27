'use client'

import { useState, useTransition } from 'react'
import { BellRing, Check, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { deletePushDevice, sendTestPush } from '@/actions/push'
import { Button } from '@/components/ui/button'
import { formatTimestamp } from '@/lib/dates'
import { usePushNotifications } from '@/hooks/use-push-notifications'
import type { PushDevice } from '@/lib/data/queries'

/**
 * Notifications système de cet appareil.
 *
 * Un utilisateur peut abonner autant d'appareils qu'il veut : chacun s'active
 * séparément, depuis l'appareil concerné.
 */
export function PushSettings({
  vapidPublicKey,
  devices,
  timezone,
}: {
  vapidPublicKey: string | null
  devices: PushDevice[]
  timezone: string
}) {
  const { state, busy, error, enable, disable } = usePushNotifications(vapidPublicKey)
  const [testing, startTest] = useTransition()
  const [removing, startRemove] = useTransition()
  const [removingId, setRemovingId] = useState<string | null>(null)

  function handleTest() {
    startTest(async () => {
      const result = await sendTestPush()
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Notification test envoyée', {
        description: `${result.data.sent} appareil${result.data.sent > 1 ? 's' : ''} notifié${result.data.sent > 1 ? 's' : ''}.`,
      })
    })
  }

  function handleRemove(device: PushDevice) {
    setRemovingId(device.id)
    startRemove(async () => {
      const result = await deletePushDevice(device.id)
      if (!result.ok) toast.error(result.error)
      else toast.success('Appareil retiré')
      setRemovingId(null)
    })
  }

  return (
    <div className="space-y-5">
      <div>
        {state === 'loading' ? (
          <p className="text-[13px] text-muted">Vérification de cet appareil…</p>
        ) : null}

        {state === 'unsupported' ? (
          <p className="text-[13px] text-muted">
            Les notifications push ne sont pas disponibles sur cet appareil.
          </p>
        ) : null}

        {state === 'not-configured' ? (
          <p className="text-[13px] text-muted">
            Les clés VAPID ne sont pas configurées sur le serveur. Génère-les avec{' '}
            <code className="rounded bg-surface-muted px-1 py-0.5 text-xs">
              npm run generate:vapid
            </code>{' '}
            puis renseigne-les dans les variables d’environnement.
          </p>
        ) : null}

        {state === 'needs-install' ? (
          <div className="text-[13px] leading-relaxed text-muted">
            <p className="font-medium text-ink">Pour recevoir les notifications sur iPhone</p>
            <ol className="mt-1.5 list-decimal space-y-0.5 pl-4">
              <li>Ajoute Patrimoine à ton écran d’accueil</li>
              <li>Ouvre l’application depuis l’écran d’accueil</li>
              <li>Active les notifications</li>
            </ol>
          </div>
        ) : null}

        {state === 'denied' ? (
          <div className="text-[13px] leading-relaxed">
            <p className="font-medium text-ink">Notifications bloquées</p>
            <p className="text-muted">
              Autorise les notifications dans les réglages de ton navigateur ou de ton appareil
              pour les réactiver.
            </p>
          </div>
        ) : null}

        {state === 'inactive' ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] text-muted">
              Recevoir les rappels même lorsque l’application est fermée.
            </p>
            <Button variant="primary" size="sm" onClick={() => void enable()} disabled={busy}>
              <BellRing />
              {busy ? 'Activation…' : 'Activer les notifications'}
            </Button>
          </div>
        ) : null}

        {state === 'active' ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-1.5 text-[13px] text-ink">
              <Check className="size-4 text-success" aria-hidden />
              <span>
                <span className="font-medium">Activées</span>
                <span className="ml-1.5 text-muted">
                  Cet appareil recevra les rappels d’échéance.
                </span>
              </span>
            </p>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleTest} disabled={testing}>
                {testing ? 'Envoi…' : 'Envoyer une notification test'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => void disable()} disabled={busy}>
                {busy ? 'Désactivation…' : 'Désactiver'}
              </Button>
            </div>
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="mt-2 text-[13px] text-danger">
            {error}
          </p>
        ) : null}
      </div>

      {devices.length > 0 ? (
        <div>
          <h3 className="text-xs font-medium text-muted">Appareils abonnés</h3>
          <ul className="mt-2 divide-y divide-line border-t border-line">
            {devices.map((device) => (
              <li key={device.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[13px] text-ink">
                    {device.device_name ?? 'Cet appareil'}
                  </p>
                  <p className="truncate text-xs text-subtle">
                    Ajouté le {formatTimestamp(device.created_at, timezone)}
                    {device.last_used_at
                      ? ` · dernier envoi ${formatTimestamp(device.last_used_at, timezone)}`
                      : ''}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Retirer ${device.device_name ?? 'cet appareil'}`}
                  onClick={() => handleRemove(device)}
                  disabled={removing && removingId === device.id}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
