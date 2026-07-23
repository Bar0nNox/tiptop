# Roadmap — TipTop

Suivi des fonctionnalités. Format par élément : besoin, décisions prises, statut.

## Livré

### v1.3.0 — Zoom, noms adaptatifs, orientations, export enrichi

**Zoom / dézoom du plan**
- Déclencheurs : molette, pincé tactile (2 doigts), boutons +/− et bouton reset.
- Bornes : 40 % à 250 %, pas de 12 %.
- Local et non sauvegardé (confort d'affichage propre à chaque écran).
- Point technique résolu : le drag des tables divise ses deltas par le facteur de
  zoom (`onTablePointerMove`, `centerOfView`) — validé par test (100 px écran à 148 %
  = 68 px dans le plan).

**Noms sur les sièges (adaptatif)**
- Initiales par défaut ; nom complet affiché quand le zoom dépasse 135 % (`FULLNAME_ZOOM`)
  ou au survol/clic (infobulle `data-name`).
- Bascule via la classe CSS `.show-fullnames` sur le `.floor`.

**Étiquettes d'orientation sur les bords**
- Quatre étiquettes éditables (haut/bas/gauche/droite) pour situer l'ensemble
  (ex. Mer, Jardin, Cuisine, Entrée).
- Contenu de l'événement : sauvegardé dans `state.edges` et partagé en temps réel.
- Reprises dans l'export PNG (sur les 4 bords, gauche/droite en rotation).

**Export PNG enrichi**
- Sous chaque siège occupé : nom complet + tag de régime/allergie (champ `diet`).
- Marges d'export élargies pour ne pas couper les textes ; étiquettes d'orientation incluses.

## Tarification et essai (décidé)

- **Formule unique au lancement — « Particulier »** : 9,90 €/mois ou 89,90 €/an
  (annuel ≈ 10 mois payés). Secrets `CORE_PRICE_MONTHLY` / `CORE_PRICE_ANNUAL`.
- **Formule « Pro »** (planners, traiteurs, lieux) : reportée à une MAJ ultérieure
  qui apportera des fonctionnalités différenciantes. Ordre de grandeur envisagé :
  39 €/mois ou 390 €/an. Nécessitera 4 tarifs (2 formules × 2 périodicités) et le
  passage de la formule choisie jusqu'à `core-charge`.
- **Essai gratuit : 14 jours, carte enregistrée à l'inscription.**
  - Limite pendant l'essai : **1 seul événement sur toute la durée de l'essai**
    (cumul, et non « en simultané ») — supprimer son événement ne redonne pas droit
    à un nouveau.
  - Implication : compter les événements existants ne suffit pas. Il faut un
    compteur qui ne redescend jamais, ex. colonne `trial_events_used int not null
    default 0` sur `profiles`, incrémentée à chaque création pendant l'essai.
  - Le contrôle doit être **côté base de données** (trigger `before insert` sur
    `events` qui refuse si `subscription_status = 'trialing'` et
    `trial_events_used >= 1`). Un contrôle uniquement dans le navigateur est
    contournable. Le blocage côté interface reste utile pour le confort (message
    clair, bouton désactivé), mais ne fait pas foi.
  - Statut `subscription_status = 'trialing'`, `current_period_end = now + 14 jours`.
  - Le prélèvement à J+14 impose la tâche planifiée (voir ci-dessous).
- Commission Core à titre indicatif : 2 % + 0,20 € → ~4 % effectifs sur 9,90 €,
  ~2,2 % sur 89 €. L'annuel est nettement plus rentable, à mettre en avant.

### Prérequis technique remonté en priorité
Le renouvellement automatique (tâche planifiée pg_cron) n'est plus un « 2ᵉ temps » :
l'essai de 14 jours impose un prélèvement différé, donc un déclencheur côté serveur.
À construire avant toute mise en ligne commerciale.

## Backlog (à préciser avant implémentation)

*Format : besoin + points à trancher + version cible envisagée. Aucune implémentation
tant que les points ne sont pas tranchés.*

### Connexion « Se connecter avec Apple »
- Techniquement supporté par Supabase (provider Apple).
- Prérequis : compte Apple Developer payant (99 $/an).
- Config plus lourde que Google : App ID + Services ID + clé privée ; le secret est un
  JWT qui expire et doit être renouvelé tous les 6 mois.
- Obligation Apple : si une app iOS native propose d'autres connexions sociales, « Sign in
  with Apple » devient obligatoire. Ne s'applique PAS à une web app pure.
- Statut : non prioritaire, ajoutable plus tard sans rien casser (juste un provider de plus).

### Paiement Apple — clarification (pas une simple option)
- **Apple Pay** (carte via Face/Touch ID) : simple moyen de paiement, fourni par le
  prestataire de paiement retenu (Paddle, Lemon Squeezy…). À activer quand le paiement
  sera en place.
- **Abonnement via l'App Store / iCloud (In-App Purchase)** : réservé aux apps iOS
  NATIVES sur l'App Store — NON disponible pour une web app. Impliquerait de construire
  une app native et d'accepter la commission Apple (15–30 %, vs ~5 % pour un MoR).
  Décision structurante à examiner séparément si l'App Store devient un objectif.

### Paiement Core by Carlo — état
- Codé : enregistrement de carte + 1er prélèvement + callback vérifié (voir
  `supabase/CORE-PAIEMENT.md`). Anciennes fonctions Stripe supprimées.
- Reste à faire : renouvellement auto (cron pg_cron), écran « gérer l'abonnement »,
  gestion des échecs de renouvellement, définition des tarifs (CORE_PRICE_*).
- Non activable tant que le compte partenaire Core n'est pas créé et les secrets
  renseignés.

## Notes transverses

- Le champ « allergie » utilise le champ existant `diet` (notes de régime) du modèle
  invité ; il n'y a pas de champ allergie distinct. À créer si une distinction
  régime/allergie devient nécessaire.
- Le zoom étant local, il n'entre pas en conflit avec la synchronisation temps réel
  (deux appareils peuvent avoir des zooms différents sur le même événement).
