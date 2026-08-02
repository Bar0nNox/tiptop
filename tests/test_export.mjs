/* =========================================================================
   Banc d'essai de l'export PNG — v1.20.2

   Aucun navigateur n'est disponible ici. On extrait donc du fichier livré les
   fonctions réellement concernées et on les exécute contre un canevas simulé
   qui applique la MÊME règle que le vrai : toute couleur non analysable est
   refusée. addColorStop lève, fillStyle ignore en silence — c'est exactement
   ce qui a masqué le défaut pendant sept versions.

   Ce banc vérifie trois choses :
     1. l'export s'exécute sans lever ;
     2. aucune chaîne "var(--x)" n'atteint le canevas ;
     3. un échec de résolution est bien signalé à l'utilisateur.
   ========================================================================= */
import fs from "node:fs";

const SRC = fs.readFileSync("../event.html", "utf8");
const LIGNES = SRC.split("\n");

/* Extrait un bloc de lignes 1-indexées, bornes incluses. */
const bloc = (a, b) => LIGNES.slice(a - 1, b).join("\n");

/* ---- Variables CSS, telles que theme.css et applyThemeColor les exposent --- */
const VARS = {
  "--floor": "#FDF4F7", "--ink": "#1E211F", "--ink-soft": "#5C625F",
  "--ink-faint": "#989E9B", "--table-top": "#F6D9E4", "--table-top-hi": "#FBECF1",
  "--table-edge": "#E7A8C0", "--chair": "#FFFFFF", "--chair-edge": "#F7E2EA",
  "--seat-filled": "#FBEDF3", "--ok": "#3F7A52", "--ok-soft": "#E4F0EA",
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

class ContexteSimule {
  constructor() { this.ops = 0; }
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
  measureText(s) { return { width: s.length * 5 }; }
  save() {} restore() {} beginPath() {} moveTo() {} arcTo() {} arc() {}
  closePath() {} fill() { this.ops++; } stroke() { this.ops++; }
  fillRect() { this.ops++; } fillText() { this.ops++; }
  scale() {} translate() {} rotate() {}
}

/* ---- Environnement minimal --------------------------------------------- */
let toasts = [], blobDemande = false;
const ctx = new ContexteSimule();

globalThis.getComputedStyle = () => ({
  getPropertyValue: nom => VARS[nom] ?? ""
});
globalThis.document = {
  documentElement: {},
  createElement: () => ({
    width: 0, height: 0,
    getContext: () => ctx,
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

/* ---- Code réellement livré --------------------------------------------- */
const CODE = [
  bloc(838, 838),          // GROUP_COLORS
  bloc(842, 842),          // SEAT, PITCH, EDGE
  bloc(1004, 1009),        // groupColor
  bloc(1014, 1018),        // displayDiet
  bloc(1040, 1040),        // occupantOf
  bloc(1269, 1307),        // tableGeometry
  bloc(1575, 1579),        // initials
  bloc(2141, 2283)         // palette + export
].join("\n");

const module = new Function("state", "role", CODE + "\n; return { exportPNG, canvasPalette, canvasGroupColor };");

/* ---- Jeu d'essai -------------------------------------------------------- */
const invite = (i, nom, groupe, regime) => ({
  id: "g" + i, name: nom, group: groupe || "", diet: regime || "",
  avoid: [], apart: [], hasPlusOne: false, seat: { t: "t1", i }
});

const state = {
  eventName: "Test 1",
  themeColor: "#F0A8C4",
  edges: { top: "haut...", bottom: "", left: "MER", right: "droite..." },
  tables: [{ id: "t1", name: "Table 14", shape: "rect", seats: 10, x: 400, y: 300 }],
  guests: [
    invite(0, "Isabelle Laurent", "Famille", "Végétarien"),
    invite(1, "Jean-Luc Martin", "Famille", ""),
    invite(2, "Thomas Leroy", "", ""),          // sans groupe → var(--ink-faint)
    invite(3, "Sophie Lefèvre", "Amis", "Sans gluten"),
    invite(4, "Olivier Renard", "", "")
  ]
};

globalThis.state = state;
globalThis.subExpired = false;
globalThis.myRole = "owner";   // displayDiet() le lit
globalThis.role = "owner";

let echecs = 0;
const cas = (nom, fn) => {
  refusees.length = 0; toasts = []; blobDemande = false;
  try { fn(); console.log("  ok   — " + nom); }
  catch (e) { echecs++; console.log("  ÉCHEC — " + nom + " : " + e.message); }
};

console.log("\nBanc d'essai export PNG — v1.20.2\n");

const api = module(state, "owner");

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

cas("plan sans table → message dédié, pas d'échec", () => {
  const tables = state.tables;
  state.tables = [];
  try {
    api.exportPNG();
    if (!toasts.includes("ed_nothing_export"))
      throw new Error("message attendu : ed_nothing_export, obtenu : " + toasts.join(", "));
  } finally { state.tables = tables; }
});

console.log("\n" + (echecs ? echecs + " échec(s)" : "7 cas, aucun échec") + "\n");
process.exit(echecs ? 1 : 0);
