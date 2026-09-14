# INFRA — TipTop

> À déposer dans les connaissances du projet, avec `CONTEXTE.md` et `ROADMAP.md`.
> Ce fichier porte **où sont les choses, comment s'y connecter, et ce qui s'y casse**.
> Les conventions de travail sont dans `CONTEXTE.md`, l'état des chantiers dans
> `ROADMAP.md`.

## ⚠ Aucune valeur secrète ici

Ce fichier est relu à chaque conversation. Il porte les **noms** des secrets, les
URLs et les procédures — **jamais** une clé, un mot de passe, un jeton ni un IBAN.
Une clé API de production a déjà été exposée en clair sur une capture d'écran
(17/08/2026) et a dû être régénérée. Même règle pour les captures : masquer avant
d'envoyer.

Les valeurs vivent dans les secrets Supabase, les dashboards des prestataires et un
gestionnaire de mots de passe. Nulle part ailleurs.

---

## Vue d'ensemble

| Brique | Prestataire | Rôle |
|---|---|---|
| Frontend | OVH mutualisé (Starter) | fichiers statiques, dépôt FTP dans `www` |
| Domaine & DNS | OVH | `tiptopplans.com`, Anycast, DNSSEC, SSL Let's Encrypt |
| Backend | Supabase (Frankfurt) | Postgres, Auth, Realtime, Edge Functions, pg_cron |
| Paiement | Core by Carlo (Monaco) | abonnements, cartes enregistrées — **production**, versement à J+3 |
| E-mails | Resend | SMTP pour Supabase Auth + API HTTP pour les Edge Functions |
| Connexion | Supabase Auth + Google Cloud | e-mail/mot de passe et Google OAuth |

**Adresse postale de l'éditeur**, utilisée dans les pieds d'e-mails et les documents
légaux : Childish Agency, 4 Rue Baron de Sainte Suzanne, 98000 Monaco.

---

## OVH — hébergement, domaine, DNS

**Hébergement** mutualisé Starter. Les fichiers vont dans `www`.

| | |
|---|---|
| Serveur FTP | `ftp.cluster129.hosting.ovh.net` |
| Identifiant | `tiptopd` |

**Le serveur n'accepte pas le FTP sur TLS.** La commande `AUTH` reçoit
`500 This security scheme is not implemented`, en explicite comme en implicite.
C'est une limite de l'hébergement mutualisé OVH, non un réglage du client —
constaté le 14/09/2026 depuis GitHub Actions, et cohérent avec l'erreur 500
imputée jusque-là au client. **Identifiants et fichiers transitent donc en clair**,
depuis un client de bureau comme depuis le CI. La seule voie chiffrée chez OVH est
le **SFTP**, qui exige un accès SSH, donc l'offre **Professional ou supérieure** :
indisponible sur Starter.

**Ne pas déposer** `supabase/`, `tests/`, `assets/` ni les fichiers `.md` : ils ne
sont pas servis. `.htaccess` force HTTPS et désactive le listage des dossiers.

### Pièges de dépôt

**Le dépôt FTP n'efface jamais.** Il ajoute et remplace. Un fichier retiré d'une
version reste indéfiniment sur le serveur — le supprimer à la main.

**Contrôler les tailles après dépôt.** Un ZIP livré a déjà contenu deux fichiers à
zéro octet alors que les sources étaient intactes, rendant le site inutilisable. Les
valeurs de référence par version sont au §7 du roadmap, à relever à chaque livraison :
laissées à celles de la v1.7.0, le contrôle ne détectait plus rien.

**Fichiers iCloud non téléchargés.** Un dossier synchronisé peut contenir des fichiers
présents seulement dans le nuage ; un client FTP les transfère alors **vides**.
Décompresser les archives hors iCloud.

**Caches obstinés.** Safari conserve les favicons et l'état de sécurité TLS ; iOS
conserve les icônes d'écran d'accueil. Après un dépôt : rechargement forcé, et pour
l'icône, supprimer puis rajouter le raccourci. Sans cela, c'est la version précédente
qui est jugée.

### Domaine et DNS

