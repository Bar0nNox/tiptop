/* =========================================================================
   Banc d'essai de l'export PNG et des étiquettes de siège — v1.23.0

   Aucun navigateur n'est disponible ici. On extrait donc du fichier livré les
   fonctions réellement concernées et on les exécute contre un canevas simulé
   qui applique la MÊME règle que le vrai : toute couleur non analysable est
   refusée. addColorStop lève, fillStyle ignore en silence — c'est exactement
   ce qui a masqué le défaut de l'export pendant sept versions.

   ⚠️ L'extraction se fait désormais par BORNES TEXTUELLES assertées et non par
   numéros de ligne (v1.21.0). Les numéros glissent à chaque édition, et une
   extraction décalée aurait donné un banc d'essai s'exécutant contre le mauvais
   code — sans rien signaler, le mode de défaut habituel du projet.

   Ce banc vérifie :
     1. l'export s'exécute sans lever ;
     2. aucune chaîne "var(--x)" n'atteint le canevas ;
     3. un échec de résolution est bien signalé à l'utilisateur ;
     4. aucune étiquette n'est jamais dessinée à l'envers ;
     5. chaque siège porte une normale sortante cohérente avec son bord ;
     6. les noms longs sont tronqués et la boîte englobante les contient ;
     7. (v1.22.0) une pastille de régime ou d'allergie n'est JAMAIS tronquée :
        entière ou omise, l'allergie primant, le régime jamais seul quand une
        allergie existe ;
     8. (v1.23.0) un élément de décor borne les étiquettes voisines, entre dans
        la boîte englobante de l'image et y est dessiné.
   ========================================================================= */
import fs from "node:fs";

const SRC = fs.readFileSync("../event.html", "utf8");

/* Extrait le code compris entre deux bornes littérales, bornes incluses.
   Toute borne absente ou mal ordonnée arrête le banc : mieux vaut un échec
   bruyant qu'un test qui s'exécute contre le mauvais code. */
function entre(debut, fin, quoi) {
  const a = SRC.indexOf(debut);
  if (a < 0) { console.error("ARRÊT — borne de début introuvable (" + quoi + ")"); process.exit(2); }
  const b = SRC.indexOf(fin, a);
  if (b < 0) { console.error("ARRÊT — borne de fin introuvable (" + quoi + ")"); process.exit(2); }
  return SRC.slice(a, b + fin.length);
}

/* ---- Variables CSS, telles que theme.css et applyThemeColor les exposent --- */
const VARS = {
  "--floor": "#FDF4F7", "--ink": "#1E211F", "--ink-soft": "#5C625F",
  "--ink-faint": "#989E9B", "--table-top": "#F6D9E4", "--table-top-hi": "#FBECF1",
  "--table-edge": "#E7A8C0", "--chair": "#FFFFFF", "--chair-edge": "#F7E2EA",
  "--seat-filled": "#FBEDF3", "--label-bg": "rgba(255,255,255,.92)",
  "--ok": "#3F7A52", "--ok-soft": "#E4F0EA",
  "--danger": "#B4453C", "--danger-soft": "#FBEDEA",
  "--decor": "#E6EAE8", "--decor-edge": "#AEB5B1", "--on-decor": "#4A504D",
  "--canvas-shadow": "rgba(30,33,31,.20)",
  "--canvas-shadow-soft": "rgba(30,33,31,.12)"
};

/* ---- Le contrôle : une couleur doit être analysable --------------------- */
const COULEUR_OK = /^(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\))$/;
const refusees = [];
function verifier(champ, v) {
  if (typeof v !== "string") return v;      // dégradé ou objet
  if (!COULEUR_OK.test(v.trim())) refusees.push(champ + " = " + v);
  return v;
}

/* Rotations appliquées et textes tracés, relevés pour les contrôles radiaux.
   La pile save/restore est simulée : `rotation` est l'angle courant cumulé. */
let rotations = [], traces = [], rotation = 0;
const pile = [];

