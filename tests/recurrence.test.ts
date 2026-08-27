import { describe, expect, it } from 'vitest'
import {
  advanceUntilFutureDate,
  calculateNextDueDate,
  compareByDueDate,
  formatDaysRemaining,
  formatFrequency,
  getDaysRemaining,
  getDueStatus,
  InvalidFrequencyError,
  previewNextDueDate,
} from '@/lib/recurrence'

const TODAY = '2026-08-27'

describe('calculateNextDueDate — base « date prévue » (scheduled)', () => {
  it('repart de l’échéance prévue, pas de la date de paiement', () => {
    // Cas du cahier des charges : échéance 01/09, payé le 05/09, fréquence 30.
    expect(
      calculateNextDueDate({
        currentDueDate: '2026-09-01',
        completionDate: '2026-09-05',
        frequencyDays: 30,
        calculationBasis: 'scheduled',
      }),
    ).toBe('2026-10-01')
  })

  it('ne dérive pas au fil des retards répétés', () => {
    let due = '2026-01-01'
    for (let i = 0; i < 6; i += 1) {
      due = calculateNextDueDate({
        currentDueDate: due,
        // Systématiquement payé avec 5 jours de retard.
        completionDate: `2026-0${i + 1}-06`,
        frequencyDays: 30,
        calculationBasis: 'scheduled',
      })
    }
    // 6 × 30 jours après le 01/01/2026, sans aucune dérive.
    expect(due).toBe('2026-06-30')
  })

  it('+90 jours', () => {
    expect(
      calculateNextDueDate({
        currentDueDate: '2026-09-10',
        completionDate: '2026-09-10',
        frequencyDays: 90,
        calculationBasis: 'scheduled',
      }),
    ).toBe('2026-12-09')
  })

  it('+365 jours — cas assurance du cahier des charges', () => {
    expect(
      calculateNextDueDate({
        currentDueDate: '2026-09-04',
        completionDate: '2026-09-03',
        frequencyDays: 365,
        calculationBasis: 'scheduled',
      }),
    ).toBe('2027-09-04')
  })

  it('+730 jours — contrôle technique', () => {
    expect(
      calculateNextDueDate({
        currentDueDate: '2026-05-12',
        completionDate: '2026-05-12',
        frequencyDays: 730,
        calculationBasis: 'scheduled',
      }),
    ).toBe('2028-05-11')
  })
})

describe('calculateNextDueDate — base « date réelle » (completion)', () => {
  it('repart du jour de réalisation', () => {
    // Entretien réalisé le 05/09/2026, fréquence 180 jours.
    expect(
      calculateNextDueDate({
        currentDueDate: '2026-09-01',
        completionDate: '2026-09-05',
        frequencyDays: 180,
        calculationBasis: 'completion',
      }),
    ).toBe('2027-03-04')
  })

  it('avance la série quand l’action est faite en retard', () => {
    expect(
      calculateNextDueDate({
        currentDueDate: '2026-08-20',
        completionDate: '2026-08-27',
        frequencyDays: 30,
        calculationBasis: 'completion',
      }),
    ).toBe('2026-09-26')
  })

  it('recule la série quand l’action est faite en avance', () => {
    expect(
      calculateNextDueDate({
        currentDueDate: '2026-09-10',
        completionDate: '2026-09-01',
        frequencyDays: 30,
        calculationBasis: 'completion',
      }),
    ).toBe('2026-10-01')
  })
})

describe('calculateNextDueDate — cas limites de calendrier', () => {
  it('traverse un 29 février', () => {
    expect(
      calculateNextDueDate({
        currentDueDate: '2024-02-15',
        completionDate: '2024-02-15',
        frequencyDays: 30,
        calculationBasis: 'scheduled',
      }),
    ).toBe('2024-03-16')
  })

  it('traverse un changement d’année', () => {
    expect(
      calculateNextDueDate({
        currentDueDate: '2026-12-15',
        completionDate: '2026-12-15',
        frequencyDays: 30,
        calculationBasis: 'scheduled',
      }),
    ).toBe('2027-01-14')
  })

  it('365 jours à cheval sur un 29 février tombe la veille', () => {
    expect(
      calculateNextDueDate({
        currentDueDate: '2024-01-15',
        completionDate: '2024-01-15',
        frequencyDays: 365,
        calculationBasis: 'scheduled',
      }),
    ).toBe('2025-01-14')
  })
})

describe('calculateNextDueDate — validation', () => {
  it('refuse une fréquence nulle ou négative', () => {
    const base = {
      currentDueDate: '2026-01-01',
      completionDate: '2026-01-01',
      calculationBasis: 'scheduled',
    } as const
    expect(() => calculateNextDueDate({ ...base, frequencyDays: 0 })).toThrow(
      InvalidFrequencyError,
    )
    expect(() => calculateNextDueDate({ ...base, frequencyDays: -10 })).toThrow(
      InvalidFrequencyError,
    )
    expect(() => calculateNextDueDate({ ...base, frequencyDays: 1.5 })).toThrow(
      InvalidFrequencyError,
    )
  })
})

