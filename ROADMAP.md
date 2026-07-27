# Roadmap — TipTop

> **Version : v1.11.0** · Application en production sur `https://tiptopplans.com`
> Paiement, essai, collaboration et internationalisation livrés.
> **Sécurité vérifiée en production** (27/07/2026) : les deux failles d'escalade sont
> fermées, les parcours légitimes intacts.
> Reste avant commercialisation : compte de production Core (passeport), logo,
> documents légaux.

**Conventions.** Versionnage sémantique MAJOR.MINOR.PATCH, couvrant l'ensemble du
projet (éditeur, authentification, tableau de bord, paiement, collaboration, i18n).
Toute livraison de code incrémente au minimum le PATCH ; une mise à jour de cette
roadmap seule n'incrémente rien. Une nouvelle fonctionnalité est d'abord inscrite
ici — besoin, décisions prises, points à trancher — et n'est codée que sur demande
explicite.

---

## 1. À faire maintenant

### Vérifications en production

**✅ Fait — sécurité (27 juillet 2026)**
- Escalade de privilège **bloquée** : la tentative de prise de propriété par un
  collaborateur renvoie `permission denied for table events`. C'est la barrière des
  **droits de colonne** qui a joué, avant même le trigger — les deux protections sont
  donc bien indépendantes, le trigger restant en réserve.
- Parcours légitimes intacts : le placeur déplace un invité et le placement persiste
  après rechargement ; le propriétaire renomme l'événement et ajoute une table.

**⬜ Reste à vérifier** — ces parcours n'ont jamais été éprouvés en conditions réelles
(les tests menés jusqu'ici simulent les réponses du serveur) :

- [ ] **Placeur bloqué sur le reste** — il ne doit pouvoir ni ajouter ni supprimer une
      table, ni modifier une fiche invité (l'interface les masque, la base les refuse,
      mais l'enchaînement complet n'a pas été testé).
- [ ] **Synchronisation temps réel** entre propriétaire et collaborateur.
- [ ] **Résiliation** — `cancel_at_period_end` posé, carte supprimée chez Core,
      aucun prélèvement à l'échéance, bascule en `inactive`.
- [ ] **Réactivation** avant échéance, puis réenregistrement d'une carte.
- [ ] **Suppression de compte** — cascade sur événements et accès, aucune tentative
      de prélèvement ensuite.
- [ ] **Renouvellement** — exécution réelle de la tâche planifiée, y compris le cas
      d'échec (3 tentatives puis abandon).
- [ ] **Inscriptions en rafale** — 3 à 4 comptes d'affilée sans « rate limit »,
      e-mails reçus hors indésirables.
- [ ] **Colonnes verrouillées** (contrôle formel, déjà prouvé indirectement) — dans le
      SQL Editor ; doit renvoyer exactement `events(doc, name)`,
      `event_invites(revoked_at)`, `profiles(lang)` :
      `select table_name, column_name from information_schema.column_privileges
       where grantee = 'authenticated' and privilege_type = 'UPDATE';`

<details>
<summary>Méthode du test d'escalade (pour re-vérification future)</summary>

⚠️ **À faire depuis la console du navigateur, connecté avec le compte collaborateur**,
et non dans le SQL Editor : celui-ci s'exécute avec le rôle de service, où `auth.uid()`
est nul et où le trigger laisse volontairement passer (les Edge Functions en
dépendent). Le test y donnerait un résultat trompeur.

```js
(async () => {
  const client = window.getSupabaseClient();
  const { data: { user } } = await client.auth.getUser();
  const eventId = new URLSearchParams(location.search).get("event");
  const { error } = await client.from("events")
    .update({ owner_id: user.id })
    .eq("id", eventId);
  console.log(error ? "BLOQUÉ : " + error.message : "⚠️ AUCUNE ERREUR — faille ouverte");
})();
```
</details>

### Prochain chantier de développement
Chantier interface, phase 1 — voir §5. *Retour au tableau de bord + déconnexion*
(v1.10.0) et *masquage du régime en lecture seule* (v1.11.0) sont livrés. Il reste
*étiquettes d'orientation toujours visibles*, qui a encore des points à trancher.
La phase 2 (refonte visuelle) attend le logo.

---

## 2. Bloqué par un tiers

| Sujet | Attente | Impact |
|---|---|---|
| **Compte de production Core** | **Passeport** d'Alexandre. Lemonway (prestataire français de Core) refuse la carte d'identité monégasque, Monaco étant hors UE. | Aucun encaissement réel possible. Le sandbox fonctionne. |
| **Nouveau logo** | Fichier source (SVG de préférence, sinon PNG haute résolution ; variantes fond clair/foncé + favicon). | Bloque la phase 2 du chantier interface (identité visuelle). Emplacements : en-tête, favicon, e-mails, page de connexion, export PNG. |
| **Documents légaux** | Rédaction (hors périmètre technique). | Obligatoires avant commercialisation. |

*Résolus depuis :* domaine + hébergement OVH (v1.9.0), envoi d'e-mails via Resend
(la limite de ~2 messages/heure de Supabase bloquait toute inscription).

---

## 3. Livré

### v1.11.0 — Régime/allergie masqué en lecture seule
Le rôle **lecture seule** ne voit plus le détail du régime ou de l'allergie, mais la
mention générique « Régime particulier » / « Special diet » — **à l'écran comme à
l'export PNG**. Motif : ce sont des données de santé, partagées avec un tiers ; la
mention générique suffit à signaler qu'un régime existe sans exposer sa nature (RGPD,
minimisation). Les rôles propriétaire et placeur conservent le détail, qui leur est
nécessaire.
Implémenté par un helper unique `displayDiet()` : les quatre points d'affichage —
infobulle du siège, marqueur de la liste, étiquette de déplacement, export PNG — y
passent, donc aucun ne peut être oublié lors d'une évolution.

