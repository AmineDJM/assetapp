'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { completeObligation, undoCompletion } from '@/lib/store/mutations'
import { useStore } from '@/lib/store/provider'
import { completionInputSchema } from '@/lib/validation/schemas'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { RadioCard, RadioGroup } from '@/components/ui/radio-group'
import { formatLongDate, formatShortDate, isValidDateString } from '@/lib/dates'
import { advanceUntilFutureDate, calculateNextDueDate } from '@/lib/recurrence'
import { formatAmount } from '@/lib/currency'
import type { DueObligation } from '@/types/domain'

/**
 * Dialogue « Marquer comme effectué ».
 *
 * L'aperçu de la prochaine échéance vient du même moteur que le serveur
 * (`lib/recurrence`) : la date affichée est exactement celle qui sera
 * enregistrée.
 */
export function CompleteDialog({
  obligation,
  today,
  onOpenChange,
}: {
  obligation: DueObligation | null
  today: string
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={obligation !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Monté par obligation : la saisie repart à zéro à chaque ouverture,
            sans effet de réinitialisation. */}
        {obligation ? (
          <CompletionForm
            key={obligation.id}
            obligation={obligation}
            today={today}
            onOpenChange={onOpenChange}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function CompletionForm({
  obligation,
  today,
  onOpenChange,
}: {
  obligation: DueObligation
  today: string
  onOpenChange: (open: boolean) => void
}) {
  const [completedDate, setCompletedDate] = useState(today)
  const [actualAmount, setActualAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [advance, setAdvance] = useState(false)
  const { update } = useStore()

  const preview = useMemo(() => {
    if (!isValidDateString(completedDate)) return null

    const computed = calculateNextDueDate({
      currentDueDate: obligation.next_due_date,
      completionDate: completedDate,
      frequencyDays: obligation.frequency_days,
      calculationBasis: obligation.calculation_basis,
    })

    return {
      computed,
      advanced: advanceUntilFutureDate(computed, obligation.frequency_days, today),
      stillOverdue: computed <= today,
    }
  }, [obligation, completedDate, today])

  function handleConfirm() {
    const parsed = completionInputSchema.safeParse({
      obligation_id: obligation.id,
      completed_date: completedDate,
      actual_amount: actualAmount,
      notes,
      advance_until_future: advance,
    })

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Vérifie les champs du formulaire.')
      return
    }

    let outcome: ReturnType<typeof completeObligation> = null
    update((current) => {
      outcome = completeObligation(current, parsed.data, today)
      return outcome ? outcome.data : current
    })

    if (!outcome) {
      toast.error('Obligation introuvable.')
      return
    }

    const { completionId, obligationName, nextDueDate } = outcome as NonNullable<typeof outcome>
    onOpenChange(false)

    toast.success(`${obligationName} — effectué`, {
      description: `Prochaine échéance : ${formatLongDate(nextDueDate)}`,
      action: {
        label: 'Annuler',
        onClick: () => {
          let undone = false
          update((current) => {
            const result = undoCompletion(current, completionId)
            undone = result !== null
            return result ? result.data : current
          })
          if (undone) toast.success('Validation annulée')
          else toast.error('Seule la dernière validation peut être annulée.')
        },
      },
    })
  }

  return (
    <div className="flex min-h-0 flex-col">
      <DialogHeader>
        <DialogTitle>Marquer comme effectué</DialogTitle>
        <DialogDescription asChild>
          <div>
            <span className="block text-ink">{obligation.asset.name}</span>
            <span className="block">{obligation.name}</span>
            <span className="tabular block">
              Échéance : {formatShortDate(obligation.next_due_date)}
            </span>
          </div>
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="space-y-4 pb-4">
        <Field id="completion-date" label="Date de réalisation">
          <Input
            type="date"
            className="tabular"
            value={completedDate}
            onChange={(event) => setCompletedDate(event.target.value)}
            required
          />
        </Field>

        <Field
          id="completion-amount"
          label="Montant réel"
          optional
          hint={
            obligation.expected_amount !== null
              ? `Prévu : ${formatAmount(obligation.expected_amount, obligation.currency)}`
              : undefined
          }
        >
          <Input
            inputMode="decimal"
            className="tabular"
            value={actualAmount}
            onChange={(event) => setActualAmount(event.target.value)}
            placeholder={
              obligation.expected_amount !== null
                ? String(obligation.expected_amount)
                : undefined
            }
          />
        </Field>

        <Field id="completion-notes" label="Note" optional>
          <Textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </Field>

        {preview ? (
          preview.stillOverdue ? (
            /* Retard de plusieurs cycles : le rattrapage est un choix explicite,
               jamais appliqué en silence. */
            <div className="space-y-2 rounded-lg border border-warning-line bg-warning-soft/60 p-3">
              <p className="text-[13px] font-medium text-ink">
                La prochaine échéance calculée reste dans le passé.
              </p>
              <RadioGroup
                value={advance ? 'advance' : 'keep'}
                onValueChange={(value) => setAdvance(value === 'advance')}
                className="grid grid-cols-1 gap-2"
              >
                <RadioCard
                  id="keep-computed"
                  value="keep"
                  title="Conserver le calcul"
                  description={formatLongDate(preview.computed)}
                />
                <RadioCard
                  id="advance-future"
                  value="advance"
                  title="Avancer jusqu’à la prochaine échéance future"
                  description={formatLongDate(preview.advanced)}
                />
              </RadioGroup>
            </div>
          ) : (
            <p className="rounded-lg bg-surface-muted px-3 py-2.5 text-[13px]">
              <span className="text-muted">Prochaine échéance : </span>
              <span className="font-medium text-ink">{formatLongDate(preview.computed)}</span>
            </p>
          )
        ) : null}
      </DialogBody>

      <DialogFooter>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Annuler
        </Button>
        <Button
          variant="primary"
          onClick={handleConfirm}
          disabled={preview === null}
        >
          Confirmer
        </Button>
      </DialogFooter>
    </div>
  )
}
