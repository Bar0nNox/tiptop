# Roadmap — TipTop

Suivi des fonctionnalités. Format par élément : besoin, décisions prises, statut.
Version courante : **v1.6.0**. Versionnage sémantique MAJOR.MINOR.PATCH, couvrant
l'ensemble du projet (éditeur, authentification, tableau de bord, paiement,
collaboration). Chaque livraison incrémente au minimum le PATCH.

---

## Livré

### v1.3.0 — Zoom, noms adaptatifs, orientations, export enrichi

**Zoom / dézoom du plan**
- Déclencheurs : molette de souris, pincé tactile, boutons +/− et reset.
  Le glissement à deux doigts sur trackpad navigue (ne zoome pas).
- Bornes : 40 % à 250 %, pas de 12 %. Local, non sauvegardé.
- Point technique résolu : le drag des tables divise ses deltas par le facteur de
  zoom (`onTablePointerMove`, `centerOfView`) — validé par test (100 px écran à 148 %
  = 68 px dans le plan).

**Noms sur les sièges (adaptatif)**
- Initiales par défaut ; nom complet au-delà de 135 % de zoom (`FULLNAME_ZOOM`)
  ou au survol/clic. Bascule via la classe CSS `.show-fullnames`.

**Étiquettes d'orientation sur les bords**
- Quatre étiquettes éditables (haut/bas/gauche/droite) pour situer l'ensemble
  (ex. Mer, Jardin, Cuisine, Entrée), sauvegardées dans `state.edges`.
- Reprises dans l'export PNG (gauche/droite en rotation).

**Export PNG enrichi**
- Sous chaque siège occupé : nom complet + tag de régime/allergie (champ `diet`).
- Marges élargies ; étiquettes d'orientation incluses.

### v1.4.x — Paiement Core by Carlo + essai gratuit

- Enregistrement de carte (CIT) sur page hébergée, prélèvement sur carte
  enregistrée (MIT), callback vérifié côté serveur via `GET /transactions/{id}`
  (Core n'expose pas de signature de webhook — confirmé par l'éditeur).
- Idempotence par table `payments` ; anciennes fonctions Stripe supprimées.
- Renouvellement automatique : Edge Function `core-renew` + tâche pg_cron
  quotidienne, 3 tentatives espacées d'un jour avant abandon.
- Essai gratuit ouvert automatiquement à l'inscription (voir section Tarification).
- Corrections issues des tests : contrôles de zoom fixes, retrait d'un invité par
  dépôt dans le vide + image fantôme, fin des sauts de tables (échos de
  synchronisation ignorés), enregistrement en ligne avec nouvelles tentatives,
  ligne d'en-tête ignorée à l'import.

### v1.5.x — v1.6.0 — Collaboration

- Partage par lien d'invitation valable **7 jours**, jeton stocké haché.
- Rôles **placeur** (déplacer les invités) et **lecture seule**.
- Réservé aux abonnés **actifs** : l'essai n'y donne pas droit. Si l'abonnement du
  propriétaire s'arrête, les collaborateurs perdent l'accès immédiatement.
- Plafond de **6 collaborateurs** par événement (`max_collaborators()` en base,
  modifiable sans redéploiement).
- Restriction du placeur appliquée **en base** : comparaison ancien/nouveau document
  (`doc_without_seats`), donc non contournable depuis le navigateur.
- Interface : panneau de partage (créer un lien, voir qui a accès, retirer un accès),
  adaptation de l'éditeur au rôle, page `join.html`, événements partagés visibles
  dans le tableau de bord.
- Piège rencontré et corrigé : récursion entre policies RLS (`events` ↔
  `event_collaborators`), résolue par des fonctions `security definer`.

### v1.7.0 — Composant modale (chantier interface, phase 1)

- Composant unique `shared/ui-modal.js` paramétré par type : information,
  confirmation ordinaire, confirmation dangereuse, saisie de texte.
- Fermeture par Échap et clic extérieur active pour les deux premiers types,
  verrouillée pour les deux autres (geste explicite exigé).
