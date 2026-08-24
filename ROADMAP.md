# Roadmap — TipTop

> **Version : v1.21.2** · En production sur `https://tiptopplans.com`
> Les conventions de travail et les pièges connus sont dans `CONTEXTE.md`.

**Organisation : un chantier par discussion.** Chaque chantier du §5 est autonome —
il porte son besoin, ses décisions prises et ses points à trancher. Ouvrir une
discussion en indiquant lequel.

| Chantier | État | Ce qui bloque |
|---|---|---|
| **Contraste du bouton annuel** | **livré, v1.21.2** | dépôt FTP + 4 contrôles au navigateur |
| **Étiquettes perpendiculaires** | **livré, v1.21.1** | dépôt FTP + 7 contrôles au navigateur |
| **Correctifs zoom + export PNG** | **déployé, v1.20.2** | 4 contrôles au navigateur |
| **Relances de fin d'essai** | **en production, v1.20.1** | contrôler `net._http_response` demain matin |
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

**Déploiement de la v1.19.0 : fait et vérifié au navigateur (30/07/2026).**
Migration exécutée, fichiers déposés, les deux parcours contrôlés — le propriétaire
expiré revoit ses plans en consultation, le collaborateur d'un compte expiré ne voit
toujours rien.

- [ ] **Reste à confirmer** : `--on-danger` est arrivée dans `theme.css` à la v1.18.1,
      et la liste FTP de la v1.19.0 ne comprenait pas ce fichier puisqu'il n'avait pas
      changé entre les deux. Si la v1.18.1 n'a jamais été déposée, le bouton du bandeau
      d'expiration est rouge sur rouge — sans erreur, comme toujours avec les couples
      fond/texte. Contrôle : le bouton « S'abonner » du bandeau doit être lisible en
      blanc.

**Déploiement de la v1.21.2 : à faire.** Deux fichiers à déposer : `dashboard.html`
(le correctif) et `event.html` (numéro de version seul, aucun changement fonctionnel).
`shared/theme.css` est **inchangé** — `--on-accent` y existe depuis la v1.13.0, c'est
son câblage qui manquait ; `shared/i18n.js` l'est aussi, aucune chaîne visible n'ayant
bougé. Aucune migration, aucun secret, aucune fonction à redéployer.

- [ ] Contrôler que les **deux** boutons du bandeau sont lisibles, dans les **deux
      états** : compte en essai (bandeau vert) et essai terminé (bandeau rouge). Le
      défaut valait pour les deux — c'est la même portion de code, dupliquée.
- [ ] Contrôler en **thème monochrome** également : le défaut y était pire (1,12:1
      contre 1,32:1 en clair), l'accent et l'encre y étant deux gris presque identiques.
- [ ] Contrôler que l'**annuel est à gauche** et porte le fond plein, le mensuel à
      droite en bouton bordé. Un ordre inversé signerait un `dashboard.html` périmé.
- [ ] Vider le cache Safari avant de conclure (cf. « caches obstinés »).

**Déploiement de la v1.21.1 : à faire.** Deux fichiers à déposer : `event.html`
et `shared/i18n.js`. `shared/theme.css` est **inchangé** — aucune variable nouvelle,
`--label-bg` existe depuis la v1.20.2. `tests/` ne va pas sur le serveur. Aucune
migration, aucun secret, aucune fonction à redéployer.

- [ ] Contrôler au navigateur, **sur iPhone et sur ordinateur**, que les noms ne se
      chevauchent plus : ouvrir un plan comportant une table ronde d'au moins 10
      couverts et une table rectangulaire, puis régler « Noms sur les sièges » sur
      **Noms complets** dans le menu > Affichage.
- [ ] Contrôler qu'**aucun nom n'apparaît à l'envers**, en particulier sur la moitié
      gauche d'une table ronde et sur les places en bout de table.
- [ ] Contrôler l'**impression** (aperçu PDF) **depuis un zoom à 100 %** : les noms
      doivent y figurer. C'est le défaut annexe corrigé — la feuille suivait
      jusqu'ici le zoom de l'écran et ne portait que des initiales.
- [ ] Contrôler l'**export PNG** : noms perpendiculaires, régime en seconde ligne,
      aucun nom rogné au bord de l'image. Éprouver avec un nom volontairement très
      long (30 caractères et plus) et avec un invité **sans groupe**.
- [ ] Contrôler que le réglage « Noms sur les sièges » **persiste après rechargement**
      et qu'il n'a plus aucun lien avec le niveau de zoom.
- [ ] Contrôler que **l'import d'un plan JSON ouvre le sélecteur de fichier**
      (menu > « Importer un plan (.json) »). Il était mort en silence — voir §3.
- [ ] Contrôler, sur un plan où **deux tables se font face à moins de 430 px**,
      qu'aucune étiquette ne déborde sur la table voisine, et que les noms longs
      s'y affichent bien sur **deux lignes**. C'est le défaut de la v1.21.0.
- [ ] Vider le cache Safari avant de conclure (cf. « caches obstinés »).

**Déploiement de la v1.20.2 : fichiers déposés le 02/08/2026, contrôles au
navigateur à faire.** Trois fichiers : `event.html`, `shared/theme.css`,
`shared/i18n.js`. Aucune migration, aucun secret, aucune fonction à redéployer.

Le dépôt de `theme.css` **referme la question de `--on-danger`** restée ouverte
depuis la v1.19.0 : le fichier livré porte la variable dans les deux thèmes,
quel que soit l'état antérieur du serveur. Reste à le constater à l'écran.

- [ ] Contrôler au navigateur, sur iPhone ET sur ordinateur : au-delà de 135 %
      de zoom, chaque siège occupé doit afficher le **nom complet** sous la
      pastille. C'est le défaut signalé.
- [ ] Contrôler l'**export PNG** — cassé depuis la v1.13.0, jamais constaté
      puisqu'il échouait sans message. Comparer les couleurs du fichier obtenu
      à celles de l'écran : fond, plateaux, sièges occupés, pastilles de groupe.
