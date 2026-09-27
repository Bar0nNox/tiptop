# TipTop — SaaS (technique)

Architecture : frontend statique (hébergé chez OVH)
+ Supabase (Postgres, Auth, Realtime, Edge Functions, pg_cron — région Frankfurt)
+ Core by Carlo (paiements). En production sur `https://tiptopplans.com`.

> **Documents de référence** : `ROADMAP.md` (état des chantiers), `CONTEXTE.md`
> (méthode et pièges de code), `INFRA.md` (configuration des services tiers —
> secrets, dashboard Core, pg_cron). Ce fichier n'en donne que la vue d'ensemble ;
> **en cas de divergence, `INFRA.md` fait foi.**

## Décisions structurantes

| Aspect | Décision |
|---|---|
| Modèle commercial | SaaS multi-clients, self-service, clientèle internationale (FR / EN) |
| Backend | Supabase, région **Frankfurt (eu-central-1)** |
| Facturation | **Core by Carlo** (prestataire monégasque), **en production depuis le 25/08/2026**. Mensuel 9,90 € / annuel 89,90 € — montants en base, table `app_pricing` |
| Essai | 14 jours sans carte, un seul événement |
| Connexion | E-mail/mot de passe + Google OAuth |
| Hébergement frontend | **OVH** mutualisé, dépôt par GitHub Actions (§5.7 du roadmap) |

Pourquoi Core by Carlo plutôt que Stripe/Mollie : ces derniers n'acceptent pas les sociétés
monégasques (hors EEE). L'intégration Stripe initiale a été abandonnée ; ses dernières
colonnes ont été supprimées en v1.22.0 (`migration-drop-stripe.sql`).

**Modèle d'abonnement Core** : Core ne renouvelle PAS automatiquement.
(1) le client enregistre sa carte sur une page hébergée Core → `cardId` ;
(2) `core-charge` débite ce `cardId` (prélèvement MIT `rebill`) ;
(3) la tâche planifiée `core-renew` (pg_cron, 04:00 UTC) re-débite à chaque échéance.
`core-callback` confirme chaque transaction en la **re-vérifiant** par
`GET /transactions/{id}` — Core ne signe pas ses webhooks.

## Fichiers

```
index.html  auth.html  reset.html  dashboard.html  account.html
event.html             Éditeur de plan de table — porte APP_VERSION
join.html              Acceptation d'une invitation à collaborer
unsubscribe.html       Désabonnement des relances de fin d'essai
shared/                theme.css, i18n.js, ui-modal.js, theme-switch.js,
                       supabase-config.js, icônes
emails/                Gabarits Supabase Auth, à coller au dashboard (jamais déposés)
supabase/
  schema.sql           Schéma de base
  migration-*.sql      Migrations, à exécuter dans l'ordre de leur version
                       (v1.23.0 : migration-decor-scope.sql et migration-venues.sql
                       AVANT le dépôt des pages)
  cron-*.sql           Tâches pg_cron
  functions/           Edge Functions (Core, collaboration, relances, compte)
tests/                 Bancs d'essai, exécutés par `node` depuis ce dossier
deploy/                Liste blanche et contrôles du dépôt automatisé
```

## Mise en place

La procédure pas à pas est dans `GUIDE-DEPLOIEMENT.md`. Les points suivants
résument ce qui ne se devine pas.

### Supabase
1. SQL Editor → `schema.sql`, puis les migrations. **Les éprouver d'abord sur un
   PostgreSQL local** (§7 du roadmap) — un index refusé ou une fonction qui ne
   compile pas n'apparaît pas à la relecture.
2. Authentication : providers, URL Configuration, SMTP Resend, gabarits — cf. `INFRA.md`.

### Core by Carlo
1. Dashboard Core, **Developer > Configuration > Webhooks** : un seul champ,
   `Endpoint URL` = `https://<projet>.supabase.co/functions/v1/core-callback`.
   **Les URLs de succès et d'échec ne se configurent pas au dashboard** : les fonctions
   les transmettent à chaque appel, à partir du secret `SITE_URL`.
2. L'environnement (sandbox ou production) est choisi **uniquement** par les secrets
   `CORE_API_BASE` et `CORE_AUTH_BASE`. Depuis la v1.21.3, `_shared/core.ts` **lève** si
   `CORE_API_BASE` est absent : aucun repli silencieux sur le sandbox.

### Edge Functions
```bash
supabase link --project-ref <ref>
supabase secrets set CORE_EMAIL=… CORE_PASSWORD=… CORE_API_KEY=…
supabase secrets set CORE_API_BASE=https://api.corebycarlo.com/api/v1/partner
supabase secrets set CORE_AUTH_BASE=https://api.corebycarlo.com/api/v1/auth/partner
supabase secrets set SITE_URL=https://tiptopplans.com CRON_SECRET=…
supabase secrets set RESEND_API_KEY=…      # clé « Sending access » dédiée
supabase secrets list                      # contrôle de l'orthographe des noms

supabase functions deploy core-register-card
supabase functions deploy core-charge
supabase functions deploy account-actions
supabase functions deploy collab-invite
supabase functions deploy collab-join
# Sans vérification de JWT : leurs appelants n'ont pas de session.
supabase functions deploy core-callback --no-verify-jwt    # Core
supabase functions deploy unsubscribe --no-verify-jwt      # clients de messagerie
supabase functions deploy core-renew --no-verify-jwt       # pg_cron, protégée par x-cron-secret
supabase functions deploy trial-reminders --no-verify-jwt  # pg_cron, protégée par x-cron-secret
```
Les tarifs ne sont **pas** des secrets : ils vivent dans `app_pricing`
(`migration-pricing.sql`), lue par le navigateur et par les fonctions.
**Les secrets sont lus à l'import du module : redéployer après toute modification.**

### Frontend
Dépôt par le workflow `.github/workflows/deploy.yml` (déclenchement manuel), à partir
de la liste blanche `deploy/publish.json` et des contrôles de `deploy/preflight.py`.
Ne jamais déposer `supabase/`, `tests/`, `emails/`, `assets/` ni les `.md`.

## Tester en local
Un simple serveur statique suffit (les appels Supabase se font depuis le navigateur) :
```bash
python3 -m http.server 8080
```

## Points restant à trancher
Tenus à jour dans `ROADMAP.md` (§5). Le seul bloquant à l'ouverture commerciale est
la rédaction des documents légaux (CGV, CGU, politique de confidentialité), en français
et en anglais.
