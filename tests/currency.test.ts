import { describe, expect, it } from 'vitest'
import { formatAmount, formatVariance, isValidCurrencyCode, sumByCurrency } from '@/lib/currency'

/** Les espaces d'Intl sont insécables : on normalise avant comparaison. */
const norm = (value: string) => value.replace(/ | /g, ' ')

describe('formatAmount', () => {
  it('formate selon la devise', () => {
    expect(norm(formatAmount(1250, 'EUR'))).toBe('1 250 €')
    expect(norm(formatAmount(45000, 'DZD'))).toBe('45 000 DZD')
    expect(norm(formatAmount(300, 'USD'))).toBe('300 $US')
  })

  it('conserve les centimes quand il y en a', () => {
    expect(norm(formatAmount(615.5, 'EUR'))).toBe('615,50 €')
  })

  it('affiche un tiret quand le montant est absent', () => {
    expect(formatAmount(null, 'EUR')).toBe('—')
    expect(formatAmount(undefined, 'EUR')).toBe('—')
  })

  it('retombe sur la devise par défaut si le code est invalide', () => {
    expect(norm(formatAmount(100, 'xx'))).toBe('100 €')
    expect(norm(formatAmount(100, null))).toBe('100 €')
  })

  it('formate zéro, qui n’est pas la même chose qu’absent', () => {
    expect(norm(formatAmount(0, 'EUR'))).toBe('0 €')
  })
})

describe('formatVariance', () => {
  it('affiche l’écart signé', () => {
    expect(norm(formatVariance(615, 620, 'EUR'))).toBe('−5 €')
    expect(norm(formatVariance(630, 620, 'EUR'))).toBe('+10 €')
  })

  it('n’affiche rien sans écart ou sans référence', () => {
    expect(formatVariance(620, 620, 'EUR')).toBe('—')
    expect(formatVariance(620, null, 'EUR')).toBe('—')
    expect(formatVariance(null, 620, 'EUR')).toBe('—')
  })
})

describe('sumByCurrency', () => {
  it('n’additionne jamais deux devises différentes', () => {
    const totals = sumByCurrency([
      { amount: 1000, currency: 'EUR' },
      { amount: 250, currency: 'EUR' },
      { amount: 84000, currency: 'DZD' },
      { amount: 400, currency: 'USD' },
    ])
    expect(totals).toEqual([
      { currency: 'DZD', total: 84000 },
      { currency: 'EUR', total: 1250 },
      { currency: 'USD', total: 400 },
    ])
  })

  it('ignore les montants absents', () => {
    expect(sumByCurrency([{ amount: null, currency: 'EUR' }])).toEqual([])
  })

  it('range les montants sans devise sous la devise par défaut', () => {
    expect(sumByCurrency([{ amount: 100, currency: null }], 'DZD')).toEqual([
      { currency: 'DZD', total: 100 },
    ])
  })
})

describe('isValidCurrencyCode', () => {
  it('exige trois lettres majuscules', () => {
    expect(isValidCurrencyCode('EUR')).toBe(true)
    expect(isValidCurrencyCode('eur')).toBe(false)
    expect(isValidCurrencyCode('EURO')).toBe(false)
    expect(isValidCurrencyCode('')).toBe(false)
  })
})