- Focus à l'ouverture : action principale (cas anodins), « Annuler » (cas dangereux),
  champ de saisie (prompt). Piège de focus et restitution du focus à la fermeture.
- `role="dialog"`, `aria-modal`, `aria-labelledby`.
- Mobile : feuille remontant du bas. Ordinateur : modale centrée.
- Animation ~160 ms, neutralisée si `prefers-reduced-motion` est actif.
- Empilement limité à 2 niveaux.
- **14 fenêtres natives migrées** (plus que les 6 recensées initialement) :
  création d'événement, suppression d'événement, ajout d'invité, suppression
  d'invité, suppression de table (bouton et touche Suppr), « Tout effacer »,
  retrait d'un collaborateur, et 6 alertes des parcours d'abonnement et de partage.
  Plus aucun `alert`/`confirm`/`prompt` natif dans le code.

### v1.8.0 — Onglet « Mon compte » (chantier interface, phase 1)

- Accès par **menu profil** (avatar en haut à droite du tableau de bord).
- Quatre blocs : **identité** (adresse, mot de passe, moyens de connexion ; le bloc
  mot de passe disparaît pour un compte Google, un changement d'adresse déclenche une
  vérification par courriel), **abonnement** (statut, formule, échéance, carte
  masquée lue chez Core), **facturation** (historique `payments`), **compte**
  (export JSON des données, suppression).
- **Résiliation à effet différé** : accès maintenu jusqu'à la fin de la période payée
  (`cancel_at_period_end`), puis bascule en `inactive` sans prélèvement. Réactivation
  possible avant l'échéance. La carte est supprimée chez Core à la résiliation
  (`DELETE /cards/{cardId}` — endpoint vérifié dans la documentation).
- **Suppression de compte** : double confirmation (modale dangereuse puis saisie de
  « SUPPRIMER »), résiliation préalable de l'abonnement, puis suppression de
  l'utilisateur ; événements et accès collaboratifs suivent en cascade.
- `core-renew` respecte désormais `cancel_at_period_end`.
- Nouveaux fichiers : `account.html`, `supabase/migration-account.sql`,
  `supabase/functions/account-actions/`.

---

## Marché visé (décidé)

**Clientèle internationale**, et non francophone uniquement. Conséquences à intégrer :

- **Interface en français uniquement aujourd'hui** — l'internationalisation devient un
  chantier à part entière (voir backlog). Concerne : textes de l'éditeur, du tableau de
  bord, de « Mon compte », des modales, des e-mails automatiques, et le format des dates.
- **E-mails automatiques** : la décision « français uniquement » prise pour l'e-mail de
  confirmation est à revoir.
- **Paiement** : Core accepte CB, Visa et Mastercard dans le monde entier, y compris
  cartes internationales et corporate, sans surcoût (confirmé par Core). Les montants
  restent libellés en euros — à confirmer si un affichage multi-devises devient utile.
- **Domaine** : `.com` en principal, cohérent avec une cible internationale. Le `.fr`
  reste utile en défensif mais n'est plus prioritaire.
- **Performance** : un CDN, jugé inutile pour une cible francophone, redevient
  discutable si une part significative du trafic vient de loin. À réévaluer sur données
  réelles plutôt qu'a priori — les fichiers servis restent très légers.
- **Juridique** : mentions légales, CGV et politique de confidentialité devront exister
  au moins en anglais, et tenir compte du droit de la consommation hors UE.

### v1.9.0 — Internationalisation (FR / EN)

- Moteur `shared/i18n.js` : un dictionnaire par langue, textes portés par des
  attributs `data-i18n`, `data-i18n-placeholder`, `data-i18n-html`, `data-i18n-title`.
  Interpolation `{var}`. Ajouter une langue = ajouter un dictionnaire.
