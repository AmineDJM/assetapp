/**
 * Génère une paire de clés VAPID — À EXÉCUTER UNE SEULE FOIS.
 *
 * Régénérer les clés invalide tous les abonnements push existants : chaque
 * appareil devrait être réactivé à la main. Conserve-les.
 *
 *   npm run generate:vapid
 */
import webpush from 'web-push'

const { publicKey, privateKey } = webpush.generateVAPIDKeys()

console.log(`
Clés VAPID générées. À placer dans .env.local, puis dans
Vercel → Project → Settings → Environment Variables.

NEXT_PUBLIC_VAPID_PUBLIC_KEY=${publicKey}
VAPID_PRIVATE_KEY=${privateKey}
VAPID_SUBJECT=mailto:ton-email@exemple.com

  • NEXT_PUBLIC_VAPID_PUBLIC_KEY est exposée au navigateur : c'est normal.
  • VAPID_PRIVATE_KEY ne doit JAMAIS être préfixée NEXT_PUBLIC_ ni commitée.
  • Ne régénère pas ces clés après le premier déploiement.
`)
