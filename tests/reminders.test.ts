import { describe, expect, it } from 'vitest'
import {
  DEFAULT_REMINDER_DAYS,
  formatReminderThreshold,
  getReminderCandidate,
  normalizeReminderDays,
  OVERDUE_REMINDER_MARKER,
  reminderKey,
  shouldSendReminder,
} from '@/lib/reminders/rules'

const TODAY = '2026-08-27'
const DEFAULTS = [...DEFAULT_REMINDER_DAYS]

const ELECTRICITE = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'
const DECLARATION = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb'

function obligation(
  id: string,
  next_due_date: string,
  reminder_days_before: number[] = DEFAULTS,
) {
  return { id, next_due_date, reminder_days_before }
}

describe('getReminderCandidate', () => {
  it('déclenche à J-7', () => {
    expect(getReminderCandidate(obligation(ELECTRICITE, '2026-09-03'), TODAY)).toEqual({
      obligationId: ELECTRICITE,
      dueDate: '2026-09-03',
      daysBefore: 7,
      daysRemaining: 7,
    })
  })

  it('déclenche à J-30', () => {
    expect(
      getReminderCandidate(obligation(ELECTRICITE, '2026-09-26'), TODAY)?.daysBefore,
    ).toBe(30)
  })

  it('déclenche le jour J', () => {
    expect(getReminderCandidate(obligation(ELECTRICITE, TODAY), TODAY)).toEqual({
      obligationId: ELECTRICITE,
      dueDate: TODAY,
      daysBefore: 0,
      daysRemaining: 0,
    })
  })

  it('ne déclenche pas un jour non configuré', () => {
    // J-8 n’est pas dans [30, 7, 1, 0].
    expect(getReminderCandidate(obligation(ELECTRICITE, '2026-09-04'), TODAY)).toBeNull()
  })

  it('respecte une configuration personnalisée', () => {
    expect(
      getReminderCandidate(obligation(ELECTRICITE, '2026-09-04', [60, 8]), TODAY)?.daysBefore,
    ).toBe(8)
  })

  it('ne déclenche jamais sans seuil configuré, sauf retard', () => {
    expect(getReminderCandidate(obligation(ELECTRICITE, '2026-09-03', []), TODAY)).toBeNull()
    expect(
      getReminderCandidate(obligation(ELECTRICITE, '2026-08-20', []), TODAY)?.daysBefore,
    ).toBe(OVERDUE_REMINDER_MARKER)
  })

  it('utilise la sentinelle de retard, quelle que soit l’ancienneté', () => {
    for (const dueDate of ['2026-08-26', '2026-08-20', '2025-01-01']) {
      const candidate = getReminderCandidate(obligation(ELECTRICITE, dueDate), TODAY)
      expect(candidate?.daysBefore).toBe(OVERDUE_REMINDER_MARKER)
      expect(candidate?.dueDate).toBe(dueDate)
    }
  })
})

describe('shouldSendReminder — anti-doublon', () => {
  const candidate = getReminderCandidate(obligation(ELECTRICITE, '2026-09-03'), TODAY)!

  it('envoie un rappel jamais journalisé', () => {
    expect(shouldSendReminder(candidate, 'push', new Set())).toBe(true)
  })

  it('bloque un rappel déjà envoyé sur le même canal', () => {
    const sent = new Set([reminderKey(ELECTRICITE, '2026-09-03', 7, 'push')])
    expect(shouldSendReminder(candidate, 'push', sent)).toBe(false)
    // ...mais l’email n’a pas encore été envoyé.
    expect(shouldSendReminder(candidate, 'email', sent)).toBe(true)
  })

  it('ne confond pas deux seuils de la même échéance', () => {
    const sent = new Set([reminderKey(ELECTRICITE, '2026-09-03', 30, 'push')])
    expect(shouldSendReminder(candidate, 'push', sent)).toBe(true)
  })

  it('ne confond pas deux échéances du même seuil', () => {
    const sent = new Set([reminderKey(ELECTRICITE, '2027-09-03', 7, 'push')])
    expect(shouldSendReminder(candidate, 'push', sent)).toBe(true)
  })

  it('notifie deux obligations distinctes tombant le même jour au même seuil', () => {
    // Régression : la clé doit inclure l’identifiant de l’obligation, sinon
    // une déclaration fiscale échue le même jour qu’une facture d’électricité
    // ferait taire l’une des deux.
    const sent = new Set([reminderKey(ELECTRICITE, '2026-09-03', 7, 'push')])
    const autre = getReminderCandidate(obligation(DECLARATION, '2026-09-03'), TODAY)!

    expect(shouldSendReminder(candidate, 'push', sent)).toBe(false)
    expect(shouldSendReminder(autre, 'push', sent)).toBe(true)
  })

  it('n’alerte qu’une fois pour un retard, même après plusieurs jours', () => {
    const sent = new Set<string>()
    const overdue = obligation(ELECTRICITE, '2026-08-20')

    for (const day of ['2026-08-21', '2026-08-25', '2026-08-27', '2026-09-15']) {
      const daily = getReminderCandidate(overdue, day)!
      if (shouldSendReminder(daily, 'push', sent)) {
        sent.add(reminderKey(daily.obligationId, daily.dueDate, daily.daysBefore, 'push'))
      }
    }

    expect(sent.size).toBe(1)
    expect(
      sent.has(reminderKey(ELECTRICITE, '2026-08-20', OVERDUE_REMINDER_MARKER, 'push')),
    ).toBe(true)
  })

  it('ré-alerte après validation, sur la nouvelle échéance', () => {
    const sent = new Set([
      reminderKey(ELECTRICITE, '2026-08-20', OVERDUE_REMINDER_MARKER, 'push'),
    ])
    // Après validation, l’échéance devient 2027-08-20 : nouvelle clé.
    const next = getReminderCandidate(obligation(ELECTRICITE, '2027-08-20', [7]), '2027-08-13')!
    expect(shouldSendReminder(next, 'push', sent)).toBe(true)
  })
})

describe('normalizeReminderDays', () => {
  it('déduplique, trie et rejette les valeurs invalides', () => {
    expect(normalizeReminderDays([7, 30, 7, 0, 1, -5, 2.5, Number.NaN])).toEqual([30, 7, 1, 0])
  })

  it('accepte une liste vide', () => {
    expect(normalizeReminderDays([])).toEqual([])
  })
})

describe('formatReminderThreshold', () => {
  it('formate les libellés', () => {
    expect(formatReminderThreshold(30)).toBe('30 jours avant')
    expect(formatReminderThreshold(1)).toBe('1 jour avant')
    expect(formatReminderThreshold(0)).toBe('Jour J')
    expect(formatReminderThreshold(OVERDUE_REMINDER_MARKER)).toBe('En retard')
  })
})
