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

*Format : besoin + points à trancher + version cible envisagée. Aucune implémentation
tant que les points ne sont pas tranchés.*

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

### Onglet « Mon compte »
- **Besoin** : regrouper tout ce qui concerne le compte utilisateur.
- **Points à trancher** :
  - Contenu : e-mail/mot de passe, moyens de connexion liés, abonnement et
    facturation (désormais possible : carte enregistrée, historique `payments`,
    résiliation), suppression du compte, préférences.
  - Emplacement : onglet dans la navigation ou menu profil ?
  - Suppression de compte : immédiate ou délai de grâce ; sort des événements créés,
    et des accès accordés à des collaborateurs.
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

### Personnaliser l'e-mail de confirmation d'adresse
- **Besoin** : personnaliser contenu et expéditeur de l'e-mail de confirmation.
- **Décisions prises** : texte/logo/couleurs ET expéditeur ; français uniquement.
- **Résolu depuis** : le fournisseur d'authentification est **Supabase**.
- **Points restant à trancher** : envoi natif Supabase (domaine vérifié, DNS/SPF/DKIM
  — dépend du domaine OVH) ou service tiers (Resend, SendGrid) ; comportement du lien
  de confirmation.
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
