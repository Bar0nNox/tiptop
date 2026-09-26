/* =========================================================================
   Banc d'essai de core-callback — v1.22.0
   Exécute la fonction livrée contre une base simulée (filtres eq / gt,
   comptage, mise à jour) et une vérification Core simulée. Couvre la clôture
   d'accès au remboursement (CANCELLED d'une transaction encaissée), décidée le
   26/09/2026, et vérifie que les autres branches n'ont pas bougé.
   Exécution : `node test_callback.mjs` depuis tests/. Exige le paquet
   `typescript` (local, ou installé globalement).
   ========================================================================= */
import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let ts;
try { ts = require("typescript"); }
catch { ts = require(require("node:child_process").execSync("npm root -g").toString().trim() + "/typescript"); }
let src = fs.readFileSync("../supabase/functions/core-callback/index.ts","utf8")
  .replace(/^import .*$/mg, "");
const js = ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
let handler;
globalThis.Deno = { serve: h => { handler = h; }, env: { get: () => "x" } };
let db, txStatus;
globalThis.CORS = {};
globalThis.coreFetch = async () => ({ ok: true, json: async () => ({ id: "tx", status: txStatus, metadata: { orderReference: "ref2" } }) });
// Mini client : filtres eq / gt, select head count, update, maybeSingle.
globalThis.createClient = () => ({ from(t) {
  const f = []; let upd = null, head = false;
  const rows = () => db[t].filter(r => f.every(fn => fn(r)));
  const q = {
    select(_c, o) { head = !!(o && o.head); return q; },
    eq(k, v) { f.push(r => String(r[k]) === String(v)); return q; },
    gt(k, v) { f.push(r => r[k] > v); return q; },
    update(o) { upd = o; return q; },
    async maybeSingle() { return { data: rows()[0] ? { ...rows()[0] } : null }; },
    then(res) {
      if (upd) { rows().forEach(r => Object.assign(r, upd)); return Promise.resolve({ error: null }).then(res); }
      if (head) return Promise.resolve({ count: rows().length }).then(res);
      return Promise.resolve({ data: rows() }).then(res);
    } };
  return q; } });
new Function(js)();
if (!handler) { console.error("ARRÊT — Deno.serve n'a pas été appelé : extraction invalide"); process.exit(2); }
const post = () => handler({ method: "POST", json: async () => ({ transaction: { id: "tx" } }) });
const base = (extra = []) => ({
  profiles: [{ id: "u", subscription_status: "active", current_period_end: "2099-01-01", renewal_attempts: 0 }],
  payments: [{ id: "p2", user_id: "u", order_reference: "ref2", core_transaction_id: "tx", status: "COMPLETED", created_at: "2026-09-01" }, ...extra] });
let fails = 0; const ok = (c, m) => { console.log((c ? "  ok   — " : "  ÉCHEC — ") + m); if (!c) fails++; };

db = base(); txStatus = "CANCELLED"; await post();
ok(db.profiles[0].subscription_status === "inactive", "remboursement du dernier paiement encaissé → inactive");
ok(db.profiles[0].current_period_end < "2099", "échéance ramenée à maintenant");
ok(db.payments[0].status === "CANCELLED", "ligne payments passée en CANCELLED");
db.profiles[0].subscription_status = "active"; await post();
ok(db.profiles[0].subscription_status === "active", "rejeu du callback : aucune seconde clôture");

db = base([{ id: "p3", user_id: "u", order_reference: "ref3", status: "COMPLETED", created_at: "2026-10-01" }]); txStatus = "CANCELLED"; await post();
ok(db.profiles[0].subscription_status === "active", "remboursement d'une période antérieure → accès maintenu");

db = base(); db.payments[0].status = "PENDING"; txStatus = "CANCELLED"; await post();
ok(db.profiles[0].subscription_status === "active", "PENDING annulé (jamais encaissé) → rien");

db = base(); db.payments[0].status = "PENDING"; txStatus = "FAILED"; await post();
ok(db.profiles[0].subscription_status === "active", "FAILED → rien");

db = base(); db.payments[0].status = "PENDING"; db.profiles[0].subscription_status = "trialing"; txStatus = "COMPLETED"; await post();
ok(db.profiles[0].subscription_status === "active", "COMPLETED → activation inchangée");
console.log("\n" + (fails ? fails + " échec(s)" : "aucun échec"));
process.exit(fails ? 1 : 0);
