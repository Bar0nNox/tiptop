// ============================================================================
// TipTop — trial-reminders/templates.ts               (v1.19.0)
//
// Gabarits des relances de fin d'essai, FR et EN.
//
// ⚠️ EXCEPTION ASSUMÉE À L'AUDIT COULEURS. `CONTEXTE.md` interdit toute valeur
// littérale hors de `theme.css`. Un e-mail ne peut pas charger de feuille de
// style externe et ne connaît pas les variables CSS : les couleurs sont donc
// écrites en dur ici, comme dans `emails/reset-password.html`. Elles sont
// regroupées dans `C` ci-dessous — un seul endroit à corriger si la palette
// bouge. L'audit doit ignorer `supabase/functions/**` comme il ignore `emails/`.
//
// Sept formes de message : d7 n'existe qu'en `cold`, les trois autres échéances
// se déclinent en `cold` (aucun événement créé) et `warm` (au moins un).
// ============================================================================

export type Kind = "d7" | "d3" | "d0" | "p3";
export type Variant = "cold" | "warm";
export type Lang = "fr" | "en";

// ---------------------------------------------------------------------------
// Constantes de déploiement
// ---------------------------------------------------------------------------

export const APP_URL = "https://tiptopplans.com";

// ⚠️ VÉRIFIER LE NOM DU FICHIER. La v1.14.0 a fait le ménage dans `shared/` :
// `logo-512.png` est devenu `assets/logo-master.png` et n'est plus publié. Le
// PNG restant le plus grand devrait être `logo-192.png`. Un SVG est exclu — les
// messageries le suppriment (v1.12.1).
export const LOGO_URL = `${APP_URL}/shared/logo-192.png`;

// Adresse postale, obligatoire en pied d'e-mail commercial (CAN-SPAM aux
// États-Unis ; recommandé partout ailleurs). Le J+3 s'adresse à un ancien
// utilisateur : c'est de la prospection, pas du transactionnel.
export const POSTAL_ADDRESS =
  "Childish Agency — 4 Rue Baron de Sainte Suzanne, 98000 Monaco";

const PRICE_MONTHLY = "9,90 €";
const PRICE_ANNUAL = "89,90 €";

const C = {
  page: "#F4F6F5",
  panel: "#FFFFFF",
  ink: "#1E211F",
  muted: "#5A6560",
  border: "#DDE3DF",
  accent: "#27392E", // vert de marque, cf. v1.12.1
  onAccent: "#FFFFFF", // couple fond/texte — cf. §7 du roadmap
  accentSoft: "#EEF2F0",
};

// ---------------------------------------------------------------------------
// Ce que devient un compte après l'échéance
//
// ⚠️ CETTE PHRASE N'EST VRAIE QU'À PARTIR DE LA v1.19.0, déployée séparément.
// Avant elle, un compte `inactive` ne voyait plus AUCUN de ses événements : la
// policy de lecture exigeait un abonnement actif jusque pour le propriétaire,
// et le `select` renvoyait zéro ligne sans erreur. Le produit a été aligné sur
// la promesse plutôt que l'inverse — c'est l'option (a) du roadmap.
//
// Conséquence d'ordonnancement : ne pas activer le cron des relances avant
// d'avoir déposé la v1.19.0 et exécuté `migration-readonly-inactive.sql`, sous
// peine d'écrire à des clients une phrase que le tableau de bord démentira.
//
// Utilisée par les trois variantes `warm` (J-3, J-0, J+3). Les variantes `cold`
// n'y font pas appel : sans plan créé, il n'y a rien à conserver.
//
// Sans objet pour la collaboration : elle est réservée aux abonnés actifs,
// l'essai n'y donne pas droit (v1.5.x). Un compte en essai n'a jamais de
// collaborateur à perdre.
// ---------------------------------------------------------------------------
const AFTER_EXPIRY: Record<Lang, string> = {
  fr: "Vos événements restent consultables, en lecture seule. Un abonnement rétablit la modification et la création — vous reprenez vos plans là où vous les avez laissés.",
  en: "Your events stay viewable, in read-only. Subscribing restores editing and creation — you pick up your plans exactly where you left them.",
};