- [ ] Contrôler l'export en **thème monochrome** également : la palette du
      canevas est relue à chaque export, les deux thèmes doivent différer.
- [ ] Contrôler que le bouton « S'abonner » du bandeau d'expiration est lisible
      en blanc (couple `--danger` / `--on-danger`).
- [ ] Vider le cache Safari avant de conclure (cf. « caches obstinés ») — sans
      rechargement forcé, c'est la v1.20.1 qui reste jugée.

*Éprouver l'export sur un plan comportant au moins un invité **sans groupe** et un
invité **avec régime renseigné** : ce sont les deux branches que le banc d'essai
couvre en simulation et qu'aucun canevas réel n'a encore exécutées.*

**Déploiement de la v1.20.1 : fait et validé (30/07/2026).** Migration exécutée,
secrets définis, fonctions déployées (`unsubscribe` sans vérification de JWT), fichiers
déposés, parcours éprouvés sur un compte de test — sélection, envoi réel, lien
`?subscribe=`, désabonnement par la page et en un clic. Tâche planifiée à 08:00 UTC.

- [ ] **Contrôle du lendemain matin, à ne pas reporter.** `cron.job_run_details` rapporte
      le succès de l'appel SQL, pas le code HTTP : un secret erroné donnerait une tâche
      « succeeded » qui n'envoie rien, chaque nuit. Seul `net._http_response` porte la
      vérité — et pg_net le purge au bout de quelques heures, donc en matinée.
      `select created, status_code, content from net._http_response order by created desc limit 5;`
      Attendu : deux lignes en 200, `core-renew` à 04:00 et les relances à 08:00.
- [ ] Créer une clé Resend en permission **Sending access** seule, la stocker en secret
      Supabase `RESEND_API_KEY`. Ne pas réutiliser la clé « Supabase Key » en Full
      access. Secrets optionnels : `RESEND_FROM`, `RESEND_REPLY_TO` — plusieurs relances
      invitent à répondre, sans `reply_to` les réponses tombent dans le vide.
- [ ] Déployer `unsubscribe` **sans vérification de JWT**
      (`--no-verify-jwt`, ou `verify_jwt = false` dans `config.toml`). Sinon Gmail
      reçoit un 401 sur le désabonnement en un clic, ce qui dégrade la réputation de
      l'expéditeur.
- [ ] Aligner les deux noms de secrets Vault de `cron-trial-reminders.sql` sur ceux de
      `cron-renew.sql` (`select name from vault.decrypted_secrets;`). Un nom erroné ne
      lève aucune erreur : l'appel HTTP échoue silencieusement chaque nuit.
- [ ] Vérifier le nom du PNG du logo utilisé dans les e-mails — la v1.14.0 a déplacé
      `logo-512.png` en `assets/logo-master.png`, non publié.

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

### v1.21.2 — Bouton d'abonnement annuel illisible

**Signalé en test sur le tableau de bord ; corrigé directement, sans passer par le
roadmap.** `.plan-choice #subAnnual` posait `color:var(--ink)` sur
`background:var(--accent)` : **1,32:1** en thème clair, **1,12:1** en monochrome, là
où WCAG AA demande 4,5:1. Mesuré sur la capture, puis retrouvé à l'identique dans les
sources.

**C'est le défaut de la v1.18.1, sur un sélecteur que son correctif n'a pas atteint.**
`--on-accent` existe dans les deux thèmes depuis la v1.13.0 ; la règle fautive est
locale à `dashboard.html` et ne passe pas par `.btn.primary`. Le balayage de tous les
fonds `--accent` et `--danger` du projet ne trouve aucune autre occurrence —
`ui-modal.js`, `auth.html`, `reset.html`, `account.html`, `unsubscribe.html` et
`event.html` posent tous leur `--on-*`.

- **Le défaut valait dans les deux branches de `renderBanner()`** — `trialing` et le
  cas par défaut — donc **pendant les 14 jours d'essai**, et pas seulement après
  expiration. Le bouton illisible était celui de la formule dont la commission Core est
  la plus faible (~2,2 % contre ~4 %), sur toute la durée où l'on cherche à convertir.
- **L'ordre des boutons est aligné sur la décision du §5.2**, restée sans effet :
  l'annuel passe en premier et devient le bouton principal, le mensuel devient le choix
  secondaire. Le mensuel héritait jusqu'ici de `.banner button` (fond `--ink`, 16,2:1)
  et avait donc l'aspect du bouton principal — l'inverse exact de ce qui était décidé.
- **Bordure du secondaire en `--accent`, non en `--line-strong`** : celle-ci ne donne
  que **1,29:1** contre le fond du bandeau, sous le seuil de 3:1 de WCAG 1.4.11 pour la
  limite d'un composant. Le bouton aurait été lisible mais sans contour perceptible.
  Motif repris de `a.keep` dans `unsubscribe.html`.
- `var(--accent, var(--accent))` supprimé — une variable ne se replie pas sur elle-même.

Ratios obtenus, clair / mono : annuel **12,27 / 16,48**, au survol **16,57 / 21,00** ;
mensuel **12,27 / 16,48**, bordure **10,76 / 14,11** sur le bandeau d'expiration et
**10,49 / 14,24** sur celui d'essai.

*Les correctifs de code du §5.5 (repli sandbox, `orderReference`, autorisation de
0,10 €, source unique du prix, `core-renew` bruyant) sont reportés en **v1.21.3**.*

### v1.21.1 — L'étiquette s'adapte à la place disponible

**Le correctif de la v1.21.0 en a créé un autre, et c'était prévisible.**
L'étiquette perpendiculaire porte jusqu'à `LBL_OFF + LBL_MAX` = **144 px** du
centre du siège, là où l'ancienne étiquette horizontale ne descendait que de
48 px. Deux tables se faisant face n'entrent donc plus en conflit qu'au-delà de
**~430 px entre centres**, contre 238 px auparavant — un plan jusque-là
confortable devient serré sans que rien n'ait bougé.