class ContexteSimule {
  constructor() { this.ops = 0; this.font = ""; this.textAlign = ""; this.textBaseline = ""; }
  set fillStyle(v)   { verifier("fillStyle", v); this._f = v; }
  get fillStyle()    { return this._f; }
  set strokeStyle(v) { verifier("strokeStyle", v); this._s = v; }
  get strokeStyle()  { return this._s; }
  set shadowColor(v) { verifier("shadowColor", v); this._sc = v; }
  get shadowColor()  { return this._sc; }
  createRadialGradient() {
    return { addColorStop(_, c) {
      /* Le vrai canevas LÈVE ici, contrairement à fillStyle. */
      if (!COULEUR_OK.test(String(c).trim()))
        throw new SyntaxError("addColorStop : couleur invalide « " + c + " »");
    } };
  }
  /* ~5 px par caractère à 9,5 px : 24 caractères atteignent le plafond de 120. */
  measureText(s) { return { width: String(s).length * 5 }; }
  save() { pile.push(rotation); }
  restore() { rotation = pile.length ? pile.pop() : 0; }
  rotate(a) { rotation += a; rotations.push(a); }
  fillText(s, x, y) { this.ops++; traces.push({ texte: String(s), x, y, rotation }); }
  beginPath() {} moveTo() {} arcTo() {} arc() {} ellipse() {} closePath() {} setLineDash() {}
  fill() { this.ops++; } stroke() { this.ops++; } fillRect() { this.ops++; }
  scale() {} translate() {}
}

/* ---- Environnement minimal --------------------------------------------- */
let toasts = [], blobDemande = false, dernierCanevas = null;
const ctx = new ContexteSimule();

globalThis.getComputedStyle = () => ({
  getPropertyValue: nom => (nom in VARS ? VARS[nom] : "")
});
globalThis.document = {
  documentElement: {},
  // createElement sert au canevas ET à l'ancre de téléchargement : seul l'objet
  // dont on lit un contexte 2D est retenu, sinon l'ancre écrase la mesure.
  createElement: () => ({
    width: 0, height: 0,
    getContext() { dernierCanevas = this; return ctx; },
    toBlob: (cb) => { blobDemande = true; cb({ taille: 1 }); },
    click() {}, set href(v) {}, set download(v) {}
  }),
  getElementById: () => ({ addEventListener() {} })
};
globalThis.URL = { createObjectURL: () => "blob:x", revokeObjectURL() {} };
globalThis.menuOverlay = { classList: { remove() {} } };
globalThis.toast = m => toasts.push(m);
globalThis.t = k => k;
globalThis.console = console;

/* ---- Code réellement livré, extrait par bornes -------------------------- */
const CODE = [
  entre("const GROUP_COLORS", "];", "palette de groupes"),
  entre("const SEAT = 34,", "EDGE = 10;", "constantes de siège"),
  entre("function groupColor(group){", "\n}", "groupColor"),
  entre("function displayDiet(diet){", "function guestSummary(g){", "displayDiet + displayAllergy + guestDetails")
    + "\n  const d = guestDetails(g);\n  return d ? g.name + ' · ' + d : g.name;\n}",
  entre("function occupantOf(tableId", "|| null; }", "occupantOf"),
  entre("function boiteDecor(d){", "hh: d.h/2 }; }", "boiteDecor"),
  entre("function tableGeometry(t){", "return { body:{ w, h, round:false }, seats };\n}", "tableGeometry"),
  entre("function initials(name){", "\n}", "initials"),
  entre("function seatLabelOrientation(dir){", "\n  return LBL_MAX;\n}", "orientation + espace disponible"),
  entre("/* ---- PNG export : draw the plan on a canvas ----",
        'document.getElementById("exportPng").addEventListener("click", exportPNG);',
        "palette + étiquettes + export")
].join("\n");

const module = new Function("state", "role",
  CODE + "\n; return { exportPNG, canvasPalette, canvasGroupColor, tableGeometry," +
         " seatLabelOrientation, mesurerEtiquette, tronquerTexte, decouperNom," +
         " construireObstacles, espaceEtiquette, choisirPastilles, displayAllergy," +
         " LBL_MAX, LBL_OFF, LBL_MIN, LBL_DEMI_H, PASTILLE_PAD, PASTILLE_GAP };");

/* ---- Jeu d'essai -------------------------------------------------------- */
const invite = (i, nom, groupe, regime, table, allergie) => ({
  id: "g" + (table || "t1") + i, name: nom, group: groupe || "", diet: regime || "",
  allergy: allergie || "",
  avoid: [], apart: [], hasPlusOne: false, seat: { t: table || "t1", i }
});

