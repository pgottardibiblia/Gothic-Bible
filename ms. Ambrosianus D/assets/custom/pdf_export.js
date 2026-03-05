/**
 * PDF Export (v8)
 *
 * Esporta il contenuto del pannello EVT3 come PDF con testo selezionabile.
 * Menu: "Pagina corrente" / "Range di pagine…"
 *
 * v8:
 *   - Accede ai dati delle pagine tramite __ngContext__ (stesso metodo
 *     del Page Label Enhancer) per ottenere la lista completa con xml:id.
 *   - Il dialogo range accetta numeri assoluti di pagina (es. 1–14),
 *     estratti dall'xml:id (CArg_pb_1_1r → pagina assoluta 1).
 *   - Naviga direttamente a ogni pagina tramite il dropdown ng-select
 *     (click sull'opzione per indice), minimizzando gli spostamenti.
 *   - Pre-apre la finestra di stampa per evitare il blocco popup.
 *
 * Nessuna dipendenza esterna richiesta.
 */
(function () {
  'use strict';

  // ── Configurazione ──────────────────────────────────────────────
  const CONFIG = {
    contentSelector: 'div.panel-content.content.card-content.edition-font.p-4',
    footerSelector: 'div[footer].d-flex.align-items-center',
    renderDelay: 1500,
    pageChangeDelay: 2000,
    fileNamePrefix: 'EVT3_export',
  };

  // ── CSS stampa ──────────────────────────────────────────────────
  const PRINT_CSS = `
    @page { size: A4; margin: 15mm; }
    * { box-sizing: border-box; }
    body {
      font-family: "Junicode", "Times New Roman", "DejaVu Serif", serif;
      font-size: 12pt; line-height: 1.5; color: #000; background: #fff;
      margin: 0; padding: 0;
    }
    .pdf-edition-header {
      text-align: center; font-size: 14pt; font-weight: bold;
      padding: 8px 0 12px; margin-bottom: 12px; border-bottom: 1px solid #666;
    }
    .pdf-edition-separator { page-break-before: always; }
    .pdf-section { padding: 0 65px; position: relative; }

    .ab[rend="align-center"] { display: block; text-align: center; }
    *[rend="strikethrough"] { text-decoration: line-through; }
    *[rend="overwritten"]   { font-weight: bold; }
    *[rend="underline"]     { text-decoration: underline; }
    *[rend="italic"]        { font-style: italic; }
    *[rend="cross"]         { text-decoration: line-through; }
    *[rend="erasure"]       { background-color: rgb(70,70,70); color: rgb(70,70,70); }
    *[rend="gold_ink"]      { color: rgb(184,134,11); font-weight: bold; }
    *[rend="line_full_width"] { margin-bottom: 0.1rem; border-bottom: 1px solid black; display: block; }
    *[rend="sup"]           { vertical-align: text-bottom; }
    *[place="superscript"]  { vertical-align: text-bottom; }
    .metamark[rend="line"]  { display: block; border: 1px solid black; margin-top: -1em; margin-right: 70%; }
    .fw { display: block; }
    [type="pageNum"][place="top_right"] { float: right; margin-top: -1.5rem; }
    .ex { font-style: normal; }
    evt-reading evt-note, evt-addition evt-note { display: none; }
    evt-addition > span.add > evt-content-viewer + evt-content-viewer { margin-left: 0.3em; }
    evt-addition > span.add[data-place="margin_left"] > evt-content-viewer { display: block; margin-left: -3.5em; }

    .pdf-section.diplomatic-mode evt-word[rend="silver_ink"] *[class~="unclear"] { color: rgb(120,120,120); }
    .pdf-section.diplomatic-mode evt-word[rend="gold_ink"] *[class~="unclear"]   { color: rgb(184,164,11); }
    .pdf-section.diplomatic-mode evt-content-viewer.seg:has([data-type="corresp-text"]) { display: none !important; }

    .pdf-section.interpretative-mode evt-word *[class~="unclear"] { border-bottom: 1px dotted rgba(0,0,0,0.5); padding-bottom: 1px; }
    .pdf-section.interpretative-mode evt-content-viewer *[class~="gap"] { display: none !important; }
    .pdf-section.interpretative-mode evt-generic-element *[class~="num"] span { display: none !important; }
    .pdf-section.interpretative-mode evt-generic-element *[class~="num"] evt-content-viewer:first-of-type::before { content: attr(data-value); }
    .pdf-section.interpretative-mode *[data-id*="seg_2"] { display: none !important; }
    .pdf-section.interpretative-mode evt-content-viewer[class~="seg-primary"][class~="seg-hidden"]::after { content: "-"; }
    .pdf-section.interpretative-mode evt-content-viewer[data-corresp-text="..."]:not(:has(evt-generic-element[type="corresp-text"])):not(:has([data-type="corresp-text"]))::after { content: " | "; }
    .pdf-section.interpretative-mode evt-generic-element[type="chapter"]::before {
      content: attr(n); font-weight: bold; font-size: 1.4em;
      color: #dc3545; margin-right: 0.5em; display: inline-block;
    }
    .pdf-section.interpretative-mode evt-generic-element[type="chapter"]:has(*[type="header"])::before { content: none !important; }
    .pdf-section.interpretative-mode evt-generic-element[type="verse"]::before {
      content: attr(n); vertical-align: super; font-size: 0.7em; color: #999; margin-right: 0.3em;
    }
    .pdf-section.interpretative-mode evt-generic-element[type="verse"]:has(*[type="header"])::before { content: none !important; }

    *[place="margin_left"] { float: left; margin-left: -55px; max-width: 175px; overflow-wrap: anywhere; word-break: break-all; }
    *[place="margin_left"] evt-generic-element.w { margin-right: 0.3em; }
    evt-addition[place="margin_right"] *[data-edition="diplomatic"] { float: right; margin-right: -45px; max-width: 125px; overflow-wrap: anywhere; word-break: break-word; }
    evt-addition[place="margin_right"] evt-generic-element.w { margin-right: 0.3em; }
    evt-note { display: inline-block; margin-left: 20px; }

    evt-generic-element[type="eusebian_canons"] {
      margin: 0.5rem 0; padding: 2rem; background-color: #faf8f3;
      border: 2px solid #8b7355; border-radius: 4px; display: block; page-break-inside: avoid;
    }
    evt-generic-element[type="eusebian_canons"] > evt-content-viewer { display: block; margin: 0; padding: 0; }
    evt-generic-element[type="eusebian_canons"] > evt-content-viewer:empty,
    evt-generic-element[type="eusebian_canons"] > evt-content-viewer:not(:has(evt-generic-element)) { display: none; }
    evt-generic-element.row {
      display: grid; grid-template-columns: auto auto auto auto;
      grid-auto-rows: auto; gap: 0.5rem; padding: 0; margin: 0 0 0.5rem 0;
    }
    evt-generic-element.row:last-of-type { margin-bottom: 0; }
    evt-generic-element.row[n="1"] { padding-bottom: 0.5rem; border-bottom: 1px solid #8b7355; margin-bottom: 0.75rem; font-weight: 600; }
    evt-generic-element.row > evt-content-viewer { text-align: center; padding: 0; white-space: nowrap; display: flex; align-items: center; justify-content: center; }
    evt-generic-element.row > evt-content-viewer:empty,
    evt-generic-element.row > evt-content-viewer:not(:has(evt-word)):not(:has(evt-generic-element)) { display: none; }
    evt-generic-element.row:empty { display: none; }

    table { border-collapse: collapse; width: 100%; margin: 8px 0; page-break-inside: avoid; }
    th, td { border: 1px solid #999; padding: 4px 8px; text-align: left; vertical-align: top; }
    th { background-color: #eee; font-weight: bold; }

    evt-generic-element { display: inline; }
    .lineN { color: #888; font-size: 9pt; margin-right: 6px; }

    button, .btn, [role="button"], .toolbar, .navbar, nav,
    .ng-select, ng-select, .modal, .tooltip, .popover,
    .scroll-to-top, .pdf-export-no-print,
    #image-folder-selector, .evt-verse-nav { display: none !important; }

    a { color: #000; text-decoration: none; }
    img { max-width: 100%; height: auto; }
    p, div.text-line, .verse-line { margin: 2px 0; }

    @media print {
      evt-generic-element[type="eusebian_canons"] { background-color: white; border-color: black; }
    }
  `;

  // ── Utility ─────────────────────────────────────────────────────
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  function extractAbsoluteNumber(id) {
    if (!id) return null;
    const m = id.match(/_pb_(\d+)_/);
    return m ? parseInt(m[1], 10) : null;
  }

  // ── Deep search Angular __ngContext__ ───────────────────────────
  /**
   * Cerca ricorsivamente nei dati interni di Angular l'array
   * di oggetti pagina { id: "..._pb_...", label: "..." }.
   * Stessa tecnica del Page Label Enhancer.
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
          const v = obj[k];
          if (v && typeof v === 'object') {
            const r = deepSearch(v, depth + 1, visited);
            if (r) return r;
          }
        } catch (_) {}
      }
    } catch (_) {}
    return null;
  }

  function getAngularPageData() {
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
   * Costruisce la struttura dati delle pagine:
   *   allPages: array ordinato per posizione nel dropdown
   *     [{ index, id, label, absNum }, ...]
   *   absNumbers: array ordinato di numeri assoluti unici (per il dialogo)
   *   byAbsNum: Map<absNum, [pageEntry, ...]> (ogni absNum ha r e v)
   */
  function buildPageIndex(angularPages) {
    const allPages = [];
    const byAbsNum = new Map();

    angularPages.forEach((page, index) => {
      const absNum = extractAbsoluteNumber(page.id);
      if (absNum === null) return;
      const entry = { index, id: page.id, label: page.label, absNum };
      allPages.push(entry);
      if (!byAbsNum.has(absNum)) byAbsNum.set(absNum, []);
      byAbsNum.get(absNum).push(entry);
    });

    const absNumbers = [...byAbsNum.keys()].sort((a, b) => a - b);

    return { allPages, absNumbers, byAbsNum };
  }

  // ── Controller edizione EVT3 ────────────────────────────────────
  function getEditionController() {
    const editionSelects = document.querySelectorAll('ng-select');
    for (const sel of editionSelects) {
      const container = sel.querySelector('.ng-value');
      if (container) {
        const text = container.textContent.toLowerCase();
        if (text.includes('diplom') || text.includes('interpr') || text.includes('critic')) {
          return {
            getCurrentEdition() {
              const val = sel.querySelector('.ng-value');
              return val ? val.textContent.trim().toLowerCase() : '';
            },
            async switchTo(target) {
              const input = sel.querySelector('.ng-select-container');
              if (input) input.click();
              await sleep(300);
              const opts = document.querySelectorAll('.ng-dropdown-panel .ng-option');
              for (const opt of opts) {
                if (opt.textContent.trim().toLowerCase().includes(target)) {
                  opt.click();
                  await sleep(CONFIG.renderDelay);
                  return true;
                }
              }
              if (input) input.click();
              return false;
            },
          };
        }
      }
    }
    return null;
  }

  // ── Navigazione pagina via dropdown ─────────────────────────────
  /**
   * Naviga alla pagina con l'indice specificato nel dropdown ng-select.
   * Apre il dropdown, clicca l'opzione all'indice dato, attende il render.
   */
  async function goToPageByIndex(dropdownIndex) {
    const pageSelect = document.querySelector('evt-page-selector ng-select');
    if (!pageSelect) return false;

    const input = pageSelect.querySelector('.ng-select-container');
    if (!input) return false;

    input.click();
    await sleep(500);

    const options = document.querySelectorAll('.ng-dropdown-panel .ng-option');
    if (dropdownIndex >= 0 && dropdownIndex < options.length) {
      options[dropdownIndex].click();
      await sleep(CONFIG.pageChangeDelay);
      return true;
    }

    // Chiudi se indice fuori range
    pageSelect.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await sleep(200);
    return false;
  }

  /**
   * Restituisce la label della pagina attualmente selezionata.
   */
  function getCurrentPageLabel() {
    const val = document.querySelector('evt-page-selector .ng-value');
    if (val) {
      // Potrebbe essere nel formato "X/folio" se il page enhancer è attivo
      const text = val.textContent.trim();
      const slashIdx = text.lastIndexOf('/');
      if (slashIdx >= 0) return text.substring(slashIdx + 1).trim();
      // Altrimenti testo puro
      return text.replace(/^.*?(?=\d)/, '').trim() || text;
    }
    const pbEl = document.querySelector('evt-generic-element.pb[data-id]');
    const pageId = pbEl ? pbEl.getAttribute('data-id') || '' : '';
    return pageId.replace(/^.*_pb_\d+_/, '') || 'page';
  }

  // ── Clonazione contenuto ────────────────────────────────────────
  function cloneContent() {
    const content = document.querySelector(CONFIG.contentSelector);
    if (!content) throw new Error(`Elemento non trovato: ${CONFIG.contentSelector}`);
    const clone = content.cloneNode(true);
    clone.querySelectorAll(
      'ng-select, .ng-select, [ng-reflect-model], #image-folder-selector, .evt-verse-nav'
    ).forEach(el => el.remove());
    copyComputedFonts(content, clone);
    return clone;
  }

  function copyComputedFonts(orig, clone) {
    const oC = orig.children, cC = clone.children;
    for (let i = 0, len = Math.min(oC.length, cC.length); i < len; i++) {
      try {
        const cs = window.getComputedStyle(oC[i]);
        if (cs.fontFamily && !cs.fontFamily.startsWith('"Times New Roman"')) cC[i].style.fontFamily = cs.fontFamily;
        if (cs.fontWeight && cs.fontWeight !== '400') cC[i].style.fontWeight = cs.fontWeight;
        if (cs.fontStyle && cs.fontStyle !== 'normal') cC[i].style.fontStyle = cs.fontStyle;
        if (oC[i].children.length > 0) copyComputedFonts(oC[i], cC[i]);
      } catch (_) {}
    }
  }

  function collectFontFaceRules() {
    const r = [];
    try { for (const s of document.styleSheets) {
      try { for (const rule of (s.cssRules || s.rules || [])) {
        if (rule instanceof CSSFontFaceRule) r.push(rule.cssText);
      }} catch (_) {}
    }} catch (_) {}
    return r.join('\n');
  }

  // ── Finestra di stampa ──────────────────────────────────────────
  function preOpenPrintWindow() {
    const pw = window.open('', '_blank', 'width=800,height=1000');
    if (!pw) return null;
    pw.document.open();
    pw.document.write(`<!DOCTYPE html><html><head><title>Preparazione PDF…</title>
<style>body{font-family:sans-serif;margin:0}.ld{display:flex;align-items:center;justify-content:center;height:80vh;flex-direction:column;gap:16px;color:#666;font-size:18px}.ld svg{animation:sp 1s linear infinite}@keyframes sp{to{transform:rotate(360deg)}}</style></head><body><div class="ld">
<svg width="48" height="48" viewBox="0 0 50 50"><circle cx="25" cy="25" r="20" fill="none" stroke="#6c63ff" stroke-width="4" stroke-dasharray="90 60" stroke-linecap="round"/></svg>
<div>Cattura delle pagine in corso…</div>
<div style="font-size:13px;color:#999">Non chiudere questa finestra.</div>
</div></body></html>`);
    pw.document.close();
    return pw;
  }

  function populatePrintWindow(pw, sections, docTitle) {
    if (!pw || pw.closed) throw new Error('La finestra di stampa è stata chiusa.');
    const ff = collectFontFaceRules();
    let body = '';
    sections.forEach((s, i) => {
      if (i > 0) body += '<div class="pdf-edition-separator"></div>';
      body += `<div class="pdf-edition-header">${s.title}</div><div class="pdf-section ${s.modeClass}">${s.html}</div>`;
    });
    pw.document.open();
    pw.document.write(`<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><title>${docTitle}</title><style>${ff}\n${PRINT_CSS}</style></head><body>${body}</body></html>`);
    pw.document.close();
    setTimeout(() => { if (!pw.closed) { pw.focus(); pw.print(); } }, 800);
  }

  // ── Cattura diplomatica + interpretativa ────────────────────────
  async function captureBothEditions(ec, canSwitch, pageLabel) {
    const sections = [];

    if (canSwitch) { const c = ec.getCurrentEdition(); if (!c.includes('diplom')) await ec.switchTo('diplomatic'); }
    await sleep(500);
    sections.push({ title: `Edizione Diplomatica — ${pageLabel}`, html: cloneContent().innerHTML, modeClass: 'diplomatic-mode' });

    if (canSwitch) { const sw = await ec.switchTo('interpretive'); if (!sw) await ec.switchTo('interpretative'); }
    await sleep(500);
    sections.push({ title: `Edizione Interpretativa — ${pageLabel}`, html: cloneContent().innerHTML, modeClass: 'interpretative-mode' });

    return sections;
  }

  // ── Esportazione: pagina corrente ───────────────────────────────
  async function exportCurrentPage(pw) {
    const ec = getEditionController();
    let origEd = null, canSwitch = false;
    if (ec) { origEd = ec.getCurrentEdition(); canSwitch = true; }

    showOverlay('Cattura vista diplomatica…');
    const pageLabel = getCurrentPageLabel();
    const sections = await captureBothEditions(ec, canSwitch, pageLabel);

    if (canSwitch && origEd) await ec.switchTo(origEd);
    hideOverlay();

    const ts = new Date().toISOString().slice(0, 10);
    populatePrintWindow(pw, sections, `${CONFIG.fileNamePrefix}_${pageLabel}_${ts}`);
  }

  // ── Esportazione: range di pagine (per numero assoluto) ─────────
  async function exportPageRange(pw, pageIndex, startAbs, endAbs) {
    const ec = getEditionController();
    let origEd = null, canSwitch = false;
    if (ec) { origEd = ec.getCurrentEdition(); canSwitch = true; }

    // Salva indice della pagina corrente per ripristino
    const origPageLabel = getCurrentPageLabel();
    const origEntry = pageIndex.allPages.find(p => p.label === origPageLabel);

    // Raccogli tutte le pagine nel range [startAbs, endAbs]
    const pagesToExport = [];
    for (const absNum of pageIndex.absNumbers) {
      if (absNum < startAbs) continue;
      if (absNum > endAbs) break;
      const entries = pageIndex.byAbsNum.get(absNum);
      if (entries) pagesToExport.push(...entries);
    }

    if (pagesToExport.length === 0) {
      hideOverlay();
      if (pw && !pw.closed) pw.close();
      alert(`Nessuna pagina trovata nel range ${startAbs}–${endAbs}.`);
      return;
    }

    console.log(`[EVT3 PDF Export] Pagine da esportare: ${pagesToExport.length} (range abs. ${startAbs}–${endAbs})`);

    const allSections = [];
    const total = pagesToExport.length;

    for (let i = 0; i < total; i++) {
      const page = pagesToExport[i];
      const displayLabel = `${page.absNum}/${page.label}`;

      // Naviga direttamente alla pagina tramite dropdown
      updateOverlay(`${i + 1} / ${total}: ${displayLabel} — navigazione…`);
      await goToPageByIndex(page.index);

      // Diplomatica
      updateOverlay(`${i + 1} / ${total}: ${displayLabel} — diplomatica…`);
      if (canSwitch) { const c = ec.getCurrentEdition(); if (!c.includes('diplom')) await ec.switchTo('diplomatic'); }
      await sleep(500);
      allSections.push({ title: `Edizione Diplomatica — ${displayLabel}`, html: cloneContent().innerHTML, modeClass: 'diplomatic-mode' });

      // Interpretativa
      updateOverlay(`${i + 1} / ${total}: ${displayLabel} — interpretativa…`);
      if (canSwitch) { const sw = await ec.switchTo('interpretive'); if (!sw) await ec.switchTo('interpretative'); }
      await sleep(500);
      allSections.push({ title: `Edizione Interpretativa — ${displayLabel}`, html: cloneContent().innerHTML, modeClass: 'interpretative-mode' });
    }

    // Ripristina pagina ed edizione originali
    updateOverlay('Ripristino…');
    if (origEntry) await goToPageByIndex(origEntry.index);
    if (canSwitch && origEd) await ec.switchTo(origEd);
    hideOverlay();

    const ts = new Date().toISOString().slice(0, 10);
    populatePrintWindow(pw, allSections, `${CONFIG.fileNamePrefix}_pp${startAbs}-${endAbs}_${ts}`);
    console.log(`[EVT3 PDF Export] Esportate ${pagesToExport.length} pagine (abs. ${startAbs}–${endAbs}).`);
  }

  // ── Overlay UI ──────────────────────────────────────────────────
  function showOverlay(msg) {
    let ov = document.getElementById('pdf-export-overlay');
    if (!ov) {
      ov = document.createElement('div'); ov.id = 'pdf-export-overlay';
      ov.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;';
      const box = document.createElement('div'); box.id = 'pdf-export-overlay-box';
      box.style.cssText = 'background:white;padding:24px 40px;border-radius:8px;font-family:sans-serif;font-size:15px;color:#333;box-shadow:0 4px 20px rgba(0,0,0,0.3);text-align:center;max-width:420px;';
      ov.appendChild(box); document.body.appendChild(ov);
    }
    document.getElementById('pdf-export-overlay-box').innerHTML = `<div style="margin-bottom:12px"><svg width="40" height="40" viewBox="0 0 50 50" style="animation:spin 1s linear infinite"><circle cx="25" cy="25" r="20" fill="none" stroke="#6c63ff" stroke-width="4" stroke-dasharray="90 60" stroke-linecap="round"/></svg></div><div>${msg}</div>`;
    if (!document.getElementById('pdf-export-spin-style')) { const s = document.createElement('style'); s.id = 'pdf-export-spin-style'; s.textContent = '@keyframes spin{to{transform:rotate(360deg)}}'; document.head.appendChild(s); }
  }
  function updateOverlay(msg) { const b = document.getElementById('pdf-export-overlay-box'); if (b) b.querySelector('div:last-child').textContent = msg; }
  function hideOverlay() { const o = document.getElementById('pdf-export-overlay'); if (o) o.remove(); }

  // ── Dialogo range ───────────────────────────────────────────────
  function showRangeDialog(pageIndex) {
    return new Promise((resolve) => {
      const old = document.getElementById('pdf-range-dialog');
      if (old) old.remove();

      const absNums = pageIndex.absNumbers;
      const minAbs = absNums[0];
      const maxAbs = absNums[absNums.length - 1];
      const totalPages = pageIndex.allPages.length;

      const backdrop = document.createElement('div');
      backdrop.id = 'pdf-range-dialog';
      backdrop.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.45);z-index:100000;display:flex;align-items:center;justify-content:center;';

      const dialog = document.createElement('div');
      dialog.style.cssText = 'background:#f5ead4;border:1px solid #ccc;border-radius:8px;padding:24px 28px;box-shadow:0 8px 30px rgba(0,0,0,0.25);font-family:inherit;font-size:0.9rem;color:#50433b;min-width:300px;max-width:360px;';
      dialog.innerHTML = `
        <div style="font-weight:600;font-size:1rem;margin-bottom:6px;">Range di pagine</div>
        <div style="font-size:0.8rem;color:#888;margin-bottom:4px;">
          Inserisci i numeri assoluti di pagina (dal xml:id).
        </div>
        <div style="font-size:0.8rem;color:#888;margin-bottom:14px;">
          Pagine disponibili: ${totalPages} fogli (abs. ${minAbs}–${maxAbs})
        </div>
        <div style="display:flex;gap:12px;margin-bottom:16px;">
          <div style="flex:1;">
            <label style="display:block;font-size:0.78rem;font-weight:500;margin-bottom:4px;">Da (abs.)</label>
            <input id="pdf-range-start" type="number" min="${minAbs}" max="${maxAbs}" value="${minAbs}" style="width:100%;padding:6px 10px;border:1px solid #ccc;border-radius:4px;font-size:0.9rem;font-family:inherit;background:#fff;color:#333;outline:none;" />
          </div>
          <div style="flex:1;">
            <label style="display:block;font-size:0.78rem;font-weight:500;margin-bottom:4px;">A (abs.)</label>
            <input id="pdf-range-end" type="number" min="${minAbs}" max="${maxAbs}" value="${maxAbs}" style="width:100%;padding:6px 10px;border:1px solid #ccc;border-radius:4px;font-size:0.9rem;font-family:inherit;background:#fff;color:#333;outline:none;" />
          </div>
        </div>
        <div id="pdf-range-info" style="font-size:0.78rem;color:#666;margin-bottom:10px;"></div>
        <div id="pdf-range-error" style="color:#dc3545;font-size:0.78rem;margin-bottom:10px;display:none;"></div>
        <div style="display:flex;gap:10px;justify-content:flex-end;">
          <button id="pdf-range-cancel" type="button" style="padding:7px 16px;border:1px solid #ccc;border-radius:4px;background:#fff;color:#50433b;font-size:0.85rem;cursor:pointer;font-family:inherit;">Annulla</button>
          <button id="pdf-range-confirm" type="button" style="padding:7px 16px;border:1px solid #8b7355;border-radius:4px;background:#8b7355;color:#fff;font-size:0.85rem;cursor:pointer;font-family:inherit;font-weight:500;">Esporta</button>
        </div>
      `;
      backdrop.appendChild(dialog);
      document.body.appendChild(backdrop);

      const startInput = document.getElementById('pdf-range-start');
      const endInput = document.getElementById('pdf-range-end');
      const errorEl = document.getElementById('pdf-range-error');
      const infoEl = document.getElementById('pdf-range-info');
      const cancelBtn = document.getElementById('pdf-range-cancel');
      const confirmBtn = document.getElementById('pdf-range-confirm');

      startInput.focus();
      startInput.select();

      function cleanup() { backdrop.remove(); }

      // Mostra il conteggio dei fogli nel range selezionato
      function updateInfo() {
        const s = parseInt(startInput.value, 10);
        const e = parseInt(endInput.value, 10);
        errorEl.style.display = 'none';
        if (isNaN(s) || isNaN(e) || s > e) { infoEl.textContent = ''; return; }
        let count = 0;
        for (const a of absNums) { if (a >= s && a <= e) count += pageIndex.byAbsNum.get(a).length; }
        infoEl.textContent = count > 0 ? `${count} fogli da esportare` : 'Nessun foglio in questo range';
      }

      startInput.addEventListener('input', updateInfo);
      endInput.addEventListener('input', updateInfo);
      updateInfo();

      function validate() {
        const s = parseInt(startInput.value, 10);
        const e = parseInt(endInput.value, 10);
        errorEl.style.display = 'none';
        if (isNaN(s) || isNaN(e)) { errorEl.textContent = 'Inserisci numeri validi.'; errorEl.style.display = 'block'; return null; }
        if (s < minAbs) { errorEl.textContent = `Il minimo è ${minAbs}.`; errorEl.style.display = 'block'; return null; }
        if (e < s) { errorEl.textContent = 'Il valore finale deve essere ≥ l\'iniziale.'; errorEl.style.display = 'block'; return null; }
        return { start: s, end: e };
      }

      cancelBtn.addEventListener('click', () => { cleanup(); resolve(null); });
      backdrop.addEventListener('click', (e) => { if (e.target === backdrop) { cleanup(); resolve(null); } });
      confirmBtn.addEventListener('click', () => { const r = validate(); if (r) { cleanup(); resolve(r); } });

      function onKey(e) { if (e.key === 'Enter') confirmBtn.click(); if (e.key === 'Escape') cancelBtn.click(); }
      startInput.addEventListener('keydown', onKey);
      endInput.addEventListener('keydown', onKey);

      cancelBtn.addEventListener('mouseenter', () => { cancelBtn.style.background = '#f0f0f0'; });
      cancelBtn.addEventListener('mouseleave', () => { cancelBtn.style.background = '#fff'; });
      confirmBtn.addEventListener('mouseenter', () => { confirmBtn.style.background = '#735e43'; });
      confirmBtn.addEventListener('mouseleave', () => { confirmBtn.style.background = '#8b7355'; });
    });
  }

  // ── Pulsante e menu ─────────────────────────────────────────────
  // Cache dei dati pagine (calcolata una volta sola)
  let cachedPageIndex = null;

  function getPageIndex() {
    if (cachedPageIndex) return cachedPageIndex;
    const angularPages = getAngularPageData();
    if (!angularPages || angularPages.length === 0) return null;
    cachedPageIndex = buildPageIndex(angularPages);
    console.log(`[EVT3 PDF Export] Indice pagine: ${cachedPageIndex.allPages.length} fogli, abs. ${cachedPageIndex.absNumbers[0]}–${cachedPageIndex.absNumbers[cachedPageIndex.absNumbers.length - 1]}`);
    return cachedPageIndex;
  }

  function closeDropdown() { const m = document.getElementById('pdf-export-dropdown'); if (m) m.style.display = 'none'; }

  function createExportButton() {
    if (document.getElementById('evt3-pdf-export-btn')) return;
    const footer = document.querySelector(CONFIG.footerSelector);
    if (!footer) { setTimeout(createExportButton, 2000); return; }

    const wrapper = document.createElement('div');
    wrapper.className = 'd-inline-block';
    wrapper.style.cssText = 'margin-left:4px;position:relative;';

    const btn = document.createElement('button');
    btn.id = 'evt3-pdf-export-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Export PDF');
    btn.setAttribute('aria-haspopup', 'true');
    btn.setAttribute('aria-expanded', 'false');
    btn.title = 'Esporta in PDF';
    btn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width="14" height="14" fill="currentColor"><path d="M64 0C28.7 0 0 28.7 0 64V448c0 35.3 28.7 64 64 64H320c35.3 0 64-28.7 64-64V160H256c-17.7 0-32-14.3-32-32V0H64zM256 0V128H384L256 0zM112 256H272c8.8 0 16 7.2 16 16s-7.2 16-16 16H112c-8.8 0-16-7.2-16-16s7.2-16 16-16zm0 64H272c8.8 0 16 7.2 16 16s-7.2 16-16 16H112c-8.8 0-16-7.2-16-16s7.2-16 16-16zm0 64H272c8.8 0 16 7.2 16 16s-7.2 16-16 16H112c-8.8 0-16-7.2-16-16s7.2-16 16-16z"/></svg>
      <span>PDF</span>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" width="8" height="8" fill="currentColor" style="margin-left:4px;opacity:0.7;"><path d="M2 4l4 4 4-4z"/></svg>
    `;

    const dropdown = document.createElement('div');
    dropdown.id = 'pdf-export-dropdown';
    dropdown.style.cssText = 'display:none;position:absolute;bottom:calc(100% + 6px);left:0;z-index:10001;min-width:210px;background:#f5ead4;border:1px solid #ccc;border-radius:4px;box-shadow:0 4px 12px rgba(0,0,0,0.15);overflow:hidden;font-family:inherit;font-size:0.815rem;';

    const optCSS = 'padding:8px 14px;cursor:pointer;color:#50433b;transition:background 0.1s ease;';

    // Pagina corrente
    const opt1 = document.createElement('div');
    opt1.textContent = 'Pagina corrente';
    opt1.style.cssText = optCSS + 'border-bottom:1px solid #e6dcc8;';
    opt1.addEventListener('mouseenter', () => { opt1.style.background = '#efe3c9'; });
    opt1.addEventListener('mouseleave', () => { opt1.style.background = 'none'; });
    opt1.addEventListener('click', async () => {
      closeDropdown(); btn.setAttribute('aria-expanded', 'false');
      const pw = preOpenPrintWindow();
      if (!pw) { alert('Popup bloccato. Consenti i popup per questo sito.'); return; }
      btn.disabled = true; btn.style.opacity = '0.6';
      try { await exportCurrentPage(pw); }
      catch (err) { hideOverlay(); if (pw && !pw.closed) pw.close(); alert("Errore:\n" + err.message); }
      finally { btn.disabled = false; btn.style.opacity = '1'; }
    });

    // Range di pagine
    const opt2 = document.createElement('div');
    opt2.textContent = 'Range di pagine…';
    opt2.style.cssText = optCSS;
    opt2.addEventListener('mouseenter', () => { opt2.style.background = '#efe3c9'; });
    opt2.addEventListener('mouseleave', () => { opt2.style.background = 'none'; });
    opt2.addEventListener('click', async () => {
      closeDropdown(); btn.setAttribute('aria-expanded', 'false');

      const pageIndex = getPageIndex();
      if (!pageIndex) { alert('Dati pagine non disponibili.\nVerifica che il selettore pagina sia visibile.'); return; }

      const range = await showRangeDialog(pageIndex);
      if (!range) return;

      const pw = preOpenPrintWindow();
      if (!pw) { alert('Popup bloccato. Consenti i popup per questo sito.'); return; }

      btn.disabled = true; btn.style.opacity = '0.6';
      showOverlay('Avvio esportazione…');
      try { await exportPageRange(pw, pageIndex, range.start, range.end); }
      catch (err) { hideOverlay(); if (pw && !pw.closed) pw.close(); alert("Errore:\n" + err.message); }
      finally { btn.disabled = false; btn.style.opacity = '1'; }
    });

    dropdown.appendChild(opt1);
    dropdown.appendChild(opt2);

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = dropdown.style.display === 'block';
      dropdown.style.display = isOpen ? 'none' : 'block';
      btn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    });

    document.addEventListener('click', (e) => {
      if (!wrapper.contains(e.target)) { closeDropdown(); btn.setAttribute('aria-expanded', 'false'); }
    });

    wrapper.appendChild(btn);
    wrapper.appendChild(dropdown);
    footer.appendChild(wrapper);
    console.log('[EVT3 PDF Export] Pulsante con menu aggiunto.');
  }

  // ── Inizializzazione ────────────────────────────────────────────
  function init() {
    createExportButton();
    new MutationObserver(() => {
      if (!document.getElementById('evt3-pdf-export-btn')) createExportButton();
    }).observe(document.body, { childList: true, subtree: true });
    console.log('[EVT3 PDF Export] Script v8 inizializzato.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