describe('advanceUntilFutureDate', () => {
  it('ne touche pas à une date déjà future', () => {
    expect(advanceUntilFutureDate('2026-09-04', 365, TODAY)).toBe('2026-09-04')
  })

  it('rattrape un retard de plusieurs cycles', () => {
    // Échéance au 01/01, fréquence 30, aujourd’hui le 27/08 : 8 cycles (240 j),
    // soit la première date strictement future.
    expect(advanceUntilFutureDate('2026-01-01', 30, TODAY)).toBe('2026-08-29')
  })

  it('rattrape toujours strictement au-delà d’aujourd’hui', () => {
    // La date pile sur aujourd’hui doit avancer d’un cycle complet.
    expect(advanceUntilFutureDate('2026-08-27', 30, TODAY)).toBe('2026-09-26')
  })

  it('rattrape un retard de plusieurs années', () => {
    expect(advanceUntilFutureDate('2020-01-01', 365, TODAY)).toBe('2026-12-30')
  })

  it('un seul saut suffit quand le retard est inférieur à un cycle', () => {
    expect(advanceUntilFutureDate('2026-08-20', 30, TODAY)).toBe('2026-09-19')
  })
})

describe('getDaysRemaining', () => {
  it('compte les jours restants — Audi Q3, assurance', () => {
    expect(getDaysRemaining('2026-09-04', TODAY)).toBe(8)
  })

  it('compte les jours restants — Appartement Milan, électricité', () => {
    expect(getDaysRemaining('2026-09-09', TODAY)).toBe(13)
  })

  it('compte un retard — Appartement Alicante, assurance', () => {
    expect(getDaysRemaining('2026-08-20', TODAY)).toBe(-7)
  })

  it('renvoie 0 le jour même', () => {
    expect(getDaysRemaining(TODAY, TODAY)).toBe(0)
  })
})

describe('getDueStatus', () => {
  it('détecte un retard', () => {
    expect(getDueStatus('2026-08-26', TODAY)).toBe('overdue')
    expect(getDueStatus('2026-08-20', TODAY)).toBe('overdue')
  })

  it('détecte le jour même', () => {
    expect(getDueStatus(TODAY, TODAY)).toBe('today')
  })

  it('détecte une échéance proche jusqu’à J-7 inclus', () => {
    expect(getDueStatus('2026-08-28', TODAY)).toBe('soon')
    expect(getDueStatus('2026-09-03', TODAY)).toBe('soon')
  })

  it('bascule en « à venir » à partir de J-8', () => {
    expect(getDueStatus('2026-09-04', TODAY)).toBe('upcoming')
    expect(getDueStatus('2027-01-01', TODAY)).toBe('upcoming')
  })
})

describe('formatDaysRemaining', () => {
  it('formate les libellés attendus', () => {
    expect(formatDaysRemaining(0)).toBe("Aujourd'hui")
    expect(formatDaysRemaining(1)).toBe('Demain')
    expect(formatDaysRemaining(4)).toBe('Dans 4 j')
    expect(formatDaysRemaining(17)).toBe('Dans 17 j')
    expect(formatDaysRemaining(-1)).toBe('En retard de 1 j')
    expect(formatDaysRemaining(-3)).toBe('En retard de 3 j')
  })
})

describe('formatFrequency', () => {
  it('affiche toujours des jours, jamais « mensuel » ou « annuel »', () => {
    expect(formatFrequency(30)).toBe('30 j')
    expect(formatFrequency(365)).toBe('365 j')
    expect(formatFrequency(45)).toBe('45 j')
  })
})

describe('previewNextDueDate', () => {
  it('donne l’aperçu du formulaire de création', () => {
    // Date de référence 10/08/2026 + 30 jours -> 09/09/2026.
    expect(previewNextDueDate('2026-08-10', 30)).toBe('2026-09-09')
  })
})

describe('compareByDueDate', () => {
  it('trie par échéance croissante, retards en tête', () => {
    const rows = [
      { next_due_date: '2026-09-09' },
      { next_due_date: '2026-08-20' },
      { next_due_date: '2026-09-04' },
    ]
    expect([...rows].sort(compareByDueDate).map((r) => r.next_due_date)).toEqual([
      '2026-08-20',
      '2026-09-04',
      '2026-09-09',
    ])
  })
})

describe('scénario complet — validation puis recalcul', () => {
  it('assurance Audi Q3 : 04/09/2026 -> 04/09/2027', () => {
    const obligation = {
      next_due_date: '2026-09-04',
      frequency_days: 365,
      calculation_basis: 'scheduled',
    } as const

    expect(getDaysRemaining(obligation.next_due_date, TODAY)).toBe(8)
    expect(formatDaysRemaining(8)).toBe('Dans 8 j')

    const next = calculateNextDueDate({
      currentDueDate: obligation.next_due_date,
      completionDate: '2026-09-03',
      frequencyDays: obligation.frequency_days,
      calculationBasis: obligation.calculation_basis,
    })

    expect(next).toBe('2027-09-04')
    expect(getDueStatus(next, TODAY)).toBe('upcoming')
  })

  it('une obligation en retard reste en retard tant qu’elle n’est pas validée', () => {
    const dueDate = '2026-08-20'
    // Aucune fonction n’avance la date : seule une validation le fait.
    expect(getDueStatus(dueDate, TODAY)).toBe('overdue')
    expect(formatDaysRemaining(getDaysRemaining(dueDate, TODAY))).toBe('En retard de 7 j')
  })

  it('le recalcul « scheduled » peut rester dans le passé et doit être détecté', () => {
    const next = calculateNextDueDate({
      currentDueDate: '2026-01-01',
      completionDate: TODAY,
      frequencyDays: 30,
      calculationBasis: 'scheduled',
    })
    expect(next).toBe('2026-01-31')
    expect(getDueStatus(next, TODAY)).toBe('overdue')
    // L’utilisateur peut alors choisir explicitement de rattraper.
    expect(advanceUntilFutureDate(next, 30, TODAY)).toBe('2026-08-29')
  })
})
