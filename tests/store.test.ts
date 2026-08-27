import { describe, expect, it } from 'vitest'
import {
  addAsset,
  addObligation,
  completeObligation,
  editObligation,
  removeAsset,
  setAssetArchived,
  undoCompletion,
} from '@/lib/store/mutations'
import { createEmptyData, migrate, type PatrimoineData } from '@/lib/store/schema'
import {
  selectAssetsWithSummary,
  selectDueObligations,
  selectHistory,
} from '@/lib/store/selectors'
import type { AssetInput, ObligationInput } from '@/lib/validation/schemas'

/**
 * Le magasin local remplace la base : ces tests couvrent ce que garantissait
 * auparavant PostgreSQL — cohérence de la validation, immuabilité de
 * l'historique, cascade d'archivage et de suppression.
 */

const TODAY = '2026-08-27'

const AUDI: AssetInput = {
  name: 'Audi Q3',
  type: 'vehicle',
  subtype: 'Voiture',
  country: 'France',
  city: 'Lyon',
  address: null,
  default_currency: 'EUR',
  notes: null,
}

function assurance(assetId: string, overrides: Partial<ObligationInput> = {}): ObligationInput {
  return {
    asset_id: assetId,
    name: 'Assurance',
    type: 'payment',
    category: 'Assurance',
    frequency_days: 365,
    calculation_basis: 'scheduled',
    next_due_date: '2026-09-04',
    expected_amount: 620,
    currency: 'EUR',
    reminder_days_before: [30, 7, 1, 0],
    notes: null,
    ...overrides,
  }
}

function withAudiAssurance(): { data: PatrimoineData; assetId: string; obligationId: string } {
  let data = addAsset(createEmptyData(), AUDI)
  const assetId = data.assets[0]!.id
  data = addObligation(data, assurance(assetId))
  return { data, assetId, obligationId: data.obligations[0]!.id }
}

describe('création', () => {
  it('ajoute un bien actif avec un identifiant', () => {
    const data = addAsset(createEmptyData(), AUDI)
    expect(data.assets).toHaveLength(1)
    expect(data.assets[0]?.name).toBe('Audi Q3')
    expect(data.assets[0]?.is_active).toBe(true)
    expect(data.assets[0]?.id).toBeTruthy()
  })

  it('rattache l’obligation à son bien', () => {
    const { data, assetId, obligationId } = withAudiAssurance()
    expect(data.obligations).toHaveLength(1)
    expect(data.obligations[0]?.asset_id).toBe(assetId)
    expect(obligationId).toBeTruthy()
  })

  it('normalise les seuils de rappel', () => {
    let data = addAsset(createEmptyData(), AUDI)
    data = addObligation(
      data,
      assurance(data.assets[0]!.id, { reminder_days_before: [7, 30, 7, 0] }),
    )
    expect(data.obligations[0]?.reminder_days_before).toEqual([30, 7, 0])
  })
})

describe('sélecteurs', () => {
  it('calcule les jours restants et le statut sans les stocker', () => {
    const { data } = withAudiAssurance()
    const rows = selectDueObligations(data, TODAY)

    expect(rows[0]?.days_remaining).toBe(8)
    expect(rows[0]?.status).toBe('upcoming')
    expect(rows[0]?.asset.name).toBe('Audi Q3')
    // Rien n'est persisté : le document ne connaît que la date d'échéance.
    expect(data.obligations[0]).not.toHaveProperty('days_remaining')
  })

  it('trie par échéance croissante, retards en tête', () => {
    const base = withAudiAssurance()
    const assetId = base.assetId
    let data = base.data
    data = addObligation(
      data,
      assurance(assetId, { name: 'Contrôle', next_due_date: '2026-08-20' }),
    )
    data = addObligation(
      data,
      assurance(assetId, { name: 'Entretien', next_due_date: '2026-10-12' }),
    )

    expect(selectDueObligations(data, TODAY).map((row) => row.name)).toEqual([
      'Contrôle',
      'Assurance',
      'Entretien',
    ])
  })

  it('résume chaque bien avec sa prochaine échéance', () => {
    const { data } = withAudiAssurance()
    const summary = selectAssetsWithSummary(data, TODAY)
    expect(summary[0]?.obligation_count).toBe(1)
    expect(summary[0]?.next_obligation?.name).toBe('Assurance')
  })
})

describe('archivage', () => {
  it('archive les obligations avec leur bien', () => {
    const { data, assetId } = withAudiAssurance()
    const archived = setAssetArchived(data, assetId, true)

    expect(archived.assets[0]?.is_active).toBe(false)
    expect(archived.obligations[0]?.is_active).toBe(false)
    // Plus rien au dashboard, mais les données restent.
    expect(selectDueObligations(archived, TODAY)).toHaveLength(0)
    expect(archived.obligations).toHaveLength(1)
  })

  it('restaure bien et obligations ensemble', () => {
    const { data, assetId } = withAudiAssurance()
    const restored = setAssetArchived(setAssetArchived(data, assetId, true), assetId, false)
    expect(selectDueObligations(restored, TODAY)).toHaveLength(1)
  })
})

describe('suppression définitive', () => {
  it('emporte les obligations et l’historique du bien', () => {
    const { data, assetId, obligationId } = withAudiAssurance()
    const completed = completeObligation(
      data,
      {
        obligation_id: obligationId,
        completed_date: '2026-09-03',
        actual_amount: 615,
        notes: null,
        advance_until_future: false,
      },
      TODAY,
    )!

    expect(completed.data.completions).toHaveLength(1)

    const purged = removeAsset(completed.data, assetId)
    expect(purged.assets).toHaveLength(0)
    expect(purged.obligations).toHaveLength(0)
    expect(purged.completions).toHaveLength(0)
  })
})