- **Détection** : choix mémorisé sur l'appareil → langue du navigateur → repli anglais.
  Sélecteur présent sur chaque écran. Préférence enregistrée dans `profiles.lang` et
  relue au chargement (suit l'utilisateur d'un appareil à l'autre) ; un choix explicite
  fait sur l'appareil reste prioritaire.
- **Anti-FOUC** : le corps n'est masqué que si la langue effective n'est pas le
  français (les textes en dur étant français, un francophone ne subit aucun délai).
  Filet de sécurité à 1,2 s si le script ne se charge pas.
- **Couverture** : les 6 pages (accueil, authentification, tableau de bord, éditeur,
  Mon compte, invitation) + `ui-modal.js`. Environ 200 clés.
- L'éditeur générant son contenu en JS, un changement de langue déclenche un rendu
  complet (`i18n:changed`), y compris le compteur et l'étiquette de la zone de dépôt
  (dessinée en CSS via `attr(data-drop-label)`).
- **E-mails automatiques : en anglais uniquement** (décision assumée — Supabase ne
  gère pas deux langues sur un même gabarit).
- Migration `migration-i18n.sql` (colonne `lang` + correctif de sécurité, voir notes).

---

## Tarification et essai (décidé)

- **Formule unique au lancement — « Particulier »** : 9,90 €/mois ou 89,90 €/an
  (annuel ≈ 10 mois payés). Secrets `CORE_PRICE_MONTHLY` / `CORE_PRICE_ANNUAL`.
- **Formule « Pro »** (planners, traiteurs, lieux) : reportée à une MAJ ultérieure
  apportant des fonctionnalités différenciantes. Ordre de grandeur : 39 €/mois ou
  390 €/an. Nécessitera 4 tarifs (2 formules × 2 périodicités) et le passage de la
  formule choisie jusqu'à `core-charge`. Levier naturel de différenciation : nombre
  de collaborateurs, nombre d'événements simultanés.
- **Essai gratuit : 14 jours, SANS carte bancaire.**
  - Ouvert automatiquement à la création du compte : le profil naît en `trialing`
    avec `current_period_end = now() + 14 jours`.
  - Limite : **1 seul événement sur toute la durée de l'essai** (cumul, non
    simultané). Compteur `trial_events_used` qui ne redescend jamais + trigger
    `before insert` sur `events`.
  - Fin de l'essai : passage en `inactive`. Aucun prélèvement possible sans carte.
  - Conséquence assumée : meilleur taux d'inscription, conversion plus faible
    qu'avec carte obligatoire — à compenser par des relances (voir backlog).
- Commission Core : 2 % + 0,20 € → ~4 % effectifs sur 9,90 €, ~2,2 % sur 89,90 €.
  L'annuel est nettement plus rentable, à mettre en avant visuellement.

---

## Bloqué par un élément extérieur

### 🚫 Envoi d'e-mails — BLOQUANT POUR LE LANCEMENT
Constaté en conditions réelles : erreur « Email rate limit exceeded » lors de
l'inscription d'un tiers.
- **Cause** : le service d'e-mail intégré de Supabase est limité à ~2 messages par
  heure et n'est pas destiné à la production (documenté comme tel). Le plan payant
  n'augmente PAS cette limite.
- **Conséquence** : aucune inscription n'est possible au-delà de deux par heure.
  Tant que ce point n'est pas réglé, le service ne peut pas accueillir de clients.
- **Solution** : configurer un SMTP tiers dans Supabase (Authentication > SMTP
  Settings). Candidats : Resend, Brevo, Mailtrap, Postmark — offres gratuites de
  l'ordre de quelques milliers d'envois par mois.
- **Débloque au passage** : l'envoi depuis une adresse du domaine `tiptopplans.com`
  (SPF/DKIM désormais possibles, le domaine étant acquis), et la personnalisation
  du contenu des e-mails (contenu, logo, couleurs).
- **Points à trancher** : fournisseur retenu ; adresse d'expédition (`bonjour@`,
  `noreply@`) ; langue des messages (voir marché international) ; personnalisation
  des gabarits Supabase.
- Version prévue : configuration, pas de code applicatif.

