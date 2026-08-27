# Patrimoine

Application personnelle pour suivre ses biens immobiliers, ses véhicules et
toutes les échéances récurrentes qui vont avec.

> Un seul endroit pour savoir ce qui arrive, quand, pour quel bien — et
> recalculer automatiquement la prochaine échéance à partir d'une fréquence
> exprimée en jours.

**Aucun serveur, aucune base de données, aucun compte.** Les données vivent
dans le navigateur. On clone, on lance, ça marche.

---

## Le principe

Une fréquence est **toujours un nombre entier de jours**. Ni « mensuel », ni
« trimestriel », ni « annuel » — nulle part. `30`, `90`, `365`, `45`, `400` :
la règle de calcul reste évidente.

Chaque obligation choisit sa **base de calcul** :

| Base                  | Après validation, la prochaine échéance est…            |
| --------------------- | ------------------------------------------------------- |
| `scheduled` — prévue  | `échéance prévue + fréquence` (payer en retard ne décale pas la série) |
| `completion` — réelle | `date de réalisation + fréquence` (un entretien repart du jour où il a été fait) |

Une échéance dépassée **reste** dépassée : rien n'avance tout seul. La date ne
change que sur validation explicite, ou sur modification de l'obligation.

---

## Démarrer

```bash
npm install
npm run dev
```

Ouvrir <http://localhost:3000>. C'est tout — pas de fichier `.env`, pas de
service à créer, pas de compte à ouvrir.

Pour explorer avec des données : **Paramètres → Mes données → Ajouter des
exemples**. Quatre biens, treize obligations, dont une en retard.

---

## Où sont mes données

Dans le `localStorage` de ton navigateur, sous une seule clé. Concrètement :

- elles ne quittent **jamais** l'appareil — aucune requête réseau ne part vers
  quoi que ce soit ;
- elles sont **propres à ce navigateur** : Chrome sur ton portable et Safari
  sur ton iPhone sont deux jeux de données distincts ;
- elles **disparaissent** si tu effaces les données du site.

D'où l'importance de **Paramètres → Mes données → Exporter**. Le fichier JSON
obtenu est ta sauvegarde, et c'est aussi ce qui te permet de reprendre sur un
autre appareil : il suffit de le restaurer là-bas.

L'application prévient si le stockage est indisponible — navigation privée,
quota atteint, cookies bloqués — plutôt que de perdre une saisie en silence.

---

## Notifications

Patrimoine affiche une vraie notification système pour les échéances qui
arrivent, **au moment où tu ouvres l'application**. Elle reste ensuite dans le
centre de notifications de l'appareil. À activer dans
**Paramètres → Notifications** ; la permission n'est jamais demandée
automatiquement.

**Ce que ça ne fait pas :** te notifier quand l'application est fermée. Une
notification push part toujours d'un serveur qui connaît tes échéances — sans
base de données, aucun serveur ne les connaît. C'est le prix, assumé, du
« zéro infrastructure ».

En pratique, la combinaison qui fonctionne bien :

- installer l'application sur l'écran d'accueil (elle est installable en PWA) ;
- la pastille sur l'icône affiche le nombre d'échéances en retard ou du jour ;
- l'ouvrir affiche les rappels et met tout à jour.

---

## Déploiement

Le projet se déploie tel quel sur n'importe quel hébergeur statique ou sur
Vercel : importer le dépôt, déployer. **Aucune variable d'environnement.**

```bash
npm run build
npm start
```

Toutes les pages sauf le détail d'un bien sont pré-rendues statiquement ; le
serveur ne sert que des fichiers, il ne détient aucune donnée.

---

## Développement

```bash
npm run dev         # serveur de développement
npm run lint        # ESLint
npm run typecheck   # TypeScript, mode strict
npm run test        # tests unitaires (Vitest)
npm run build       # build de production
```

### Tests

`npm run test` couvre toute la logique métier, indépendante de React :

- arithmétique des dates — fuseaux, heure d'été, années bissextiles,
  changements d'année ;
- moteur de récurrence dans les deux bases de calcul, rattrapage des retards,
  statuts ;
- opérations du magasin — validation, annulation, archivage en cascade,
  immuabilité de l'historique, tolérance d'un document corrompu ;
- déclenchement des rappels et anti-doublon ;
- formatage monétaire multi-devises, échappement CSV.

---

## Structure

```
app/
  (app)/                   les cinq écrans
components/                UI, sans logique métier
lib/
  store/                   le magasin local
    schema.ts              forme du document, migration, valeurs par défaut
    storage.ts             localStorage, tolérant aux pannes
    provider.tsx           accès React (useSyncExternalStore)
    mutations.ts           opérations métier — fonctions pures
    selectors.ts           vues dérivées (jamais stockées)
    demo.ts                données d'exemple
  recurrence/              moteur de fréquence — pur, testé
  dates/                   arithmétique des dates métier
  reminders/               règles de déclenchement
  notifications/           notifications système locales
  export/                  CSV et sauvegarde JSON
  validation/              schémas Zod
tests/                     tests unitaires
```

Les calculs de dates ne vivent qu'à un seul endroit : `lib/recurrence`. Aucun
composant React ne recalcule d'échéance. Les mutations sont des fonctions pures
`(état, entrée) → état` : c'est ce qui les rend directement testables.

---

## Ce que fait l'application

Dashboard — quatre indicateurs et la liste des prochaines échéances, triée, les
retards en tête · Biens et véhicules avec sous-types, pays, ville, devise ·
Obligations typées et catégorisées, montant facultatif · Validation en un clic
avec recalcul automatique et annulation · Historique immuable, montant prévu
figé et écart · Rappels in-app et notifications système à l'ouverture · Export
CSV, sauvegarde et restauration JSON · Archivage réversible · PWA installable ·
Synchronisation entre les onglets ouverts.

## Ce qu'elle ne fait pas

Ni comptabilité, ni OCR, ni synchronisation bancaire, ni conversion de devises,
ni collaboration, ni synchronisation entre appareils. Les montants de devises
différentes sont affichés séparément, jamais additionnés.

---

## Et si je veux un serveur plus tard

Le magasin est le seul point de contact avec la persistance :
`lib/store/storage.ts` pour la lecture/écriture, `lib/store/provider.tsx` pour
l'accès React. Les mutations et les sélecteurs, eux, ne savent pas où vivent
les données. Brancher une base reviendrait à réécrire ces deux fichiers — le
reste ne bougerait pas.

Une version complète avec Supabase, authentification, Row Level Security et
notifications push serveur existe dans l'historique git, au commit `e4fe4b6`.
