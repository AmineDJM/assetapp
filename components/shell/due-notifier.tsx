'use client'

import { useEffect, useRef } from 'react'
import { buildDueNotices, showDueNotices } from '@/lib/notifications/local'
import { useStore } from '@/lib/store/provider'
import { selectDueObligations } from '@/lib/store/selectors'

/**
 * Notifications système à l'ouverture.
 *
 * Sans serveur, c'est le moment où l'application est ouverte qui déclenche les
 * rappels. Une échéance ne notifie qu'une fois par seuil franchi, et la
 * notification reste dans le centre de notifications de l'appareil.
 */
export function DueNotifier() {
  const { data, today, hydrated } = useStore()
  const lastRun = useRef<string | null>(null)

  useEffect(() => {
    if (!hydrated || !data.profile.notifications_enabled) return
    // Une seule passe par jour et par chargement.
    if (lastRun.current === today) return
    lastRun.current = today

    const rows = selectDueObligations(data, today)
    const notices = buildDueNotices(rows, today)
    if (notices.length === 0) return

    void showDueNotices(notices).catch(() => {
      // Permission révoquée entre-temps : sans conséquence.
    })
  }, [data, today, hydrated])

  return null
}
