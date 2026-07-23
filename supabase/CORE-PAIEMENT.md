# Intégration paiement — Core by Carlo

Ce document décrit ce qui est codé, et ce qu'il restera à faire une fois votre
compte partenaire Core créé. **Rien n'est actif tant que les secrets ne sont pas
renseignés** (les tarifs notamment).

## Ce qui est codé

**Base de données** (`supabase/migration-core.sql`)
- Colonnes ajoutées à `profiles` : `core_card_id`, `plan_period`, `current_period_end`.
- Table `payments` (audit + idempotence des callbacks).

**Edge Functions** (`supabase/functions/`)
- `core-register-card` — enregistre la carte du client (page hébergée Core) et renvoie l'URL.
- `core-charge` — déclenche le 1er prélèvement (MIT) sur la carte enregistrée.
- `core-callback` — reçoit les notifications Core, **re-vérifie** chaque transaction via
  `GET /transactions/{id}` (la doc Core n'ayant pas de signature de webhook), et active
  l'abonnement de façon idempotente.
- `_shared/core.ts` — login Core (token mis en cache), appels API, montants.

**Frontend** (`dashboard.html`)
- Deux boutons : « S'abonner — mensuel » et « S'abonner — annuel ».
- Gère le retour depuis la page hébergée (enregistrement carte → 1er prélèvement).
- Rafraîchit le profil après paiement (l'activation réelle vient du callback).

Les anciennes fonctions Stripe ont été supprimées.

## Modèle d'abonnement Core (à connaître)

Core ne renouvelle **pas** les abonnements tout seul. Le flux est :
1. Le client enregistre sa carte une fois → `cardId` stocké.
2. Le serveur prélève ce `cardId` (1er paiement).
3. **Renouvellement** : à chaque échéance, le serveur doit re-prélever (MIT).
   → Cette tâche planifiée (pg_cron) est prévue en **2ᵉ temps**, pas encore codée.

## À faire une fois le compte Core créé

1. **Créer le compte partenaire** Core by Carlo (sandbox d'abord).

2. **Récupérer l'API key** : Dashboard Core → Checkout → Configuration.

3. **Configurer les 3 URL** dans ce même écran Core :
   - Success URL : `https://VOTRE-DOMAINE/dashboard.html?card=saved`
   - Failure URL : `https://VOTRE-DOMAINE/dashboard.html?card=error`
   - **Callback URL** : `https://jlvzpqfafaubxphojoqg.supabase.co/functions/v1/core-callback`
     (c'est l'URL de l'Edge Function ; doit être en https).

4. **Renseigner les secrets Supabase** (Dashboard Supabase → Edge Functions → Secrets,
   ou via CLI `supabase secrets set`) :
   ```
   CORE_EMAIL=...             # email du compte partenaire Core
   CORE_PASSWORD=...          # mot de passe du compte partenaire
   CORE_API_KEY=...           # clé API Core
   CORE_API_BASE=https://sandbox-api.corebycarlo.com/api/v1/partner
   CORE_AUTH_BASE=https://sandbox-api.corebycarlo.com/api/v1/auth/partner
   SITE_URL=https://VOTRE-DOMAINE          # sans slash final
   CORE_PRICE_MONTHLY=0       # ⚠️ à définir (ex. 9.90) — le paiement échoue tant que = 0
   CORE_PRICE_ANNUAL=0        # ⚠️ à définir (ex. 99)
   ```
   Pour la **production**, remplacer les deux bases par les URL sans `sandbox-`
   (à confirmer auprès de Core).

5. **Déployer les Edge Functions** :
   ```
   supabase functions deploy core-register-card
   supabase functions deploy core-charge
   supabase functions deploy core-callback
   ```
   Note : `core-callback` doit être accessible **sans** authentification (Core l'appelle
   sans JWT Supabase). Le déployer avec l'option `--no-verify-jwt`.

6. **Exécuter la migration** `supabase/migration-core.sql` dans SQL Editor.

7. **Tester en sandbox** avec les cartes de test Core
   (https://documentation.corebycarlo.com/api-reference/overview/test-cards).

## Sécurité (déjà pris en compte dans le code)

- Identifiants et token Core : uniquement dans les Edge Functions, jamais côté navigateur.
- Callbacks non signés → chaque transaction est re-vérifiée via `GET /transactions/{id}`
  avant d'activer un abonnement. Ne jamais activer sur la seule foi du corps reçu.
- Idempotence des callbacks via `order_reference` (unique) et `core_transaction_id`.

## Reste à faire (2ᵉ temps)

- Tâche planifiée pg_cron pour le renouvellement automatique mensuel/annuel.
- Gestion des échecs de renouvellement (relances, passage en `past_due`, email au client).
- Écran « Gérer mon abonnement » (changer de carte, résilier).
- Définir les tarifs définitifs.
