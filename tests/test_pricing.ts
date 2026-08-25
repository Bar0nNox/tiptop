// Banc d'essai — loadPricing() et formatage des montants (v1.21.3).
// Contrôle NÉGATIF inclus : chaque cas vérifie que le défaut visé est bien exercé.
import { loadPricing, amountFor } from "../supabase/functions/_shared/core.ts";

let ok = 0, ko = 0;
function cas(nom: string, f: () => void | Promise<void>) {
  return (async () => {
    try { await f(); console.log("  OK   " + nom); ok++; }
    catch (e) { console.log("  ECHEC " + nom + " → " + (e as Error).message); ko++; }
  })();
}
function faux(cond: boolean, msg: string) { if (!cond) throw new Error(msg); }

function db(lignes: unknown[] | null, erreur: string | null = null) {
  return { from: (_t: string) => ({ select: (_c: string) => ({ eq: (_k: string, _v: string) =>
    Promise.resolve({ data: lignes, error: erreur ? { message: erreur } : null }) }) }) };
}

await cas("tarifs complets → lus correctement", async () => {
  const p = await loadPricing(db([
    { period: "monthly", amount_eur: "9.90" },
    { period: "annual",  amount_eur: "89.90" },
  ]));
  faux(p.monthly === 9.9, "mensuel = " + p.monthly);
  faux(p.annual === 89.9, "annuel = " + p.annual);
});

await cas("amountFor sélectionne la bonne période", () => {
  const p = { monthly: 9.9, annual: 89.9 };
  faux(amountFor(p, "annual") === 89.9, "annual");
  faux(amountFor(p, "monthly") === 9.9, "monthly");
  faux(amountFor(p, "inconnu") === 9.9, "repli mensuel");
});

await cas("tarif annuel ABSENT → lève (ne renvoie pas 0)", async () => {
  let leve = false;
  try { await loadPricing(db([{ period: "monthly", amount_eur: "9.90" }])); }
  catch (_e) { leve = true; }
  faux(leve, "n'a pas levé — un tarif absent passerait pour 0");
});

await cas("tarif à ZÉRO → lève (cas du secret resté à 0)", async () => {
  let leve = false;
  try {
    await loadPricing(db([
      { period: "monthly", amount_eur: "0" },
      { period: "annual",  amount_eur: "89.90" },
    ]));
  } catch (_e) { leve = true; }
  faux(leve, "n'a pas levé sur un tarif nul");
});

await cas("table absente / erreur SQL → lève", async () => {
  let leve = false;
  try { await loadPricing(db(null, 'relation "app_pricing" does not exist')); }
  catch (_e) { leve = true; }
  faux(leve, "n'a pas levé sur erreur de lecture");
});

await cas("table VIDE → lève", async () => {
  let leve = false;
  try { await loadPricing(db([])); } catch (_e) { leve = true; }
  faux(leve, "n'a pas levé sur table vide");
});

// --- Formatage : le nombre brut doit produire les DEUX formes ---
function fmt(a: number, lang: string) {
  return new Intl.NumberFormat(lang === "fr" ? "fr-FR" : "en-GB",
    { style: "currency", currency: "EUR" }).format(a);
}
await cas("formatage FR et EN divergent bien", () => {
  const fr = fmt(9.9, "fr"), en = fmt(9.9, "en");
  faux(fr !== en, "FR et EN identiques : le formatage ne suit pas la langue");
  faux(fr.includes(","), "FR sans virgule décimale : " + fr);
  faux(en.includes("."), "EN sans point décimal : " + en);
  console.log("       FR=" + fr + "  EN=" + en);
});

console.log("\n  " + ok + " cas concluants, " + ko + " en échec.");
if (ko) Deno.exit(1);