Le texte qui paraissait inversé dans la zone commune n'était **pas** un défaut
d'orientation : ce sont deux jeux d'étiquettes superposés, se lisant en sens
opposés. Chacun était correct pris isolément — le genre de symptôme qui envoie
chercher le défaut au mauvais endroit.

**Deux correctifs combinés — le premier réduit le besoin, le second le borne.**

- **`decouperNom()` coupe le nom en deux lignes**, au point qui les **équilibre**
  et non après le prénom : couper « Marie-Christine | de la Rochefoucauld »
  laisserait la seconde ligne aussi longue que le tout. La portée radiale tombe
  du nom entier au mot le plus long, ~70 px au lieu de 120.
- **`espaceEtiquette()` mesure la place réellement libre** le long de la normale,
  jusqu'au premier obstacle appartenant à une autre table, et plafonne
  l'étiquette à cette valeur (`--nm-max` côté CSS, argument `max` côté canevas).
  Le balayage teste **trois points par pas** — l'axe et les deux bords du bloc :
  ne suivre que l'axe laisserait les bords mordre sur un plateau voisin sans que
  rien ne le signale.
- **Le couloir est partagé quand il doit l'être.** Deux sièges occupés qui se
  font face y projettent tous deux leur étiquette : chacun n'en prend que la
  moitié. Un plateau n'en projette pas, et un siège dont la normale est
  perpendiculaire écrit ailleurs — dans ces cas le couloir reste entier. Sans
  cette distinction, toute étiquette proche d'une table serait divisée par deux
  sans raison.
- **Sous 34 px, l'étiquette est masquée** plutôt que réduite à un fragment :
  « Mar… » n'apprend rien et ajoute du bruit. Les initiales restent dans la
  pastille, l'infobulle reste disponible au survol.
- **`construireObstacles()` est appelée une fois par rendu**, pas par siège : la
  reconstruire à chaque appel rendrait le calcul quadratique sur un plan chargé.

**L'épaisseur du bloc passe de 26 à 37 px** (deux lignes de nom + pastille de
régime) pour un pas entre sièges de **54 px** au plus serré — 17 px de marge.
`tests/test_chevauchement.mjs` mesure ce rapport sur les six formes de table.

**Bancs d'essai portés à 24 cas.** Quatre nouveaux cas reproduisent la
disposition constatée — deux tables à 300 px d'écart — et vérifient que la place
est bornée, que les deux bandes ne se croisent plus, qu'un écart de 180 px fait
disparaître l'étiquette plutôt que de la réduire à rien, et qu'un plateau voisin
borne sans partage. **Contrôle négatif** : le banc échoue si, à pleine portée,
les bandes ne se croiseraient pas — sans quoi une disposition trop lâche
donnerait un contrôle vide qui passe toujours.

### v1.21.0 — Étiquettes de siège perpendiculaires à la table

**Les noms se chevauchaient sur les trois surfaces à la fois** — écran, impression
et export PNG partagent la même géométrie de sièges. Le pas entre deux sièges vaut
`52 + 24/count` px sur une table rectangulaire et `52 + 170/n` sur une ronde, soit
**54 à 76 px mesurés** ; l'étiquette, elle, peut atteindre **120 px** (plafond de
`.full-name`). Le fond étant opaque (`--label-bg`), la voisine était masquée plutôt
que mêlée — d'où la lecture « superposition » et non « illisible ».

**Correction : l'étiquette est posée le long de la normale sortante du siège.**
Elle n'occupe alors plus que la hauteur de son bloc — 11 px pour un nom seul, 26 px
avec la pastille de régime — dans la direction où les sièges se succèdent. Le
chevauchement devient structurellement impossible, quel que soit le nombre de
couverts.

- **`tableGeometry()` expose `dir`**, la normale sortante de chaque siège.
  **Définition structurelle, jamais `atan2(s.y, s.x)`** : sur une table
  rectangulaire, un siège de bord haut décalé vers la gauche donnerait ~127° là où
  la perpendiculaire au côté vaut −90°. Même raisonnement que l'adjacence de la
  v1.18.0, définie par la structure et non par une distance. Un **contrôle négatif**
  du banc d'essai vérifie qu'`atan2` donnerait bien un résultat différent — sans
  quoi le contrôle positif ne prouverait rien.
- **Aucun nom à l'envers, par construction.** `seatLabelOrientation()` bascule de
  180° et ancre le texte par sa **fin** quand `cos(dir) < 0` : l'étiquette occupe la
  même bande radiale, mais la rotation appliquée reste **toujours dans
  [−90°, +90°]**. C'est le procédé des étiquettes de camembert. Vérifié sur 73
  angles, puis sur les rotations relevées pendant un export réel.
- **Une seule géométrie pour les trois surfaces.** `seatLabelOrientation()` est
  partagée entre le rendu DOM et le canevas ; le CSS et le canevas lisent le même
  plafond de 120 px, et un contrôle **échoue si les deux valeurs divergent**. C'est
  ce qui empêchera la feuille et l'image de se désaligner à la prochaine version.
- **Le régime passe en seconde ligne**, parallèle au nom, plutôt qu'en prolongement
  radial : celui-ci aurait porté l'encombrement à ~180 px vers l'extérieur et
  rapproché les étiquettes des tables voisines.

**🔴 Trois défauts annexes, tous silencieux, trouvés en instruisant celui-ci.**

1. **Le contenu de la feuille imprimée suivait le zoom de l'écran.**
   `.show-fullnames` n'était posé qu'au-delà de 135 % et aucun `beforeprint` ne le
   forçait : **imprimer depuis un zoom normal ne donnait que des initiales**.
   L'impression force désormais les noms.
2. **L'export PNG ne tronquait aucun nom** — `ctx.fillText` n'a pas d'équivalent de
   `max-width` — alors que la boîte englobante ne réservait que 60 px de marge
   latérale forfaitaire : les noms longs étaient **rognés au bord de l'image**.
   Troncature à 120 px et boîte calculée sur les **quatre coins réels** de
   l'étiquette tournée.
