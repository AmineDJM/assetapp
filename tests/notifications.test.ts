import { describe, expect, it } from 'vitest'
import { buildDueNotices } from '@/lib/notifications/local'
import { buildAssetsCsv, buildHistoryCsv, buildObligationsCsv, toCsv } from '@/lib/export/download'
import { createEmptyData } from '@/lib/store/schema'
import { addAsset, addObligation, completeObligation } from '@/lib/store/mutations'
import type { DueObligation } from '@/types/domain'

const TODAY = '2026-08-27'

function row(overrides: Partial<DueObligation> = {}): DueObligation {
  return {
    id: 'o1',
    asset_id: 'a1',
    name: 'Assurance',
    type: 'payment',
    category: 'Assurance',
    frequency_days: 365,
    calculation_basis: 'scheduled',
    next_due_date: '2026-09-03',
    expected_amount: 620,
    currency: 'EUR',
    reminder_days_before: [30, 7, 1, 0],
    notes: 'Note privée à ne pas divulguer',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    asset: { id: 'a1', name: 'Audi Q3', type: 'vehicle', subtype: 'Voiture' },
    days_remaining: 7,
    status: 'soon',
    ...overrides,
  }
}

describe('buildDueNotices', () => {
  it('notifie à un seuil configuré', () => {
    const notices = buildDueNotices([row()], TODAY)
    expect(notices).toHaveLength(1)
    expect(notices[0]?.title).toBe('Patrimoine')
    expect(notices[0]?.body).toContain('Assurance Audi Q3 dans 7 j')
    expect(notices[0]?.body).toContain('Échéance : 3 septembre 2026')
  })

  it('ne notifie pas hors des seuils configurés', () => {
    // J-8 n'est pas dans [30, 7, 1, 0].
    expect(buildDueNotices([row({ next_due_date: '2026-09-04', days_remaining: 8 })], TODAY))
      .toHaveLength(0)
  })

  it('annonce le jour J sans compte à rebours', () => {
    const notices = buildDueNotices([row({ next_due_date: TODAY, days_remaining: 0 })], TODAY)
    expect(notices[0]?.body).toContain('Assurance — Audi Q3')
    expect(notices[0]?.body).toContain("Échéance aujourd'hui")
  })

  it('annonce un retard', () => {
    const notices = buildDueNotices(
      [row({ next_due_date: '2026-08-20', days_remaining: -7, status: 'overdue' })],
      TODAY,
    )
    expect(notices[0]?.body).toContain('en retard de 7 j')
  })

  it('ouvre directement l’obligation concernée', () => {
    expect(buildDueNotices([row()], TODAY)[0]?.url).toBe('/assets/a1?obligation=o1')
  })

  it('produit une clé distincte par obligation, échéance et seuil', () => {
    const first = buildDueNotices([row()], TODAY)[0]!
    const other = buildDueNotices([row({ id: 'o2' })], TODAY)[0]!
    const later = buildDueNotices(
      [row({ next_due_date: '2027-09-03' })],
      '2027-08-27',
    )[0]!

    expect(first.key).not.toBe(other.key)
    expect(first.key).not.toBe(later.key)
  })

  it('ne transporte ni note ni montant', () => {
    const serialized = JSON.stringify(buildDueNotices([row()], TODAY))
    expect(serialized).not.toContain('Note privée')
    expect(serialized).not.toContain('620')
  })
})

describe('toCsv', () => {
  it('échappe guillemets, virgules et sauts de ligne', () => {
    expect(toCsv(['a', 'b'], [['x,y', 'il a dit "oui"']])).toContain('"x,y","il a dit ""oui"""')
  })

  it('neutralise les cellules interprétables comme des formules', () => {
    const csv = toCsv(['nom'], [['=1+1'], ['@import'], ['+42']])
    expect(csv).toContain("'=1+1")
    expect(csv).toContain("'@import")
    expect(csv).toContain("'+42")
  })

  it('laisse les nombres négatifs intacts', () => {
    expect(toCsv(['ecart'], [[-5]])).toContain('-5')
  })

  it('commence par un BOM pour que les accents s’ouvrent bien dans Excel', () => {
    expect(toCsv(['nom'], [['Électricité']]).startsWith('﻿')).toBe(true)
  })
})

describe('exports', () => {
  const build = () => {
    let data = addAsset(createEmptyData(), {
      name: 'Audi Q3',
      type: 'vehicle',
      subtype: 'Voiture',
      country: 'France',
      city: 'Lyon',
      address: null,
      default_currency: 'EUR',
      notes: null,
    })
    data = addObligation(data, {
      asset_id: data.assets[0]!.id,
      name: 'Assurance',
      type: 'payment',
      category: 'Assurance',
      frequency_days: 365,
      calculation_basis: 'scheduled',
      next_due_date: '2026-09-04',
      expected_amount: 620,
      currency: 'EUR',
      reminder_days_before: [30, 7],
      notes: null,
    })
    return completeObligation(
      data,
      {
        obligation_id: data.obligations[0]!.id,
        completed_date: '2026-09-03',
        actual_amount: 615,
        notes: null,
        advance_until_future: false,
      },
      TODAY,
    )!.data
  }

  it('exporte les biens', () => {
    const csv = buildAssetsCsv(build())
    expect(csv).toContain('nom,type,sous_type')
    expect(csv).toContain('Audi Q3,Véhicule,Voiture')
  })

  it('exporte les obligations avec la fréquence en jours', () => {
    const csv = buildObligationsCsv(build())
    expect(csv).toContain('Audi Q3,Assurance,Paiement,Assurance,365,Date prévue')
    expect(csv).toContain('30 7')
  })

  it('exporte l’historique avec l’écart calculé', () => {
    const csv = buildHistoryCsv(build())
    expect(csv).toContain('2026-09-04,2026-09-03,Audi Q3,Assurance,620,615,-5,EUR')
  })
})
