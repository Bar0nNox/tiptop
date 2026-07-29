# CONTEXTE — TipTop

> À déposer dans les connaissances du projet, avec `ROADMAP.md`.
> Ce fichier ne change presque jamais. Le roadmap, lui, évolue à chaque session.

---

## Le projet en trois lignes

Application web de **plans de table pour événements**, vendue en abonnement.
Client : **Childish Agency** (Monaco). Marché visé : **international**, interface
bilingue FR/EN. En production sur `https://tiptopplans.com`.

---

## Comment on travaille

**Roadmap d'abord.** Une demande de nouvelle fonctionnalité est **inscrite au
roadmap** — besoin, décisions prises, points à trancher, version cible — et n'est
codée que sur demande explicite. Les **corrections de bugs** signalés en test sont
traitées directement, sans passer par le roadmap.

**Versionnage sémantique** MAJOR.MINOR.PATCH, couvrant tout le projet. Le numéro
figure à trois endroits qui doivent rester cohérents : `APP_VERSION` dans
`event.html`, le bandeau de commentaire en tête du même fichier, et l'en-tête du
roadmap. Une mise à jour du seul roadmap **n'incrémente rien**.

**Livraison** sous forme d'archive `tiptop-saas-vX.Y.Z.zip`. Le dossier interne porte
le même nom.

**Ton attendu** : factuel et précis, sans encouragements inutiles. Ne pas sacrifier la
qualité pour aller vite. Poser les questions nécessaires plutôt que deviner.

---

## Pièges rencontrés — à ne pas redécouvrir

**Vérifier l'archive avant de la livrer.** Un ZIP livré contenait deux fichiers à
zéro octet alors que les sources étaient intactes : le site est devenu inutilisable.
Un autre contenait une version périmée d'un fichier. **Reconstruire le dossier de
sortie intégralement**, puis extraire le ZIP et comparer les empreintes avec les
sources avant de présenter quoi que ce soit.

**Les substitutions échouent en silence.** `sed` ne signale rien quand le motif est
absent, et un `str.replace` non plus. Cinq incréments de version consécutifs ont ainsi
échoué sans bruit. **Toujours poser une assertion** qui échoue si la substitution n'a
pas eu lieu.

**Piège de nommage dans `event.html`.** Une vingtaine de fonctions y utilisent une
variable locale `t` pour désigner une table, ce qui masque la fonction de traduction
globale `t()`. S'est matérialisé une fois : le libellé « couverts » était
intraduisible. Contournements employés : renommer la variable en `tbl`, ou appeler
`window.t(...)`.

**Tester la sécurité depuis le navigateur, pas le SQL Editor.** Celui-ci s'exécute
avec le rôle de service : `auth.uid()` y est nul et les protections de rôle sont
volontairement inactives. Un test de permission y donnerait un résultat trompeur.

**Le dépôt FTP n'efface jamais.** Il ajoute et remplace. Les fichiers retirés d'une
version restent indéfiniment sur le serveur : les supprimer à la main.

**Caches obstinés.** Safari conserve les favicons et l'état de sécurité TLS ; iOS
conserve les icônes d'écran d'accueil. Après un dépôt : rechargement forcé, et pour
l'icône, supprimer puis rajouter le raccourci.

**Fichiers iCloud non téléchargés.** Un dossier synchronisé peut contenir des fichiers
présents seulement dans le nuage ; un client FTP les transfère alors vides.
Décompresser les archives hors iCloud.

---

## Architecture

| Brique | Détail |
|---|---|
| Frontend | HTML/JS statique, hébergement OVH mutualisé, dépôt FTP dans `www` |
| Backend | Supabase — Postgres, Auth, Realtime, Edge Functions (Frankfurt) |
| Paiement | Core by Carlo (Monaco) — sandbox actif, **production en attente d'un passeport** |
| E-mails | Resend en SMTP, domaine vérifié, expéditeur `hello@tiptopplans.com` |
| Connexion | E-mail/mot de passe + Google OAuth |

**Pages** : `index`, `auth`, `reset`, `dashboard`, `event` (l'éditeur, de loin la plus
grosse), `account`, `join`.
**Partagé** : `theme.css` (toutes les couleurs), `i18n.js` (~200 clés FR/EN),
`ui-modal.js`, `theme-switch.js`, `supabase-config.js`, icônes.
**Gabarits d'e-mails** dans `emails/`, à coller dans Supabase — en **anglais
uniquement**, Supabase ne gérant pas deux langues sur un même gabarit.

---

## Règles de sécurité en place

Deux failles ont été trouvées et corrigées lors d'un audit ; elles sont décrites dans
le roadmap. Deux principes en découlent :

**Liste blanche, jamais liste noire.** Les restrictions de rôle comparent ce qui doit
rester inchangé, et non ce qui peut changer : un champ ajouté plus tard est bloqué par
défaut, ce qui oblige à l'autoriser sciemment.

**Droits au niveau colonne.** Le rôle client ne peut écrire que `events(name, doc,
event_date)`, `event_invites(revoked_at)`, `profiles(lang)`. **Toute nouvelle colonne
écrite depuis le navigateur doit être explicitement autorisée**, sinon même le
propriétaire ne pourra pas l'enregistrer.

---

## Pour démarrer une session

Un chantier par discussion. Ouvrir en indiquant lequel, et me laisser lire le roadmap :
il porte l'état, les décisions déjà prises et les points restant à trancher.

À la fin de chaque session, **remplacer `ROADMAP.md` dans les connaissances du
projet** — je peux le lire, pas l'écrire.