`tiptopplans.com` en principal, `tiptop-plans.com` en défensif (redirection).

**La zone DNS de `tiptop-plans.com` est dans un état incohérent** — configuration de
parking héritée, partiellement écrasée. À traiter avec précaution ; un ticket au
support OVH peut être nécessaire si l'incohérence persiste.

**Ne jamais cocher « confirmer l'écrasement » sur une redirection existante.** La
procédure correcte est de **supprimer les enregistrements TXT puis A à la main** avant
d'ajouter la nouvelle redirection.

**`hello@tiptopplans.com` est en émission seule** (via Resend). Le recevoir exige des
enregistrements MX et la création explicite d'une boîte chez OVH — non fait à ce jour,
alors que le RGPD impose une adresse joignable dans les documents légaux.

---

## Supabase

Projet en région **Frankfurt (eu-central-1)**. Postgres, Auth, Realtime, Edge
Functions, pg_cron.

**`shared/supabase-config.js`** porte le Project URL et la clé **anon** — publiques par
conception, elles vivent dans le fichier livré. La clé **service role** ne quitte
jamais les Edge Functions.

### Authentication

- **Providers** : e-mail/mot de passe et **Google**. Le client OAuth est créé côté
  Google Cloud (voir plus bas).
- **URL Configuration** : Site URL, et en Redirect URLs au moins
  `https://tiptopplans.com/reset.html` — sans quoi le lien de récupération de mot de
  passe est refusé.
- **SMTP** : Resend (voir plus bas). Sans lui, la limite Supabase d'environ deux
  messages par heure bloquait toute inscription.
- **Gabarits d'e-mails** : à coller depuis `emails/` dans les onglets correspondants —
  `reset-password.html` → *Reset Password*, `confirm-signup.html`, `change-email.html`.
  **En anglais uniquement** : Supabase ne gère pas deux langues sur un même gabarit.
  Variable du lien de réinitialisation : `{{ .ConfirmationURL }}`.

### Secrets des Edge Functions

