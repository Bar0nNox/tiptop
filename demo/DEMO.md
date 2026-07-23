# Démo complète TipTop — mode d'emploi

Ce dossier contient `invites-demo.csv` : 42 invités répartis en 10 groupes, dont 16
avec un régime ou une allergie. Suivez les étapes ci-dessous pour exercer **toutes**
les fonctionnalités de l'app.

## 1. Charger les invités (import CSV)
1. Ouvrez un événement dans TipTop.
2. Menu > **Importer**.
3. Soit glissez le fichier `invites-demo.csv`, soit copiez-collez son contenu dans la zone.
4. « 42 invités détectés » doit s'afficher. Confirmez.

Le format d'import gère **Nom, Groupe, Régime**. Les +1 et les incompatibilités ne
s'importent pas (ce n'est pas prévu par le format) — on les ajoute à la main plus bas,
ce qui fait justement partie de la démo.

## 2. Créer des tables
Ajoutez plusieurs tables pour accueillir 42 personnes, par exemple :
- 4 tables rondes de 8 places, ou
- un mélange rondes / rectangulaires (testez aussi les tables rectangulaires avec
  bouts de table via l'inspecteur).

## 3. Placement automatique (groupes + incompatibilités)
1. Menu > **Placement automatique**.
2. Observez : les membres d'un même groupe (ex. « Amis mariée ») sont regroupés,
   les +1 placés côte à côte.

## 4. Démontrer les incompatibilités (« ne pas asseoir avec »)
L'auto-placement respecte les incompatibilités. Pour en créer :
1. Cliquez un invité dans la liste (ex. **Bernard Moreau**) pour ouvrir son éditeur.
2. Section « Ne pas asseoir avec » : cochez une autre personne (ex. **Jean-Pierre Laurent**).
3. Refaites un placement automatique : les deux ne devraient plus être à la même table.

Suggestion de scénario parlant : brouillez deux familles (Laurent vs Moreau) avec 2–3
incompatibilités croisées, puis relancez l'auto-placement.

## 5. Démontrer les +1
1. Éditez un invité (ex. **Inès Roux**, groupe « Plus un »).
2. Cochez « Accompagné d'un +1 ». Un convive lié apparaît.
3. Au placement, le +1 est posé à côté de son invité.

## 6. Zoom (nouveau v1.3.0)
- **Molette** sur le plan, ou **boutons +/−** en bas à droite, ou **pincé à deux doigts**
  sur écran tactile.
- Vérifiez que le déplacement d'une table reste précis même zoomé.

## 7. Noms adaptatifs (nouveau v1.3.0)
- À zoom normal : les sièges affichent les **initiales**.
- Zoomez au-delà de ~135 % : les sièges affichent le **nom complet**.
- Survolez un siège : le nom complet apparaît en infobulle à tout niveau de zoom.

## 8. Étiquettes d'orientation (nouveau v1.3.0)
- Cliquez les zones de texte sur les 4 bords du plan (haut/bas/gauche/droite).
- Saisissez par exemple : haut = « Mer », bas = « Entrée », gauche = « Jardin »,
  droite = « Cuisine ».
- Elles sont sauvegardées et partagées entre appareils.

## 9. Personnalisation (v1.2.0)
- Menu : changez le **nom de l'événement** et la **couleur** de l'interface.

## 10. Export PNG enrichi (nouveau v1.3.0)
- Menu > **Exporter PNG**.
- Vérifiez sur l'image : nom complet sous chaque siège occupé, **tag de régime/allergie**
  (ex. « Allergie fruits de mer », « Végétalienne »), et les **étiquettes d'orientation**
  sur les bords.

## 11. Collaboration temps réel
- Ouvrez le même événement dans un second navigateur (même compte).
- Déplacez une table d'un côté : le changement apparaît de l'autre.

## Couverture des cas de régime/allergie (pour tester l'export)
Le jeu de données inclut volontairement : Végétarienne, Végétalienne/Végétalien,
Sans gluten, Sans lactose, Sans sel, Diabétique, et plusieurs allergies (fruits de mer,
arachides, fruits à coque, œuf) — de quoi vérifier l'affichage des tags à l'export.