// ---------------------------------------------------------------------------
// Dates
//
// `period_end` arrive en `YYYY-MM-DD`. Surtout ne pas passer par
// `new Date("2027-06-14")`, interprété en UTC : la date affichée peut reculer
// d'un jour selon le fuseau (piège déjà rencontré en v1.17.0). D'où un
// découpage manuel et un `Date` construit en heure locale.
// ---------------------------------------------------------------------------
function formatDate(iso: string, lang: Lang): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Contenu
// ---------------------------------------------------------------------------

type Cta = { label: string; url: string; kind: "primary" | "secondary" };

type Block = {
  subject: string;
  preheader: string;
  heading: string;
  paragraphs: string[];
  ctas: Cta[];
  footnote?: string;
};

const dashboard = `${APP_URL}/dashboard.html`;
const subscribeAnnual = `${dashboard}?subscribe=annual`;
const subscribeMonthly = `${dashboard}?subscribe=monthly`;

// L'annuel d'abord et en primaire : la commission Core est de ~2,2 % sur
// 89,90 € contre ~4 % sur 9,90 €, et le roadmap demande de le mettre en avant.
function subscribeCtas(lang: Lang): Cta[] {
  return lang === "fr"
    ? [
        { label: `S’abonner à l’année — ${PRICE_ANNUAL}`, url: subscribeAnnual, kind: "primary" },
        { label: `Ou au mois — ${PRICE_MONTHLY}`, url: subscribeMonthly, kind: "secondary" },
      ]
    : [
        { label: `Subscribe yearly — ${PRICE_ANNUAL}`, url: subscribeAnnual, kind: "primary" },
        { label: `Or monthly — ${PRICE_MONTHLY}`, url: subscribeMonthly, kind: "secondary" },
      ];
}

function priceFootnote(lang: Lang): string {
  return lang === "fr"
    ? `Au-delà de l’essai : ${PRICE_MONTHLY} par mois, ou ${PRICE_ANNUAL} par an — deux mois et demi offerts.`
    : `After the trial: ${PRICE_MONTHLY} per month, or ${PRICE_ANNUAL} per year — two and a half months free.`;
}