Noms attendus. `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont injectées
automatiquement.

| Secret | Usage |
|---|---|
| `CORE_EMAIL`, `CORE_PASSWORD`, `CORE_API_KEY` | identifiants partenaire Core |
| `CORE_API_BASE`, `CORE_AUTH_BASE` | **choisissent l'environnement Core** — voir ci-dessous |
| `CORE_PRICE_MONTHLY`, `CORE_PRICE_ANNUAL` | montants **en euros** (`9.90`, `89.90`) |
| `SITE_URL` | base des `successUrl` / `failedUrl` transmises à chaque appel |
| `CRON_SECRET` | en-tête `x-cron-secret` des fonctions appelées par pg_cron |
| `RESEND_API_KEY` | clé *Sending access* dédiée aux Edge Functions |
| `RESEND_FROM`, `RESEND_REPLY_TO` | optionnels — `RESEND_REPLY_TO` **non défini à ce jour** |

**`supabase secrets list` ne révèle pas les valeurs** mais confirme l'orthographe
exacte des noms — c'est précisément le contrôle qui manque partout ailleurs. Les
valeurs se lisent au dashboard, *Project Settings > Edge Functions > Secrets*.

**Une fois un secret écrasé, l'ancienne valeur n'est plus lisible.** Relever avant de
remplacer si l'on veut pouvoir revenir en arrière.

### Déploiement des fonctions

```bash
supabase link --project-ref <ref>
supabase functions deploy <nom>
```

Deux fonctions **doivent** être déployées sans vérification de JWT, leurs appelants
n'ayant pas de session :

- `core-callback` — sinon Core reçoit un 401 et aucun paiement n'est confirmé.
- `unsubscribe` — sinon Gmail reçoit un 401 sur le désabonnement en un clic, ce qui
  dégrade la réputation de l'expéditeur.

`--no-verify-jwt`, ou `verify_jwt = false` dans `config.toml`.

**Les variables d'environnement sont lues à l'import du module**, pas à l'appel : une
instance déjà chaude conserve les anciennes valeurs après un changement de secret.
**Toujours redéployer après avoir modifié un secret.**

### Tâches planifiées (pg_cron)

| Tâche | Heure UTC | Fonction |
|---|---|---|
| Renouvellements | 04:00 | `core-renew` |
| Relances de fin d'essai | 08:00 | `trial-reminders` |

L'écart de quatre heures est délibéré : la relance J+3 exige que la bascule de statut
ait eu lieu.

**Authentification par en-tête `x-cron-secret`**, jamais par clé de service en Bearer.

**Les noms de secrets Vault doivent être alignés** entre `cron-renew.sql` et
`cron-trial-reminders.sql` (`select name from vault.decrypted_secrets;`). Un nom erroné
ne lève aucune erreur : l'appel HTTP échoue silencieusement chaque nuit.

**`cron.job_run_details` ment par omission** — il rapporte le succès de l'appel SQL,
pas le code HTTP. Une tâche « succeeded » peut n'avoir rien envoyé. La vérité est dans
`net._http_response`, **que pg_net purge au bout de quelques heures** : le contrôle se
fait donc en matinée.

```sql
select created, status_code, content from net._http_response order by created desc limit 5;
```

### Pièges Postgres

**Tester la sécurité depuis le navigateur, jamais depuis le SQL Editor.** Celui-ci
s'exécute avec le rôle de service : `auth.uid()` y est nul et les protections de rôle
sont volontairement inactives. Un test de permission y donnerait un résultat trompeur.

**Un `update` refusé par RLS ne remonte aucune erreur** — PostgREST répond 204 avec
zéro ligne touchée. Toute écriture interdite doit être court-circuitée dans
l'interface, sous peine d'afficher « enregistré » sur un travail perdu.

**`timestamptz::date` est `STABLE`, pas `IMMUTABLE`** — inutilisable dans un index
fonctionnel (erreur 42P17).

**Exécuter les migrations en local** contre un PostgreSQL jetable avant livraison.

**Droits au niveau colonne** : le client ne peut écrire que `events(name, doc,
event_date)`, `event_invites(revoked_at)`, `profiles(lang)`. **Toute nouvelle colonne
écrite depuis le navigateur doit être explicitement autorisée**, sinon même le
propriétaire ne pourra pas l'enregistrer.

### Supprimer proprement un compte

**Tout est ancré sur `auth.users`, rien sur `public.profiles`** — aucune clé
étrangère ne pointe vers cette dernière. Supprimer la seule ligne `profiles`
laisserait un compte capable de se connecter mais sans statut d'abonnement ni
langue. **La suppression part toujours de `auth.users`.**

Carte des cascades, relevée le 26/08/2026 :

| Table | Colonne | `on delete` | Conséquence |
|---|---|---|---|
| `profiles` | `id` | CASCADE | — |
| `events` | `owner_id` | **CASCADE** | **les plans sont détruits** |
| `event_collaborators` | `user_id` | CASCADE | — |
| `event_collaborators` | `invited_by` | SET NULL | ligne conservée, détachée |
| `event_invites` | `created_by` | **SET NULL** | **le lien reste consommable** |
| `trial_emails` | `user_id` | CASCADE | — |
| `payments` | `user_id` | **SET NULL** | **la ligne survit, inidentifiable** |
| `auth.*` (identities, sessions, mfa_factors, one_time_tokens, oauth_*, webauthn_*) | `user_id` | CASCADE | — |

**Trois pièges, tous silencieux :**

- **`events` est en CASCADE.** Un plan à conserver doit être réattribué
  (`update events set owner_id = …`) **avant** le `delete` ; après, il n'existe plus.
- **`payments` est en SET NULL.** Une fois le `delete` passé, `user_id` vaut `null`
  et plus rien ne dit à qui la ligne appartenait. Pour un compte de test, la
  supprimer **avant**, dans la même transaction. Pour un compte réel, la conserver —
  obligation comptable — en sachant que `SET NULL` n'efface **pas** les autres
  colonnes identifiantes (`order_reference` porte l'UUID du compte).
- **`event_invites.created_by` est en SET NULL.** Un lien d'invitation créé par le
  compte supprimé sur un événement **appartenant à un tiers** survit sans être
  révoqué. À neutraliser explicitement :
  `update event_invites set revoked_at = now() where created_by in (…) and revoked_at is null;`

**Ce que le SQL ne fait pas.** `account-actions` supprime la carte chez Core
(`DELETE /cards/{cardId}`) avant la cascade. En SQL brut, **relever `core_card_id`
avant** : la ligne partie, la carte reste enregistrée chez Core sans moyen de la
retrouver. Même raisonnement pour une transaction de moins de 3 jours encore
annulable — relever `core_transaction_id`.

**Forme retenue.** Cibles données par **adresse explicite**, jamais par motif : un
`like '%test%'` attraperait une adresse légitime, et la cascade sur `events` est
irréversible. Une table temporaire porte les adresses, une assertion échoue si le
nombre de comptes trouvés diffère du nombre fourni — une adresse absente signifie
que l'on ne vise pas ce que l'on croit viser. Un second garde-fou refuse
nommément le compte propriétaire.

Exécuter **deux fois** : une première avec `rollback;` en dernière ligne, pour lire
l'inventaire (`core_card_id`, nombre d'événements et de paiements) sans rien
détruire ; une seconde à l'identique avec `commit;`. Le SQL Editor ne tient pas une
transaction entre deux envois, et n'affiche par défaut que le résultat de la
**dernière** requête.

**Le SQL Editor avertit « creates tables without RLS »** sur les tables
temporaires : sans objet, une table `temp` vit dans un schéma `pg_temp_*` propre à
la session et disparaît au `commit`. Répondre **« Run without RLS »** — le bouton
vert poserait un `alter table` inutile sur des tables en cours de suppression.

---

## Core by Carlo — paiement

**Compte de production ouvert et confirmé** (Childish Agency, 17/08/2026). Le passage
effectif est instruit au **§5.5 du roadmap**.

### URLs d'API

| | Sandbox | Production |
|---|---|---|
| `CORE_AUTH_BASE` | `https://sandbox-api.corebycarlo.com/api/v1/auth/partner` | `https://api.corebycarlo.com/api/v1/auth/partner` |
| `CORE_API_BASE` | `https://sandbox-api.corebycarlo.com/api/v1/partner` | `https://api.corebycarlo.com/api/v1/partner` |

