/* =========================================================================
   Banc d'essai du rapport de contraintes — v1.23.0 (§5.8.6)

   La v1.23.0 remplace la détection des contraintes non tenues par un rapport
   détaillé, dont le bord rouge DÉRIVE. Deux volets :

     1. NON-RÉGRESSION : sur des plans tirés au hasard, le nouvel ensemble
        d'invités marqués est identique à celui de l'ancienne détection,
        extraite de la v1.22.1 par git (commit 220bce6, REF_ANCIENNE ci-dessous).
        Un bord rouge qui apparaîtrait ou disparaîtrait serait un défaut
        silencieux — exactement le mode de défaut du §7.
     2. TEXTE : chaque type d'entrée nomme les bonnes personnes, « impossible »
        est distingué, et la fiche d'un invité nomme l'AUTRE partie.

   Extraction par bornes textuelles assertées, comme les autres bancs.
   Exécution : `node test_contraintes.mjs` depuis tests/, dans le dépôt git.
   ========================================================================= */
import fs from "node:fs";
import { execSync } from "node:child_process";

const REF_ANCIENNE = "220bce6";   // commit v1.22.1 : dernière version de l'ancienne détection
function extraire(src, debut, fin, quoi) {
  const a = src.indexOf(debut);
  if (a < 0) { console.error("ARRÊT — borne de début introuvable (" + quoi + ")"); process.exit(2); }
  const b = src.indexOf(fin, a);
  if (b < 0) { console.error("ARRÊT — borne de fin introuvable (" + quoi + ")"); process.exit(2); }
  return src.slice(a, b + fin.length);
}
const NOUV = fs.readFileSync("../event.html", "utf8");
let ANC;
try { ANC = execSync("git show " + REF_ANCIENNE + ":event.html", { encoding: "utf8", maxBuffer: 1 << 26 }); }
catch (e) { console.error("ARRÊT — version de référence introuvable (" + REF_ANCIENNE + ")"); process.exit(2); }

const commun = src => [
  extraire(src, "const SEAT = 34,", "EDGE = 10;", "constantes"),
  extraire(src, "function seatAdjacency(t){", "\n}", "seatAdjacency"),
  extraire(src, "function tableGeometry(t){", "return { body:{ w, h, round:false }, seats };\n}", "tableGeometry"),
  extraire(src, "function sontVoisins(a, b){", "return vus.size === sieges.size;\n}", "voisins + chaîne"),
].join("\n");

const DICT = {
  ed_ci_apart_table: "{other}|{table}", ed_ci_apart_table_g: "{a}|{b}|{table}",
  ed_ci_apart_next: "{other}|{table}", ed_ci_apart_next_g: "{a}|{b}|{table}",
  ed_ci_group_split_table: "{others}|{tables}", ed_ci_group_split_table_g: "{names}|{tables}",
  ed_ci_group_split_next: "{others}|{tables}", ed_ci_group_split_next_g: "{names}|{tables}",
  ed_ci_chain: "{others}|{table}", ed_ci_chain_g: "{names}|{table}",
  ed_ci_impossible: "{n}|{table}|{seats}", ed_ci_impossible_g: "{n}|{names}|{table}|{seats}",
};
const tStub = (k, v) => (DICT[k] || k).replace(/\{(\w+)\}/g, (m, x) => (v && x in v ? String(v[x]) : m));

const nouveau = new Function("state", "t",
  "function guestById(id){ return state.guests.find(g=>g.id===id); }\n" +
  "function tableById(id){ return state.tables.find(x=>x.id===id); }\n" +
  commun(NOUV) + "\n" +
  extraire(NOUV, "function constraintReport(){", "\n  return out;\n}", "constraintReport") + "\n" +
  extraire(NOUV, "function constraintIssues(){", "\n  return bad;\n}", "constraintIssues") + "\n" +
  extraire(NOUV, "function describeIssue(issue, pov){", "\n}", "describeIssue") + "\n" +
  extraire(NOUV, "function issuesForGuest(id, rapport){", "\n}", "issuesForGuest") + "\n" +
  "return { constraintReport, constraintIssues, describeIssue, issuesForGuest };");
const ancien = new Function("state",
  "function tableById(id){ return state.tables.find(x=>x.id===id); }\n" +
  commun(ANC) + "\n" +
  extraire(ANC, "function constraintIssues(){", "\n  return bad;\n}", "ancienne constraintIssues") + "\n" +
  "return { constraintIssues };");

let echecs = 0, n = 0;
const cas = (nom, fn) => { n++; try { fn(); console.log("  ok   — " + nom); } catch (e) { echecs++; console.log("  ÉCHEC — " + nom + " : " + e.message); } };
console.log("\nBanc d'essai — rapport de contraintes\n");

