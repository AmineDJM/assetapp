# Patrimoine

Application personnelle pour suivre ses biens immobiliers, ses véhicules et
toutes les échéances récurrentes qui vont avec.

> Un seul endroit pour savoir ce qui arrive, quand, pour quel bien — et
> recalculer automatiquement la prochaine échéance à partir d'une fréquence
> exprimée en jours.

---

## Le principe

Une fréquence est **toujours un nombre entier de jours**. Ni « mensuel », ni
« trimestriel », ni « annuel » — ni dans l'interface, ni en base. `30`, `90`,
`365`, `45`, `400` : la règle de calcul reste évidente.

Chaque obligation choisit sa **base de calcul** :

| Base                  | Après validation, la prochaine échéance est…            |
| --------------------- | ------------------------------------------------------- |
| `scheduled` — prévue  | `échéance prévue + fréquence` (payer en retard ne décale pas la série) |
| `completion` — réelle | `date de réalisation + fréquence` (un entretien repart du jour où il a été fait) |

Une échéance dépassée **reste** dépassée : rien n'avance tout seul. La date ne
change que sur validation explicite, ou sur modification de l'obligation.

---

## Stack

Next.js (App Router) · TypeScript strict · Tailwind CSS · Supabase (PostgreSQL,
Auth, RLS) · Zod · React Hook Form · Radix UI · Web Push (VAPID) · Vitest.

Déployable tel quel sur **Vercel Hobby** : un seul cron quotidien.

---

## Installation

```bash
npm install
cp .env.example .env.local
```

### 1. Créer le projet Supabase