**Ces deux secrets, et eux seuls, choisissent l'environnement.** Rien d'autre dans le
projet ne connaît le sandbox. `_shared/core.ts` **retombe silencieusement sur le
sandbox** si `CORE_API_BASE` est absent : les prélèvements « réussissent » et rien
n'est encaissé. Suppression du repli prévue en v1.21.2.

### Dashboard

Navigation réelle — **la documentation est périmée sur ce point**, elle annonce
« Checkout → Configuration ».

| Écran | Contenu |
|---|---|
| Developer > Configuration | clé API (régénérable), accès Webhooks |
| Developer > Configuration > **Webhooks** | **un seul champ**, `Endpoint URL` |
| Whitelisted IPs | **vide au 17/08/2026** — aucune restriction |
| Transactions | historique, pour recouper avec `payments` |
| Transfers | *moneyouts* — virements quotidiens, agrégés après commission |

**`Endpoint URL`** = `https://<projet>.supabase.co/functions/v1/core-callback`, en
`https`, exigé. **Les `successUrl` et `failedUrl` ne se configurent pas ici** : elles
sont transmises à chaque appel depuis `SITE_URL`.

### Conventions de l'API

- **Montants en euros**, décimaux (`9.90`). Pas de centimes.
- **Jeton valide 90 jours** ; `coreLogin()` en redemande un toutes les 24 h par
  prudence.
- **Aucune signature de webhook.** Chaque transaction est donc re-vérifiée par
  `GET /transactions/{id}` avant toute activation. **L'identité du client doit venir de
  cette réponse vérifiée, jamais du payload reçu** — sans quoi n'importe qui pourrait
  faire activer un abonnement en rejouant l'identifiant d'une transaction aboutie.
