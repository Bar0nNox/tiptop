# Roadmap — TipTop

> **Version : v1.18.1** · En production sur `https://tiptopplans.com`
> Les conventions de travail et les pièges connus sont dans `CONTEXTE.md`.

**Organisation : un chantier par discussion.** Chaque chantier du §5 est autonome —
il porte son besoin, ses décisions prises et ses points à trancher. Ouvrir une
discussion en indiquant lequel.

| Chantier | État | Ce qui bloque |
|---|---|---|
| **Relances de fin d'essai** | à faire | calendrier et contenu à décider |
| **Refonte visuelle (phase 2)** | à faire | typographie, espacements, états |
| **Correctifs connus** | à faire | 3 éléments, tous petits |
| **Distinguer régime et allergie** | à faire | utilité à confirmer |
| **Vérifications en production** | à faire | ne demande pas de code |
| Connexion Apple | non prioritaire | 99 $/an, sans urgence |
| Documents légaux | hors code | à faire rédiger |

---

## 1. État du déploiement

**Base de données : à jour.** Toutes les migrations sont exécutées et vérifiées
(fonctions présentes, colonnes verrouillées, déclencheur branché).

**Sécurité : vérifiée en production** (27/07/2026). Les deux failles d'escalade sont
fermées, les parcours légitimes intacts.

**Reste à faire côté configuration :**
- [ ] Déposer la v1.18.1 par FTP. Fichiers modifiés : `event.html`, `dashboard.html`,
      `auth.html`, `account.html`, `shared/theme.css`, `shared/ui-modal.js`,
      `shared/i18n.js`. Si la v1.18.0 n'a pas été déposée, `reset.html` et
      `manifest.webmanifest` sont également nouveaux.
- [ ] Coller `emails/reset-password.html` dans Supabase, onglet **Reset Password**.
- [ ] Ajouter `https://tiptopplans.com/reset.html` aux **Redirect URLs**
      (Authentication > URL Configuration) — sans quoi le lien de récupération sera refusé.

---

## 2. Bloqué par un tiers

| Sujet | Attente | Impact |
|---|---|---|
| **Compte de production Core** | **Passeport** d'Alexandre. Lemonway (prestataire français de Core) refuse la carte d'identité monégasque, Monaco étant hors UE. | Aucun encaissement réel possible. Le sandbox fonctionne. |
| **Documents légaux** | Rédaction (hors périmètre technique). | Obligatoires avant commercialisation. |

*Résolus depuis :* domaine + hébergement OVH (v1.9.0), envoi d'e-mails via Resend
(la limite de ~2 messages/heure de Supabase bloquait toute inscription).

---

## 3. Livré

### v1.18.1 — Contraste sur l'accent, modales sous `theme.css`, i18n de l'éditeur

**Un défaut, trois symptômes, une même cause : des couples fond/texte non modélisés
ou non câblés.** La v1.13.0 avait unifié les couleurs, la v1.9.0 l'internationalisation ;
dans les deux cas, quelques points de raccordement ont été oubliés en silence.

**Contraste.** Le texte posé sur le vert d'accent était `--ink` (#1E211F) : **1,32:1**,
là où WCAG AA demande 4,5:1 — illisible. La variable juste, `--on-accent`, existait
depuis la v1.13.0 mais n'était utilisée **que dans `reset.html`**.
Indice révélateur : `.btn.primary:hover` passait en `--panel` (blanc). Le bouton
n'était donc lisible **qu'au survol** — asymétrie qui signe l'oubli, non le choix.
Corrigé sur `.btn.primary` (+ survol), `.avatar` et `.fab` de l'éditeur, `.avatar` du
tableau de bord. `auth.html` et les deux règles sur `--danger` alignées par cohérence.
Ajout de `--on-danger` : le rouge avait le même couple implicite.