3. **`data-i18n` posé sur le `<label>` d'import d'un plan JSON**, qui contient
   l'`<input type="file">`. L'attribut écrivant `textContent`, l'input était
   **détaché du document** au `DOMContentLoaded` — juste après l'attachement de son
   écouteur, d'où l'absence de toute erreur : le bouton n'ouvrait plus rien. Le
   piège est documenté dans `CONTEXTE.md` depuis la v1.18.1 ; ce cas y avait échappé
   parce que l'audit ne cherchait que `</svg data-i18n>`. **L'audit est désormais
   scripté et couvre le cas général** — tout élément porteur de `data-i18n` ayant un
   enfant. Texte enveloppé dans un `<span data-i18n>`.

**Le seuil de zoom à 135 % est remplacé par un réglage explicite** — « Noms sur les
sièges : Initiales / Noms complets », dans le bloc « Affichage » du menu de
l'éditeur, mémorisé sur l'appareil comme le thème et la langue. L'éditeur affiche
les initiales par défaut. La valeur est mise en cache : `applyZoom()` s'exécute une
fois par image pendant un pincé et `localStorage` est synchrone (v1.12.2).

**Les initiales ne sont plus masquées** quand le nom s'affiche : le nom étant
désormais hors de la pastille, les cacher laisserait un siège vide — exactement le
défaut corrigé en v1.20.2. Elles rattachent aussi le nom à son siège sur la moitié
du plan où le texte se lit de l'extérieur vers l'intérieur.

**Bancs d'essai.** `tests/test_export.mjs` porté à **19 cas**. **L'extraction du
code y passe de numéros de ligne à des bornes textuelles assertées** : les numéros
glissent à chaque édition et une extraction décalée aurait donné un banc
s'exécutant contre le mauvais code, sans rien signaler — le mode de défaut habituel
du projet, appliqué cette fois à l'outil de contrôle lui-même.
`tests/test_chevauchement.mjs` (nouveau) mesure l'écart réel entre sièges sur six
formes de table et vérifie **que l'ancienne règle échoue là où la nouvelle passe** —
6 formes sur 6. Sans ce second volet, un jeu de formes trop lâche aurait produit un
contrôle vide qui passe toujours.

### v1.20.2 — Nom complet rogné au zoom, export PNG rétabli

**Deux défauts, une même signature : aucune erreur, aucun message, un résultat
vide.** Le premier était visible et a été signalé ; le second ne l'était pas et
durait depuis sept versions.