const state = {
  eventName: "Test 1",
  themeColor: "#F0A8C4",
  edges: { top: "haut...", bottom: "", left: "MER", right: "droite..." },
  tables: [
    { id: "t1", name: "Table 14", shape: "rect",  seats: 10, ends: 2, x: 400, y: 300 },
    { id: "t2", name: "Table 2",  shape: "round", seats: 12, x: 900, y: 300 }
  ],
  guests: [
    invite(0, "Isabelle Laurent", "Famille", "Végétarien"),
    invite(1, "Jean-Luc Martin", "Famille", ""),
    invite(2, "Thomas Leroy", "", ""),          // sans groupe → var(--ink-faint)
    invite(3, "Sophie Lefèvre", "Amis", "Sans gluten"),
    invite(4, "Olivier Renard", "", ""),
    // nom volontairement plus long que le plafond de 120 px
    invite(5, "Marie-Christine de la Rochefoucauld", "Amis", "Végétarien", "t1", "Arachides"),
    ...Array.from({ length: 12 }, (_, k) =>
      invite(k, "Invité Ronde " + (k + 1), k % 3 ? "Amis" : "", k % 4 ? "" : "Sans lactose", "t2"))
  ]
};

globalThis.state = state;
globalThis.subExpired = false;
globalThis.myRole = "owner";   // displayDiet() le lit
globalThis.role = "owner";

let echecs = 0, NB_CAS = 0;
const cas = (nom, fn) => {
  NB_CAS++;
  refusees.length = 0; toasts = []; blobDemande = false;
  rotations = []; traces = []; rotation = 0; pile.length = 0;
  try { fn(); console.log("  ok   — " + nom); }
  catch (e) { echecs++; console.log("  ÉCHEC — " + nom + " : " + e.message); }
};

console.log("\nBanc d'essai export PNG et étiquettes — v1.23.0\n");

const api = module(state, "owner");
const DEG = a => a * 180 / Math.PI;
const normalise = deg => ((deg % 360) + 540) % 360 - 180;

cas("l'export s'exécute sans lever", () => {
  api.exportPNG();
  if (toasts.length) throw new Error("message inattendu : " + toasts.join(", "));
});

cas("aucun var(--x) n'atteint le canevas", () => {
  api.exportPNG();
  if (refusees.length)
    throw new Error(refusees.length + " couleur(s) refusée(s) : " + refusees.join(" | "));
});

cas("un fichier est bien produit", () => {
  api.exportPNG();
  if (!blobDemande) throw new Error("toBlob n'a pas été appelé");
});

cas("invité sans groupe → couleur littérale", () => {
  const C = api.canvasPalette();
  const c = api.canvasGroupColor("", C);
  if (!COULEUR_OK.test(c)) throw new Error("couleur non analysable : " + c);
  if (c !== VARS["--ink-faint"]) throw new Error("attendu " + VARS["--ink-faint"] + ", obtenu " + c);
});

