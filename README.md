# TipTop — SaaS (technique)

Architecture : frontend statique (hébergé chez OVH)
+ Supabase (Postgres, Auth, Realtime, région Frankfurt) + Core by Carlo (paiements).

## Décisions actées dans cette conversation

| Aspect | Décision |
|---|---|
| Modèle commercial | SaaS multi-clients, self-service |
| Backend | Supabase, région **Frankfurt (eu-central-1)** |
| Facturation | **Core by Carlo** (prestataire monégasque), abonnement mensuel + annuel — **tarifs à définir** (secrets `CORE_PRICE_*`) |
| Connexion | Email/mot de passe + Google OAuth |
| Hébergement frontend | **OVH** (mutualisé), domaine acheté chez OVH |

Pourquoi Core by Carlo plutôt que Stripe/Mollie : ces derniers n'acceptent pas les sociétés
monégasques (hors EEE). Core est un prestataire de Monaco, reversant sur compte bancaire
monégasque. Tarif Core : 2 % + 0,20 € par transaction, sans abonnement ni engagement.

**Modèle d'abonnement Core (différent de Stripe)** : Core ne renouvelle PAS automatiquement.
Le flux est : (1) le client enregistre sa carte une fois sur une page hébergée Core →
`cardId` ; (2) le serveur débite ce `cardId` (endpoint MIT `rebill`) pour le 1er paiement ;
(3) une tâche planifiée (pg_cron, **à ajouter en 2ᵉ temps**) re-débitera à chaque échéance.

**Non résolu** : la collaboration par lien public (n'importe qui avec le lien édite sans
compte, feature de la v1.x) n'est pas reprise — voir note en fin de `supabase/schema.sql`.
Chaque événement est désormais privé au compte qui l'a créé.

## Fichiers

```
index.html            Page d'accueil (marketing)
auth.html             Connexion / inscription
dashboard.html         Liste des événements du client connecté, gestion abonnement
event.html             Éditeur de plan de table (v1.2.0 adaptée à Supabase)
shared/
  supabase-config.js   URL + clé publique Supabase (à renseigner), helpers auth
supabase/
  schema.sql            Tables, policies RLS, triggers — à exécuter dans Supabase
  migration-core.sql     Colonnes Core (core_card_id, plan_period, current_period_end) + table payments
  functions/
    _shared/core.ts           Helpers Core (login + cache token, appels API)
    core-register-card/       Edge Function : lance l'enregistrement de carte (page hébergée)
    core-charge/              Edge Function : 1er prélèvement (MIT) sur la carte enregistrée
    core-callback/            Edge Function : reçoit les webhooks Core, active l'abonnement
```

## Mise en place, étape par étape

### 1. Créer le projet Supabase
1. https://supabase.com → New Project → région **Frankfurt (eu-central-1)**.
2. Project Settings > API → copier `Project URL` et `anon public key`.
3. Coller ces deux valeurs dans `shared/supabase-config.js`.
4. SQL Editor → coller et exécuter `supabase/schema.sql`, PUIS `supabase/migration-core.sql`.
5. Authentication > Providers → activer **Google** (nécessite un OAuth Client ID/Secret
   Google Cloud Console — écran de consentement + URI de redirection Supabase à renseigner).
6. Authentication > URL Configuration → ajouter l'URL du site une fois le domaine acheté.

### 2. Configurer Core by Carlo
1. Demander à Core l'accès **sandbox** (email, mot de passe partenaire, clé API sandbox).
   Aucun document requis pour le sandbox ; les documents (RCI, statuts, RIB, pièces
   d'identité, registre des bénéficiaires…) ne servent qu'à l'ouverture du compte de
   **production**, après validation des tests.
2. Dans le Dashboard Core > **Checkout → Configuration**, renseigner :
   - Success URL : `https://votre-domaine.fr/dashboard.html?card=saved`
   - Failure URL : `https://votre-domaine.fr/dashboard.html?card=error`
   - **Callback URL** : `https://VOTRE-PROJET.supabase.co/functions/v1/core-callback`
3. Récupérer la clé API (même écran).

### 3. Déployer les Edge Functions (Supabase CLI)
```bash
npm install -g supabase
supabase login
supabase link --project-ref VOTRE_PROJECT_REF

# Identifiants Core (NE JAMAIS exposer côté navigateur) :
supabase secrets set CORE_EMAIL=partenaire@votredomaine.fr
supabase secrets set CORE_PASSWORD=...
supabase secrets set CORE_API_KEY=...
# Sandbox (défaut) ou production : basculer ces deux URLs pour passer en prod.
supabase secrets set CORE_API_BASE=https://sandbox-api.corebycarlo.com/api/v1/partner
supabase secrets set CORE_AUTH_BASE=https://sandbox-api.corebycarlo.com/api/v1/auth/partner
# Tarifs (en euros) — à renseigner une fois fixés :
supabase secrets set CORE_PRICE_MONTHLY=0
supabase secrets set CORE_PRICE_ANNUAL=0
supabase secrets set SITE_URL=https://votre-domaine.fr
# SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont injectées automatiquement.

supabase functions deploy core-register-card
supabase functions deploy core-charge
supabase functions deploy core-callback --no-verify-jwt
```
Note : `core-callback` doit être déployée avec `--no-verify-jwt` (Core l'appelle sans JWT
Supabase). Sa sécurité repose sur la re-vérification de chaque transaction via
`GET /transactions/{id}` (la doc Core n'expose pas de signature de webhook).

### 4. Déployer le frontend
Fichiers statiques (`index.html`, `auth.html`, `dashboard.html`, `event.html`, `.htaccess`,
`shared/`) : à déposer dans le dossier `www` de l'hébergement mutualisé **OVH** (domaine +
hébergement souscrits ensemble). Aucune étape de build. Voir `GUIDE-DEPLOIEMENT.md` (Outil 4)
pour la procédure détaillée. Le `.htaccess` fourni force le HTTPS et désactive le listage des
dossiers. Ne pas déposer le dossier `supabase/` sur l'hébergement web (il ne sert qu'à Supabase).

### 5. Domaine et hébergement (OVH)
Domaine + hébergement mutualisé souscrits ensemble chez OVH. Déposer le contenu de
`tiptop-saas` (hors `supabase/`) dans le dossier `www`, activer « Forcer HTTPS », puis
renseigner l'URL du domaine dans Supabase Authentication > URL Configuration (Site URL +
Redirect URLs) et dans le secret `SITE_URL` des Edge Functions. Procédure détaillée pour
non-développeur dans `GUIDE-DEPLOIEMENT.md`, Outil 4.

## Tester en local
Un simple serveur statique suffit (les appels Supabase se font depuis le navigateur) :
```bash
python3 -m http.server 8080
```
Puis ouvrir `http://localhost:8080`.

## Points restant à trancher
- Tarifs par formule et périodicité (renseigner `CORE_PRICE_MONTHLY` / `CORE_PRICE_ANNUAL`).
- **Renouvellement automatique** : tâche planifiée pg_cron à ajouter (2ᵉ temps) — pour chaque
  profil dont `current_period_end` est atteint, rappeler le prélèvement MIT sur `core_card_id`.
- Gestion des échecs de renouvellement (relances, période de grâce, passage `past_due`).
- Modèle de collaboration par lien (si nécessaire pour des invités externes sans compte).
- Politique de confidentialité / CGV / CGU (obligatoires avant mise en ligne commerciale,
  hors périmètre technique).