**`ui-modal.js` était resté hors de `theme.css`.** Le fichier portait **15 couleurs en
dur** issues de l'ancienne palette dorée — dont `#3a2f11`, l'encre périmée que la
v1.13.0 devait faire disparaître, et `#EAC873`, l'ancien doré. Conséquence :
**les 14 fenêtres migrées en v1.7.0 ignoraient totalement le mode monochrome.**
Toutes ses couleurs passent par `theme.css` ; deux variables ajoutées pour cela
(`--overlay`, `--overlay-2` — le voile de modale n'était modélisé nulle part).
*Changement visible* : les modales quittent le brun doré pour le vert de marque.

**11 chaînes de l'éditeur n'étaient jamais traduites**, dont le libellé `Nom` de la
fiche invité. Deux causes mécaniques, pas des oublis isolés :
- `data-i18n` posé sur une **balise fermante** — `</svg data-i18n="…">`. Invalide en
  HTML, l'attribut est ignoré par le parseur. Trois cas : `autoBtn`, `deleteTable`,
  l'import de fichier.
- `data-i18n` écrit `textContent`, donc **inapplicable à un `<label>` contenant un
  `<input>`** : il effacerait la case à cocher. D'où « +1 » et « Remplacer la liste »
  laissés en dur. Correctif : envelopper le texte dans un `<span data-i18n>`.

8 des 11 clés existaient déjà en FR et EN — il ne manquait que le câblage. 3 clés de
placeholder créées ; l'exemple CSV de l'import est désormais localisé (un anglophone
lisait « Jean Dupont, Famille mariée »).

**`data-i18n-aria` ajouté à `i18n.js`** (6 `aria-label` restaient en français ; seul
`aria-label` est annoncé par un lecteur d'écran, `title` ne suffit pas). Deux attributs
`data-i18n-title` dupliqués corrigés sur les contrôles de zoom, et `ed_zoom_in`
raccordé — il n'avait aucun attribut.

**`ed_auto_desc` était périmé** : le texte décrivait encore « ne pas asseoir avec »,
mécanisme remplacé en v1.18.0 par les groupes et séparations. Reformulé FR et EN.

Vérifié : bascule EN simulée sur les 7 pages, aucun français résiduel hors des trois
libellés réécrits par le JS ; 331 clés en parité FR/EN ; aucune couleur en dur dans
`shared/*.js` ; les 34 substitutions assertées.

### v1.18.0 — Placement contraint : groupes et séparations
Remplace « Ne pas asseoir avec ». Fusionne deux items du backlog qui se recouvraient.

**Structure imposée par la nature des relations.** Les contraintes positives sont
**transitives** — si A est avec B et B avec C, les trois sont ensemble : c'est un
**groupe**. Les négatives ne le sont pas — A≠B et B≠C n'empêche pas A et C de
voisiner : ce sont des **paires**. Les forcer dans une même structure aurait produit
un modèle bancal, d'où deux mécanismes exposés dans une interface unique.

```
doc.groups   = [ { id, members:[ids], scope:"table"|"adjacent" } ]
guest.apart  = [ { with:id, scope:"table"|"adjacent" } ]
```
**Migration automatique** au chargement : `avoid:[ids]` → `apart:[{with, scope:"table"}]`.
Aucune migration SQL — tout vit dans le document.

- **Adjacence** « rayon d'une personne, diagonale comprise » : ronde fermée (premier et
  dernier voisins), rectangle avec vis-à-vis et diagonales, places en bout voisines des
  extrémités. Définition **structurelle** et non par distance — sur un rectangle, l'écart
  entre côtés dépasse celui entre voisins, un seuil aurait exclu le vis-à-vis.
- **Détection** : un seul signal, le **bord rouge**, qu'une contrainte soit violée ou
  **impossible à tenir** (groupe plus grand que la table). Pour un groupe « côte à côte »
  de plus de deux, la chaîne doit être **continue** — vérifier que chacun a un voisin du
  groupe laisserait passer deux paires séparées.
- **Placement automatique** : effort au mieux. Les membres d'un groupe forment une unité
  indivisible ; les séparations « même table » écartent les tables incompatibles. Le
  décompte final mesure ce qui reste réellement non tenu.
- **Interface** : un sélecteur par invité dans la fiche. Les groupes **fusionnent** :
  rattacher A à B alors que B est groupé avec C réunit les trois — conséquence directe
  de la transitivité.
- Vérifié : 6 cas d'adjacence, 13 cas de détection, parcours complet au navigateur.

### v1.17.1 — Fondation de l'adjacence
`seatAdjacency()` ajoutée et vérifiée, encore inerte à ce stade.

### v1.17.0 — Date de l'événement
- **Colonne `events.event_date`** et non un champ du document : dans le document, la
  date serait invisible à la base — impossible de trier, de filtrer les événements
  passés, ou de déclencher une relance sans charger tous les événements.
- **Type `date`, sans heure.** Un événement a lieu « le 14 juin » quel que soit le
  fuseau de celui qui regarde ; un horodatage décalerait la date affichée pour un
  collaborateur situé ailleurs — sensible avec une clientèle internationale.
  Même précaution côté navigateur : `new Date("2027-06-14")` est interprété en UTC et
  peut afficher la veille, d'où un découpage manuel de la chaîne.
- **Propriété d'événement** : réservée au propriétaire, verrouillée en base
  (`COLLAB_SCOPE_DATE`). Le champ est masqué au collaborateur, et un refus éventuel
  ramène l'affichage à l'état réel plutôt que de laisser croire à une modification.
- ⚠️ **Droit d'écriture indispensable** : le correctif de sécurité avait limité les
  colonnes modifiables à `(name, doc)`. Sans `grant update (event_date)`, personne
  n'aurait pu renseigner la date, propriétaire compris.
- **Affichage** : à côté du nom dans l'éditeur (masqué sous 900 px), sur les cartes du
  tableau de bord — la date d'événement remplace alors « modifié le », plus utile —,
  et dans le titre imprimé, pour qu'un plan retrouvé plus tard se situe d'emblée.
- Index `(owner_id, event_date)` posé pour le tri à venir.
→ `migration-event-date.sql`

### v1.16.0 — Fiche invité au clic
Le clic sur un invité ouvre sa fiche, où qu'il apparaisse — ligne de la liste,
pastille sur un siège, nom dans la liste des incompatibilités.

| Support | Appui simple | Appui long |
|---|---|---|
| Ordinateur | **ouvre la fiche** | — |
| Tactile | sélection (inchangé) | **ouvre la fiche** |

- **Décision** : sur ordinateur, la sélection puis clic sur un siège est **supprimée**.
  Le placement s'y fait exclusivement au **glisser-déposer**.
- **Détection par type de pointeur** (`pointer: coarse`) et non par largeur d'écran :
  une tablette a un grand écran mais un doigt pour pointeur, et se serait sinon
  comportée comme un ordinateur — donc sans appui long, sans moyen d'ouvrir la fiche.
- **Appui long** : 500 ms, annulé si le doigt se déplace de plus de 8 px (sinon il se
  déclencherait pendant un glissement), menu contextuel natif neutralisé, retour
  haptique léger quand l'appareil le permet.
- Le double-clic sur une pastille et le crayon de la liste restent actifs : ils ne
  gênent pas et rendent le geste familier à qui les avait pris.

### v1.15.0 — Périmètre du rôle collaborateur élargi
Le collaborateur ne pouvait modifier **que l'attribution des sièges**. Il peut
désormais modifier **les tables, les invités, le compteur de tables et les repères
d'orientation** — mais pas les propriétés de l'événement (nom, couleur).

- **Posture de sécurité conservée.** On aurait pu écrire « tout est permis sauf le nom
  et la couleur » : ce serait une liste noire, et tout champ ajouté au document plus
  tard deviendrait modifiable par défaut. La règle reste une **liste blanche** — on
  retire du document les seuls champs autorisés et on compare le reste. Vérifié : un
  champ ajouté ultérieurement (testé avec une date d'événement) est refusé par défaut.
- **Trois niveaux de visibilité** dans l'éditeur : `.owner-only` (propriétés de
  l'événement, import d'un plan JSON qui les écraserait), `.editor-only` (outils
  d'édition — masqués en lecture seule), et sans classe (exports et impression,
  accessibles à tous). Le masquage reste un confort : la restriction réelle est en base.
- **Repères d'orientation** reclassés en *contenu* : ils décrivent la salle, pas
  l'événement. Modifiables par le collaborateur, pas en lecture seule.
- **« Tout effacer » et l'import CSV** sont ouverts au collaborateur : interdire
  l'action groupée quand l'action unitaire est permise serait un faux garde-fou.
- **Libellé** : « Collaborateur » au lieu de « Placement des invités ». La valeur en
  base reste `placer` — elle est interne, la renommer imposerait une migration sans
  bénéfice.
- Vérifié sur 18 scénarios de base et les 3 rôles au navigateur.
→ `migration-collab-scope.sql`

### v1.14.0 — Mot de passe oublié, manifeste, ménage
- **🔴 Parcours de récupération de compte** — il n'en existait aucun : un client
  ayant oublié son mot de passe perdait ses événements et devait recréer un compte.
  Ajouté : lien « Mot de passe oublié ? » sur la page de connexion (troisième mode de
  la même carte, sans page supplémentaire), page `reset.html` où l'on choisit le
  nouveau mot de passe, et gabarit `emails/reset-password.html`.
  *Sécurité* : le message affiché après envoi est **identique que l'adresse existe ou
  non** — révéler l'existence d'un compte permettrait d'énumérer les clients.
  `reset.html` vérifie la session ouverte par le lien avant d'afficher le formulaire :
  sans elle, le lien est expiré ou déjà consommé, et on le dit plutôt que de laisser
  échouer la saisie.
- **Manifeste** (`manifest.webmanifest`) : sur Android, le raccourci prenait l'URL
  comme nom et une icône générique — seul iOS était traité. Corrige le nom, l'icône,
  la couleur de barre système, et permet l'affichage sans barre d'adresse.
- **Ménage** : `icon-48.png`, `logo-light.svg` et un `logo-email@2x.png` orphelin
  (34 Ko) supprimés ; `logo-512.png` déplacé en `assets/logo-master.png` — c'est un
  fichier **source**, il n'a pas à être publié. Le dossier `shared/` ne contient plus
  que ce qui est réellement servi.
- Correctif : statut de sauvegarde du panneau de partage, resté en français.

### v1.13.0 — Palette unifiée et mode noir & blanc
**Constat de départ** : 99 couleurs écrites en dur dans six pages, dont **deux crèmes**
(`#F7F1E6` et `#F5F1E8`) et **deux encres** (`#2B2620` et `#3a2f11`) légèrement
différentes — dérive involontaire, invisible à l'œil mais impossible à maintenir.
Changer la palette signifiait modifier six fichiers à la main.

- **`shared/theme.css`** : référence unique chargée par les six pages. Les 90 couleurs
  hors bloc de variables ont été converties ; ne subsistent que les palettes de
  **données** (couleurs de groupes, choix de couleur d'événement), qui portent de
  l'information et non de l'habillage.
- **Palette neutre professionnelle** : gris très légèrement verts en écho au tracé du
  logo (un gris pur donnerait un rendu clinique). Accent d'interface = **#27392E**,
  le vert du logo, à la place du doré.
- **Mode monochrome** (`[data-theme="mono"]`) : allure papier, accent neutralisé. Les
  couleurs de sens restent perceptibles mais désaturées — en monochrome intégral, une
  erreur ne se distinguerait plus d'une confirmation.
- **La couleur d'événement ne colore plus que le PLAN** (fond, tables, sièges) et non
  l'interface : une identité stable plutôt qu'une application qui change de teinte à
  chaque événement. En mode monochrome, elle est convertie en gris par luminance
  perçue — la valeur choisie est conservée et reparaît au retour.
- Interrupteur dans le menu de l'éditeur et dans « Mon compte ». Préférence mémorisée
  sur l'appareil, appliquée **avant le premier rendu** pour éviter un clignotement.

### v1.12.2 — Zoom mobile et icônes
- **Pincé pour zoomer** : le geste saccadait. Trois causes cumulées — le zoom
  s'appliquait à chaque événement tactile (jusqu'à 120/s, plus vite que l'écran ne
  peut peindre), chaque application mesurait le cadre puis lisait et réécrivait la
  position de défilement (recalcul de mise en page à répétition), et rien n'indiquait
  au navigateur d'anticiper la transformation. Corrigé : une seule application par
  image (`requestAnimationFrame`), cadre mesuré une fois au début du geste, couche
  promue sur le processeur graphique pendant le pincé puis libérée.
  Mesuré : 60 événements tactiles → 1 application, contre 60 auparavant.
- **Icônes** : les PNG générés n'étaient **pas carrés** (32×38 au lieu de 32×32) alors
  qu'ils étaient déclarés comme tels — d'où une favicon ignorée par le navigateur, et
  un logo rétréci et décentré sur l'écran d'accueil, iOS insérant l'image dans un
  carré. Refaits : `favicon.ico` (16/32/48), `icon-16/32/48.png` transparents,
  `apple-touch-icon.png` 180×180 sur fond crème avec marge intérieure.

### v1.12.1 — Logo intégré
Logo fourni en SVG (9 tracés, 2,4 Ko), couleur de marque **#27392E**. Déployé sur les
six pages, en favicon (SVG + PNG de secours) et en icône d'écran d'accueil.
- Le libellé texte « TipTop » de l'en-tête de l'éditeur est **retiré** : le logo porte
  déjà le nom, l'afficher deux fois était redondant.
- Fichiers : `shared/logo.svg` (couleur de marque), `shared/logo-light.svg` (fond
  foncé), et PNG en 512 / 192 / 64 / 32 px à fond transparent — les messageries
  supprimant le SVG, un PNG reste nécessaire pour les e-mails automatiques.
- **31 Ko économisés** sur l'éditeur : l'ancien logo et les favicons étaient encodés
  en base64 dans la page, ils sont désormais des fichiers partagés et mis en cache.

### v1.12.0 — Étiquettes d'orientation toujours visibles
Les quatre repères (Mer, Jardin, Cuisine, Entrée…) étaient dessinés aux bords du plan
et sortaient du champ dès qu'on se déplaçait ou qu'on zoomait — à rebours de leur rôle.
Ils sont désormais **ancrés au cadre visible**, comme les contrôles de zoom : le même
mécanisme (`.stage-wrap` plutôt que `.floor`), déjà éprouvé.

Décisions prises à l'implémentation :
- *Ancrage* : bords de l'écran, et non étiquettes flottantes — celles-ci auraient
  chevauché les tables et alourdi la lecture.
- *Édition* : maintenue **sur place**, pour ne pas ajouter de friction à une action
  rare mais naturelle. Non éditable pour le rôle lecture seule.
- *Impression et export* : **inchangés**, les repères restent dessinés aux bords du
  plan — ancrés à l'écran, ils n'auraient aucun sens sur une feuille. Mis en œuvre par
  un second jeu d'étiquettes, masqué à l'écran et révélé à l'impression, alimenté par
  la même source. L'export PNG lit `state.edges`, il n'était pas concerné.
- *Petit écran* : les quatre sont **conservées**, en taille réduite. Les masquer
  annulerait précisément leur raison d'être.

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

## 5. Chantiers

*Format : besoin, décisions prises, points à trancher, version cible. Aucune
implémentation tant que les points ne sont pas tranchés.*


### 5.0 Vérifications en conditions réelles
*Ne demande aucun code. Les tests menés jusqu'ici simulent les réponses du serveur ;
ces parcours n'ont jamais été éprouvés en vrai.*

- [ ] **Résiliation** — `cancel_at_period_end` posé, carte supprimée chez Core, aucun
      prélèvement à l'échéance, bascule en `inactive`.
- [ ] **Réactivation** avant échéance, puis réenregistrement d'une carte.
- [ ] **Suppression de compte** — cascade sur événements et accès, aucune tentative de
      prélèvement ensuite.
- [ ] **Renouvellement** — exécution réelle de la tâche planifiée, y compris le cas
      d'échec (3 tentatives puis abandon).
- [ ] **Inscriptions en rafale** — 3 à 4 comptes d'affilée sans « rate limit », e-mails
      reçus hors indésirables.
- [ ] **Mot de passe oublié** — parcours complet, de la demande à la connexion avec le
      nouveau mot de passe.
- [ ] **Collaboration** — le collaborateur peut créer une table et gérer les invités,
      mais pas renommer l'événement ni changer sa couleur ou sa date.

### 5.1 Chantier interface

Ordre retenu : **composants d'abord, visuel ensuite**. La phase 1 (composants) est
terminée ; la phase 2 (visuel) est débloquée depuis l'intégration du logo.

#### Phase 2 — refonte visuelle (fondations posées en v1.13.0)
Les **fondations sont faites** : couleurs unifiées dans `shared/theme.css`, palette
neutre professionnelle, mode monochrome. Reste à définir : palette (au-delà de la couleur d'accent déjà
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

> **Leçon de la v1.18.1** — deux invariants ont été enfreints en silence pendant
> plusieurs versions : une couleur en dur hors de `theme.css`, et un `data-i18n`
> posé sur une balise fermante. Ni l'un ni l'autre ne produit d'erreur. Les deux
> audits qui les ont trouvés sont scriptables et méritent d'être rejoués avant
> chaque livraison — cf. §7.

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

#### Bouton « Vider la table »
- **Besoin** : retirer d'un coup tous les convives d'une table, sans supprimer la
  table elle-même. Aujourd'hui il faut les déplacer un par un.
- **Permission : tranchée** (v1.15.0). Le collaborateur peut désormais modifier les
  tables, l'inspecteur lui est visible : le bouton y sera accessible sans traitement
  particulier.
- **Autres points à trancher** :
  - Emplacement : dans l'inspecteur à côté de « Supprimer la table », ou ailleurs ?
  - Confirmation : l'action est réversible en replaçant les invités, mais peut annuler
    un long travail de placement. Modale de confirmation, ou action directe avec
    possibilité d'annuler ?
  - Libellé et état : masquer ou désactiver le bouton quand la table est déjà vide ?
  - Les invités retournent dans la liste — le confirmer explicitement dans le message.
- **Coût** : faible. La logique existe déjà (`unassign()` par invité), il s'agit de
  l'appliquer aux occupants d'une table.
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

**Deux contrôles à rejouer avant livraison** (v1.18.1) :
- *Couleurs* — aucune couleur littérale (`#rrggbb`, `rgb(`) hors de `shared/theme.css`,
  exception faite des palettes de **données** (`GROUP_COLORS`, couleurs d'événement).
  `ui-modal.js` y a échappé pendant cinq versions sans qu'aucun test ne le signale.
- *Traductions* — tout texte visible doit être couvert par un `data-i18n*`, **et
  l'attribut doit être sur une balise ouvrante**. Un attribut sur `</svg>` est ignoré
  sans erreur. Contrôle utile : appliquer le dictionnaire anglais à chaque page et
  chercher ce qui reste en français.

**Couples fond/texte** — toute couleur de fond a une couleur de texte associée :
`--accent` → `--on-accent`, `--danger` → `--on-danger`. Ne jamais poser `--ink` ou
`--panel` sur un fond coloré : c'est ce qui a produit le bouton illisible de la
v1.18.0. Une nouvelle couleur de fond appelle sa variable `--on-*`.

**`data-i18n` écrase `textContent`** — donc inutilisable sur un élément qui contient
d'autres nœuds (`<label>` avec `<input>`, bouton avec `<svg>`). Envelopper le texte
dans un `<span data-i18n>`.

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