- **`orderReference` doit être passé dans `metadata`.** La réponse `GET` l'expose sous
  `metadata.orderReference`, jamais au premier niveau ; le payload de callback a la
  même structure. L'existence d'un champ `externalId` n'est pas confirmée.
- **Callbacks émis sur `COMPLETED`, `FAILED` et `CANCELLED`.** `PENDING` est
  intermédiaire et peut donner lieu à un callback de suivi. Sur un prélèvement MIT,
  `PENDING` avec `paymentPageUrl` non nul signifie qu'une authentification du porteur
  est requise ; en `COMPLETED`, `paymentPageUrl` est nul.
- **Enregistrement de carte : autorisation de 0,10 €**, annulée automatiquement, jamais
  débitée, mais **visible en attente sur le relevé du client**. À annoncer en amont.
- **Annulation d'une transaction** : `PUT /transactions/{id}/cancel`, uniquement en
  `COMPLETED`, **montant total, dans les 3 jours**. Pas de remboursement partiel.
  Le délai découle du versement au marchand, **initié à J+3** : au-delà, les fonds ont
  quitté Core et le remboursement est à faire par virement manuel. C'est la contrainte
  qui gouverne la politique de remboursement des CGV.
- **Commission** : 2 % + 0,20 € — soit environ 4 % sur 9,90 € et 2,2 % sur 89,90 €.
  L'annuel est nettement plus rentable.
- Cartes gérées par **Lemonway** pour la conformité PCI ; aucune donnée de carte ne
  transite par nos serveurs.

**Documentation** : `documentation.corebycarlo.com`, index complet sur `/llms.txt`,
OpenAPI sur `/openapi.json`.

**Scheduler natif annoncé** « à horizon quelques mois » (Adrien Gobert). Notre tâche
planifiée est conçue pour être retirée sans douleur ce jour-là.

---

## Resend — e-mails

Domaine vérifié, SPF/DKIM/DMARC en place. Expéditeur `hello@tiptopplans.com`.

**Deux canaux distincts, à ne pas confondre :**

- **SMTP**, configuré dans Supabase Auth — ne sert qu'aux e-mails Supabase
  (confirmation d'inscription, réinitialisation, changement d'adresse).
- **API HTTP**, appelée par les Edge Functions — relances de fin d'essai.

**Deux clés distinctes.** Celle des Edge Functions doit être en permission **Sending
access seule**, jamais la clé Full access. Motif : moindre privilège, et surtout
révocabilité — révoquer la clé des relances ne doit pas couper les e-mails
d'authentification.

**Les gabarits sont en anglais uniquement** côté Supabase (contrainte de la
plateforme). Les envois faits par nos propres fonctions sont bilingues via
`profiles.lang`, repli anglais.

**Adresse lue dans `auth.users.email`**, pas dans `profiles.email` — ce dernier n'est
pas synchronisé après changement d'adresse.

**Exception d'audit** : `supabase/functions/**` et `emails/` sont exclus de l'audit
couleurs. Un e-mail ne charge pas de feuille externe et ignore les variables CSS ; les
couleurs y sont nécessairement littérales, regroupées dans un objet `C` unique.

---

## Google Cloud — OAuth

Client OAuth créé dans la Console Google Cloud : écran de consentement, puis Client ID
et Client Secret à reporter dans Supabase, *Authentication > Providers > Google*.

**URI de redirection autorisée** côté Google :
`https://<projet>.supabase.co/auth/v1/callback`.

---

## Connexion Apple — non mise en place

Supportée par Supabase mais non prioritaire. Prérequis : compte Apple Developer
(99 $/an), App ID + Services ID + clé privée, et un secret qui est **un JWT à
renouveler tous les 6 mois**. L'obligation Apple ne vaut que pour une application iOS
native, pas pour une application web.

**Apple Pay est écarté** (17/08/2026) : il **ne permet pas l'enregistrement d'une
carte**, donc aucun prélèvement MIT, donc aucun abonnement. Il ne vaut que pour des
paiements one-shot, et uniquement pour les cartes VISA/Mastercard cobadgées réseau CB
— soit des banques françaises. Activable à la demande si un usage one-shot apparaît.