describe('validation d’une échéance', () => {
  it('écrit l’historique et recalcule l’échéance en une seule opération', () => {
    const { data, obligationId } = withAudiAssurance()
    const outcome = completeObligation(
      data,
      {
        obligation_id: obligationId,
        completed_date: '2026-09-03',
        actual_amount: 615,
        notes: 'Payé en ligne',
        advance_until_future: false,
      },
      TODAY,
    )!

    // Base « date prévue » : payer en avance ne décale pas la série.
    expect(outcome.previousDueDate).toBe('2026-09-04')
    expect(outcome.nextDueDate).toBe('2027-09-04')
    expect(outcome.data.obligations[0]?.next_due_date).toBe('2027-09-04')
    expect(outcome.data.completions).toHaveLength(1)

    const entry = outcome.data.completions[0]!
    expect(entry.scheduled_due_date).toBe('2026-09-04')
    expect(entry.completed_date).toBe('2026-09-03')
    expect(entry.actual_amount).toBe(615)
    expect(entry.expected_amount_snapshot).toBe(620)
  })

  it('rattrape un retard uniquement sur demande explicite', () => {
    let data = addAsset(createEmptyData(), AUDI)
    data = addObligation(
      data,
      assurance(data.assets[0]!.id, { frequency_days: 30, next_due_date: '2026-01-01' }),
    )
    const obligationId = data.obligations[0]!.id
    const input = {
      obligation_id: obligationId,
      completed_date: TODAY,
      actual_amount: null,
      notes: null,
      advance_until_future: false,
    }

    // Sans rattrapage, la date calculée reste dans le passé — et c'est voulu.
    expect(completeObligation(data, input, TODAY)!.nextDueDate).toBe('2026-01-31')
    expect(
      completeObligation(data, { ...input, advance_until_future: true }, TODAY)!.nextDueDate,
    ).toBe('2026-08-29')
  })

  it('renvoie null pour une obligation inconnue', () => {
    const { data } = withAudiAssurance()
    expect(
      completeObligation(
        data,
        {
          obligation_id: 'inexistant',
          completed_date: TODAY,
          actual_amount: null,
          notes: null,
          advance_until_future: false,
        },
        TODAY,
      ),
    ).toBeNull()
  })
})

describe('annulation', () => {
  it('restaure l’échéance et retire la ligne d’historique', () => {
    const { data, obligationId } = withAudiAssurance()
    const outcome = completeObligation(
      data,
      {
        obligation_id: obligationId,
        completed_date: '2026-09-03',
        actual_amount: 615,
        notes: null,
        advance_until_future: false,
      },
      TODAY,
    )!

    const undone = undoCompletion(outcome.data, outcome.completionId)!
    expect(undone.restoredDueDate).toBe('2026-09-04')
    expect(undone.data.obligations[0]?.next_due_date).toBe('2026-09-04')
    expect(undone.data.completions).toHaveLength(0)
  })

  it('refuse d’annuler autre chose que la dernière validation', () => {
    const { data, obligationId } = withAudiAssurance()
    const input = {
      obligation_id: obligationId,
      completed_date: '2026-09-03',
      actual_amount: null,
      notes: null,
      advance_until_future: false,
    }

    const first = completeObligation(data, input, TODAY)!
    const second = completeObligation(first.data, input, TODAY)!

    expect(undoCompletion(second.data, first.completionId)).toBeNull()
    expect(undoCompletion(second.data, second.completionId)).not.toBeNull()
  })
})

describe('immuabilité de l’historique', () => {
  it('modifier une obligation ne réécrit pas le passé', () => {
    const { data, assetId, obligationId } = withAudiAssurance()
    const outcome = completeObligation(
      data,
      {
        obligation_id: obligationId,
        completed_date: '2026-09-03',
        actual_amount: 615,
        notes: null,
        advance_until_future: false,
      },
      TODAY,
    )!

    const edited = editObligation(
      outcome.data,
      obligationId,
      assurance(assetId, { expected_amount: 999, frequency_days: 180 }),
    )

    // Le montant figé et l'échéance de l'époque restent ceux d'origine.
    expect(edited.completions[0]?.expected_amount_snapshot).toBe(620)
    expect(edited.completions[0]?.scheduled_due_date).toBe('2026-09-04')
    expect(selectHistory(edited)[0]?.obligation.frequency_days).toBe(180)
  })
})

describe('migration du document', () => {
  it('accepte un document vide ou absent', () => {
    expect(migrate(null).assets).toEqual([])
    expect(migrate(undefined).obligations).toEqual([])
    expect(migrate('texte').completions).toEqual([])
  })

  it('conserve ce qui est lisible et écarte le reste', () => {
    const restored = migrate({
      version: 1,
      assets: [
        { id: 'a1', name: 'Villa' },
        { name: 'sans identifiant' },
        null,
      ],
      obligations: [{ id: 'o1', asset_id: 'a1', next_due_date: '2026-09-04', frequency_days: 30 }],
      completions: 'invalide',
    })

    expect(restored.assets).toHaveLength(1)
    expect(restored.obligations).toHaveLength(1)
    expect(restored.completions).toEqual([])
  })

  it('complète un profil partiel avec les valeurs par défaut', () => {
    const restored = migrate({ profile: { display_name: 'Amine' } })
    expect(restored.profile.display_name).toBe('Amine')
    expect(restored.profile.default_currency).toBe('EUR')
    expect(restored.profile.default_reminder_days).toEqual([30, 7, 1, 0])
  })
})
