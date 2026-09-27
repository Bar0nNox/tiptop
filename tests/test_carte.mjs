/* =========================================================================
   Banc d'essai du parcours de carte — v1.23.1

   Exécute les fonctions livrées — core-register-card, core-charge,
   account-actions (confirm-card, resume) — contre une base simulée et un Core
   simulé. `promotePendingCard` est extraite de _shared/core.ts par bornes
   textuelles assertées.

   Le défaut corrigé : l'enregistrement remplaçait `core_card_id` et
   `plan_period` dès l'ouverture de la page Core. Un abandon laissait une carte
   jamais validée en service et perdait la précédente. Le banc vérifie qu'un
   abandon ne touche plus à rien, que le retour par l'URL de succès promeut la
   carte (avec ou sans prélèvement), et qu'une carte inconnue de Core est
   refusée.

   Témoin négatif : le code de la v1.23.0 (git 7d9026d) est rejoué sur le même
   scénario d'abandon et doit, lui, remplacer la carte — sans quoi le banc ne
   prouverait rien.

   Exécution : `node test_carte.mjs` depuis tests/, dans le dépôt git. Exige le
   paquet `typescript` (local ou global).
   ========================================================================= */
import fs from "node:fs";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let ts;
try { ts = require("typescript"); }
catch { ts = require(execSync("npm root -g").toString().trim() + "/typescript"); }

