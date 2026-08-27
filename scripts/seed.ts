/**
 * Données de démonstration.
 *
 *   npm run seed -- mon-email@exemple.com
 *
 * Nécessite `SUPABASE_SERVICE_ROLE_KEY` : le script écrit pour le compte d'un
 * utilisateur existant, ce qui contourne le RLS. Il ne s'exécute jamais depuis
 * l'application.
 *
 * Les échéances sont calculées **relativement à aujourd'hui**, pour que la
 * démonstration reste parlante quelle que soit la date d'exécution :
 * une assurance dans 8 jours, une électricité dans 13 jours, une assurance
 * habitation en retard de 7 jours.
 */
import { createClient } from '@supabase/supabase-js'
import { addDays, fromUtcDate } from '../lib/dates'
import type { CalculationBasis, ObligationType } from '../types/domain'

interface SeedObligation {
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

interface SeedAsset {
  name: string
  type: 'property' | 'vehicle'
  subtype: string
  country: string
  city: string
  currency: string
  obligations: SeedObligation[]
}

const SEED: SeedAsset[] = [
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

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    console.error(`✗ ${name} est manquant. Renseigne .env.local avant de lancer le seed.`)
    process.exit(1)
  }
  return value
}

async function main() {
  const email = process.argv[2] ?? process.env.SEED_USER_EMAIL
  if (!email) {
    console.error('Usage : npm run seed -- mon-email@exemple.com')
    process.exit(1)
  }

  const supabase = createClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const { data: list, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (listError) {
    console.error(`✗ Lecture des comptes impossible : ${listError.message}`)
    process.exit(1)
  }

  const user = list.users.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase())
  if (!user) {
    console.error(`✗ Aucun compte pour ${email}. Crée-le depuis la page de connexion.`)
    process.exit(1)
  }

  const { count } = await supabase
    .from('assets')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if ((count ?? 0) > 0 && !process.argv.includes('--force')) {
    console.error(
      `✗ ${email} possède déjà ${count} bien(s). Relance avec --force pour ajouter quand même.`,
    )
    process.exit(1)
  }

  const today = fromUtcDate(new Date())
  let assetCount = 0
  let obligationCount = 0

  for (const seedAsset of SEED) {
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .insert({
        user_id: user.id,
        name: seedAsset.name,
        type: seedAsset.type,
        subtype: seedAsset.subtype,
        country: seedAsset.country,
        city: seedAsset.city,
        default_currency: seedAsset.currency,
      })
      .select('id')
      .single()

    if (assetError || !asset) {
      console.error(`✗ ${seedAsset.name} : ${assetError?.message}`)
      continue
    }
    assetCount += 1

    const { error: obligationError } = await supabase.from('obligations').insert(
      seedAsset.obligations.map((obligation) => ({
        user_id: user.id,
        asset_id: asset.id,
        name: obligation.name,
        type: obligation.type,
        category: obligation.category,
        frequency_days: obligation.frequencyDays,
        calculation_basis: obligation.calculationBasis,
        next_due_date: addDays(today, obligation.dueInDays),
        expected_amount: obligation.expectedAmount,
        currency: obligation.currency,
      })),
    )

    if (obligationError) console.error(`✗ Obligations de ${seedAsset.name} : ${obligationError.message}`)
    else obligationCount += seedAsset.obligations.length
  }

  console.log(`✓ ${assetCount} biens et ${obligationCount} obligations créés pour ${email}.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
