import { addDays, fromUtcDate } from '@/lib/dates'
import { createEmptyData, type PatrimoineData } from './schema'
import type { CalculationBasis, ObligationType } from '@/types/domain'

/**
 * Données de démonstration, proposées depuis les Paramètres.
 *
 * Les échéances sont calculées **relativement à aujourd'hui** pour que la
 * démonstration reste parlante quelle que soit la date : une assurance dans
 * 8 jours, une électricité dans 13 jours, une assurance habitation en retard
 * de 7 jours.
 */

interface DemoObligation {
  name: string
  type: ObligationType
  category: string
  frequencyDays: number
  calculationBasis: CalculationBasis
  /** Décalage en jours par rapport à aujourd'hui. Négatif = en retard. */
  dueInDays: number
  expectedAmount: number | null
  currency: string
}

interface DemoAsset {
  name: string
  type: 'property' | 'vehicle'
  subtype: string
  country: string
  city: string
  currency: string
  obligations: DemoObligation[]
}

const DEMO: DemoAsset[] = [
  {
    name: 'Appartement Milan',
    type: 'property',
    subtype: 'Appartement',
    country: 'Italie',
    city: 'Milan',
    currency: 'EUR',
    obligations: [
      { name: 'Électricité', type: 'payment', category: 'Énergie', frequencyDays: 30, calculationBasis: 'scheduled', dueInDays: 13, expectedAmount: 78, currency: 'EUR' },
      { name: 'Internet', type: 'payment', category: 'Télécommunications', frequencyDays: 30, calculationBasis: 'scheduled', dueInDays: 15, expectedAmount: 29.9, currency: 'EUR' },
      { name: 'Charges de copropriété', type: 'payment', category: 'Charges', frequencyDays: 90, calculationBasis: 'scheduled', dueInDays: 35, expectedAmount: 320, currency: 'EUR' },
      { name: 'Assurance habitation', type: 'renewal', category: 'Assurance', frequencyDays: 365, calculationBasis: 'scheduled', dueInDays: 141, expectedAmount: 210, currency: 'EUR' },
    ],
  },
  {
    name: 'Audi Q3',
    type: 'vehicle',
    subtype: 'Voiture',
    country: 'France',
    city: 'Lyon',
    currency: 'EUR',
    obligations: [
      { name: 'Assurance', type: 'payment', category: 'Assurance', frequencyDays: 365, calculationBasis: 'scheduled', dueInDays: 8, expectedAmount: 620, currency: 'EUR' },
      { name: 'Entretien', type: 'maintenance', category: 'Maintenance', frequencyDays: 180, calculationBasis: 'completion', dueInDays: 46, expectedAmount: 240, currency: 'EUR' },
      { name: 'Contrôle technique', type: 'maintenance', category: 'Maintenance', frequencyDays: 730, calculationBasis: 'completion', dueInDays: 258, expectedAmount: 85, currency: 'EUR' },
    ],
  },
  {
    name: 'Villa Alger',
    type: 'property',
    subtype: 'Villa',
    country: 'Algérie',
    city: 'Alger',
    currency: 'DZD',
    obligations: [
      { name: 'Internet', type: 'payment', category: 'Télécommunications', frequencyDays: 30, calculationBasis: 'scheduled', dueInDays: 14, expectedAmount: 4200, currency: 'DZD' },
      { name: 'Eau', type: 'payment', category: 'Eau', frequencyDays: 90, calculationBasis: 'scheduled', dueInDays: 22, expectedAmount: 6800, currency: 'DZD' },
      { name: 'Assurance', type: 'renewal', category: 'Assurance', frequencyDays: 365, calculationBasis: 'scheduled', dueInDays: 96, expectedAmount: 45000, currency: 'DZD' },
    ],
  },
  {
    name: 'Appartement Alicante',
    type: 'property',
    subtype: 'Appartement',
    country: 'Espagne',
    city: 'Alicante',
    currency: 'EUR',
    obligations: [
      // En retard : reste visible tant qu'elle n'est pas validée.
      { name: 'Assurance habitation', type: 'renewal', category: 'Assurance', frequencyDays: 365, calculationBasis: 'scheduled', dueInDays: -7, expectedAmount: 185, currency: 'EUR' },
      { name: 'Déclaration fiscale', type: 'declaration', category: 'Fiscalité', frequencyDays: 365, calculationBasis: 'scheduled', dueInDays: 30, expectedAmount: null, currency: 'EUR' },
      { name: 'Eau', type: 'payment', category: 'Eau', frequencyDays: 90, calculationBasis: 'scheduled', dueInDays: 3, expectedAmount: 64, currency: 'EUR' },
    ],
  },
]

function newId(prefix: string, index: number): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${prefix}-${index}-${Math.random().toString(36).slice(2, 8)}`
}

/** Ajoute les biens de démonstration au document existant. */
export function withDemoData(data: PatrimoineData): PatrimoineData {
  const today = fromUtcDate(new Date())
  const now = new Date().toISOString()
  const empty = createEmptyData()

  const assets = [...data.assets]
  const obligations = [...data.obligations]

  DEMO.forEach((demoAsset, assetIndex) => {
    const assetId = newId('asset', assetIndex)
    assets.push({
      id: assetId,
      name: demoAsset.name,
      type: demoAsset.type,
      subtype: demoAsset.subtype,
      country: demoAsset.country,
      city: demoAsset.city,
      address: null,
      default_currency: demoAsset.currency,
      notes: null,
      is_active: true,
      created_at: now,
      updated_at: now,
    })

    demoAsset.obligations.forEach((demoObligation, obligationIndex) => {
      obligations.push({
        id: newId('obligation', assetIndex * 100 + obligationIndex),
        asset_id: assetId,
        name: demoObligation.name,
        type: demoObligation.type,
        category: demoObligation.category,
        frequency_days: demoObligation.frequencyDays,
        calculation_basis: demoObligation.calculationBasis,
        next_due_date: addDays(today, demoObligation.dueInDays),
        expected_amount: demoObligation.expectedAmount,
        currency: demoObligation.currency,
        reminder_days_before: [...empty.profile.default_reminder_days],
        notes: null,
        is_active: true,
        created_at: now,
        updated_at: now,
      })
    })
  })

  return { ...data, assets, obligations }
}