function block(kind: Kind, variant: Variant, lang: Lang, endDate: string): Block {
  const fr = lang === "fr";

  // -- J-7, à qui n'a pas encore créé de plan --------------------------------
  // Objectif : l'activation, pas la vente. Un seul bouton, vers l'éditeur.
  if (kind === "d7") {
    return fr
      ? {
          subject: "Votre premier plan de table reste à faire",
          preheader: `Votre essai court jusqu’au ${endDate}.`,
          heading: "Votre essai a commencé",
          paragraphs: [
            `Votre essai TipTop court jusqu’au ${endDate}. Vous n’avez pas encore créé de plan de table — c’est l’affaire de quelques minutes.`,
            "Créez votre événement, importez votre liste d’invités depuis un fichier CSV, puis placez les convives par glisser-déposer. Le placement automatique propose une première répartition, qu’il ne reste qu’à ajuster.",
            "Votre essai comprend un événement, sans carte bancaire.",
          ],
          ctas: [{ label: "Créer mon plan de table", url: dashboard, kind: "primary" }],
        }
      : {
          subject: "Your first seating plan is still waiting",
          preheader: `Your trial runs until ${endDate}.`,
          heading: "Your trial has started",
          paragraphs: [
            `Your TipTop trial runs until ${endDate}. You haven’t created a seating plan yet — it only takes a few minutes.`,
            "Create your event, import your guest list from a CSV file, then place guests by dragging and dropping. Automatic placement proposes a first arrangement for you to adjust.",
            "Your trial includes one event, with no card required.",
          ],
          ctas: [{ label: "Create my seating plan", url: dashboard, kind: "primary" }],
        };
  }

  // -- J-3 -------------------------------------------------------------------
  if (kind === "d3") {
    if (variant === "cold") {
      return fr
        ? {
            subject: "Votre essai TipTop se termine dans 3 jours",
            preheader: `Fin de l’essai le ${endDate}.`,
            heading: "Trois jours avant la fin de votre essai",
            paragraphs: [
              `Votre essai se termine le ${endDate}. Vous n’avez pas encore créé de plan de table : il vous reste le temps de le faire, et votre essai comprend un événement.`,
              "Si quelque chose vous a arrêté, répondez à ce message — c’est utile à savoir.",
            ],
            ctas: [{ label: "Créer mon plan de table", url: dashboard, kind: "primary" }],
            footnote: priceFootnote(lang),
          }
        : {
            subject: "Your TipTop trial ends in 3 days",
            preheader: `Trial ends on ${endDate}.`,
            heading: "Three days left in your trial",
            paragraphs: [
              `Your trial ends on ${endDate}. You haven’t created a seating plan yet — there’s still time, and your trial includes one event.`,
              "If something got in the way, reply to this message — it’s useful to know.",
            ],
            ctas: [{ label: "Create my seating plan", url: dashboard, kind: "primary" }],
            footnote: priceFootnote(lang),
          };
    }
    return fr
      ? {
          subject: "Votre essai TipTop se termine dans 3 jours",
          preheader: `Fin de l’essai le ${endDate}.`,
          heading: "Trois jours avant la fin de votre essai",
          paragraphs: [
            `Votre essai se termine le ${endDate}. Pour continuer à créer et modifier vos plans de table au-delà de cette date, choisissez une formule.`,
            AFTER_EXPIRY.fr,
            "L’abonnement annuel revient à deux mois et demi offerts, et se résilie à tout moment — l’accès reste ouvert jusqu’à la fin de la période payée.",
          ],
          ctas: subscribeCtas(lang),
        }
      : {
          subject: "Your TipTop trial ends in 3 days",
          preheader: `Trial ends on ${endDate}.`,
          heading: "Three days left in your trial",
          paragraphs: [
            `Your trial ends on ${endDate}. To keep creating and editing seating plans past that date, pick a plan.`,
            AFTER_EXPIRY.en,
            "The yearly plan works out to two and a half months free, and can be cancelled at any time — access stays open until the end of the paid period.",
          ],
          ctas: subscribeCtas(lang),
        };
  }

  // -- J-0, matin du dernier jour -------------------------------------------
  if (kind === "d0") {
    if (variant === "cold") {
      return fr
        ? {
            subject: "Dernier jour de votre essai TipTop",
            preheader: "Votre essai se termine aujourd’hui.",
            heading: "Dernier jour de votre essai",
            paragraphs: [
              "Votre essai se termine aujourd’hui, et vous n’avez pas encore créé de plan de table. Il est encore temps d’essayer ce pour quoi vous vous êtes inscrit.",
            ],
            ctas: [{ label: "Créer mon plan de table", url: dashboard, kind: "primary" }],
            footnote: priceFootnote(lang),
          }
        : {
            subject: "Last day of your TipTop trial",
            preheader: "Your trial ends today.",
            heading: "Last day of your trial",
            paragraphs: [
              "Your trial ends today, and you haven’t created a seating plan yet. There’s still time to try what you signed up for.",
            ],
            ctas: [{ label: "Create my seating plan", url: dashboard, kind: "primary" }],
            footnote: priceFootnote(lang),
          };
    }
    return fr
      ? {
          subject: "Dernier jour de votre essai TipTop",
          preheader: "Votre essai se termine aujourd’hui.",
          heading: "Dernier jour de votre essai",
          paragraphs: [
            "Votre essai se termine aujourd’hui. Un abonnement prend le relais sans interruption.",
            AFTER_EXPIRY.fr,
          ],
          ctas: subscribeCtas(lang),
        }
      : {
          subject: "Last day of your TipTop trial",
          preheader: "Your trial ends today.",
          heading: "Last day of your trial",
          paragraphs: [
            "Your trial ends today. A subscription picks up without interruption.",
            AFTER_EXPIRY.en,
          ],
          ctas: subscribeCtas(lang),
        };
  }

  // -- J+3, après expiration -------------------------------------------------
  // Le compte est `inactive` : créer un événement n'est plus possible. Les deux
  // variantes mènent donc à l'abonnement, avec un angle différent.
  if (variant === "cold") {
    return fr
      ? {
          subject: "Votre essai TipTop est terminé",
          preheader: "Votre compte reste ouvert.",
          heading: "Votre essai est terminé",
          paragraphs: [
            "Votre essai a expiré sans que vous ayez créé de plan de table. Votre compte reste ouvert : un abonnement le réactive immédiatement.",
            "Et si TipTop ne répondait pas à votre besoin, un mot en réponse à ce message nous serait précieux.",
          ],
          ctas: subscribeCtas(lang),
        }
      : {
          subject: "Your TipTop trial has ended",
          preheader: "Your account is still open.",
          heading: "Your trial has ended",
          paragraphs: [
            "Your trial expired without a seating plan being created. Your account is still open — subscribing reactivates it right away.",
            "And if TipTop wasn’t the right fit, a line in reply would be genuinely useful to us.",
          ],
          ctas: subscribeCtas(lang),
        };
  }
  return fr
    ? {
        subject: "Votre essai TipTop est terminé",
        preheader: "Vos plans de table vous attendent.",
        heading: "Votre essai est terminé",
        paragraphs: [
          "Votre essai a expiré il y a trois jours.",
          AFTER_EXPIRY.fr,
          "L’abonnement annuel revient à deux mois et demi offerts, et se résilie à tout moment.",
        ],
        ctas: subscribeCtas(lang),
      }
    : {
        subject: "Your TipTop trial has ended",
        preheader: "Your seating plans are waiting.",
        heading: "Your trial has ended",
        paragraphs: [
          "Your trial expired three days ago.",
          AFTER_EXPIRY.en,
          "The yearly plan works out to two and a half months free, and can be cancelled at any time.",
        ],
        ctas: subscribeCtas(lang),
      };
}