1. Créer un projet sur [supabase.com](https://supabase.com).
2. **Project Settings → API** : copier `Project URL` et la clé publique
   (`anon` / `publishable`) dans `.env.local` :

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=…
   ```

3. Copier aussi la clé `service_role` dans `SUPABASE_SERVICE_ROLE_KEY`.
   Elle contourne le RLS et n'est utilisée que par le cron de rappels :
   **jamais** de préfixe `NEXT_PUBLIC_`, jamais côté navigateur.

### 2. Appliquer les migrations

Dans **SQL Editor** du dashboard Supabase, exécuter dans l'ordre :

```
supabase/migrations/0001_initial_schema.sql
supabase/migrations/0002_reminders_and_push.sql
supabase/migrations/0003_row_level_security.sql
supabase/migrations/0004_functions.sql
supabase/migrations/0005_documents.sql   ← optionnel (préparation documents)
```

Ou avec la CLI Supabase, si le projet est lié :

```bash
npx supabase link --project-ref <ref>
npx supabase db push
```

Vérifier ensuite dans **Authentication → Policies** que les six tables affichent
bien « RLS enabled ».

### 3. Créer son compte

```bash
npm run dev
```

Ouvrir <http://localhost:3000>, cliquer sur **Créer un compte**. Selon la
configuration Supabase, un email de confirmation peut être demandé
(**Authentication → Providers → Email**).

Comme l'application est personnelle, il est recommandé de désactiver les
inscriptions une fois son compte créé :
**Authentication → Sign In / Providers → Allow new users to sign up** → off.

### 4. Données de démonstration (optionnel)

```bash
npm run seed -- mon-email@exemple.com
```

Crée quatre biens et treize obligations, avec des échéances calculées
relativement à aujourd'hui : une assurance dans 8 jours, une électricité dans
13 jours, une assurance habitation en retard de 7 jours. Ajouter `--force` pour
peupler un compte qui contient déjà des biens.

---

## Développement

```bash
npm run dev         # serveur de développement
npm run lint        # ESLint
npm run typecheck   # TypeScript, mode strict
npm run test        # tests unitaires (Vitest)
npm run build       # build de production
```

### Tests unitaires

`npm run test` couvre la logique métier, indépendante de React et de la base :
arithmétique des dates (fuseaux, heure d'été, années bissextiles, changements
d'année), moteur de récurrence dans les deux bases de calcul, rattrapage des
retards, statuts, formatage monétaire multi-devises, et déclenchement des
rappels avec anti-doublon.

### Tests de base de données (optionnel, nécessite PostgreSQL en local)

```bash
npm run test:db
```

Applique les migrations sur une base jetable et vérifie, au niveau PostgreSQL,
qu'un utilisateur ne peut ni lire, ni modifier, ni supprimer les données d'un
autre — y compris en connaissant les identifiants exacts. Vérifie aussi les
contraintes métier, la transaction « marquer comme effectué », son annulation et
l'unicité des rappels. Ne nécessite pas de projet Supabase : le shim
`supabase/tests/00_supabase_shim.sql` recrée le minimum nécessaire.

---

## Déploiement sur Vercel

1. Importer le dépôt sur [vercel.com](https://vercel.com/new).
2. **Settings → Environment Variables** — pour *Production*, *Preview* et
   *Development* :

   | Variable                        | Obligatoire | Rôle |
   | ------------------------------- | :---------: | ---- |
   | `NEXT_PUBLIC_SUPABASE_URL`      | ✅ | URL du projet Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Clé publique, protégée par le RLS |
   | `SUPABASE_SERVICE_ROLE_KEY`     | ✅ | Cron de rappels uniquement — serveur |
   | `CRON_SECRET`                   | ✅ | Protège `/api/cron/reminders` |
   | `NEXT_PUBLIC_VAPID_PUBLIC_KEY`  | ⬜ | Notifications push |
   | `VAPID_PRIVATE_KEY`             | ⬜ | Notifications push — serveur |
   | `VAPID_SUBJECT`                 | ⬜ | `mailto:…` exigé par la spec Web Push |
   | `RESEND_API_KEY`                | ⬜ | Rappels email |
   | `REMINDER_FROM_EMAIL`           | ⬜ | Expéditeur, ex. `Patrimoine <p@exemple.com>` |

   Générer `CRON_SECRET` avec `openssl rand -base64 32`.

3. Déployer. `vercel.json` déclare le cron quotidien ; aucune autre
   configuration n'est nécessaire.

Sans les variables optionnelles, l'application fonctionne normalement : les
rappels push et email sont simplement ignorés, les alertes in-app restent
actives.

---

## Le rappel quotidien

`vercel.json` déclare un unique cron :

```json
{ "crons": [{ "path": "/api/cron/reminders", "schedule": "0 7 * * *" }] }
```

Une exécution par jour à 07:00 UTC — compatible avec le plan Hobby, qui
n'autorise pas les crons plus fréquents. Vercel appelle la route avec
l'en-tête `Authorization: Bearer $CRON_SECRET` ; sans secret valide, elle
répond `401`. Si `CRON_SECRET` n'est pas défini, la route refuse de s'exécuter
plutôt que de rester ouverte.

À chaque passage, pour chaque obligation active :

1. « aujourd'hui » est calculé **dans le fuseau de l'utilisateur** ;
2. si `jours restants` figure dans `reminder_days_before`, un rappel est
   candidat — une obligation dépassée en produit un aussi, une seule fois par
   échéance ;
3. `reminder_logs` est consulté : un rappel déjà envoyé n'est jamais renvoyé ;
4. la notification push part vers **tous** les appareils de l'utilisateur ;
5. l'email part, en un seul message regroupant ses échéances, si
   `RESEND_API_KEY` est configurée et les rappels email activés ;
6. chaque envoi est journalisé.

La contrainte d'unicité `(obligation_id, due_date, days_before, channel)` est ce
qui garantit l'absence de doublon : rejouer le cron n'envoie rien deux fois.

Pour déclencher le job à la main :

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<domaine>/api/cron/reminders
```

---

## Résolution de problèmes

### « Internal Server Error » après un déploiement Vercel

C'est presque toujours une variable d'environnement absente. `NEXT_PUBLIC_SUPABASE_URL`
et `NEXT_PUBLIC_SUPABASE_ANON_KEY` sont les deux seules variables indispensables.

L'application le détecte et affiche un écran nommant les variables manquantes —
si tu vois une vraie page « Internal Server Error » sans explication, c'est que le
déploiement est antérieur à cette détection : redéploie.

> **Le piège Vercel :** les variables préfixées `NEXT_PUBLIC_` sont lues par le
> navigateur, donc figées au moment du build. Les ajouter dans Settings →
> Environment Variables ne suffit pas : il faut **redéployer** pour qu'elles
> soient prises en compte. Deployments → ⋯ → Redeploy.

### « Base de données non initialisée »

La connexion à Supabase fonctionne mais les tables n'existent pas : les migrations
n'ont pas été appliquées. Voir [Appliquer les migrations](#2-appliquer-les-migrations).

### La page reste bloquée sur la connexion

Vérifie dans Supabase, **Authentication → Providers → Email**, si la confirmation
par email est exigée. Le compte doit être confirmé avant de pouvoir se connecter.

### Un projet Supabase gratuit se met en pause

Après une période d'inactivité, un projet du plan gratuit est suspendu et
l'application affiche « Base de données injoignable ». Il se réveille depuis le
dashboard Supabase.

### Le cron ne s'exécute pas

Le plan Hobby n'autorise qu'un déclenchement par jour, et Vercel n'appelle les
crons que sur le déploiement de production. Pour tester immédiatement :

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<domaine>/api/cron/reminders
```

La réponse JSON indique le nombre de push envoyés, d'emails envoyés ou ignorés,
et les erreurs éventuelles.

---

## Notifications push

Web Push standard, avec VAPID. Aucun service tiers, aucun abonnement payant :
les push passent par les services natifs des navigateurs.

**Générer les clés une seule fois :**

```bash
npm run generate:vapid
```

Placer les trois valeurs dans `.env.local` puis dans Vercel. **Ne jamais
régénérer ces clés après un déploiement** : tous les abonnements existants
deviendraient invalides.

**Activer sur un appareil :** *Paramètres → Notifications sur cet appareil →
Activer*. La permission n'est jamais demandée automatiquement. Chaque appareil
s'abonne séparément : iPhone, Mac et PC peuvent recevoir les mêmes rappels.
Le bouton **Envoyer une notification test** vérifie d'un coup les clés VAPID, le
Service Worker, la base et les permissions du navigateur.

**Sur iPhone et iPad**, la Push API n'existe qu'en application installée :
ajouter Patrimoine à l'écran d'accueil, l'ouvrir depuis là, puis activer. Les
Paramètres affichent cette aide uniquement aux appareils concernés.

Un abonnement auquel le service push répond `404` ou `410` est supprimé
automatiquement.

---

## Structure

```
app/
  (auth)/login/            connexion
  (app)/                   écrans protégés (dashboard, biens, échéances,
                           historique, paramètres)
  api/cron/reminders/      job quotidien, protégé par CRON_SECRET
  api/export/              export CSV et sauvegarde JSON
actions/                   Server Actions — la seule voie d'écriture
lib/
  recurrence/              moteur de fréquence — pur, testé
  dates/                   arithmétique des dates métier
  reminders/               règles de déclenchement, envoi, email
  push/                    Web Push serveur, payloads, encodage VAPID
  supabase/                clients navigateur, serveur, service-role
  validation/              schémas Zod
components/                UI, sans logique métier
supabase/migrations/       schéma, RLS, fonctions transactionnelles
supabase/tests/            tests d'isolation PostgreSQL
tests/                     tests unitaires
```

Les calculs de dates ne vivent qu'à un seul endroit : `lib/recurrence`. Aucun
composant React ne recalcule d'échéance.

---

## Sécurité

- **Row Level Security** sur les six tables, avec `auth.uid() = user_id` pour
  `SELECT`, `INSERT`, `UPDATE` et `DELETE`. Le frontend ne protège rien.
- Les obligations référencent `(asset_id, user_id)` : la base rend
  structurellement impossible de rattacher une obligation au bien d'un autre.
- Validation Zod **côté serveur** dans chaque Server Action, avant toute
  écriture. Vérification d'authentification par `getUser()`, qui revalide le
  jeton auprès de Supabase.
- « Marquer comme effectué » passe par une fonction PostgreSQL : historique et
  échéance sont écrits dans la même transaction.
- La clé service-role n'est jamais exposée au navigateur (`server-only`), la clé
  privée VAPID non plus.
- Les notifications ne transportent que le nom de l'obligation, le bien et la
  date — ni montant, ni note, ni jeton.

---

## Ce que fait l'application

Dashboard — quatre indicateurs et la liste des prochaines échéances, triée, avec
les retards en tête · Biens et véhicules avec sous-types, pays, ville, devise ·
Obligations typées et catégorisées, montant facultatif · Validation en un clic
avec recalcul automatique et annulation · Historique immuable, avec montant
prévu figé et écart · Rappels in-app, push et email · Export CSV et sauvegarde
JSON · Archivage réversible · PWA installable.

## Ce qu'elle ne fait pas

Ni comptabilité, ni OCR, ni synchronisation bancaire, ni conversion de devises,
ni collaboration. Les montants de devises différentes sont affichés séparément,
jamais additionnés.