### v1.10.0 — Navigation depuis l'éditeur
Logo cliquable **avec libellé** « ← Mes événements » (masqué sous 900 px, logo restant
cliquable) et **menu profil** repris du tableau de bord (avatar, adresse, Mon compte,
Se déconnecter), affiché **quel que soit le rôle** — un collaborateur a lui aussi un
compte à gérer, et cela lève l'ambiguïté sur le compte actif.
Sortie avec modifications non enregistrées : plutôt que la boîte native de
`beforeunload`, l'enregistrement est **terminé avant de naviguer** (`leaveTo`), y
compris pour « Mon compte » et la déconnexion.
Corrections de traduction au passage : « couverts » sur les tables, info-bulles des
contrôles de zoom et du renommage, étiquette « Placé », deux messages d'abonnement.

### v1.9.1 — Audit de sécurité
Correction d'une **escalade de privilège** : un collaborateur « placeur » pouvait
devenir propriétaire d'un événement (détail en §6). Droits de colonne restreints sur
`events` et `event_invites`. Dernière chaîne non traduite de l'éditeur corrigée.
→ `migration-security-audit.sql`

### v1.9.0 — Internationalisation (FR / EN)
- Moteur `shared/i18n.js` : un dictionnaire par langue, textes portés par
  `data-i18n`, `data-i18n-placeholder`, `data-i18n-html`, `data-i18n-title`.
  Interpolation `{var}`. Ajouter une langue = ajouter un dictionnaire.
- Détection : choix mémorisé sur l'appareil → langue du navigateur → repli anglais.
  Sélecteur sur chaque écran. Préférence enregistrée dans `profiles.lang` et relue au
  chargement ; un choix explicite local reste prioritaire.
- Anti-FOUC : le corps n'est masqué que si la langue effective n'est pas le français
  (textes en dur français → aucun délai pour un francophone). Filet de sécurité 1,2 s.
- Couverture : 6 pages + `ui-modal.js`, ~200 clés. L'éditeur générant son contenu en
  JS, un changement de langue déclenche un rendu complet (`i18n:changed`).
- **E-mails automatiques en anglais uniquement** (Supabase ne gère pas deux langues
  sur un même gabarit).
- Correctif de sécurité inclus : colonnes de `profiles` verrouillées (§6).
→ `migration-i18n.sql`