const tsjs = src => ts.transpileModule(src, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
function entre(src, debut, fin, quoi) {
  const a = src.indexOf(debut);
  if (a < 0) { console.error("ARRÊT — borne de début introuvable (" + quoi + ")"); process.exit(2); }
  const b = src.indexOf(fin, a);
  if (b < 0) { console.error("ARRÊT — borne de fin introuvable (" + quoi + ")"); process.exit(2); }
  return src.slice(a, b + fin.length);
}

/* ---- Environnement simulé --------------------------------------------- */
let db, core;
function reset(profil) {
  db = { profiles: [Object.assign({ id: "u", subscription_status: "trialing", core_card_id: null, plan_period: null,
                                     pending_card_id: null, pending_plan_period: null, current_period_end: "2099-01-01",
                                     cancel_at_period_end: false }, profil || {})],
         payments: [], app_pricing: [{ plan: "individual", period: "monthly", amount_eur: 9.9 }, { plan: "individual", period: "annual", amount_eur: 89.9 }] };
  core = { calls: [], cartesConnues: new Set(["301", "302"]), prochaineCarte: "302" };
}
globalThis.Deno = { env: { get: k => ({ SITE_URL: "https://site", SUPABASE_URL: "x", SUPABASE_SERVICE_ROLE_KEY: "x" })[k] }, serve: h => { globalThis.__h = h; } };
globalThis.CORS = {};
globalThis.coreFetch = async (path, init = {}) => {
  const m = (init.method || "GET").toUpperCase();
  core.calls.push(m + " " + path + (init.body ? " " + init.body : ""));
  const rep = (ok, body) => ({ ok, status: ok ? 200 : 404, json: async () => body });
  if (m === "POST" && path === "/cards/register") return rep(true, { cardId: core.prochaineCarte, paymentPageUrl: "https://core/page" });
  if (m === "GET" && path.startsWith("/cards/")) return rep(core.cartesConnues.has(path.slice(7)), {});
  if (m === "DELETE" && path.startsWith("/cards/")) return rep(true, {});
  if (m === "POST" && path === "/transactions/rebill") return rep(true, { id: 77, status: "COMPLETED", paymentPageUrl: null });
  return rep(false, {});
};
globalThis.loadPricing = async sb => { const r = await sb.from("app_pricing").select("*"); const o = {}; r.data.forEach(x => o[x.period] = x.amount_eur); return o; };
globalThis.amountFor = (p, period) => p[period];
globalThis.createClient = () => ({
  auth: { getUser: async () => ({ data: { user: { id: "u", email: "u@x" } }, error: null }),
          admin: { deleteUser: async () => ({ error: null }) } },
  from(t) {
    const f = []; let upd = null, ins = null;
    const rows = () => db[t].filter(r => f.every(fn => fn(r)));
    const q = {
      select() { return q; }, eq(k, v) { f.push(r => String(r[k]) === String(v)); return q; },
      update(o) { upd = o; return q; }, insert(o) { ins = o; return q; },
      async single() { const r = rows()[0]; return { data: r ? { ...r } : null, error: r ? null : { message: "none" } }; },
      then(res) {
        if (ins) { db[t].push(ins); return Promise.resolve({ error: null }).then(res); }
        if (upd) { rows().forEach(r => Object.assign(r, upd)); return Promise.resolve({ error: null }).then(res); }
        return Promise.resolve({ data: rows(), error: null }).then(res);
      } };
    return q;
  } });

/* ---- Chargement d'une version du code ---------------------------------- */
function charger(lire) {
  const shared = lire("supabase/functions/_shared/core.ts");
  let promote = "";
  if (shared.includes("export async function promotePendingCard(")) {
    promote = tsjs(entre(shared, "export async function promotePendingCard(",
      "return { promoted: true, cardId: p.pending_card_id, period };\n}", "promotePendingCard").replace("export ", ""));
  }
  const fn = {};
  for (const nom of ["core-register-card", "core-charge", "account-actions"]) {
    const src = lire("supabase/functions/" + nom + "/index.ts").replace(/^import .*$/mg, "");
    new Function(promote + "\n" + tsjs(src))();
    if (!globalThis.__h) { console.error("ARRÊT — Deno.serve non appelé (" + nom + ")"); process.exit(2); }
    fn[nom] = globalThis.__h; globalThis.__h = null;
  }
  const appel = async (nom, body) => {
    const r = await fn[nom]({ method: "POST", headers: { get: () => "Bearer x" }, json: async () => body });
    return { status: r.status, body: JSON.parse(await r.text()) };
  };
  return appel;
}
const actuel = charger(f => fs.readFileSync("../" + f, "utf8"));
const ancien = charger(f => execSync("git show 7d9026d:" + f, { encoding: "utf8" }));

let echecs = 0, n = 0;
const cas = async (nom, fn) => { n++; try { await fn(); console.log("  ok   — " + nom); } catch (e) { echecs++; console.log("  ÉCHEC — " + nom + " : " + e.message); } };
const P = () => db.profiles[0];
const eq = (a, b, quoi) => { if (a !== b) throw new Error(quoi + " : " + JSON.stringify(a) + " ≠ " + JSON.stringify(b)); };

console.log("\nBanc d'essai — parcours de carte\n");

await cas("témoin négatif : la v1.23.0 remplaçait la carte dès l'ouverture de la page", async () => {
  reset({ core_card_id: "301", plan_period: "annual", subscription_status: "active" });
  await ancien("core-register-card", { period: "monthly" });
  eq(P().core_card_id, "302", "carte en service après simple ouverture (ancien code)");
  eq(P().plan_period, "monthly", "périodicité après simple ouverture (ancien code)");
});

await cas("ouverture puis abandon : carte et périodicité en service inchangées", async () => {
  reset({ core_card_id: "301", plan_period: "annual", subscription_status: "active" });
  const r = await actuel("core-register-card", { period: "monthly" });
  eq(r.status, 200, "statut"); eq(r.body.paymentPageUrl, "https://core/page", "URL Core");
  eq(P().core_card_id, "301", "carte en service"); eq(P().plan_period, "annual", "périodicité");
  eq(P().pending_card_id, "302", "carte en attente"); eq(P().pending_plan_period, "monthly", "périodicité en attente");
});

await cas("essai sans carte, abandon : aucune carte en service (core-renew passera en inactive)", async () => {
  reset();
  await actuel("core-register-card", { period: "annual" });
  eq(P().core_card_id, null, "carte en service");
});

await cas("retour par l'URL de succès : promotion puis prélèvement sur la NOUVELLE carte, au tarif choisi", async () => {
  reset({ core_card_id: "301", plan_period: "monthly" });
  await actuel("core-register-card", { period: "annual" });
  core.calls = [];
  const r = await actuel("core-charge", { period: "annual" });
  eq(r.status, 200, "statut");
  eq(P().core_card_id, "302", "carte en service"); eq(P().plan_period, "annual", "périodicité");
  eq(P().pending_card_id, null, "carte en attente vidée");
  const rebill = core.calls.find(c => c.startsWith("POST /transactions/rebill"));
  if (!rebill) throw new Error("aucun prélèvement");
  const b = JSON.parse(rebill.slice(rebill.indexOf("{")));
  eq(b.cardId, 302, "carte prélevée");
  eq(b.amount, 89.9, "montant annuel");
  if (!core.calls.includes("DELETE /cards/301")) throw new Error("ancienne carte non supprimée chez Core");
});

await cas("période déjà payée : confirm-card promeut SANS prélever", async () => {
  reset({ core_card_id: null, plan_period: "monthly", subscription_status: "active" });
  await actuel("core-register-card", { period: "monthly" });
  core.calls = [];
  const r = await actuel("account-actions", { action: "confirm-card" });
  eq(r.status, 200, "statut"); eq(r.body.promoted, true, "promue");
  eq(P().core_card_id, "302", "carte en service");
  if (core.calls.some(c => c.startsWith("POST /transactions"))) throw new Error("un prélèvement a été lancé");
});

await cas("carte inconnue de Core : refus, carte en service conservée, attente vidée", async () => {
  reset({ core_card_id: "301", plan_period: "monthly" });
  core.prochaineCarte = "999";
  await actuel("core-register-card", { period: "monthly" });
  core.calls = [];
  const r = await actuel("core-charge", {});
  eq(r.status, 400, "statut");
  eq(P().core_card_id, "301", "carte en service"); eq(P().pending_card_id, null, "attente vidée");
  if (core.calls.some(c => c.startsWith("POST /transactions"))) throw new Error("prélèvement lancé sur une carte inconnue");
});

await cas("sans carte en attente : core-charge utilise la carte en service", async () => {
  reset({ core_card_id: "301", plan_period: "monthly" });
  const r = await actuel("core-charge", {});
  eq(r.status, 200, "statut"); eq(P().core_card_id, "301", "carte");
});

await cas("reprise après l'échéance : refusée", async () => {
  reset({ subscription_status: "active", cancel_at_period_end: true, current_period_end: "2000-01-01" });
  const r = await actuel("account-actions", { action: "resume" });
  eq(r.status, 409, "statut"); eq(P().cancel_at_period_end, true, "drapeau inchangé");
});

await cas("reprise avant l'échéance : acceptée", async () => {
  reset({ subscription_status: "active", cancel_at_period_end: true, current_period_end: "2099-01-01" });
  const r = await actuel("account-actions", { action: "resume" });
  eq(r.status, 200, "statut"); eq(P().cancel_at_period_end, false, "drapeau levé");
});

console.log("\n" + (echecs ? echecs + " échec(s)" : n + " cas, aucun échec") + "\n");
process.exit(echecs ? 1 : 0);
