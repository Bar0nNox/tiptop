/* =========================================================================
   TipTop — Composant modale réutilisable
   Remplace les fenêtres natives du navigateur (alert / confirm / prompt).

   Un seul composant, paramétré par type :
     'info'    → une action, fermeture libre (Échap, clic extérieur)
     'confirm' → deux actions, fermeture libre, focus sur l'action principale
     'danger'  → deux actions, fermeture VERROUILLÉE, focus sur « Annuler »
     'prompt'  → saisie de texte, fermeture VERROUILLÉE, focus dans le champ

   API (toutes renvoient une promesse) :
     uiAlert({ title, message, okLabel })                     → undefined
     uiConfirm({ title, message, confirmLabel, cancelLabel }) → true | false
     uiDanger({ title, message, confirmLabel, cancelLabel })  → true | false
     uiPrompt({ title, message, label, value, placeholder })  → string | null

   Accessibilité : role="dialog", aria-modal, aria-labelledby, piège de focus,
   restitution du focus à l'élément d'origine.
   Mobile : feuille remontant du bas. Ordinateur : modale centrée.
   Animation courte, neutralisée si « réduire les animations » est actif.
   Empilement : 2 niveaux maximum (au-delà, le parcours est à revoir).
   ========================================================================= */
(function () {
  "use strict";

  var MAX_STACK = 2;
  var stack = [];

  // ---- Feuille de style injectée une seule fois ----
  var CSS = [
    '.uim-backdrop{position:fixed;inset:0;background:rgba(45,38,15,.42);z-index:1000;',
    '  display:flex;align-items:center;justify-content:center;padding:20px;',
    '  opacity:0;transition:opacity .16s ease}',
    '.uim-backdrop.uim-in{opacity:1}',
    '.uim-backdrop.uim-level-2{z-index:1010;background:rgba(45,38,15,.30)}',
    '.uim-dialog{background:#fff;border-radius:14px;width:100%;max-width:420px;',
    '  box-shadow:0 18px 50px rgba(60,50,15,.26);padding:22px 22px 18px;',
    '  transform:translateY(10px) scale(.985);transition:transform .16s ease;',
    '  font-family:Inter,-apple-system,system-ui,sans-serif;color:#3a2f11}',
    '.uim-backdrop.uim-in .uim-dialog{transform:none}',
    '.uim-title{font-family:Fraunces,Georgia,serif;font-size:18px;font-weight:600;margin:0 0 8px}',
    '.uim-msg{font-size:13.5px;line-height:1.55;color:#6b6250;margin:0 0 16px;white-space:pre-line}',
    '.uim-field{width:100%;padding:10px 12px;border:1px solid #ddd4c4;border-radius:9px;',
    '  font-size:14px;font-family:inherit;color:#3a2f11;background:#fffdf7;outline:none;margin-bottom:16px}',
    '.uim-field:focus{border-color:#EAC873;box-shadow:0 0 0 3px rgba(234,200,115,.28)}',
    '.uim-label{display:block;font-size:12px;font-weight:600;color:#6b6250;margin-bottom:6px}',
    '.uim-actions{display:flex;gap:9px;justify-content:flex-end}',
    '.uim-btn{padding:9px 16px;border-radius:9px;border:1px solid transparent;font-size:13.5px;',
    '  font-weight:600;font-family:inherit;cursor:pointer;transition:filter .12s,background .12s}',
    '.uim-btn:focus-visible{outline:2px solid #8a6bd1;outline-offset:2px}',
    '.uim-btn-ghost{background:#fff;border-color:#ddd4c4;color:#5c5340}',
    '.uim-btn-ghost:hover{background:#f6f2e8}',
    '.uim-btn-primary{background:#3a2f11;color:#fff}',
    '.uim-btn-primary:hover{filter:brightness(1.18)}',
    '.uim-btn-danger{background:#b4453c;color:#fff}',
    '.uim-btn-danger:hover{filter:brightness(1.12)}',
    // --- Mobile : feuille remontant du bas ---
    '@media (max-width:700px){',
    '  .uim-backdrop{align-items:flex-end;padding:0}',
    '  .uim-dialog{max-width:none;border-radius:16px 16px 0 0;padding:20px 18px calc(18px + env(safe-area-inset-bottom));',
    '    transform:translateY(100%)}',
    '  .uim-backdrop.uim-in .uim-dialog{transform:none}',
    '  .uim-actions{flex-direction:column-reverse}',
    '  .uim-btn{width:100%;padding:12px}',
    '}',
    // --- Respect du réglage système « réduire les animations » ---
    '@media (prefers-reduced-motion:reduce){',
    '  .uim-backdrop,.uim-dialog{transition:none}',
    '  .uim-dialog{transform:none}',
    '}'
  ].join("");

  function injectStyle() {
    if (document.getElementById("uim-style")) return;
    var s = document.createElement("style");
    s.id = "uim-style";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  /* Ouvre une modale. Renvoie une promesse résolue avec :
       - undefined  (info)
       - true|false (confirm, danger)
       - string|null (prompt) */
  function openModal(opts) {
    injectStyle();

    var type = opts.type || "confirm";
    var lockedClose = (type === "danger" || type === "prompt");
    var isPrompt = (type === "prompt");

    if (stack.length >= MAX_STACK) {
      // Garde-fou volontaire : au-delà de deux niveaux, le parcours est à revoir.
      console.warn("[ui-modal] empilement limité à " + MAX_STACK + " niveaux.");
      return Promise.resolve(isPrompt ? null : false);
    }

    return new Promise(function (resolve) {
      var previousFocus = document.activeElement;
      var level = stack.length + 1;
      var titleId = "uim-title-" + Date.now() + "-" + level;

      var backdrop = document.createElement("div");
      backdrop.className = "uim-backdrop" + (level === 2 ? " uim-level-2" : "");

      // Libellés par défaut : traduits si le moteur i18n est présent, sinon français.
      var T = (typeof window.t === "function") ? window.t : function (k) {
        return ({ confirm: "Confirmer", cancel: "Annuler", ok_understood: "J'ai compris" })[k] || k;
      };
      var confirmLabel = opts.confirmLabel || T("confirm");
      var cancelLabel = opts.cancelLabel || T("cancel");
      var okLabel = opts.okLabel || T("ok_understood");

      var fieldHtml = "";
      if (isPrompt) {
        fieldHtml =
          (opts.label ? '<label class="uim-label" for="uim-input">' + escapeHtml(opts.label) + "</label>" : "") +
          '<input class="uim-field" id="uim-input" type="text" value="' + escapeHtml(opts.value || "") +
          '" placeholder="' + escapeHtml(opts.placeholder || "") + '">';
      }

      var actionsHtml;
      if (type === "info") {
        actionsHtml = '<button class="uim-btn uim-btn-primary" data-act="ok">' + escapeHtml(okLabel) + "</button>";
      } else {
        actionsHtml =
          '<button class="uim-btn uim-btn-ghost" data-act="cancel">' + escapeHtml(cancelLabel) + "</button>" +
          '<button class="uim-btn ' + (type === "danger" ? "uim-btn-danger" : "uim-btn-primary") +
          '" data-act="confirm">' + escapeHtml(confirmLabel) + "</button>";
      }

      backdrop.innerHTML =
        '<div class="uim-dialog" role="dialog" aria-modal="true" aria-labelledby="' + titleId + '">' +
          '<h2 class="uim-title" id="' + titleId + '">' + escapeHtml(opts.title || "") + "</h2>" +
          (opts.message ? '<p class="uim-msg">' + escapeHtml(opts.message) + "</p>" : "") +
          fieldHtml +
          '<div class="uim-actions">' + actionsHtml + "</div>" +
        "</div>";

      document.body.appendChild(backdrop);
      stack.push(backdrop);
      // Déclenche la transition d'entrée après insertion dans le document.
      requestAnimationFrame(function () { backdrop.classList.add("uim-in"); });

      var dialog = backdrop.querySelector(".uim-dialog");
      var input = backdrop.querySelector("#uim-input");

      function close(result) {
        if (backdrop.dataset.closing) return;
        backdrop.dataset.closing = "1";
        backdrop.classList.remove("uim-in");
        document.removeEventListener("keydown", onKey, true);
        var idx = stack.indexOf(backdrop);
        if (idx >= 0) stack.splice(idx, 1);
        var finish = function () {
          if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
          // Restitution du focus à l'élément qui avait ouvert la modale.
          if (previousFocus && typeof previousFocus.focus === "function") {
            try { previousFocus.focus(); } catch (e) {}
          }
          resolve(result);
        };
        // Laisse jouer l'animation de sortie, sauf si elle est neutralisée.
        var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion:reduce)").matches;
        if (reduced) finish(); else setTimeout(finish, 160);
      }

      function focusables() {
        return Array.prototype.filter.call(
          dialog.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'),
          function (el) { return !el.disabled && el.offsetParent !== null; }
        );
      }

      function onKey(e) {
        // Ne réagit que pour la modale la plus haute de la pile.
        if (stack[stack.length - 1] !== backdrop) return;

        if (e.key === "Escape") {
          if (lockedClose) { e.preventDefault(); return; }  // geste explicite exigé
          e.preventDefault();
          close(isPrompt ? null : (type === "info" ? undefined : false));
          return;
        }
        if (e.key === "Enter" && isPrompt && document.activeElement === input) {
          e.preventDefault();
          close(input.value.trim() ? input.value.trim() : null);
          return;
        }
        if (e.key === "Tab") {
          // Piège de focus : la tabulation ne sort pas de la modale.
          var list = focusables();
          if (!list.length) return;
          var first = list[0], last = list[list.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
      document.addEventListener("keydown", onKey, true);

      // Clic sur le fond : ferme uniquement si le type l'autorise.
      backdrop.addEventListener("mousedown", function (e) {
        if (e.target !== backdrop || lockedClose) return;
        close(isPrompt ? null : (type === "info" ? undefined : false));
      });

      backdrop.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-act]");
        if (!btn) return;
        var act = btn.dataset.act;
        if (act === "cancel") close(isPrompt ? null : false);
        else if (act === "ok") close(undefined);
        else if (act === "confirm") {
          if (isPrompt) close(input.value.trim() ? input.value.trim() : null);
          else close(true);
        }
      });

      // Focus initial, selon le type.
      requestAnimationFrame(function () {
        if (isPrompt && input) { input.focus(); input.select(); return; }
        var target = (type === "danger")
          ? dialog.querySelector('[data-act="cancel"]')     // cas dangereux : « Annuler »
          : dialog.querySelector('[data-act="confirm"],[data-act="ok"]');
        if (target) target.focus();
      });
    });
  }

  window.uiAlert = function (o) {
    return openModal(Object.assign({ type: "info" }, typeof o === "string" ? { title: o } : o));
  };
  window.uiConfirm = function (o) {
    return openModal(Object.assign({ type: "confirm" }, typeof o === "string" ? { title: o } : o));
  };
  window.uiDanger = function (o) {
    return openModal(Object.assign({ type: "danger" }, typeof o === "string" ? { title: o } : o));
  };
  window.uiPrompt = function (o) {
    return openModal(Object.assign({ type: "prompt" }, typeof o === "string" ? { title: o } : o));
  };
})();