### v1.8.0 — Onglet « Mon compte »
Accès par menu profil (avatar). Quatre blocs : identité (s'adapte au mode de
connexion — pas de mot de passe pour un compte Google), abonnement (statut, formule,
échéance, carte masquée lue chez Core), facturation (historique `payments`), compte
(export JSON, suppression).
**Résiliation à effet différé** : accès maintenu jusqu'à la fin de la période payée
(`cancel_at_period_end`), puis `inactive`. Réactivation possible. Carte supprimée chez
Core (`DELETE /cards/{cardId}`). **Suppression de compte** : double confirmation dont
saisie de « SUPPRIMER », résiliation préalable, cascade.
→ `migration-account.sql`, `account-actions`

### v1.7.0 — Composant modale
Composant unique `shared/ui-modal.js` paramétré par type : information, confirmation,
confirmation dangereuse, saisie. Fermeture par Échap/clic extérieur active pour les
deux premiers, **verrouillée** pour les deux autres. Focus sur l'action principale,
ou « Annuler » si dangereux. Piège de focus et restitution. Feuille remontant du bas
sur mobile. Animation ~160 ms, neutralisée si `prefers-reduced-motion`. Empilement
limité à 2 niveaux. **14 fenêtres natives migrées** — plus aucun `alert`/`confirm`/
`prompt` dans le code.

### v1.5.x – v1.6.0 — Collaboration
- Partage par lien d'invitation valable **7 jours**, jeton stocké haché.
- Rôles **placeur** (déplacer les invités) et **lecture seule**.
- Réservé aux abonnés **actifs** : l'essai n'y donne pas droit. Si l'abonnement du
  propriétaire s'arrête, les collaborateurs perdent l'accès immédiatement.
- Plafond de **6 collaborateurs** (`max_collaborators()` en base, modifiable sans
  redéploiement).
- Restriction du placeur appliquée **en base** (comparaison ancien/nouveau document
  via `doc_without_seats`) : non contournable depuis le navigateur.
- Interface : panneau de partage, adaptation de l'éditeur au rôle, page `join.html`,
  événements partagés au tableau de bord.
- Piège corrigé : récursion entre policies RLS (`events` ↔ `event_collaborators`),
  résolue par des fonctions `security definer`.
→ `migration-collab.sql`, `collab-invite`, `collab-join`