**Sièges vides au-delà de 135 % de zoom.** `.seat .occupant` portait
`overflow:hidden` tandis que `.full-name` est posé **hors des bornes du parent**
(`top:calc(100% + 2px)`) : l'étiquette était intégralement rognée. Passé le seuil,
`.show-fullnames` masque les initiales — le siège n'affichait donc plus rien du
tout. `overflow:hidden` ne protégeait rien : `initials()` renvoie toujours deux
caractères et la pastille de groupe tient dans le cadre.
- `z-index:5` ajouté sur `.full-name`. `zoom-layer` porte un `transform`, donc un
  contexte d'empilement ; à l'intérieur, sièges et tables se peignent dans l'ordre
  du DOM et une étiquette large (jusqu'à 120 px pour un siège de 34) passerait
  sous les sièges créés après elle.
- **Le défaut pesait plus lourd sur tactile** : sans survol, le zoom est le seul
  moyen d'obtenir un nom complet sur un iPhone. La fonction y était inaccessible,
  pas seulement dégradée.
- `rgba(252,251,245,.92)` remplacé par `--label-bg`.

**🔴 Export PNG inopérant depuis la v1.13.0.** Le canevas n'interprète aucune
variable CSS, et il échoue de **deux manières distinctes** : `fillStyle` ignore
la valeur en silence et conserve la précédente, tandis qu'`addColorStop` lève une
`SyntaxError`. Sans `try/catch`, l'exception remontait : aucun fichier produit,
aucun message. La v1.13.0 a converti les couleurs en variables sans voir que le
canevas ne les lit pas.
- La v1.19.0 s'appuyait explicitement dessus — « exports et impression conservés,
  c'est précisément ce dont a besoin quelqu'un qui veut récupérer son plan ».
  La promesse faite au compte expiré n'était pas tenue.
- `canvasPalette()` résout les 14 variables **une fois par export** via
  `getComputedStyle(document.documentElement)` — où `applyThemeColor()` dépose
  aussi les couleurs du plan propres à l'événement. Une variable absente **lève**
  plutôt que de laisser dessiner en noir.
- `groupColor()` renvoie `"var(--ink-faint)"` pour un invité sans groupe : valable
  dans un `style=` inline, ignoré par le canevas. D'où `canvasGroupColor()`.
- **Sièges occupés alignés sur l'écran** : l'export les peignait en `--warn-soft`
  (#FBF3D4, jaune pâle de l'ancienne palette dorée) là où l'écran emploie
  `--seat-filled`, qui suit la couleur de l'événement. Divergence invisible tant
  que l'export ne produisait rien. Idem `--panel` → `--chair`.
- **Échec désormais visible** : `toast(t("ed_export_failed"))`, nouvelle clé FR/EN.
  Le rappel de `toBlob` étant asynchrone, il porte son propre garde — le
  `try/catch` ne le couvre pas.
- Trois variables ajoutées à `theme.css`, dans les deux thèmes : `--label-bg`,
  `--canvas-shadow`, `--canvas-shadow-soft`. Les deux dernières existent parce que
  `shadowColor` attend une **couleur seule**, quand `--shadow-lift` est une
  déclaration complète `offset blur couleur`.
- **Banc d'essai** `tests/test_export.mjs` : il extrait les fonctions du fichier
  livré et les exécute contre un canevas simulé qui refuse toute couleur non
  analysable. 7 cas. Contrôle négatif concluant — la même batterie lancée contre
  les sources v1.20.1 échoue sur `addColorStop : couleur invalide
  « var(--table-top-hi) »`, ce qui confirme le diagnostic et prouve que le test
  détecte bien ce qu'il prétend détecter.

### v1.20.1 — Correctif de migration
`migration-trial-reminders.sql` échouait en **42P17** : l'index posé sur
`(current_period_end::date)` est refusé, la conversion `timestamptz → date` dépendant
du fuseau de session — donc `STABLE` et non `IMMUTABLE`. Index retiré plutôt que
réécrit : `(… at time zone 'UTC')::date` serait indexable mais ne correspondrait plus
au prédicat de la fonction, et `profiles` compte une ligne par utilisateur pour une
sélection quotidienne. Le `begin/commit` avait tout annulé, aucune base touchée.

**Ce que ça change dans la méthode.** Les migrations sont désormais exécutées en local
contre un PostgreSQL jetable avant livraison, avec un schéma minimal reconstitué. Ont
été éprouvés : l'exécution, l'idempotence sur deux passages, **13 cas de sélection**
(dont l'ancien abonné résilié, le compte ayant déjà payé, le désabonné, le converti,
le J+3 dont `core-renew` n'a pas tourné), la contrainte d'unicité contre le double
envoi, la reprise après échec, et les droits — `authenticated` et `anon` ne peuvent
appeler ni `trial_reminder_targets()` ni lire `trial_emails`.

### v1.20.0 — Relances de fin d'essai
Quatre envois : **J-7 conditionnel** (réservé à qui n'a créé aucun événement — à qui a
déjà son plan, il n'annoncerait rien), **J-3**, **J-0**, **J+3**. Bilingues, segmentés
sur `trial_events_used` : à `0` le frein est le démarrage et le bouton mène à l'éditeur ;
au-delà, il mène à l'abonnement. Sept formes de message.

- **Ancrage sur `current_period_end::date`, pas sur le statut.** `core-renew` tourne à
  04:00 UTC et ne bascule un profil que si l'échéance est atteinte : un essai expirant
  à 10:00 UTC reste `trialing` toute la journée du J-0. L'heure de bascule dépend de
  l'heure d'inscription — le statut est instable, la date ne l'est pas. Il ne sert
  qu'en garde-fou.
- **🔴 `core_card_id is null` ne suffisait pas** à isoler un essai non converti. À la
  résiliation, `account-actions` remet la carte à `null` et `core-renew` bascule en
  `inactive` sans toucher à l'échéance : trois jours plus tard, **un ancien abonné
  résilié présente exactement la même signature qu'un essai expiré** et aurait reçu
  « votre essai est terminé ». Ajout de `cancel_at_period_end = false` et d'une absence
  de paiement `COMPLETED` — le statut, et non l'existence d'une ligne, pour qu'un
  prélèvement échoué pendant l'essai ne prive pas des relances.
- **Idempotence** par `trial_emails`, unicité `(user_id, kind)`. L'insertion **précède**
  l'envoi : la contrainte sert de verrou contre deux exécutions concurrentes. Échec
  d'envoi → la ligne est retirée, la relance repart le lendemain.
- **Désabonnement** sur les quatre envois, en-têtes RFC 8058 pour le clic unique de
  Gmail et Apple Mail. `unsubscribe.html` demande **confirmation** : les scanners de
  sécurité ouvrent les liens des e-mails, un GET actif désabonnerait à l'insu. Réponse
  identique que le jeton existe ou non — pas d'oracle d'existence de compte.
- **Lien `?subscribe=`** ouvrant la modale d'abonnement, prix affiché. Le départ
  automatique vers Core a été écarté : sessions orphelines créées par les scanners, et
  un client ne doit pas arriver sur un formulaire de carte sans avoir vu le montant.
  Le paramètre traverse l'authentification sans code supplémentaire — `requireAuth()`
  reportait déjà `pathname + search` dans `?next=`.
- **Garde-fou de gabarit** : `templatePlaceholders()` fait échouer la fonction en 409
  tant qu'une chaîne reste en placeholder. Posé après avoir failli livrer une promesse
  fausse sur le sort des événements ; conservé pour les prochaines.
- **Exception d'audit** : `supabase/functions/**` rejoint `emails/` dans les exclusions
  de l'audit couleurs. Un e-mail ne charge pas de feuille externe et ignore les
  variables CSS ; les couleurs sont regroupées dans un objet `C` unique.
- **Déployée et validée le 30/07/2026.** Sélection contrôlée avant tout envoi, envoi réel
  reçu et vérifié (expéditeur, logo, langue, date, pied de page, boutons), lien
  `?subscribe=` menant à la modale prix affiché, désabonnement éprouvé par les deux
  chemins — page de confirmation et POST en un clic.
- **Mesure de la conversion**, une fois quelques semaines écoulées :
  `select te.kind, te.variant, count(*) as envoyes,`
  `count(*) filter (where p.subscription_status = 'active') as convertis`
  `from trial_emails te join profiles p on p.id = te.user_id group by 1,2 order by 1,2;`
  C'est ce tableau qui dira si le J-7 conditionnel et la segmentation `cold`/`warm`
  valaient leurs sept formes de message. Le lien n'est pas causal — ordres de grandeur,
  pas attribution.
→ `migration-trial-reminders.sql`, `cron-trial-reminders.sql`, `trial-reminders`, `unsubscribe`

### v1.19.0 — Lecture seule après expiration
**Un compte expiré ne voyait plus aucun de ses événements.** Pas « en lecture seule » :
invisibles. `has_active_subscription()` ne renvoie vrai que pour `active` et `trialing`,
et la policy `events: select own or shared` l'exigeait **pour le propriétaire lui-même**.
Le `select` renvoyait zéro ligne — **sans erreur**, donc sans passer par la branche
`dash_load_error` : grille vide, et pour tout message « Votre essai gratuit est
terminé ». Vérifié au navigateur le 30/07/2026.

Le défaut frappait au pire moment : l'instant où l'on demande au client de s'abonner
est celui où il constatait que son travail avait disparu. Il valait aussi pour tout
abonné résilié.

- **Policy de lecture** : la branche « propriétaire » ne dépend plus de l'abonnement.
  La branche « collaborateur » est reprise mot pour mot — elle exige toujours
  `owner_has_active_paid_subscription()`, donc les collaborateurs d'un compte expiré
  restent exclus. C'était le risque de la migration, vérifié au navigateur.
- **Écriture et création inchangées.** `delete` ne demandait déjà aucun abonnement :
  volontaire, effacer ses propres données ne se conditionne pas à un paiement.
- **Éditeur : nouvel état `subExpired`, distinct du rôle `viewer`.** Réutiliser
  « viewer » aurait masqué les régimes alimentaires au propriétaire lui-même
  (`displayDiet`, v1.11.0 — la minimisation RGPD vise les **tiers**, pas le
  responsable de traitement) et affiché un badge laissant croire à une
  rétrogradation. L'utilisateur est bien propriétaire ; c'est son abonnement qui ne
  permet plus d'écrire.
- **🔴 Écritures court-circuitées, et c'est le point sensible.** Un `update` refusé par
  RLS **ne remonte aucune erreur** : PostgREST répond 204 avec zéro ligne touchée.
  Le traitement d'erreur de `doWrite()` ne pouvait donc pas s'en apercevoir et
  l'éditeur aurait affiché « enregistré » sur un travail perdu. Le garde est posé à
  l'entrée de `doWrite()` et de `saveEventDate()`, pas dans la gestion d'erreur.
- **Exports et impression conservés** — sans classe de rôle depuis la v1.15.0, ils
  restent accessibles. C'est précisément ce dont a besoin quelqu'un qui veut récupérer
  son plan.
- Bandeau d'expiration dans l'éditeur, mention « Lecture seule » sur les cartes du
  tableau de bord, message du bandeau reformulé (il annonçait la fin de l'essai sans
  dire que les plans étaient conservés).
- **Déployée et vérifiée en production le 30/07/2026** — les deux parcours au
  navigateur : propriétaire expiré en consultation, collaborateur d'un compte expiré
  toujours exclu.
→ `migration-readonly-inactive.sql`

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

#### ~~Relances de fin d'essai~~ — **livrées en v1.20.0**
*Décisions conservées ; le détail est au §3.*

**Besoin** : sans carte enregistrée, rien ne ramène le client à l'expiration. C'est la
pièce qui déterminera le taux de conversion.

**Calendrier : quatre envois.** J-7, J-3, J-0 (matin du dernier jour), J+3.
Le **J-7 est conditionnel** — réservé à qui n'a pas encore créé d'événement
(`trial_events_used = 0`). À qui a déjà son plan, il n'annoncerait rien : l'échéance
est encore à une semaine.

**Segmentation sur `trial_events_used`.** Deux populations à ne pas traiter du même
texte : `= 0` (le frein est le démarrage, l'objectif est l'activation — le bouton mène
à l'éditeur, pas à l'abonnement) et `≥ 1` (le produit a été vu, le frein est le prix ou
l'échéance — le bouton mène à l'abonnement). Sept formes de message au total, le J-7
n'existant qu'en variante froide.

**Bilingue FR/EN via `profiles.lang`, repli anglais.** Contrairement aux gabarits
Supabase, ces envois sont les nôtres : rien n'impose l'anglais seul.

**Adresse lue dans `auth.users.email`**, pas dans `profiles.email` — ce dernier n'est
pas synchronisé après changement d'adresse (§5.3). Effet de bord utile : le correctif
correspondant perd de son urgence.

**Sélection ancrée sur `current_period_end::date`, jamais sur le statut seul.**
`core-renew` tourne à 04:00 UTC et ne bascule un profil que si l'échéance est atteinte :
un essai expirant à 10:00 UTC reste `trialing` toute la journée du J-0 et ne passe
`inactive` que le lendemain. L'heure de bascule dépend donc de l'heure d'inscription —
le statut est un signal instable, la date ne l'est pas. Le statut ne sert qu'en
garde-fou : `trialing` exigé pour J-7/J-3/J-0, `inactive` pour J+3. Si `core-renew` a
échoué, le J+3 ne part pas — mieux vaut ne rien envoyer qu'annoncer à tort la fin d'un
essai.

**Distinguer un essai non converti d'un ancien abonné**, tous deux `inactive` :
`trial_started_at is not null and core_card_id is null`.

**Tâche quotidienne à 08:00 UTC**, quatre heures après `core-renew` — le J+3 exige que
la bascule ait eu lieu. Comparaisons en dates. Aucun fuseau par destinataire : on n'en
stocke pas, et avec une clientèle internationale aucune heure ne conviendrait à tous.

**Idempotence par table `trial_emails`**, unicité `(user_id, kind)`, sur le modèle de
`payments`. L'insertion **précède** l'envoi : la contrainte fait office de verrou, un
rejeu du cron ou deux exécutions concurrentes se heurtent à un conflit au lieu
d'envoyer deux fois. Échec d'envoi → la ligne est retirée, la relance repart le
lendemain. Sert aussi à mesurer la conversion par échéance.

**Désabonnement sur les quatre envois.** Les trois premiers portent sur un contrat en
cours, le J+3 est de la prospection : le distinguer serait un raffinement inutile.
En-têtes `List-Unsubscribe` / `List-Unsubscribe-Post` pour le désabonnement en un clic
de Gmail et Apple Mail. Deux colonnes ajoutées à `profiles`
(`trial_emails_opt_out`, `unsubscribe_token`), **écrites uniquement par la Edge
Function** — aucun `grant update` supplémentaire, la liste blanche du §6 reste intacte.
- Page `unsubscribe.html` avec **confirmation explicite** : les scanners de sécurité et
  certaines passerelles antispam ouvrent les liens des e-mails, un GET actif
  désabonnerait des gens à leur insu. Le GET sur la fonction redirige, il n'écrit pas.
- Réponse **identique que le jeton existe ou non**, même raisonnement que « mot de passe
  oublié » (v1.14.0) : ne pas fournir d'oracle d'existence de compte.

**Clé Resend distincte.** Une seconde clé en permission *Sending access* seule, réservée
aux Edge Functions, plutôt que la clé « Full access » existante. Moindre privilège, et
surtout révocabilité : révoquer la clé des relances ne doit pas couper les e-mails
d'authentification. À stocker en secret `RESEND_API_KEY`. L'API HTTP de Resend est
distincte du SMTP configuré dans Auth, qui ne sert qu'aux e-mails Supabase.

**Lien de l'e-mail : `dashboard.html?subscribe=annual|monthly`**, qui ouvre la modale
d'abonnement formule présélectionnée et prix affiché. Un clic délibéré déclenche
`core-register-card`. Le déclenchement **automatique à l'arrivée a été écarté** :
`core-register-card` renvoie une URL Core à usage unique et exige une session, or
(a) les scanners suivent les liens et créeraient des sessions orphelines,
(b) le paramètre est perdu à la redirection vers `auth.html` si le client n'est pas
connecté — il faut le porter à travers l'authentification, (c) arriver sur un
formulaire de carte sans avoir vu le prix est mauvais commercialement et exposé
juridiquement, les CGV n'étant pas rédigées. L'annuel est présenté en premier et en
bouton principal : commission Core ~2,2 % contre ~4 % sur le mensuel.

**Ce que devient un compte après l'échéance : tranché — option (a), livrée en v1.19.0.**
Le produit a été aligné sur la promesse plutôt que l'inverse : les événements d'un
compte expiré redeviennent consultables. Les trois variantes `warm` peuvent donc
l'affirmer sans mentir. Le découpage en deux versions était délibéré — la lecture seule
corrige un défaut de production qui vaut indépendamment des e-mails, et isole une
modification de policy dans une livraison vérifiable seule.

`AFTER_EXPIRY` reste à réécrire dans `templates.ts` : la constante est encore en
placeholder, le garde-fou la bloque.

Sans objet pour la collaboration dans tous les cas : elle est réservée aux abonnés
actifs, l'essai n'y donne pas droit (v1.5.x) — un compte en essai n'a jamais de
collaborateur à perdre.

**Garde-fou en place** : `AFTER_EXPIRY` et `POSTAL_ADDRESS` sont livrés en placeholder,
et `templatePlaceholders()` fait échouer la fonction en 409 tant qu'ils n'ont pas été
remplacés. Aucun e-mail faux ne peut partir par inadvertance — le mode de défaut
habituel du §7 est ici rendu bruyant.

**Renseigné** : adresse postale — Childish Agency, 4 Rue Baron de Sainte Suzanne,
98000 Monaco. `templatePlaceholders()` ne trouve plus de placeholder ; la fonction
peut envoyer.

**Livré** : `migration-trial-reminders.sql`, `cron-trial-reminders.sql`,
`supabase/functions/trial-reminders/` (`index.ts`, `templates.ts`),
`supabase/functions/unsubscribe/index.ts`, `unsubscribe.html`.

**Reste à produire — exige les sources de la v1.18.1** : la modale `?subscribe=` dans
`dashboard.html` et le report du paramètre à travers `auth.html`, les 9 clés de
`unsubscribe.html` dans `shared/i18n.js`, l'alignement de `unsubscribe.html` sur les
noms réellement exposés par `supabase-config.js` et `i18n.js`, l'incrément de version
dans `event.html`, l'archive.

**Gabarits d'e-mails et audit couleurs** : `supabase/functions/**` doit être exclu de
l'audit du §7, comme l'est `emails/`. Un e-mail ne charge pas de feuille de style
externe et ignore les variables CSS ; les couleurs y sont nécessairement littérales.
Elles sont regroupées dans un objet `C` unique en tête de `templates.ts`.

- Version : MINOR → **v1.20.0**.

### 5.3 Correctifs connus

> **Leçon de la v1.18.1** — deux invariants ont été enfreints en silence pendant
> plusieurs versions : une couleur en dur hors de `theme.css`, et un `data-i18n`
> posé sur une balise fermante. Ni l'un ni l'autre ne produit d'erreur. Les deux
> audits qui les ont trouvés sont scriptables et méritent d'être rejoués avant
> chaque livraison — cf. §7.

#### ~~🔴 Événements invisibles après expiration~~ — **corrigé en v1.19.0**
*Conservé pour mémoire ; le détail de la correction est au §3.*

- **Constat** : en `inactive`, `has_active_subscription()` est faux et la policy
  `events: select own or shared` bloque la lecture pour le propriétaire lui-même. Le
  `select` de `loadEvents()` renvoie **zéro ligne sans erreur** : la grille est vide, et
  le seul message affiché est « Votre essai gratuit est terminé — abonnez-vous pour
  continuer ». Rien ne dit que les plans existent toujours.
- **Impact** : c'est le moment précis où l'on cherche à convertir, et le client constate
  que son travail a disparu. Deux effets — l'abandon, et le support. Aggravé par les
  relances J+3, qui écriraient « vos plans vous attendent » vers un tableau de bord vide.
- **Trois niveaux de correction**, du moins cher au plus complet :
  1. **Message seul** — remplacer le texte du bandeau par « Vos N événements sont
     conservés ; un abonnement en rétablit l'accès ». Suppose de compter les événements,
     donc une fonction `security definer` ou une colonne de comptage : la policy
     interdit même le `count`. PATCH.
  2. **Lecture seule réelle** — policy de lecture ouverte au propriétaire quel que soit
     le statut, écriture inchangée, éditeur forcé en lecture seule quand
     `subscription_status` ne vaut ni `active` ni `trialing`. Le mécanisme d'affichage
     par rôle existe déjà (v1.15.0 : `.owner-only`, `.editor-only`) et l'export PNG
     resterait accessible. MINOR.
  3. **Idem + bandeau d'incitation** dans l'éditeur. MINOR.
- **Attention** : la policy de lecture porte aussi sur les collaborateurs, via
  `owner_has_active_paid_subscription()`. Ouvrir la lecture au propriétaire ne doit pas
  la rouvrir aux collaborateurs d'un compte expiré — la clause est distincte, mais à
  vérifier explicitement au navigateur (§7 : jamais depuis le SQL Editor).
- **Lien avec les relances** : le choix (a)/(b)/(c) du §5.2 est le même arbitrage.
- Version : PATCH ou MINOR selon le niveau retenu.

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

**Exécuter les migrations en local avant de les livrer** (v1.20.1). Un PostgreSQL
jetable et un schéma minimal reconstitué suffisent à faire apparaître ce qu'aucune
relecture ne montre : un index refusé, une colonne absente, une fonction qui ne compile
pas. La sélection des destinataires s'y éprouve aussi sur des cas construits, sans
envoyer un seul e-mail — c'est ce qui a validé l'exclusion de l'ancien abonné résilié.

**Deux contrôles à rejouer avant livraison** (v1.18.1) :
- *Couleurs* — aucune couleur littérale hors de `shared/theme.css`, exception faite
  des palettes de **données** (`GROUP_COLORS`, couleurs d'événement).
  `ui-modal.js` y a échappé pendant cinq versions sans qu'aucun test ne le signale.
  ⚠️ **Le motif était incomplet** (v1.20.2) : `rgb(` ne correspond pas à `rgba(`,
  les quatre caractères ne s'y suivant pas. Chercher `#rrggbb`, `rgb(`, **`rgba(`**,
  **`hsl(`**, **`hsla(`**. Quatre couleurs de l'ancienne palette dorée survivaient
  ainsi dans `event.html` sept versions après l'unification.
  **Reste 19 occurrences** dans le projet, hors périmètre de la v1.20.2 : ombres
  portées surtout, dont `rgba(234,200,115,.28)` dans `account.html` et
  `rgba(60,50,15,.14)` dans `dashboard.html` — encore le doré.
- *Traductions* — tout texte visible doit être couvert par un `data-i18n*`, **et
  l'attribut doit être sur une balise ouvrante**. Un attribut sur `</svg>` est ignoré
  sans erreur. Contrôle utile : appliquer le dictionnaire anglais à chaque page et
  chercher ce qui reste en français.

**Le canevas n'interprète pas les variables CSS** (v1.20.2). `ctx.fillStyle =
"var(--ink)"` n'affecte rien et **conserve la valeur précédente** — le tracé
continue avec la mauvaise couleur, sans erreur. `addColorStop("var(--x)")`, lui,
**lève**. Toute couleur destinée à un canevas doit être résolue par
`getComputedStyle` au préalable. Vaut aussi pour l'attribut `content` d'un
`<meta>` — `theme-color` porte encore `var(--floor)` dans `event.html`, sans
conséquence puisque `applyThemeColor()` le réécrit dès le premier rendu.

**Un `data-i18n` sur un élément à enfants efface l'enfant** (v1.18.1, retrouvé en
v1.21.0). L'attribut écrit `textContent`. Le cas connu était `<label>` + `<input>` ;
le cas **général** est n'importe quel élément porteur de `data-i18n` contenant une
balise. L'audit à rejouer ne doit donc pas chercher `<label>` mais tout élément dont
le contenu comporte un `<`. Un cas a survécu à un audit trop étroit : l'import d'un
plan JSON, dont l'`<input type="file">` était détaché au `DOMContentLoaded` — après
l'attachement de son écouteur, donc sans la moindre erreur.

**Ce qui est affiché n'est pas ce qui est imprimé** (v1.21.0). `@media print`
neutralise la transformation de zoom mais **pas les classes posées par le JS en
fonction de ce zoom**. `.show-fullnames` étant conditionné au seuil de 135 %, la
feuille ne portait que des initiales dès lors qu'on imprimait depuis un affichage
normal. Toute classe qui décide d'un **contenu** doit être forcée explicitement dans
`@media print`, ou détachée de l'état d'affichage — voie retenue ici.

**Le canevas n'a pas de `max-width`** (v1.21.0). `ctx.fillText` écrit ce qu'on lui
donne, sans troncature ni retour à la ligne. Tout texte de longueur non maîtrisée
doit être tronqué à la main via `measureText`, et la boîte englobante calculée sur
sa largeur **mesurée** : une marge forfaitaire finit toujours par être dépassée.

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
**v1.21.2** : `dashboard.html` 19 678 o · `event.html` 179 270 o ·
`i18n.js` 47 695 o (inchangé) · `theme.css` 5 248 o (inchangé) ·
`ui-modal.js` 12 021 o (inchangé) · `supabase-config.js` 1 545 o (inchangé).
*(v1.21.1 : `i18n.js` 47 695 o · `theme.css` 5 248 o · `event.html` 177 710 o.)*
*(v1.20.2 : `i18n.js` 47 443 o · `theme.css` 5 248 o · `event.html` 158 346 o.)*
**Relever ces valeurs à chaque version** : elles étaient restées à celles de la v1.7.0,
si bien que le contrôle ne détectait plus rien.

**Modèle de données** — le champ « allergie » utilise le champ existant `diet` ; il n'y
a pas de champ distinct.

**Statut `inactive` — lecture seule depuis la v1.19.0.** *Avant cette version :*
`has_active_subscription()` (`schema.sql`) ne renvoie vrai que pour `active` et
`trialing`, et la policy `events: select own or shared` (`migration-collab.sql`) l'exige
pour le propriétaire. Un `select` sur `events` renvoie donc **zéro ligne, sans erreur** :
`loadEvents()` affiche une grille vide et rien n'indique que les données existent
toujours. Elles sont bien en base — mais l'utilisateur voit ses plans disparaître.
Corrigé en v1.19.0 : la branche « propriétaire » de la policy de lecture ne dépend plus
de l'abonnement. **L'écriture, elle, reste fermée** — et un `update` refusé par RLS ne
remonte aucune erreur au client (PostgREST répond 204, zéro ligne touchée). Toute
écriture doit donc être court-circuitée dans l'interface : compter sur un message
d'erreur reviendrait à afficher « enregistré » sur un travail perdu.

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
