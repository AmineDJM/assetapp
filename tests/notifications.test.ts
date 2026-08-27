import { describe, expect, it } from 'vitest'
import {
  buildReminderEmail,
  buildReminderPush,
  buildTestPush,
  obligationUrl,
  reminderDetail,
  reminderHeadline,
  type ReminderSubject,
} from '@/lib/push/payload'
import { urlBase64ToUint8Array } from '@/lib/push/encoding'
import { describeDevice } from '@/lib/push/device'

const ASSURANCE: ReminderSubject = {
  obligationId: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
  obligationName: 'Assurance',
  assetId: 'cccccccc-3333-4333-8333-cccccccccccc',
  assetName: 'Audi Q3',
  dueDate: '2026-09-04',
  daysRemaining: 7,
}

describe('reminderHeadline', () => {
  it('annonce une échéance à venir', () => {
    expect(reminderHeadline(ASSURANCE)).toBe('Assurance Audi Q3 dans 7 jours')
  })

  it('annonce demain', () => {
    expect(reminderHeadline({ ...ASSURANCE, daysRemaining: 1 })).toBe('Assurance Audi Q3 demain')
  })

  it('annonce le jour J sans compte à rebours', () => {
    expect(reminderHeadline({ ...ASSURANCE, daysRemaining: 0 })).toBe('Assurance — Audi Q3')
    expect(reminderDetail({ ...ASSURANCE, daysRemaining: 0 })).toBe("Échéance aujourd'hui")
  })

  it('annonce un retard, avec accord du pluriel', () => {
    expect(
      reminderHeadline({
        ...ASSURANCE,
        obligationName: 'Assurance habitation',
        assetName: 'Appartement Alicante',
        daysRemaining: -3,
      }),
    ).toBe('Assurance habitation Appartement Alicante en retard de 3 jours')

    expect(reminderHeadline({ ...ASSURANCE, daysRemaining: -1 })).toContain('en retard de 1 jour')
  })
})

describe('buildReminderPush', () => {
  const payload = buildReminderPush(ASSURANCE)

  it('utilise le nom de l’application comme titre', () => {
    expect(payload.title).toBe('Patrimoine')
  })

  it('résume l’échéance en deux lignes', () => {
    expect(payload.body).toBe('Assurance Audi Q3 dans 7 jours\nÉchéance : 4 septembre 2026')
  })

  it('ouvre directement l’obligation concernée', () => {
    expect(payload.url).toBe(
      '/assets/cccccccc-3333-4333-8333-cccccccccccc?obligation=aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
    )
    expect(payload.url).toBe(obligationUrl(ASSURANCE.assetId, ASSURANCE.obligationId))
  })

  it('porte un tag stable pour éviter les notifications empilées', () => {
    expect(payload.tag).toBe(`obligation-${ASSURANCE.obligationId}-2026-09-04`)
    // Une échéance différente doit produire un tag différent.
    expect(buildReminderPush({ ...ASSURANCE, dueDate: '2027-09-04' }).tag).not.toBe(payload.tag)
  })

  it('ne transporte aucune donnée sensible', () => {
    const serialized = JSON.stringify(
      buildReminderPush({ ...ASSURANCE, obligationName: 'Assurance' }),
    )
    // Ni montant, ni note, ni jeton : la notification s'affiche sur un écran verrouillé.
    for (const forbidden of ['token', 'amount', 'montant', 'note', 'password', 'secret']) {
      expect(serialized.toLowerCase()).not.toContain(forbidden)
    }
  })
})

describe('buildTestPush', () => {
  it('confirme que la chaîne complète fonctionne', () => {
    const payload = buildTestPush()
    expect(payload.title).toBe('Patrimoine')
    expect(payload.body).toBe('Les notifications fonctionnent correctement.')
    expect(payload.url).toBe('/settings')
  })
})

describe('buildReminderEmail', () => {
  it('résume une échéance unique dans l’objet', () => {
    const { subject, text } = buildReminderEmail([ASSURANCE])
    expect(subject).toBe('Patrimoine — Assurance Audi Q3 dans 7 jours')
    expect(text).toContain('Assurance — Audi Q3')
    expect(text).toContain('4 septembre 2026')
    expect(text).toContain('Dans 7 j')
  })

  it('regroupe plusieurs échéances en un seul message', () => {
    const { subject, text } = buildReminderEmail([
      ASSURANCE,
      { ...ASSURANCE, obligationName: 'Électricité', assetName: 'Appartement Milan', daysRemaining: -2, dueDate: '2026-08-25' },
    ])
    expect(subject).toBe('Patrimoine — 2 échéances à surveiller')
    expect(text).toContain('Assurance — Audi Q3')
    expect(text).toContain('Électricité — Appartement Milan')
    expect(text).toContain('En retard de 2 j')
  })
})

describe('urlBase64ToUint8Array', () => {
  it('décode une clé VAPID base64 URL-safe', () => {
    // Clé publique VAPID : 65 octets, préfixe 0x04 (point EC non compressé).
    const key =
      'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'
    const bytes = urlBase64ToUint8Array(key)
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBe(65)
    expect(bytes[0]).toBe(4)
  })

  it('gère le padding manquant', () => {
    expect(Array.from(urlBase64ToUint8Array('AQAB'))).toEqual([1, 0, 1])
    expect(Array.from(urlBase64ToUint8Array('_w'))).toEqual([255])
  })

  it('traduit les caractères URL-safe', () => {
    // « -_ » en URL-safe correspond à « +/ » en base64 standard.
    expect(Array.from(urlBase64ToUint8Array('-_8'))).toEqual(
      Array.from(Buffer.from('+/8=', 'base64')),
    )
  })
})

describe('describeDevice', () => {
  it('nomme les appareils de façon lisible', () => {
    expect(describeDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari/604.1')).toBe('iPhone')
    expect(describeDevice('Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) Safari/604.1')).toBe('iPad')
    expect(
      describeDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0 Safari/537.36'),
    ).toBe('Chrome · Windows')
    expect(
      describeDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Version/17.0 Safari/605.1'),
    ).toBe('Safari · Mac')
    expect(
      describeDevice('Mozilla/5.0 (Windows NT 10.0) Chrome/131.0.0.0 Safari/537.36 Edg/131.0'),
    ).toBe('Edge · Windows')
  })

  it('reste neutre sur un appareil inconnu', () => {
    expect(describeDevice('un-agent-inconnu/1.0')).toBe('Cet appareil')
  })
})