### Domaine + hébergement OVH
Blocage le plus structurant. Conditionne : le retour du client après paiement
(Core refuse `localhost` comme URL de retour), l'ouverture d'un lien d'invitation
hors de la machine de développement, la connexion Google en conditions réelles,
la valeur définitive de `SITE_URL`, et la personnalisation de l'expéditeur des
e-mails (DNS/SPF/DKIM).

### Compte de production Core by Carlo
En attente du **passeport** : Lemonway (prestataire français de Core) n'accepte pas
la carte d'identité monégasque, Monaco étant hors UE. Le sandbox fonctionne déjà.

### Nouveau logo
En attente du fichier source (actuellement celui du lancement de Chapter Two).
- Format : SVG de préférence, sinon PNG haute résolution ; variantes fond clair/foncé,
  favicon.
- Emplacements : en-tête, favicon, e-mails automatiques, page de connexion,
  export PNG le cas échéant.
- Version prévue : PATCH.

---

## Backlog (à préciser avant implémentation)

### Vérifications en conditions réelles (non couvertes par les tests actuels)
Les tests menés jusqu'ici simulent les réponses du serveur (Supabase et Core stubés
dans un navigateur headless). Les parcours suivants n'ont donc **jamais été éprouvés
en vrai** et doivent l'être avant toute mise en service :
- **Résiliation** : `cancel_at_period_end` posé, carte réellement supprimée chez Core
  (`DELETE /cards/{cardId}`), aucun prélèvement à l'échéance, bascule en `inactive`.
- **Réactivation** avant échéance, puis réenregistrement d'une carte.
- **Suppression de compte** : suppression effective de l'utilisateur, cascade sur les
  événements et les accès collaboratifs, absence de tentative de prélèvement ensuite.
- **Collaboration de bout en bout** : création d'un lien, ouverture depuis un second
  compte, refus effectif d'une écriture hors périmètre pour le rôle placeur,
  révocation, expiration à 7 jours.
- **Renouvellement** : exécution réelle de la tâche planifiée à l'échéance, y compris
  le cas d'échec (3 tentatives puis abandon).
- Prérequis : fonctions déployées, migrations exécutées, et **domaine OVH** pour les
  parcours impliquant un retour depuis une page hébergée ou un lien d'invitation.

### Enchaînement après réactivation d'un abonnement
- **Besoin** : la carte étant supprimée à la résiliation, une réactivation laisse le
  compte sans moyen de paiement. L'interface prévient, mais l'utilisateur doit
  retourner de lui-même au tableau de bord pour enregistrer une carte.
- **Attendu** : enchaîner directement sur l'enregistrement de carte après réactivation.
- **Points à trancher** : redirection automatique ou bouton dans la modale ; que faire
  si l'utilisateur abandonne en route (réactivation annulée ou maintenue sans carte ?).
- Version prévue : PATCH.


*Format : besoin + points à trancher + version cible envisagée. Aucune implémentation
tant que les points ne sont pas tranchés.*

### CHANTIER INTERFACE (prioritaire — décidé : composants d'abord, puis visuel)

Ordre retenu : refonte des composants, puis refonte visuelle. Motif : le visuel se
fige mal tant que les composants bougent, et l'identité dépend du logo (bloqué).

**Phase 1 — composants**

1. *Étiquettes d'orientation toujours visibles* — voir item dédié.
2. *Masquage du régime/allergie en lecture seule* — voir item dédié.

**Phase 2 — visuel**
- Dépend du **logo** (bloqué). Sans lui, on peut préparer les fondations mais pas
  arrêter l'identité.
- À définir : palette (au-delà de la couleur d'accent déjà personnalisable par
  événement), typographie et échelle, espacements, styles de boutons et d'états
  (survol, focus, désactivé, chargement), densité sur petit écran, mode sombre ?
- Attention : la couleur d'interface est déjà un réglage client (`state.themeColor`).
  Toute refonte doit rester compatible avec cette personnalisation.

### Étiquettes d'orientation toujours visibles
- **Besoin** : les quatre étiquettes (Mer, Jardin, Cuisine, Entrée…) sont
  actuellement positionnées sur les bords du plan. Dès qu'on se déplace ou qu'on
  zoome, elles sortent du champ — alors que leur rôle est justement de garder le
  repère d'orientation sous les yeux.