/* ---- 1. Non-régression sur plans aléatoires ---------------------------- */
let graine = 12345;
const alea = () => { graine = (graine * 1103515245 + 12345) & 0x7fffffff; return graine / 0x7fffffff; };
function planAleatoire() {
  const tables = [];
  const nt = 1 + Math.floor(alea() * 4);
  for (let i = 0; i < nt; i++) {
    const rect = alea() < 0.5;
    tables.push({ id: "t" + i, name: "T" + i, shape: rect ? "rect" : "round", orient: alea() < 0.5 ? "horizontal" : "vertical",
                  ends: Math.floor(alea() * 3), seats: 2 + Math.floor(alea() * 9), x: 0, y: 0 });
  }
  const guests = [];
  const ng = 3 + Math.floor(alea() * 14);
  const pris = new Set();
  for (let i = 0; i < ng; i++) {
    let seat = null;
    if (alea() < 0.8) {
      const tb = tables[Math.floor(alea() * tables.length)];
      const si = Math.floor(alea() * tb.seats);
      if (!pris.has(tb.id + ":" + si)) { pris.add(tb.id + ":" + si); seat = { t: tb.id, i: si }; }
    }
    guests.push({ id: "g" + i, name: "G" + i, seat, apart: [] });
  }
  for (let k = 0; k < 4; k++) {
    const a = guests[Math.floor(alea() * ng)], b = guests[Math.floor(alea() * ng)];
    if (a === b) continue;
    const scope = alea() < 0.5 ? "table" : "adjacent";
    a.apart.push({ with: b.id, scope }); b.apart.push({ with: a.id, scope });
  }
  const groups = [];
  for (let k = 0; k < 3; k++) {
    const m = [...new Set(Array.from({ length: 2 + Math.floor(alea() * 4) }, () => guests[Math.floor(alea() * ng)].id))];
    if (m.length >= 2) groups.push({ id: "G" + k, scope: alea() < 0.5 ? "table" : "adjacent", members: m });
  }
  return { tables, guests, groups };
}

cas("non-régression : mêmes invités marqués que la v1.22.1, sur 3000 plans aléatoires", () => {
  let marques = 0, divergences = [];
  for (let k = 0; k < 3000; k++) {
    const st = planAleatoire();
    const A = [...ancien(st).constraintIssues()].sort().join(",");
    const B = [...nouveau(st, tStub).constraintIssues()].sort().join(",");
    if (A) marques++;
    if (A !== B) divergences.push("plan " + k + " : ancien [" + A + "] / nouveau [" + B + "]");
  }
  if (divergences.length) throw new Error(divergences.length + " divergence(s), ex. " + divergences[0]);
  // Témoin : le jeu d'essai doit exercer la détection, pas la laisser à vide.
  if (marques < 300) throw new Error("seulement " + marques + " plans avec contrainte non tenue : jeu d'essai trop pauvre");
  console.log("         (" + marques + " plans sur 3000 avec au moins un invité marqué)");
});

/* ---- 2. Texte ----------------------------------------------------------- */
const plan = () => ({
  tables: [{ id: "t1", name: "Table 1", shape: "round", seats: 8 }, { id: "t2", name: "Table 2", shape: "round", seats: 8 },
           { id: "t3", name: "Petite", shape: "round", seats: 2 }],
  guests: [
    { id: "a", name: "Anne", seat: { t: "t1", i: 0 }, apart: [] },
    { id: "b", name: "Bruno", seat: { t: "t2", i: 0 }, apart: [] },
    { id: "c", name: "Chloé", seat: { t: "t1", i: 1 }, apart: [{ with: "d", scope: "table" }] },
    { id: "d", name: "David", seat: { t: "t1", i: 2 }, apart: [{ with: "c", scope: "table" }] },
    { id: "e", name: "Eva", seat: { t: "t3", i: 0 }, apart: [] },
    { id: "f", name: "Fanny", seat: { t: "t3", i: 1 }, apart: [] },
    { id: "g", name: "Gilles", seat: null, apart: [] },
  ],
  groups: [{ id: "G1", scope: "table", members: ["a", "b"] }, { id: "G2", scope: "table", members: ["e", "f", "g"] }],
});

cas("une séparation stockée des deux côtés n'est comptée qu'une fois", () => {
  const r = nouveau(plan(), tStub).constraintReport().filter(i => i.type === "apart_table");
  if (r.length !== 1) throw new Error(r.length + " entrées");
});
cas("types et états attendus", () => {
  const r = nouveau(plan(), tStub).constraintReport();
  const types = r.map(i => i.type + ":" + i.state).sort().join(" ");
  if (types !== "apart_table:violated group_split_table:violated impossible:impossible") throw new Error(types);
});
cas("groupe réparti : tables citées, tous les membres nommés", () => {
  const api = nouveau(plan(), tStub);
  const i = api.constraintReport().find(x => x.type === "group_split_table");
  const txt = api.describeIssue(i, null);
  if (txt !== "Anne, Bruno|Table 1, Table 2") throw new Error(txt);
});
cas("fiche : l'invité ne se nomme pas lui-même, il nomme l'autre partie", () => {
  const api = nouveau(plan(), tStub);
  const items = api.issuesForGuest("c");
  if (items.length !== 1) throw new Error(items.length + " entrées");
  const txt = api.describeIssue(items[0], "c");
  if (txt !== "David|Table 1") throw new Error(txt);
});
cas("impossible : effectif du groupe (non placé compris) et couverts de la table", () => {
  const api = nouveau(plan(), tStub);
  const i = api.constraintReport().find(x => x.type === "impossible");
  if (api.describeIssue(i, null) !== "3|Eva, Fanny, Gilles|Petite|2") throw new Error(api.describeIssue(i, null));
});
cas("un groupe dont un seul membre est placé ne produit rien", () => {
  const st = plan();
  st.guests.find(g => g.id === "b").seat = null;
  const r = nouveau(st, tStub).constraintReport();
  if (r.some(i => i.type === "group_split_table")) throw new Error("entrée produite");
});

console.log("\n" + (echecs ? echecs + " échec(s)" : n + " cas, aucun échec") + "\n");
process.exit(echecs ? 1 : 0);
