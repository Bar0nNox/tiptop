/* =========================================================================
   Contrôle du chevauchement des étiquettes — v1.21.0

   Le banc test_export.mjs vérifie que le nouveau rendu est correct. Celui-ci
   vérifie autre chose, et c'est le seul qui prouve qu'on corrige bien le défaut
   signalé : que l'ANCIENNE règle échoue et que la NOUVELLE passe, sur la même
   géométrie, extraite du fichier livré.

   L'arithmétique en jeu :
     - deux sièges voisins sont distants de `pas` (mesuré sur la géométrie réelle) ;
     - une étiquette occupe, DANS LA DIRECTION OÙ LES SIÈGES SE SUCCÈDENT :
         • ancienne règle (horizontale, centrée sous le siège) → sa LARGEUR,
           jusqu'à 120 px, plafond de .full-name ;
         • nouvelle règle (perpendiculaire à la table)        → sa HAUTEUR de
           bloc, 11 px (nom seul) ou 26 px (nom + pastille de régime).
     - il y a chevauchement dès que cette occupation dépasse le pas.
   ========================================================================= */
import fs from "node:fs";

const SRC = fs.readFileSync("../event.html", "utf8");

function entre(debut, fin, quoi) {
  const a = SRC.indexOf(debut);
  if (a < 0) { console.error("ARRÊT — borne de début introuvable (" + quoi + ")"); process.exit(2); }
  const b = SRC.indexOf(fin, a);
  if (b < 0) { console.error("ARRÊT — borne de fin introuvable (" + quoi + ")"); process.exit(2); }
  return SRC.slice(a, b + fin.length);
}

const CODE = [
  entre("const SEAT = 34,", "EDGE = 10;", "constantes de siège"),
  entre("function tableGeometry(t){", "return { body:{ w, h, round:false }, seats };\n}", "tableGeometry")
].join("\n");
const { tableGeometry } = new Function(CODE + "\n; return { tableGeometry };")();

/* Plafond de .full-name (CSS) et de LBL_MAX (canevas) : la valeur est lue dans
   le fichier livré plutôt que recopiée, pour qu'un changement de l'un sans
   l'autre fasse échouer ce contrôle. */
const capCss = /\.seat \.occupant \.seat-label > span\{[^}]*max-width:(\d+)px/.exec(SRC);
const capCanvas = /const LBL_MAX = (\d+)/.exec(SRC);
if (!capCss || !capCanvas) { console.error("ARRÊT — plafond de largeur introuvable"); process.exit(2); }
if (capCss[1] !== capCanvas[1]) {
  console.error("ARRÊT — plafonds divergents : CSS " + capCss[1] + " px, canevas " + capCanvas[1] + " px.");
  console.error("        L'écran, la feuille et l'image tronqueraient différemment.");
  process.exit(2);
}
const LARGEUR_MAX = Number(capCss[1]);
const H_NOM_SEUL = 11, H_AVEC_REGIME = 26;

const formes = [
  { nom: "ronde, 8 couverts",         t: { id: "x", shape: "round", seats: 8,  x: 0, y: 0 } },
  { nom: "ronde, 12 couverts",        t: { id: "x", shape: "round", seats: 12, x: 0, y: 0 } },
  { nom: "ronde, 16 couverts",        t: { id: "x", shape: "round", seats: 16, x: 0, y: 0 } },
  { nom: "rectangulaire, 10 + 2 bouts", t: { id: "x", shape: "rect", seats: 10, ends: 2, x: 0, y: 0 } },
  { nom: "rectangulaire, 20 couverts",  t: { id: "x", shape: "rect", seats: 20, ends: 0, x: 0, y: 0 } },
  { nom: "rectangulaire verticale, 14", t: { id: "x", shape: "rect", seats: 14, ends: 0, orient: "vertical", x: 0, y: 0 } }
];

/* Plus petit écart entre deux sièges, toutes paires confondues.
   Un regroupement par bord serait tentant mais faux sur une table ronde, où
   chaque siège porte une normale distincte : chacun se retrouverait seul dans
   son groupe et l'écart minimal vaudrait l'infini — un contrôle qui ne mesure
   rien et passe toujours. Le voisin le plus proche est de toute façon celui du
   même bord : sur une table rectangulaire, deux sièges se faisant face sont
   distants de 142 px contre 54 à 58 le long d'un côté. */
function pasMinimal(geo) {
  let mini = Infinity;
  for (let i = 0; i < geo.seats.length; i++)
    for (let j = i + 1; j < geo.seats.length; j++)
      mini = Math.min(mini, Math.hypot(geo.seats[i].x - geo.seats[j].x,
                                       geo.seats[i].y - geo.seats[j].y));
  return mini;
}

let echecs = 0, ancienneEnDefaut = 0;
console.log("\nContrôle du chevauchement — v1.21.0\n");
console.log("  " + "table".padEnd(30) + "pas".padStart(8) + "  ancienne".padStart(12) + "  nouvelle".padStart(12));

formes.forEach(({ nom, t }) => {
  const geo = tableGeometry(t);
  const pas = pasMinimal(geo);
  if (!Number.isFinite(pas)) {
    console.log("  ÉCHEC — " + nom + " : écart non mesurable, le contrôle serait vide.");
    echecs++; return;
  }

  // Ancienne règle : le nom est horizontal et centré sous le siège. Sur un bord
  // horizontal, il occupe sa largeur dans la direction de succession.
  const ancienne = LARGEUR_MAX;
  // Nouvelle règle : le bloc est perpendiculaire, il occupe sa hauteur.
  const nouvelle = H_AVEC_REGIME;

  const okAncienne = ancienne < pas;
  const okNouvelle = nouvelle < pas;
  if (!okAncienne) ancienneEnDefaut++;
  if (!okNouvelle) { echecs++; }

  console.log("  " + nom.padEnd(30)
    + pas.toFixed(1).padStart(8)
    + (okAncienne ? "  ok" : "  CHEVAUCHE").padStart(12)
    + (okNouvelle ? "  ok" : "  CHEVAUCHE").padStart(12));
});

console.log("");
if (echecs) {
  console.log("  ÉCHEC — " + echecs + " forme(s) chevauchent encore avec la nouvelle règle.");
} else {
  console.log("  ok   — aucune forme ne chevauche avec la règle perpendiculaire.");
}
/* Sans ce second contrôle, le premier ne prouverait rien : si l'ancienne règle
   passait partout, c'est que le jeu de formes n'exerce pas le défaut. */
if (!ancienneEnDefaut) {
  console.log("  ÉCHEC — l'ancienne règle ne chevauche nulle part : le jeu de");
  console.log("          formes n'exerce pas le défaut, le contrôle est vide.");
  echecs++;
} else {
  console.log("  ok   — l'ancienne règle chevauche sur " + ancienneEnDefaut + " forme(s) sur "
    + formes.length + " : le défaut est bien reproduit.");
}
console.log("");
console.log("  Nom seul (" + H_NOM_SEUL + " px) et nom + régime (" + H_AVEC_REGIME
  + " px) sont tous deux sous le pas minimal observé.");
console.log("");
process.exit(echecs ? 1 : 0);