- **Attendu** : rester visibles en permanence, comme les contrôles de zoom, quel que
  soit le déplacement dans le plan.
- **Points à trancher** :
  - Ancrage sur les bords de l'écran (comme les contrôles de zoom) ou étiquettes
    flottantes semi-transparentes suivant le déplacement ?
  - Rester éditables en place, ou devenir de simples repères, l'édition passant par
    le menu ?
  - Comportement à l'export PNG et à l'impression : inchangé (dessinées sur les bords
    du plan) — à confirmer.
  - Encombrement sur petit écran : les masquer sous une certaine largeur ?
- Version prévue : MINOR.

### Relances de fin d'essai
- **Besoin** : sans carte enregistrée, rien ne ramène le client à l'expiration de son
  essai. C'est la pièce qui déterminera le taux de conversion.
- **Points à trancher** : nombre et calendrier des relances (J-3, J-1, jour J,
  post-expiration ?), canal (e-mail via Supabase ou service tiers type Resend),
  contenu, gestion du désabonnement.
- Version prévue : MINOR.

### Grouper des invités (distinct du +1)
- **Besoin** : lier plusieurs invités existants entre eux (couple, famille, amis à
  asseoir ensemble), sans passer par la création d'un nouvel invité.
- **Décisions prises** :
  - Le lien contraint le placement : placement automatique côte à côte quand possible,
    alerte si des membres se retrouvent séparés.
  - Relation extensible à plus de deux invités.
- **Points restant à trancher** :
  - Interface de création : sélection multiple, glisser-déposer, ou bouton dédié ?
  - Définition de « côte à côte » : sièges adjacents, ou même table ?
  - Groupe plus grand que la capacité d'une table : répartition ou blocage ?
  - Représentation visuelle : couleur commune, trait de liaison, icône.
  - Persistance : nouveau champ (ex. `groupId`) — impact sur le state et la règle de
    restriction du rôle placeur (un groupe est-il modifiable par un placeur ?).
  - Suppression du lien : retirer un membre ou dissoudre le groupe.
- Version prévue : MINOR.

### Redesign des fenêtres natives
- **Besoin** : remplacer les popups natifs du navigateur par des modales cohérentes
  avec le design de l'app.
- **Instances recensées à ce jour** : création d'événement (`prompt`), suppression
  d'événement, avertissement de suppression pendant l'essai, « Tout effacer »,
  retrait d'un collaborateur, alertes du parcours d'abonnement.
- **Points à trancher** : recensement complet dans le code, composant réutilisable,
  compatibilité tactile, accessibilité (focus, Échap), traitement en un chantier ou
  par itérations.
- Version prévue : MINOR.

### Masquer le régime/allergie en lecture seule
- **Besoin** : le rôle lecture seule voit aujourd'hui les allergies, qui sont des
  données de santé. Les masquer réduit l'exposition (RGPD).
- **Points à trancher** : masquage total ou mention « régime particulier » sans détail ;
  comportement à l'export pour ce rôle.
- Version prévue : MINOR.

### Distinguer régime et allergie
- Le champ `diet` sert aujourd'hui aux deux. À scinder si la distinction devient
  nécessaire (impact : modèle invité, import CSV, export PNG, éditeur).
- Version prévue : MINOR.

### Connexion « Se connecter avec Apple »
- Supporté par Supabase. Prérequis : compte Apple Developer (99 $/an).
- Configuration plus lourde que Google : App ID + Services ID + clé privée ; le secret
  est un JWT à renouveler tous les 6 mois.
- Obligation Apple applicable seulement à une app iOS native, pas à une web app.
- Statut : non prioritaire, ajoutable sans rien casser.

### Paiement Apple — clarification
- **Apple Pay** : moyen de paiement **déjà supporté par Core by Carlo** (Carte,
  Apple Pay, app Carlo). À activer/vérifier au passage en production.