// ---------------------------------------------------------------------------
// Mise en page
//
// Tableaux imbriqués et styles en ligne : Outlook ne gère ni flexbox, ni grid,
// ni les feuilles de style dans `<head>` de façon fiable.
// ---------------------------------------------------------------------------

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function button(cta: Cta): string {
  const primary = cta.kind === "primary";
  const bg = primary ? C.accent : C.panel;
  const fg = primary ? C.onAccent : C.accent;
  const border = primary ? C.accent : C.border;
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 10px;">
      <tr>
        <td align="center" bgcolor="${bg}" style="border:1px solid ${border};border-radius:8px;">
          <a href="${esc(cta.url)}"
             style="display:inline-block;padding:13px 26px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;line-height:1.2;color:${fg};text-decoration:none;">${esc(cta.label)}</a>
        </td>
      </tr>
    </table>`;
}

function layout(b: Block, lang: Lang, unsubscribeUrl: string): string {
  const fr = lang === "fr";
  const font =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

  const paragraphs = b.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-family:${font};font-size:16px;line-height:1.6;color:${C.ink};">${esc(p)}</p>`,
    )
    .join("");

  const buttons = b.ctas.map(button).join("");

  const footnote = b.footnote
    ? `<p style="margin:18px 0 0;font-family:${font};font-size:14px;line-height:1.5;color:${C.muted};">${esc(b.footnote)}</p>`
    : "";

  const unsubLabel = fr ? "Ne plus recevoir ces messages" : "Unsubscribe from these emails";
  const signature = fr
    ? "TipTop — plans de table pour événements"
    : "TipTop — seating plans for events";

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${esc(b.subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:${C.page};">
<div style="display:none;font-size:1px;color:${C.page};max-height:0;max-width:0;opacity:0;overflow:hidden;">${esc(b.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.page};">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:${C.panel};border:1px solid ${C.border};border-radius:12px;">
        <tr>
          <td style="padding:32px 32px 0;">
            <img src="${esc(LOGO_URL)}" width="44" height="44" alt="TipTop" style="display:block;border:0;">
          </td>
        </tr>
        <tr>
          <td style="padding:22px 32px 0;">
            <h1 style="margin:0 0 18px;font-family:${font};font-size:22px;line-height:1.3;font-weight:600;color:${C.ink};">${esc(b.heading)}</h1>
            ${paragraphs}
          </td>
        </tr>
        <tr>
          <td style="padding:6px 32px 0;">
            ${buttons}
            ${footnote}
          </td>
        </tr>
        <tr>
          <td style="padding:26px 32px 30px;">
            <div style="border-top:1px solid ${C.border};padding-top:18px;">
              <p style="margin:0;font-family:${font};font-size:13px;line-height:1.6;color:${C.muted};">
                ${esc(signature)}<br>
                <a href="${esc(APP_URL)}" style="color:${C.muted};text-decoration:underline;">tiptopplans.com</a>
              </p>
            </div>
          </td>
        </tr>
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
        <tr>
          <td style="padding:18px 32px 0;">
            <p style="margin:0;font-family:${font};font-size:12px;line-height:1.6;color:${C.muted};text-align:center;">
              <a href="${esc(unsubscribeUrl)}" style="color:${C.muted};text-decoration:underline;">${esc(unsubLabel)}</a><br>
              ${esc(POSTAL_ADDRESS)}
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

// Version texte : améliore la délivrabilité et sert de repli aux clients qui
// refusent le HTML.
function plainText(b: Block, lang: Lang, unsubscribeUrl: string): string {
  const fr = lang === "fr";
  const lines = [
    b.heading,
    "",
    ...b.paragraphs.flatMap((p) => [p, ""]),
    ...b.ctas.map((c) => `${c.label} : ${c.url}`),
    "",
  ];
  if (b.footnote) lines.push(b.footnote, "");
  lines.push(
    fr ? "TipTop — plans de table pour événements" : "TipTop — seating plans for events",
    APP_URL,
    "",
    `${fr ? "Ne plus recevoir ces messages" : "Unsubscribe"} : ${unsubscribeUrl}`,
    POSTAL_ADDRESS,
  );
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Point d'entrée
// ---------------------------------------------------------------------------

// Repère des chaînes livrées en placeholder. Appelé par `index.ts` avant tout
// envoi : mieux vaut un 409 dans les logs qu'un e-mail faux chez un client.
export function templatePlaceholders(): string[] {
  const found: string[] = [];
  if (/ADRESSE À COMPLÉTER/.test(POSTAL_ADDRESS)) found.push("POSTAL_ADDRESS");
  if (Object.values(AFTER_EXPIRY).some((v) => /À TRANCHER/.test(v))) found.push("AFTER_EXPIRY");
  return found;
}

export function renderReminder(args: {
  kind: Kind;
  variant: Variant;
  lang: Lang;
  periodEnd: string; // YYYY-MM-DD
  unsubscribeUrl: string;
}): { subject: string; html: string; text: string } {
  const b = block(args.kind, args.variant, args.lang, formatDate(args.periodEnd, args.lang));
  return {
    subject: b.subject,
    html: layout(b, args.lang, args.unsubscribeUrl),
    text: plainText(b, args.lang, args.unsubscribeUrl),
  };
}
