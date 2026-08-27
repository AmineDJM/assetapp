import { describe, expect, it } from 'vitest'
import {
  addDays,
  differenceInDays,
  formatLongDate,
  formatShortDate,
  fromUtcDate,
  isValidDateString,
  todayInTimeZone,
  InvalidDateStringError,
  assertDateString,
} from '@/lib/dates'

describe('isValidDateString', () => {
  it('accepte une date réelle', () => {
    expect(isValidDateString('2026-08-27')).toBe(true)
    expect(isValidDateString('2024-02-29')).toBe(true)
  })

  it('rejette un format incorrect', () => {
    expect(isValidDateString('27/08/2026')).toBe(false)
    expect(isValidDateString('2026-8-27')).toBe(false)
    expect(isValidDateString('')).toBe(false)
    expect(isValidDateString(null)).toBe(false)
    expect(isValidDateString(20260827)).toBe(false)
  })

  it('rejette une date qui n’existe pas', () => {
    expect(isValidDateString('2026-02-30')).toBe(false)
    expect(isValidDateString('2026-13-01')).toBe(false)
    expect(isValidDateString('2025-02-29')).toBe(false)
  })

  it('assertDateString lève une erreur explicite', () => {
    expect(() => assertDateString('2026-02-30')).toThrow(InvalidDateStringError)
  })
})

describe('addDays', () => {
  it('ajoute 30 jours', () => {
    expect(addDays('2026-01-01', 30)).toBe('2026-01-31')
  })

  it('traverse un changement de mois', () => {
    expect(addDays('2026-01-25', 10)).toBe('2026-02-04')
  })

  it('traverse un changement d’année', () => {
    expect(addDays('2026-12-20', 20)).toBe('2027-01-09')
  })

  it('gère une année bissextile', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29')
    expect(addDays('2024-02-28', 2)).toBe('2024-03-01')
  })

  it('gère une année non bissextile', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01')
  })

  it('+365 jours sur une période contenant un 29 février ne rend pas la même date', () => {
    // 2024 est bissextile : 365 jours après le 01/03/2023 -> 29/02/2024.
    expect(addDays('2023-03-01', 365)).toBe('2024-02-29')
  })

  it('+365 jours sur une année commune rend la même date', () => {
    expect(addDays('2026-09-04', 365)).toBe('2027-09-04')
  })

  it('accepte un nombre de jours négatif', () => {
    expect(addDays('2026-01-05', -10)).toBe('2025-12-26')
  })

  it('refuse un nombre de jours non entier', () => {
    expect(() => addDays('2026-01-01', 1.5)).toThrow(TypeError)
  })
})

describe('differenceInDays', () => {
  it('compte les jours entre deux dates', () => {
    expect(differenceInDays('2026-09-04', '2026-08-27')).toBe(8)
    expect(differenceInDays('2026-08-27', '2026-08-27')).toBe(0)
    expect(differenceInDays('2026-08-20', '2026-08-27')).toBe(-7)
  })

  it('reste exact malgré le passage à l’heure d’été', () => {
    // En Europe, le 29/03/2026 est une journée de 23 heures.
    expect(differenceInDays('2026-03-30', '2026-03-28')).toBe(2)
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30')
  })

  it('reste exact au passage à l’heure d’hiver', () => {
    // Le 25/10/2026 est une journée de 25 heures.
    expect(differenceInDays('2026-10-26', '2026-10-24')).toBe(2)
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26')
  })
})

describe('todayInTimeZone', () => {
  it('donne la date vécue par l’utilisateur, pas celle du serveur', () => {
    // 23:30 UTC : il est déjà le lendemain à Alger (UTC+1).
    const instant = new Date('2026-08-27T23:30:00Z')
    expect(todayInTimeZone('UTC', instant)).toBe('2026-08-27')
    expect(todayInTimeZone('Africa/Algiers', instant)).toBe('2026-08-28')
    // ...et encore la veille à Los Angeles.
    expect(todayInTimeZone('America/Los_Angeles', instant)).toBe('2026-08-27')
  })

  it('bascule correctement avant minuit UTC', () => {
    const instant = new Date('2026-08-27T00:30:00Z')
    expect(todayInTimeZone('UTC', instant)).toBe('2026-08-27')
    expect(todayInTimeZone('America/New_York', instant)).toBe('2026-08-26')
  })

  it('retombe sur UTC si le fuseau est inconnu', () => {
    const instant = new Date('2026-08-27T12:00:00Z')
    expect(todayInTimeZone('Pas/UnFuseau', instant)).toBe('2026-08-27')
  })
})

describe('formatage', () => {
  it('formate en français sans décalage de fuseau', () => {
    expect(formatShortDate('2026-09-04')).toBe('04/09/2026')
    expect(formatLongDate('2026-09-04')).toBe('4 septembre 2026')
    // Le 1er janvier ne doit jamais s’afficher comme le 31 décembre.
    expect(formatShortDate('2026-01-01')).toBe('01/01/2026')
  })
})

describe('fromUtcDate', () => {
  it('formate une date UTC', () => {
    expect(fromUtcDate(new Date(Date.UTC(2026, 0, 1)))).toBe('2026-01-01')
    expect(fromUtcDate(new Date(Date.UTC(999, 0, 1)))).toBe('0999-01-01')
  })
})
