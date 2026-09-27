/* =========================================================================
   Banc d'essai de la destination après connexion (auth.html) — v1.22.1

   Extrait `destinationSure()` du fichier livré par bornes textuelles assertées
   et l'exécute avec l'analyseur d'URL WHATWG de Node — le même algorithme que
   celui des navigateurs.

   Deux volets, indissociables :
     1. les parcours légitimes passent (invitation, retour vers un plan,
        relance `?subscribe=`, chemin absolu transmis par requireAuth) ;
     2. toute destination hors du site ou hors liste retombe sur le tableau
        de bord.
   Le témoin négatif vérifie que l'ANCIENNE règle laissait bien sortir : sans
   lui, le volet 2 passerait aussi sur un jeu d'essai qui n'exerce rien.
   ========================================================================= */
import fs from "node:fs";

const SRC = fs.readFileSync("../auth.html", "utf8");
function entre(debut, fin, quoi) {
  const a = SRC.indexOf(debut);
  if (a < 0) { console.error("ARRÊT — borne de début introuvable (" + quoi + ")"); process.exit(2); }
  const b = SRC.indexOf(fin, a);
  if (b < 0) { console.error("ARRÊT — borne de fin introuvable (" + quoi + ")"); process.exit(2); }
  return SRC.slice(a, b + fin.length);
}
const CODE = entre("const PAGES_APRES_CONNEXION", "  return page + u.search;\n}", "destinationSure");
const destinationSure = new Function(CODE + "\nreturn destinationSure;")();

const ORIGINE = "https://tiptopplans.com";
let echecs = 0, n = 0;
const cas = (entree, attendu) => {
  n++;
  const obtenu = destinationSure(entree, ORIGINE);
  const ok = obtenu === attendu;
  if (!ok) echecs++;
  console.log((ok ? "  ok   — " : "  ÉCHEC — ") + JSON.stringify(entree) + " → " + obtenu
              + (ok ? "" : " (attendu " + attendu + ")"));
};

console.log("\nBanc d'essai — destination après connexion\n");
console.log(" Parcours légitimes");
cas(null, "dashboard.html");
cas("", "dashboard.html");
cas("dashboard.html", "dashboard.html");
cas("dashboard.html?subscribe=annual", "dashboard.html?subscribe=annual");
cas("join.html?token=abc%2Bdef", "join.html?token=abc%2Bdef");
cas("/event.html?event=0b7e-uuid", "event.html?event=0b7e-uuid");   // requireAuth
cas("/account.html", "account.html");
cas("https://tiptopplans.com/event.html?event=x", "event.html?event=x");

console.log("\n Destinations refusées");
[
  "https://site-externe.example",
  "https://site-externe.example/dashboard.html",
  "//site-externe.example",
  "///site-externe.example",
  "/\\site-externe.example",
  "\\\\site-externe.example",
  "https:site-externe.example",
  "javascript:alert(1)",
  "JavaScript:alert(1)",
  "data:text/html,<script>alert(1)</script>",
  " https://site-externe.example",
  "https://tiptopplans.com.site-externe.example/dashboard.html",
  "https://tiptopplans.com@site-externe.example/dashboard.html",
  "http://tiptopplans.com/dashboard.html",          // autre origine (http)
  "reset.html",                                      // page hors liste
  "supabase/schema.sql",
  "../dashboard.html/../../x",
  "%2F%2Fsite-externe.example",
].forEach(v => cas(v, "dashboard.html"));

console.log("\n Témoin négatif");
n++;
const ancienne = v => v || "dashboard.html";
if (ancienne("https://site-externe.example") === "https://site-externe.example") {
  console.log("  ok   — l'ancienne règle laissait sortir : le jeu d'essai exerce le défaut");
} else { echecs++; console.log("  ÉCHEC — le témoin ne reproduit pas le défaut"); }

console.log("\n" + (echecs ? echecs + " échec(s)" : n + " cas, aucun échec") + "\n");
process.exit(echecs ? 1 : 0);
