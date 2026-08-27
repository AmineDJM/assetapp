'use client'

import { useState } from 'react'
import { BellRing, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  getNotificationSupport,
  requestNotificationPermission,
  type NotificationSupport,
} from '@/lib/notifications/local'
import { useMounted } from '@/hooks/use-mounted'

/**
 * Autorisation des notifications système.
 *
 * La permission n'est jamais demandée au chargement : un navigateur sollicité
 * automatiquement bloque durablement le site.
 */
export function NotificationsSettings() {
  const mounted = useMounted()
  const [support, setSupport] = useState<NotificationSupport>('unsupported')
  const [busy, setBusy] = useState(false)

  // Lu après le montage : `Notification` n'existe pas au rendu serveur.
  const current = mounted ? (support === 'unsupported' ? getNotificationSupport() : support) : null

  async function handleEnable() {
    setBusy(true)
    try {
      const permission = await requestNotificationPermission()
      setSupport(permission === 'granted' ? 'granted' : permission === 'denied' ? 'denied' : 'supported')

      if (permission === 'granted') {
        new Notification('Patrimoine', {
          body: 'Les notifications fonctionnent correctement.',
          icon: '/icons/icon-192.png',
        })
        toast.success('Notifications autorisées')
      }
    } finally {
      setBusy(false)
    }
  }

  if (current === null) {
    return <p className="text-[13px] text-muted">Vérification de cet appareil…</p>
  }

  if (current === 'unsupported') {
    return (
      <p className="text-[13px] text-muted">
        Cet appareil ne gère pas les notifications système.
      </p>
    )
  }

  if (current === 'denied') {
    return (
      <div className="text-[13px] leading-relaxed">
        <p className="font-medium text-ink">Notifications bloquées</p>
        <p className="text-muted">
          Autorise les notifications pour ce site dans les réglages de ton navigateur pour les
          réactiver.
        </p>
      </div>
    )
  }

  if (current === 'granted') {
    return (
      <p className="flex items-center gap-1.5 text-[13px] text-ink">
        <Check className="size-4 text-success" aria-hidden />
        <span>
          <span className="font-medium">Autorisées</span>
          <span className="ml-1.5 text-muted">
            Les échéances qui arrivent s’affichent à l’ouverture de l’application.
          </span>
        </span>
      </p>
    )
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-[13px] text-muted">
        Affiche une notification de l’appareil pour les échéances qui arrivent.
      </p>
      <Button variant="primary" size="sm" onClick={handleEnable} disabled={busy}>
        <BellRing />
        {busy ? 'Autorisation…' : 'Autoriser les notifications'}
      </Button>
    </div>
  )
}
