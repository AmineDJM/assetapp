import 'server-only'

/**
 * Envoi des rappels par email.
 *
 * L'application ne dépend d'aucun fournisseur : sans `RESEND_API_KEY`, cette
 * fonction ne fait rien et ne lève rien. Les rappels in-app et push continuent
 * de fonctionner normalement.
 */

export type EmailResult =
  | { status: 'sent'; id: string | null }
  | { status: 'skipped'; reason: 'not_configured' }
  | { status: 'failed'; reason: string }

interface SendReminderEmailInput {
  to: string
  subject: string
  text: string
}

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.REMINDER_FROM_EMAIL)
}

export async function sendReminderEmail({
  to,
  subject,
  text,
}: SendReminderEmailInput): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.REMINDER_FROM_EMAIL

  if (!apiKey || !from) return { status: 'skipped', reason: 'not_configured' }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, text }),
    })

    if (!response.ok) {
      const detail = await response.text()
      return { status: 'failed', reason: `${response.status} ${detail.slice(0, 200)}` }
    }

    const payload = (await response.json()) as { id?: string }
    return { status: 'sent', id: payload.id ?? null }
  } catch (error) {
    return {
      status: 'failed',
      reason: error instanceof Error ? error.message : 'Erreur inconnue',
    }
  }
}
