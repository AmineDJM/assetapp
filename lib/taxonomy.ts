import type { AssetType, ObligationType } from '@/types/domain'

/**
 * Libellés et listes de référence.
 *
 * Volontairement souples : les catégories sont des suggestions, une valeur
 * personnalisée reste acceptée par la base.
 */

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  property: 'Bien immobilier',
  vehicle: 'Véhicule',
}

export const PROPERTY_SUBTYPES = [
  'Appartement',
  'Maison',
  'Villa',
  'Local',
  'Bureau',
  'Terrain',
  'Autre',
] as const

export const VEHICLE_SUBTYPES = ['Voiture', 'Moto', 'Bateau', 'Autre'] as const

export function subtypesFor(type: AssetType): readonly string[] {
  return type === 'property' ? PROPERTY_SUBTYPES : VEHICLE_SUBTYPES
}

export const OBLIGATION_TYPE_LABELS: Record<ObligationType, string> = {
  payment: 'Paiement',
  declaration: 'Déclaration',
  renewal: 'Renouvellement',
  maintenance: 'Maintenance',
  administrative: 'Administratif',
  other: 'Autre',
}

export const OBLIGATION_TYPES = Object.keys(OBLIGATION_TYPE_LABELS) as ObligationType[]

export const CATEGORIES = [
  'Énergie',
  'Eau',
  'Télécommunications',
  'Assurance',
  'Financement',
  'Fiscalité',
  'Administration',
  'Maintenance',
  'Charges',
  'Abonnements',
  'Autre',
] as const

export const FREQUENCY_PRESETS = [30, 60, 90, 180, 365] as const

export const CALCULATION_BASIS_LABELS = {
  scheduled: 'Date prévue',
  completion: 'Date réelle de réalisation',
} as const

export const CALCULATION_BASIS_HELP = {
  scheduled: 'La prochaine échéance reste basée sur le calendrier prévu.',
  completion:
    "La prochaine échéance repart du jour où l'action a réellement été effectuée.",
} as const