cas("invité avec groupe → couleur de la palette de groupes", () => {
  const C = api.canvasPalette();
  const c = api.canvasGroupColor("Famille", C);
  if (!/^#[0-9A-Fa-f]{6}$/.test(c)) throw new Error("couleur inattendue : " + c);
});

cas("variable absente → échec signalé, pas silencieux", () => {
  const sauve = VARS["--seat-filled"];
  delete VARS["--seat-filled"];
  try {
    api.exportPNG();
    if (!toasts.includes("ed_export_failed"))
      throw new Error("aucun message affiché — l'échec est resté silencieux");
  } finally { VARS["--seat-filled"] = sauve; }
});

cas("--label-bg absente → échec signalé (variable ajoutée en v1.21.0)", () => {
  const sauve = VARS["--label-bg"];
  delete VARS["--label-bg"];
  try {
    api.exportPNG();
    if (!toasts.includes("ed_export_failed"))
      throw new Error("aucun message affiché");
  } finally { VARS["--label-bg"] = sauve; }
});

cas("plan sans table → message dédié, pas d'échec", () => {
  const tables = state.tables;
  state.tables = [];
  try {
    api.exportPNG();
    if (!toasts.includes("ed_nothing_export"))
      throw new Error("message attendu : ed_nothing_export, obtenu : " + toasts.join(", "));
  } finally { state.tables = tables; }
});

/* --- Contrôles propres aux étiquettes perpendiculaires ------------------- */

cas("chaque siège porte une normale sortante", () => {
  state.tables.forEach(t => {
    api.tableGeometry(t).seats.forEach((s, i) => {
      if (!Number.isFinite(s.dir))
        throw new Error("table " + t.id + ", siège " + i + " : dir absent");
    });
  });
});

cas("la normale est perpendiculaire au bord occupé (rectangulaire)", () => {
  const geo = api.tableGeometry({ id: "x", shape: "rect", seats: 10, ends: 2, x: 0, y: 0 });
  // -180° et +180° désignent la même direction : on compare les vecteurs, pas
  // les nombres, sans quoi le contrôle échouerait sur une normale correcte.
  geo.seats.forEach((s, i) => {
    const c = Math.cos(s.dir), n2 = Math.sin(s.dir);
    const axial = (Math.abs(Math.abs(c) - 1) < 1e-9) || (Math.abs(Math.abs(n2) - 1) < 1e-9);
    if (!axial)
      throw new Error("siège " + i + " : normale " + normalise(DEG(s.dir)).toFixed(1) + "°, non perpendiculaire");
    // le siège doit se trouver du côté vers lequel pointe sa normale
    if (s.x * Math.cos(s.dir) + s.y * Math.sin(s.dir) <= 0)
      throw new Error("siège " + i + " : la normale ne pointe pas vers l'extérieur");
  });
});

cas("atan2(y,x) donnerait une normale fausse — le contrôle a du mordant", () => {
  // Contrôle négatif : sans définition structurelle, un siège de côté long
  // décalé donnerait un angle diagonal. Si ce cas cesse d'échouer, c'est que
  // la géométrie a changé et que le contrôle précédent ne prouve plus rien.
  const geo = api.tableGeometry({ id: "x", shape: "rect", seats: 10, ends: 2, x: 0, y: 0 });
  const naif = geo.seats.map(s => Math.round(normalise(DEG(Math.atan2(s.y, s.x)))));
  if (naif.every(d => [-90, 90, 0, 180].includes(d)))
    throw new Error("atan2 donne les mêmes angles : le jeu d'essai ne discrimine rien");
});

cas("la normale d'une table ronde suit le rayon", () => {
  const geo = api.tableGeometry({ id: "x", shape: "round", seats: 12, x: 0, y: 0 });
  geo.seats.forEach((s, i) => {
    const ecart = Math.abs(normalise(DEG(Math.atan2(s.y, s.x)) - DEG(s.dir)));
    if (ecart > 1e-6)
      throw new Error("siège " + i + " : écart de " + ecart.toFixed(4) + "° au rayon");
  });
});

cas("aucune étiquette n'est jamais à l'envers", () => {
  for (let d = -180; d <= 180; d += 5) {
    const o = api.seatLabelOrientation(d * Math.PI / 180);
    const norm = normalise(DEG(o.rot));
    if (norm < -90.0001 || norm > 90.0001)
      throw new Error("normale " + d + "° → rotation " + norm.toFixed(1) + "°, hors [-90, 90]");
  }
});

cas("l'étiquette reste du côté extérieur, quel que soit le sens", () => {
  for (let d = -180; d <= 180; d += 5) {
    const a = d * Math.PI / 180;
    const o = api.seatLabelOrientation(a);
    const L = 50;                       // largeur fictive
    // milieu de la bande occupée, exprimé dans le repère tourné puis ramené au plan
    const x = o.flip ? -(api.LBL_OFF + L / 2) : (api.LBL_OFF + L / 2);
    const gx = x * Math.cos(o.rot), gy = x * Math.sin(o.rot);
    if (gx * Math.cos(a) + gy * Math.sin(a) <= 0)
      throw new Error("normale " + d + "° : l'étiquette part vers l'intérieur");
  }
});

cas("aucune rotation hors [-90, 90] pendant un export réel", () => {
  api.exportPNG();
  const noms = traces.filter(x => /Invité Ronde|Isabelle|Marie-Christine/.test(x.texte));
  if (!noms.length) throw new Error("aucun nom tracé — le contrôle ne prouve rien");
  noms.forEach(x => {
    const norm = normalise(DEG(x.rotation));
    if (norm < -90.0001 || norm > 90.0001)
      throw new Error("« " + x.texte + " » tracé à " + norm.toFixed(1) + "°");
  });
});

cas("un nom trop long est tronqué, pas laissé déborder", () => {
  const long = state.guests.find(g => g.name.indexOf("Marie-Christine") === 0);
  // Sur une seule ligne forcée (un seul mot), la troncature doit intervenir.
  const L = api.mesurerEtiquette(ctx, { name: "Marie-Christine-de-la-Rochefoucauld", diet: "" }, api.LBL_MAX);
  if (L.wNom > api.LBL_MAX)
    throw new Error("largeur " + L.wNom + " px > plafond " + api.LBL_MAX);
  if (L.lignes.length !== 1)
    throw new Error("un mot unique ne peut pas être coupé en deux lignes");
  if (L.lignes[0].slice(-1) !== "…")
    throw new Error("troncature sans marque de coupure : " + L.lignes[0]);
  if (long.name.length < 10) throw new Error("jeu d'essai dégénéré");
});

cas("un nom court n'est pas touché", () => {
  const L = api.mesurerEtiquette(ctx, { name: "Léa Roy", diet: "" }, api.LBL_MAX);
  if (L.lignes.join(" ") !== "Léa Roy") throw new Error("nom altéré : " + L.lignes.join(" "));
  if (L.h !== 11) throw new Error("hauteur de bloc attendue 11, obtenue " + L.h);
});

cas("le régime ajoute une seconde ligne, pas une rallonge radiale", () => {
  const avec = api.mesurerEtiquette(ctx, { name: "Léa Roy", diet: "Sans gluten" }, api.LBL_MAX);
  const sans = api.mesurerEtiquette(ctx, { name: "Léa Roy", diet: "" }, api.LBL_MAX);
  if (avec.h <= sans.h) throw new Error("le régime n'augmente pas la hauteur du bloc");
  if (avec.w > api.LBL_MAX + 10)
    throw new Error("le bloc déborde en largeur : " + avec.w);
});

cas("le bloc d'étiquette tient dans le pas entre sièges", () => {
  // Le chevauchement venait de ce que la LARGEUR du nom (jusqu'à 120 px)
  // occupait la direction dans laquelle les sièges se succèdent. En
  // perpendiculaire, c'est la HAUTEUR du bloc qui l'occupe : elle doit rester
  // sous le pas, sur les deux formes de table.
  const hMax = 26;                       // nom + pastille de régime
  [{ shape: "round", seats: 12 }, { shape: "rect", seats: 10, ends: 2 }].forEach(f => {
    const geo = api.tableGeometry(Object.assign({ id: "x", x: 0, y: 0 }, f));
    const a = geo.seats[0], b = geo.seats[1];
    const pas = Math.hypot(a.x - b.x, a.y - b.y);
    if (hMax >= pas)
      throw new Error(f.shape + " : bloc de " + hMax + " px pour un pas de " + pas.toFixed(1) + " px");
  });
});

cas("un nom long est coupé en deux lignes équilibrées", () => {
  const L = api.mesurerEtiquette(ctx, { name: "Marie-Christine de la Rochefoucauld", diet: "" }, api.LBL_MAX);
  if (L.lignes.length !== 2) throw new Error("attendu 2 lignes, obtenu " + L.lignes.length);
  // Couper après le premier mot laisserait la seconde ligne aussi longue que le
  // tout : le point de coupe doit équilibrer.
  const naif = Math.max(ctx.measureText("Marie-Christine").width,
                        ctx.measureText("de la Rochefoucauld").width);
  if (L.wNom >= naif)
    throw new Error("coupe non équilibrée : " + L.wNom + " px, coupe naïve " + naif + " px");
  if (L.h !== 22) throw new Error("hauteur de bloc attendue 22, obtenue " + L.h);
});

cas("deux tables trop proches : l'étiquette est bornée par la place libre", () => {
  // Reproduit le défaut constaté : deux tables face à face à 300 px d'écart,
  // contre les ~430 px qu'exigerait une étiquette à pleine portée.
  const tables = state.tables;
  state.tables = [
    { id: "a", name: "Table 14", shape: "rect", seats: 8, ends: 0, x: 400, y: 200 },
    { id: "b", name: "Table 11", shape: "rect", seats: 8, ends: 0, x: 400, y: 500 }
  ];
  const guests = state.guests;
  state.guests = [];
  for (let k = 0; k < 8; k++) {
    state.guests.push(invite(k, "Invité Haut " + k, "Amis", "", "a"));
    state.guests.push(invite(k, "Invité Bas " + k, "Amis", "", "b"));
  }
  try {
    const obs = api.construireObstacles();
    const geoA = api.tableGeometry(state.tables[0]);
    // sièges du bord bas de la table du haut : leur normale pointe vers l'autre table
    const versLeBas = geoA.seats.filter(s => Math.sin(s.dir) > 0.9);
    if (!versLeBas.length) throw new Error("aucun siège ne fait face à l'autre table");
    versLeBas.forEach((s, k) => {
      const d = api.espaceEtiquette(obs, state.tables[0], s);
      if (d >= api.LBL_MAX)
        throw new Error("siège " + k + " : place non bornée (" + d + " px)");
      // les deux étiquettes se partagent le couloir : chacune doit tenir dans sa moitié
      const couloir = (500 - 71) - (200 + 71) - 2 * api.LBL_OFF;
      if (d > couloir / 2 + 2)
        throw new Error("siège " + k + " : " + d.toFixed(1) + " px pour une demi-place de " + (couloir / 2).toFixed(1));
    });
  } finally { state.tables = tables; state.guests = guests; }
});

cas("les deux bandes d'étiquettes ne se recouvrent plus", () => {
  const tables = state.tables, guests = state.guests;
  state.tables = [
    { id: "a", name: "T14", shape: "rect", seats: 8, ends: 0, x: 400, y: 200 },
    { id: "b", name: "T11", shape: "rect", seats: 8, ends: 0, x: 400, y: 500 }
  ];
  state.guests = [];
  for (let k = 0; k < 8; k++) {
    state.guests.push(invite(k, "Invité Haut " + k, "Amis", "", "a"));
    state.guests.push(invite(k, "Invité Bas " + k, "Amis", "", "b"));
  }
  try {
    const obs = api.construireObstacles();
    const bande = (table, s) => {
      const d = api.espaceEtiquette(obs, table, s);
      if (d < api.LBL_MIN) return null;
      const occ = { name: "Invité Long Nom", diet: "" };
      const L = api.mesurerEtiquette(ctx, occ, d);
      const sy = table.y + s.y;
      const dir = Math.sin(s.dir);
      return { de: sy + dir * api.LBL_OFF, a: sy + dir * (api.LBL_OFF + L.w) };
    };
    const gA = api.tableGeometry(state.tables[0]).seats.filter(s => Math.sin(s.dir) > 0.9);
    const gB = api.tableGeometry(state.tables[1]).seats.filter(s => Math.sin(s.dir) < -0.9);
    const bas = bande(state.tables[0], gA[0]), haut = bande(state.tables[1], gB[0]);
    if (!bas || !haut)
      throw new Error("à 300 px d'écart les étiquettes doivent tenir, pas disparaître");
    if (bas.a > haut.a)
      throw new Error("les deux bandes se croisent : " + bas.a.toFixed(0) + " > " + haut.a.toFixed(0));
    /* Contrôle négatif — sans la borne, les bandes se croiseraient bel et bien.
       Sans ce volet, le contrôle passerait aussi sur une disposition trop lâche
       pour exercer le défaut. */
    const sansBorne = api.LBL_OFF + api.LBL_MAX;
    const basLibre = (200 + 71) + sansBorne, hautLibre = (500 - 71) - sansBorne;
    if (basLibre <= hautLibre)
      throw new Error("à pleine portée les bandes ne se croisent pas : la disposition n'exerce pas le défaut");
  } finally { state.tables = tables; state.guests = guests; }
});

cas("place insuffisante → aucune étiquette, initiales conservées", () => {
  const tables = state.tables, guests = state.guests;
  state.tables = [
    { id: "a", name: "T1", shape: "rect", seats: 8, ends: 0, x: 400, y: 300 },
    { id: "b", name: "T2", shape: "rect", seats: 8, ends: 0, x: 400, y: 480 }
  ];
  state.guests = [];
  for (let k = 0; k < 8; k++) {
    state.guests.push(invite(k, "Invité Haut " + k, "Amis", "", "a"));
    state.guests.push(invite(k, "Invité Bas " + k, "Amis", "", "b"));
  }
  try {
    const obs = api.construireObstacles();
    const s = api.tableGeometry(state.tables[0]).seats.find(x => Math.sin(x.dir) > 0.9);
    const d = api.espaceEtiquette(obs, state.tables[0], s);
    if (d >= api.LBL_MIN)
      throw new Error("place de " + d.toFixed(1) + " px : le seuil de " + api.LBL_MIN + " px n'est pas atteint");
  } finally { state.tables = tables; state.guests = guests; }
});

cas("un plateau voisin borne aussi, sans partage de couloir", () => {
  const tables = state.tables, guests = state.guests;
  // La table du bas n'a aucun siège du côté haut : l'obstacle est le plateau,
  // qui ne projette pas d'étiquette — la place n'est donc pas divisée par deux.
  state.tables = [
    { id: "a", name: "T1", shape: "rect", seats: 4, ends: 0, x: 400, y: 200 },
    { id: "b", name: "T2", shape: "round", seats: 4, x: 400, y: 460 }
  ];
  state.guests = [invite(0, "Invité Haut", "Amis", "", "a")];
  try {
    const obs = api.construireObstacles();
    const s = api.tableGeometry(state.tables[0]).seats.find(x => Math.sin(x.dir) > 0.9);
    const d = api.espaceEtiquette(obs, state.tables[0], s);
    if (d >= api.LBL_MAX) throw new Error("place non bornée");
    if (d < 40) throw new Error("place divisée à tort : " + d.toFixed(1) + " px");
  } finally { state.tables = tables; state.guests = guests; }
});

/* --- v1.22.0 : pastilles de régime et d'allergie -------------------------- */
/* Rappel de l'échelle simulée : 5 px par caractère, + 10 px de rembourrage.
   « Allergie fruits de mer » (22 car.) → 120 px ; « Végétarien » → 60 px. */
const ALL_LONG = "Allergie fruits de mer";
const avecPastilles = (a, d) => ({ name: "Léa Roy", allergy: a || "", diet: d || "" });
const textes = L => L.pastilles.map(b => b.kind + ":" + b.txt).join(" | ");

cas("témoin négatif : l'ancienne règle tronquait bien cette pastille", () => {
  // Sans ce volet, les contrôles suivants passeraient aussi sur une place
  // assez large pour ne rien exercer.
  const ancien = api.tronquerTexte(ctx, ALL_LONG, 80 - 8);
  if (ancien.slice(-1) !== "…")
    throw new Error("à 80 px l'ancienne règle ne tronque pas : le cas n'exerce pas le défaut");
});

cas("une pastille qui ne tient pas est omise, jamais tronquée", () => {
  const L = api.mesurerEtiquette(ctx, avecPastilles(ALL_LONG, ""), 80);
  if (L.pastilles.length) throw new Error("pastille présente : " + textes(L));
  if (L.h !== 11) throw new Error("hauteur attendue 11 (nom seul), obtenue " + L.h);
});

cas("aucune pastille ne porte jamais de marque de coupure", () => {
  for (let max = api.LBL_MIN; max <= api.LBL_MAX; max += 2) {
    const L = api.mesurerEtiquette(ctx, avecPastilles(ALL_LONG, "Sans gluten"), max);
    L.pastilles.forEach(b => {
      if (b.txt.indexOf("…") >= 0) throw new Error(max + " px : « " + b.txt + " »");
      if (b.txt !== ALL_LONG && b.txt !== "Sans gluten") throw new Error("texte altéré : " + b.txt);
    });
    if (L.wPastilles > max) throw new Error(max + " px : pastilles de " + L.wPastilles + " px");
  }
});

cas("les deux pastilles tiennent → allergie d'abord, puis régime", () => {
  const L = api.mesurerEtiquette(ctx, avecPastilles("Arachides", "Végétarien"), api.LBL_MAX);
  if (textes(L) !== "allergy:Arachides | diet:Végétarien")
    throw new Error("obtenu : " + textes(L));
  const attendu = (9 * 5 + 10) + (10 * 5 + 10) + api.PASTILLE_GAP;
  if (L.wPastilles !== attendu) throw new Error("largeur " + L.wPastilles + ", attendue " + attendu);
});

cas("place pour l'allergie seule → l'allergie, sans le régime", () => {
  // Arachides 55 px, Végétarien 60 px : ensemble 119, séparément ≤ 60.
  const L = api.mesurerEtiquette(ctx, avecPastilles("Arachides", "Végétarien"), 100);
  if (textes(L) !== "allergy:Arachides") throw new Error("obtenu : " + textes(L));
});

cas("le régime n'est jamais affiché seul quand une allergie existe", () => {
  // L'allergie ne tient pas (120 px), le régime tiendrait (60 px) : rien.
  const L = api.mesurerEtiquette(ctx, avecPastilles(ALL_LONG, "Végétarien"), 100);
  if (L.pastilles.length) throw new Error("obtenu : " + textes(L));
});

cas("sans allergie, le régime seul s'affiche s'il tient", () => {
  const L = api.mesurerEtiquette(ctx, avecPastilles("", "Végétarien"), 70);
  if (textes(L) !== "diet:Végétarien") throw new Error("obtenu : " + textes(L));
  const M = api.mesurerEtiquette(ctx, avecPastilles("", "Végétarien"), 50);
  if (M.pastilles.length) throw new Error("régime de 60 px affiché dans 50 px");
});

cas("lecture seule : mentions génériques, jamais le détail", () => {
  globalThis.myRole = "viewer";
  try {
    // Clés simulées (t = identité) : 100 + 85 px ne tiennent pas ensemble,
    // la règle garde l'allergie. Chaque mention est aussi vérifiée seule.
    const L = api.mesurerEtiquette(ctx, avecPastilles("Arachides", "Végétarien"), api.LBL_MAX);
    if (textes(L) !== "allergy:ed_allergy_generic") throw new Error("obtenu : " + textes(L));
    const A = api.mesurerEtiquette(ctx, avecPastilles("Arachides", ""), api.LBL_MAX);
    const D = api.mesurerEtiquette(ctx, avecPastilles("", "Végétarien"), api.LBL_MAX);
    if (textes(A) !== "allergy:ed_allergy_generic") throw new Error("allergie : " + textes(A));
    if (textes(D) !== "diet:ed_diet_generic") throw new Error("régime : " + textes(D));
  } finally { globalThis.myRole = "owner"; }
});

cas("l'export trace les pastilles entières, allergie comprise", () => {
  api.exportPNG();
  const t = traces.map(x => x.texte);
  if (!t.includes("Arachides")) throw new Error("allergie absente de l'image");
  const coupees = t.filter(x => /…$/.test(x) && /Arach|Végé|gluten|lactose/i.test(x));
  if (coupees.length) throw new Error("pastille tronquée tracée : " + coupees.join(", "));
});

/* --- v1.23.0 : éléments de décor ------------------------------------------ */
cas("un élément de décor borne l'étiquette d'un siège qui lui fait face", () => {
  const tables = state.tables, guests = state.guests, decor = state.decor;
  state.tables = [{ id: "a", name: "T1", shape: "rect", seats: 8, ends: 0, x: 400, y: 200 }];
  state.guests = [invite(0, "Invité Haut", "Amis", "", "a")];
  const s = api.tableGeometry(state.tables[0]).seats.find(x => Math.sin(x.dir) > 0.9);
  try {
    // Témoin négatif : sans décor, la place est pleine.
    state.decor = [];
    const libre = api.espaceEtiquette(api.construireObstacles(), state.tables[0], s);
    if (libre < api.LBL_MAX) throw new Error("sans décor, place déjà bornée (" + libre + ") : le cas n'exerce rien");
    // Piscine posée 100 px sous la rangée de sièges.
    state.decor = [{ id: "p", kind: "rect", label: "Piscine", w: 400, h: 120, x: 400, y: 200 + 48 + 17 + 100 + 60 }];
    const d = api.espaceEtiquette(api.construireObstacles(), state.tables[0], s);
    if (d >= api.LBL_MAX) throw new Error("place non bornée par le décor (" + d + ")");
    // Borne sans partage de couloir : un élément de décor ne projette pas
    // d'étiquette, la place n'est donc pas divisée par deux.
    if (d < 60) throw new Error("place divisée à tort : " + d.toFixed(1));
  } finally { state.tables = tables; state.guests = guests; state.decor = decor; }
});

cas("un élément de décor à l'écart entre dans l'image", () => {
  const decor = state.decor;
  state.decor = [{ id: "p", kind: "ellipse", label: "Piscine", w: 300, h: 160, x: 1700, y: 1100 }];
  try {
    api.exportPNG();
    const largeur = dernierCanevas.width / 2, hauteur = dernierCanevas.height / 2;
    // Tables entre x = 400 et 900 ; la piscine s'étend jusqu'à x = 1850.
    if (largeur < 1850 - 400) throw new Error("image de " + largeur + " px : la piscine est rognée");
    if (hauteur < 1180 - 300) throw new Error("image de " + hauteur + " px de haut : la piscine est rognée");
    if (!traces.some(x => x.texte === "Piscine")) throw new Error("libellé du décor absent de l'image");
  } finally { state.decor = decor; }
});

cas("--decor absente → échec signalé", () => {
  const sauve = VARS["--decor"];
  delete VARS["--decor"];
  try {
    api.exportPNG();
    if (!toasts.includes("ed_export_failed")) throw new Error("aucun message affiché");
  } finally { VARS["--decor"] = sauve; }
});

cas("la boîte englobante contient les étiquettes les plus longues", () => {
  api.exportPNG();
  if (!dernierCanevas || !dernierCanevas.width)
    throw new Error("aucun canevas dimensionné");
  // Écart entre les deux tables + étiquettes de part et d'autre + marges.
  // Avant la v1.21.0, la marge forfaitaire valait 60 px : les noms longs
  // sortaient de l'image sans que rien ne le signale.
  const mini = (900 - 400) + 2 * (api.LBL_OFF + api.LBL_MAX) + 180;
  if (dernierCanevas.width / 2 < mini)
    throw new Error("largeur " + (dernierCanevas.width / 2) + " px, au moins " + mini + " attendue");
});

console.log("\n" + (echecs ? echecs + " échec(s)" : NB_CAS + " cas, aucun échec") + "\n");
process.exit(echecs ? 1 : 0);