- **Abonnement via l'App Store / iCloud** : réservé aux apps iOS natives — non
  disponible pour une web app. Impliquerait une app native et la commission Apple
  (15–30 %). Décision structurante, à examiner séparément.

### Mentions légales, CGV, CGU, politique de confidentialité
- Obligatoires avant commercialisation. Points sensibles : données de santé
  (allergies), partage avec des collaborateurs, sous-traitants (Supabase Frankfurt,
  Core by Carlo/Lemonway), durée de conservation, droit à l'effacement.
- Hors périmètre technique — à faire rédiger.

---

## Notes transverses

- **🔴 Escalade de privilège corrigée (audit de sécurité, juillet 2026)** — un
  collaborateur « placeur » pouvait devenir propriétaire d'un événement. La policy
  d'écriture l'autorise, et le trigger censé le restreindre au placement ne comparait
  que `name` et `doc`, jamais `owner_id` ; faute de clause `with check` explicite,
  PostgreSQL réutilise la clause `using`, qui porte sur l'identifiant de l'événement
  (inchangé). Un `update events set owner_id = <soi>` suffisait donc à prendre
  possession du plan, puis à le supprimer ou à en révoquer le propriétaire.
  Corrigé dans `migration-security-audit.sql` : `owner_id` et `id` sont désormais
  immuables pour tout utilisateur authentifié, et les droits de colonne limitent le
  client à `name` et `doc`. Vérifié sur 11 scénarios (escalade bloquée, parcours
  légitimes intacts, Edge Functions non affectées). **À exécuter en priorité.**

- **Audit complet des 5 tables** — RLS active partout. Après correctifs, les seules
  colonnes modifiables par le client sont : `events(name, doc)`,
  `event_invites(revoked_at)`, `profiles(lang)`. `payments` et
  `event_collaborators` sont en lecture seule côté client (la suppression d'un accès
  par le propriétaire reste permise). Les Edge Functions, en clé de service, ne sont
  soumises à aucune de ces restrictions.

- **Piège de nommage dans `event.html`** : 21 fonctions y utilisent une variable
  locale `t` pour désigner une table, ce qui masque la fonction de traduction globale
  `t()`. Aucun conflit aujourd'hui (les appels de traduction sont ailleurs), mais
  toute traduction ajoutée dans l'une de ces fonctions échouerait silencieusement —
  ou lèverait une erreur. `addTable` a été renommée en `tbl` pour cette raison.
  À renommer progressivement, ou à contourner en nommant la variable autrement.

- **Correctif de sécurité (juillet 2026)** — la policy « profiles: update own » était
  `for update using (auth.uid() = id)`. Une policy RLS filtre les LIGNES, pas les
  COLONNES : tout utilisateur connecté pouvait donc modifier n'importe quelle colonne
  de son propre profil depuis la console du navigateur, dont `subscription_status` et
  `current_period_end` — soit s'octroyer un abonnement gratuit. Corrigé dans
  `migration-i18n.sql` par des droits au niveau colonne : le rôle `authenticated` ne
  peut plus écrire que `lang`. Tout le reste passe par les Edge Functions (clé de
  service, non soumise à ces restrictions). **À exécuter en priorité.**

- Le champ « allergie » utilise le champ existant `diet` du modèle invité ; il n'y a
  pas de champ allergie distinct.
- Le zoom étant local, il n'entre pas en conflit avec la synchronisation temps réel
  (deux appareils peuvent avoir des zooms différents sur le même événement).
- La collaboration par lien public **sans compte** n'est pas reprise : chaque
  collaborateur doit créer un compte (choix assumé, traçabilité des accès).
- Une liste blanche d'IP vide côté Core vaut « aucune restriction » — à confirmer
  auprès de Core avant le passage en production, les Edge Functions Supabase n'ayant
  pas d'IP fixe.
- Core prévoit un renouvellement d'abonnement natif « à horizon quelques mois »
  (confirmé par Adrien Gobert). Notre tâche planifiée est conçue pour pouvoir être
  retirée sans douleur ce jour-là.
