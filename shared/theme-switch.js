/* =========================================================================
   TipTop — Bascule de thème (couleur / noir & blanc)
   Préférence d'affichage, mémorisée sur l'appareil comme la langue.
   Le thème est posé avant le rendu par un bloc en <head> ; ce fichier ne
   gère que le changement à chaud et l'interrupteur.
   ========================================================================= */
(function () {
  "use strict";
  const CLE = "tiptop_theme";

  function themeActuel() {
    try { return localStorage.getItem(CLE) === "mono" ? "mono" : "default"; }
    catch (e) { return "default"; }
  }

  function setTheme(theme) {
    const mono = theme === "mono";
    if (mono) document.documentElement.setAttribute("data-theme", "mono");
    else document.documentElement.removeAttribute("data-theme");
    try { localStorage.setItem(CLE, mono ? "mono" : "default"); } catch (e) {}
    document.dispatchEvent(new CustomEvent("theme:changed", { detail: { theme } }));
  }

  function mountThemeSwitch(container) {
    if (!container) return;
    const T = (k) => (typeof window.t === "function" ? window.t(k) : k);
    const sel = document.createElement("select");
    sel.className = "theme-switch";
    sel.setAttribute("aria-label", T("theme_label"));
    [["default", "theme_default"], ["mono", "theme_mono"]].forEach(([val, cle]) => {
      const o = document.createElement("option");
      o.value = val; o.textContent = T(cle);
      if (val === themeActuel()) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener("change", () => setTheme(sel.value));
    container.appendChild(sel);
    // Les libellés suivent la langue.
    document.addEventListener("i18n:changed", () => {
      [...sel.options].forEach((o, i) => {
        o.textContent = T(i === 0 ? "theme_default" : "theme_mono");
      });
      sel.setAttribute("aria-label", T("theme_label"));
    });
  }

  window.getTheme = themeActuel;
  window.setTheme = setTheme;
  window.mountThemeSwitch = mountThemeSwitch;
})();
