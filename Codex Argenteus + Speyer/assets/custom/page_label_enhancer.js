/**
 * EVT3 Page Label Enhancer
 *
 * Modifica le label nel selettore pagina di EVT3 dal formato "1r"
 * al formato "X/1r", dove X è il numero assoluto di pagina
 * estratto dall'xml:id (es. CArg_pb_1_1r → 1/1r).
 *
 * Accede ai dati delle pagine tramite __ngContext__ del componente
 * evt-page-selector, cercando ricorsivamente l'array di oggetti
 * { id: "..._pb_...", label: "..." }.
 *
 * Iniezione: <script src="evt3_page_label_enhancer.js"></script>
 * in fondo al <body> di index.html, dopo <app-root>.
 */
(function () {
  'use strict';

  // ── Utility ─────────────────────────────────────────────────────

  /**
   * Estrae il numero assoluto di pagina dall'xml:id.
   * Es: "CArg_pb_1_1r" → "1", "CArg_pb_42_102r" → "42"
   */
  function extractAbsoluteNumber(id) {
    if (!id) return null;
    const match = id.match(/_pb_(\d+)_/);
    return match ? match[1] : null;
  }

  // ── Accesso ai dati Angular ─────────────────────────────────────

  /**
   * Cerca ricorsivamente nelle proprietà interne di Angular
   * (__ngContext__ / LView) un array di oggetti pagina
   * il cui id contiene "_pb_".
   */
  function getPageData() {
    const selector = document.querySelector('evt-page-selector');
    const ngSelect = document.querySelector('evt-page-selector ng-select');

    for (const el of [selector, ngSelect].filter(Boolean)) {
      for (const key of Object.getOwnPropertyNames(el)) {
        try {
          const result = deepSearch(el[key], 0, new Set());
          if (result) return result;
        } catch (_) {}
      }
    }

    return null;
  }

  /**
   * Ricerca ricorsiva (max 8 livelli) per un array di oggetti
   * con proprietà id (contenente "_pb_") e label.
   */
  function deepSearch(obj, depth, visited) {
    if (depth > 8 || !obj || typeof obj !== 'object' || visited.has(obj)) return null;
    visited.add(obj);

    if (Array.isArray(obj) && obj.length > 2) {
      const first = obj[0];
      if (first && typeof first === 'object' &&
          typeof first.id === 'string' && first.id.includes('_pb_') && first.label) {
        return obj;
      }
    }

    try {
      const keys = Array.isArray(obj) ? [...obj.keys()] : Object.keys(obj);
      for (const k of keys) {
        try {
          const val = obj[k];
          if (val && typeof val === 'object') {
            const result = deepSearch(val, depth + 1, visited);
            if (result) return result;
          }
        } catch (_) {}
      }
    } catch (_) {}

    return null;
  }

  // ── Costruzione mappa label ─────────────────────────────────────

  function buildLabelMap(pages) {
    const map = new Map();
    for (const page of pages) {
      const absNum = extractAbsoluteNumber(page.id);
      const folio = page.label || '';
      if (absNum && folio) {
        map.set(folio, `${absNum}/${folio}`);
      }
    }
    return map;
  }

  // ── Aggiornamento label nel DOM ─────────────────────────────────

  function updateLabels(labelMap) {
    if (labelMap.size === 0) return;

    // Valore selezionato nel ng-select
    for (const ngValue of document.querySelectorAll('evt-page-selector .ng-value')) {
      const walker = document.createTreeWalker(ngValue, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const trimmed = node.textContent.trim();
        if (!trimmed || trimmed.includes('/')) continue;
        const enhanced = labelMap.get(trimmed);
        if (enhanced) node.textContent = ` ${enhanced} `;
      }
    }

    // Opzioni del dropdown (se aperto)
    for (const opt of document.querySelectorAll('.ng-dropdown-panel .ng-option-label')) {
      const trimmed = opt.textContent.trim();
      if (trimmed.includes('/')) continue;
      const enhanced = labelMap.get(trimmed);
      if (enhanced) opt.textContent = enhanced;
    }
  }

  // ── Inizializzazione ────────────────────────────────────────────

  let attempts = 0;

  function init() {
    attempts++;

    const selector = document.querySelector('evt-page-selector');
    if (!selector) {
      if (attempts < 10) setTimeout(init, 2000);
      return;
    }

    const pages = getPageData();
    if (!pages || pages.length === 0) {
      if (attempts < 10) {
        setTimeout(init, 2000);
        return;
      }
      console.warn('[Page Enhancer] Dati pagine non trovati.');
      return;
    }

    const labelMap = buildLabelMap(pages);
    console.log(`[Page Enhancer] ${labelMap.size} pagine mappate.`);

    updateLabels(labelMap);

    // Unico observer su document.body con subtree: true.
    // Cattura qualsiasi cambiamento: cambio pagina, apertura dropdown
    // (che ng-select può appendere al body o dentro il componente).
    // Debounce per evitare aggiornamenti multipli ravvicinati.
    let debounceTimer = null;
    new MutationObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => updateLabels(labelMap), 80);
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 1500));
  } else {
    setTimeout(init, 1500);
  }
})();
