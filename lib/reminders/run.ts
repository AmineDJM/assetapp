import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { todayInTimeZone } from '@/lib/dates'
import {
  getReminderCandidate,
  reminderKey,
  shouldSendReminder,
  type ReminderCandidate,
} from '@/lib/reminders/rules'
import { sendReminderEmail } from '@/lib/reminders/email'
import { buildReminderEmail, buildReminderPush, type ReminderSubject } from '@/lib/push/payload'
import { isPushConfigured, sendPushToUser } from '@/lib/push/server'
import type { DateString, ReminderChannel } from '@/types/domain'

/**
 * Exécution quotidienne des rappels.
 *
 * Un seul passage par jour traite les deux canaux (push et email). L'absence de
 * doublon repose sur `reminder_logs` et sa contrainte
 * `(obligation_id, due_date, days_before, channel)` : rejouer le job n'envoie
 * rien deux fois.
 */

type Client = SupabaseClient<Database>

interface ObligationRow {
  id: string
  user_id: string
  asset_id: string
  name: string
  next_due_date: DateString
  reminder_days_before: number[]
  asset: { name: string } | null
}

export interface ReminderRunSummary {
  processedUsers: number
  processedObligations: number
  pushSent: number
  pushFailed: number
  pushDevicesRemoved: number
  emailsSent: number
  emailsSkipped: number
  errors: string[]
}

interface UserWork {
  userId: string
  timezone: string
  emailRemindersEnabled: boolean
  items: Array<{ obligation: ObligationRow; candidate: ReminderCandidate }>
}

export async function runReminders(client: Client): Promise<ReminderRunSummary> {
  const summary: ReminderRunSummary = {
    processedUsers: 0,
    processedObligations: 0,
    pushSent: 0,
    pushFailed: 0,
    pushDevicesRemoved: 0,
    emailsSent: 0,
    emailsSkipped: 0,
    errors: [],
  }

  const { data: obligations, error } = await client
    .from('obligations')
    .select(
      'id, user_id, asset_id, name, next_due_date, reminder_days_before, asset:assets!inner (name)',
    )
    .eq('is_active', true)
    .eq('assets.is_active', true)

  if (error) {
    summary.errors.push(`Lecture des obligations : ${error.message}`)
    return summary
  }

  const rows = (obligations ?? []) as unknown as ObligationRow[]
  if (rows.length === 0) return summary

  const userIds = Array.from(new Set(rows.map((row) => row.user_id)))

  const { data: profiles } = await client
    .from('profiles')
    .select('id, timezone, email_reminders_enabled')
    .in('id', userIds)

  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]))

  // Regroupement par utilisateur : « aujourd'hui » dépend de son fuseau.
  const work = new Map<string, UserWork>()

  for (const obligation of rows) {
    const profile = profileById.get(obligation.user_id)
    const timezone = profile?.timezone ?? 'UTC'
    const today = todayInTimeZone(timezone)

    const candidate = getReminderCandidate(obligation, today)
    if (!candidate) continue

    const existing = work.get(obligation.user_id)
    const entry = existing ?? {
      userId: obligation.user_id,
      timezone,
      emailRemindersEnabled: profile?.email_reminders_enabled ?? true,
      items: [],
    }
    entry.items.push({ obligation, candidate })
    work.set(obligation.user_id, entry)
  }

  const pushConfigured = isPushConfigured()

  for (const entry of work.values()) {
    summary.processedUsers += 1
    summary.processedObligations += entry.items.length

    const alreadySent = await readSentReminders(
      client,
      entry.items.map((item) => item.obligation.id),
      entry.items.map((item) => item.candidate.dueDate),
    )

    const emailSubjects: ReminderSubject[] = []
    const emailCandidates: Array<{ obligationId: string; candidate: ReminderCandidate }> = []

    for (const { obligation, candidate } of entry.items) {
      const subject: ReminderSubject = {
        obligationId: obligation.id,
        obligationName: obligation.name,
        assetId: obligation.asset_id,
        assetName: obligation.asset?.name ?? '',
        dueDate: candidate.dueDate,
        daysRemaining: candidate.daysRemaining,
      }

      // --- Push -----------------------------------------------------------
      if (pushConfigured && shouldSendReminder(candidate, 'push', alreadySent)) {
        const result = await sendPushToUser(client, entry.userId, buildReminderPush(subject))
        summary.pushSent += result.sent
        summary.pushFailed += result.failed
        summary.pushDevicesRemoved += result.removed

        // Le rappel n'est journalisé que si au moins un appareil l'a reçu :
        // sans abonnement, rien ne doit être marqué comme envoyé.
        if (result.sent > 0) {
          await logReminder(client, entry.userId, obligation.id, candidate, 'push', summary)
        }
      }

      // --- Email : regroupé en un seul message par utilisateur -------------
      if (entry.emailRemindersEnabled && shouldSendReminder(candidate, 'email', alreadySent)) {
        emailSubjects.push(subject)
        emailCandidates.push({ obligationId: obligation.id, candidate })
      }
    }

    if (emailSubjects.length > 0) {
      const email = await resolveUserEmail(client, entry.userId)

      if (!email) {
        summary.emailsSkipped += emailSubjects.length
      } else {
        const { subject, text } = buildReminderEmail(emailSubjects)
        const result = await sendReminderEmail({ to: email, subject, text })

        if (result.status === 'sent') {
          summary.emailsSent += emailSubjects.length
          for (const item of emailCandidates) {
            await logReminder(client, entry.userId, item.obligationId, item.candidate, 'email', summary)
          }
        } else if (result.status === 'skipped') {
          // Aucun fournisseur email configuré : ce n'est pas une erreur.
          summary.emailsSkipped += emailSubjects.length
        } else {
          summary.errors.push(`Email (${entry.userId}) : ${result.reason}`)
        }
      }
    }
  }

  return summary
}

async function readSentReminders(
  client: Client,
  obligationIds: string[],
  dueDates: DateString[],
): Promise<Set<string>> {
  const { data, error } = await client
    .from('reminder_logs')
    .select('obligation_id, due_date, days_before, channel')
    .in('obligation_id', obligationIds)
    .in('due_date', Array.from(new Set(dueDates)))

  if (error || !data) return new Set()
  return new Set(
    data.map((log) =>
      reminderKey(log.obligation_id, log.due_date, log.days_before, log.channel),
    ),
  )
}

async function logReminder(
  client: Client,
  userId: string,
  obligationId: string,
  candidate: ReminderCandidate,
  channel: ReminderChannel,
  summary: ReminderRunSummary,
): Promise<void> {
  const { error } = await client.from('reminder_logs').insert({
    user_id: userId,
    obligation_id: obligationId,
    due_date: candidate.dueDate,
    days_before: candidate.daysBefore,
    channel,
  })

  // 23505 : la contrainte d'unicité a joué son rôle, rien à signaler.
  if (error && error.code !== '23505') {
    summary.errors.push(`Journalisation (${obligationId}, ${channel}) : ${error.message}`)
  }
}

async function resolveUserEmail(client: Client, userId: string): Promise<string | null> {
  const { data, error } = await client.auth.admin.getUserById(userId)
  if (error || !data.user?.email) return null
  return data.user.email
}