### v1.4.x — Paiement Core by Carlo + essai gratuit
- Enregistrement de carte (CIT) sur page hébergée, prélèvement sur carte enregistrée
  (MIT), callback vérifié côté serveur via `GET /transactions/{id}` — Core n'expose
  aucune signature de webhook (confirmé par l'éditeur).
- Idempotence par table `payments` ; anciennes fonctions Stripe supprimées.
- Renouvellement automatique : `core-renew` + tâche pg_cron quotidienne, 3 tentatives
  espacées d'un jour avant abandon.
- Corrections issues des tests : contrôles de zoom fixes, retrait d'un invité par
  dépôt dans le vide + image fantôme, fin des sauts de tables (échos de
  synchronisation ignorés), enregistrement en ligne avec nouvelles tentatives, ligne
  d'en-tête ignorée à l'import.
→ `migration-core.sql`, `migration-trial.sql`, `cron-renew.sql`

### v1.3.0 — Éditeur : zoom, noms adaptatifs, orientations, export
- **Zoom** : molette, pincé tactile, boutons +/− et reset ; trackpad deux doigts =
  navigation. Bornes 40–250 %, pas de 12 %. Local, non sauvegardé — donc sans conflit
  avec la synchronisation temps réel.
- **Noms sur les sièges** : initiales par défaut, nom complet au-delà de 135 % de zoom
  ou au survol.
- **Étiquettes d'orientation** : quatre étiquettes éditables (Mer, Jardin…) sur les
  bords, sauvegardées dans `state.edges`, reprises à l'export.
- **Export PNG enrichi** : nom complet + régime sous chaque siège occupé.

---

## 4. Décisions structurantes

### Marché
**Clientèle internationale**, pas seulement francophone. Conséquences : i18n livrée
(§3) ; `.com` en domaine principal ; Core accepte les cartes internationales et
corporate sans surcoût ; documents légaux à prévoir aussi en anglais ; CDN à
réévaluer sur données réelles plutôt qu'a priori (fichiers très légers).

### Tarification
| Formule | Mensuel | Annuel |
|---|---|---|
| **Particulier** (au lancement) | 9,90 € | 89,90 € |
| **Pro** (reportée) | ~39 € | ~390 € |

La formule Pro attend une MAJ apportant des fonctionnalités différenciantes — leviers
naturels : nombre de collaborateurs, nombre d'événements simultanés. Elle imposera
4 tarifs (2 formules × 2 périodicités) et le passage de la formule jusqu'à
`core-charge`.

Commission Core : 2 % + 0,20 € → ~4 % effectifs sur 9,90 €, ~2,2 % sur 89,90 €.
**L'annuel est nettement plus rentable, à mettre en avant visuellement.**

### Essai gratuit
**14 jours, sans carte bancaire.** Ouvert automatiquement à la création du compte
(`trialing`, `current_period_end = now() + 14 jours`).
Limite : **1 seul événement sur toute la durée** — cumul, non simultané. Compteur
`trial_events_used` qui ne redescend jamais + trigger `before insert` sur `events`,
donc non contournable depuis le navigateur.
Fin d'essai → `inactive`, aucun prélèvement possible sans carte.
*Conséquence assumée* : meilleur taux d'inscription, conversion plus faible qu'avec
carte obligatoire — à compenser par des relances (§5).

---

## 5. Backlog

*Format : besoin, décisions prises, points à trancher, version cible. Aucune
implémentation tant que les points ne sont pas tranchés.*

### 5.1 Chantier interface (prioritaire)

Ordre retenu : **composants d'abord, visuel ensuite**. Motif : le visuel se fige mal
tant que les composants bougent, et l'identité dépend du logo (bloqué).

#### Étiquettes d'orientation toujours visibles
- **Besoin** : les quatre étiquettes sortent du champ dès qu'on se déplace ou qu'on
  zoome, alors que leur rôle est de garder le repère sous les yeux.
- **À trancher** : ancrage sur les bords de l'écran (comme les contrôles de zoom) ou
  étiquettes flottantes semi-transparentes ? Éditables en place ou simples repères,
  l'édition passant par le menu ? Comportement à l'export (a priori inchangé) ?
  Masquer sous une certaine largeur d'écran ?
- Version : MINOR.

#### Phase 2 — refonte visuelle
Dépend du **logo**. À définir : palette (au-delà de la couleur d'accent déjà
personnalisable par événement), typographie et échelle, espacements, styles de boutons
et d'états, densité sur petit écran, mode sombre ?
**Contrainte** : la couleur d'interface est déjà un réglage client (`state.themeColor`),
toute refonte doit rester compatible.

### 5.2 Commercial

#### Relances de fin d'essai
- **Besoin** : sans carte enregistrée, rien ne ramène le client à l'expiration. C'est
  la pièce qui déterminera le taux de conversion. Resend est désormais en place.
- **À trancher** : calendrier (J-3, J-1, jour J, post-expiration ?), contenu, gestion
  du désabonnement.
- Version : MINOR.

### 5.3 Correctifs connus

#### Colonnes Stripe résiduelles à supprimer
- **Constat** : `profiles` conserve `stripe_customer_id` et `stripe_subscription_id`,
  vestiges de l'intégration Stripe abandonnée au profit de Core by Carlo. Toutes les
  valeurs sont `NULL` et **aucune référence ne subsiste dans le code actif** (vérifié
  sur les pages, les scripts partagés et les Edge Functions).
- **Impact** : encombrement du modèle, et confusion pour quiconque reprend le schéma —
  on peut croire que Stripe est encore branché. Aucun risque de sécurité depuis le
  verrouillage des colonnes (§6) : `authenticated` ne peut plus écrire que `lang`.
- **À faire** :
  - `alter table public.profiles drop column if exists stripe_customer_id, drop column if exists stripe_subscription_id;`
  - Corriger le commentaire périmé de `schema.sql` qui évoque encore « les champs
    `stripe_*` modifiables par la Edge Function ».
- **Précaution** : opération **irréversible**. Vérifier au préalable que toutes les
  valeurs sont bien nulles :
  `select count(*) from profiles where stripe_customer_id is not null or stripe_subscription_id is not null;`
  (doit renvoyer 0).
- Version : PATCH.

#### `profiles.email` non synchronisé après changement d'adresse
- **Constat** : `profiles.email` n'est renseigné qu'à l'inscription
  (`after insert on auth.users`). Aucun trigger ne suit la mise à jour de l'adresse.
- **Conséquences** : la liste des collaborateurs affiche l'ancienne adresse ;
  `core-renew` transmet une adresse périmée dans `metadata.customerEmail` à chaque
  prélèvement — impact sur le suivi comptable et le support.
- **Non concerné : la limite d'essai.** Le compteur est rattaché à `profiles.id`
  (UUID), pas à l'adresse. Changer d'e-mail ne redonne pas droit à un événement.
  (Créer un nouveau compte le permet — compromis assumé de l'essai sans carte.)
- **Piste** : trigger `after update of email on auth.users`. Subtilité : Supabase ne
  met `auth.users.email` à jour qu'**après** confirmation du lien, pas à la demande.
- Version : PATCH.

#### Bascule silencieuse de session à l'ouverture d'un lien d'invitation
- **Constat** : ouvrir un lien d'invitation dans un navigateur déjà connecté remplace
  la session sans signal. L'utilisateur croit que son compte a été rétrogradé alors
  qu'il regarde l'autre compte. Aucun droit n'est réellement modifié (vérifié en base).
- **À trancher** : avertir avant de consommer l'invitation si une session existe ?
  Rendre le compte actif visible dans l'éditeur ? Détecter « le propriétaire ouvre son
  propre lien » ? Proposer un basculement rapide entre comptes ?
- Version : MINOR.

#### Enchaînement après réactivation d'un abonnement
- **Constat** : la carte étant supprimée à la résiliation, une réactivation laisse le
  compte sans moyen de paiement. L'interface prévient, mais l'utilisateur doit
  retourner de lui-même au tableau de bord.
- **À trancher** : redirection automatique ou bouton dans la modale ? Que faire si
  l'utilisateur abandonne en route ?
- Version : PATCH.

### 5.4 Fonctionnalités

#### Grouper des invités (distinct du +1)
- **Besoin** : lier plusieurs invités existants (couple, famille, amis) sans créer un
  nouvel invité.
- **Décidé** : le lien contraint le placement (côte à côte quand possible, alerte si
  séparés) ; relation extensible à plus de deux invités.
- **À trancher** : interface de création (sélection multiple, glisser-déposer, bouton
  dédié ?) ; définition de « côte à côte » (sièges adjacents ou même table ?) ; groupe
  plus grand qu'une table (répartition ou blocage ?) ; représentation visuelle ;
  persistance (`groupId` — impact sur le state **et sur la règle de restriction du
  placeur** : un groupe est-il modifiable par un placeur ?) ; suppression du lien.
- Version : MINOR.

#### Distinguer régime et allergie
Le champ `diet` sert aujourd'hui aux deux. À scinder si la distinction devient
nécessaire — impact : modèle invité, import CSV, export PNG, éditeur. Version : MINOR.

#### Connexion « Se connecter avec Apple »
Supporté par Supabase. Prérequis : compte Apple Developer (99 $/an). Configuration
plus lourde que Google (App ID + Services ID + clé privée ; le secret est un JWT à
renouveler tous les 6 mois). L'obligation Apple ne vaut que pour une app iOS native,
pas pour une web app. **Non prioritaire**, ajoutable sans rien casser.

#### Paiement Apple — clarification
**Apple Pay** est déjà supporté par Core (Carte, Apple Pay, app Carlo) — à
activer/vérifier au passage en production. **L'abonnement via l'App Store** est
réservé aux apps iOS natives : indisponible pour une web app, impliquerait une app
native et la commission Apple (15–30 %). Décision structurante, à examiner à part.

#### Mentions légales, CGV, CGU, politique de confidentialité
Obligatoires avant commercialisation. Points sensibles : données de santé (allergies),
partage avec des collaborateurs, sous-traitants (Supabase Frankfurt, Core by
Carlo/Lemonway), durée de conservation, droit à l'effacement. À faire rédiger, en
français **et en anglais** (marché international).

---

## 6. Sécurité — correctifs appliqués

> Deux failles découvertes lors d'un audit des règles d'accès. Migrations exécutées
> et **correctifs vérifiés en production le 27/07/2026** : la tentative d'escalade est
> refusée (`permission denied for table events`), et les parcours légitimes —
> placement par un collaborateur, édition complète par le propriétaire — fonctionnent.

### 🔴 Escalade de privilège : un placeur pouvait devenir propriétaire
La policy d'écriture sur `events` autorise le collaborateur « placeur ». Le trigger
censé le restreindre au placement ne comparait que `name` et `doc`, **jamais
`owner_id`** ; et faute de clause `with check` explicite, PostgreSQL réutilise la
clause `using`, qui porte sur l'identifiant de l'événement (inchangé) — le placeur
reste donc « placeur » du point de vue du contrôle pendant toute l'opération.
`update events set owner_id = <soi>` suffisait à prendre possession du plan, puis à le
supprimer ou à en révoquer le propriétaire.
**Corrigé** : `owner_id` et `id` immuables pour tout utilisateur authentifié ; droits
de colonne limitant le client à `name` et `doc`. Vérifié sur 11 scénarios.
→ `migration-security-audit.sql`

### 🔴 Colonnes de profil librement modifiables
La policy « profiles: update own » était `for update using (auth.uid() = id)`. Une
policy RLS filtre les **lignes**, pas les **colonnes** : tout utilisateur connecté
pouvait modifier n'importe quelle colonne de son profil depuis la console — dont
`subscription_status` et `current_period_end`, soit s'octroyer un abonnement gratuit.
**Corrigé** : droits au niveau colonne, `authenticated` ne peut plus écrire que `lang`.
→ `migration-i18n.sql`

### État après audit des 5 tables
RLS active partout. Seules colonnes modifiables par le client :
`events(name, doc)`, `event_invites(revoked_at)`, `profiles(lang)`.
`payments` et `event_collaborators` sont en lecture seule côté client (la suppression
d'un accès par le propriétaire reste permise). Les Edge Functions, en clé de service,
ne sont soumises à aucune de ces restrictions.

---

## 7. Notes techniques

**Piège de nommage dans `event.html`** — 21 fonctions utilisent une variable locale
`t` pour désigner une table, ce qui masque la fonction de traduction globale `t()`.
**Le piège s'est déjà matérialisé** (v1.9.2) : le libellé « couverts » du rendu des
tables était intraduisible, `t` y désignant la table en cours. Contournements employés :
`addTable` renommée en `tbl`, et `window.t(...)` là où renommer était trop risqué.
À renommer progressivement — chaque nouvelle traduction dans ces fonctions rencontrera
le problème.

**Vérifier les archives livrées** — un ZIP livré contenait `supabase-config.js` et
`ui-modal.js` à zéro octet alors que les sources étaient intactes, rendant le site
inutilisable. Contrôler systématiquement le contenu de l'archive (extraction +
comparaison d'empreintes) avant livraison, et les tailles après dépôt FTP :
`supabase-config.js` 1,5 Ko · `ui-modal.js` 11,6 Ko · `i18n.js` 37,3 Ko.

**Modèle de données** — le champ « allergie » utilise le champ existant `diet` ; il n'y
a pas de champ distinct.

**Collaboration sans compte** — non reprise : chaque collaborateur doit créer un
compte (choix assumé, traçabilité des accès).

**Liste blanche d'IP Core** — une liste vide vaut « aucune restriction ». À confirmer
auprès de Core avant le passage en production : les Edge Functions Supabase n'ont pas
d'IP fixe.

**Scheduler natif Core** — un renouvellement d'abonnement natif est annoncé « à
horizon quelques mois » (Adrien Gobert). Notre tâche planifiée est conçue pour être
retirée sans douleur ce jour-là.

---

## Annexe — infrastructure

| Brique | Détail |
|---|---|
| Frontend | Statique, hébergement OVH mutualisé (Starter), dépôt FTP dans `www` |
| Domaine | `tiptopplans.com` (+ `tiptop-plans.com` en défensif), DNS Anycast, DNSSEC, SSL Let's Encrypt |
| Backend | Supabase — Postgres, Auth, Realtime, Edge Functions (région Frankfurt) |
| Paiement | Core by Carlo (prestataire monégasque) — sandbox actif, production en attente |
| E-mails | Resend (SMTP), domaine vérifié, SPF/DKIM/DMARC en place, expéditeur `hello@tiptopplans.com` |
| Connexion | E-mail/mot de passe + Google OAuth |
