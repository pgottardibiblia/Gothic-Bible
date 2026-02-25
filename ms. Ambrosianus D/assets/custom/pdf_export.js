/**
 * PDF Export
 *
 * Esporta il contenuto del pannello EVT3 come PDF con testo selezionabile,
 * preservando le differenze tra diplomatica e interpretativa, e tutti gli attributi rend.
 *
 * Funzionamento:
 *   1. Clona il div .panel-content.content.card-content.edition-font.p-4
 *   2. Per ogni edizione, switcha la vista e clona il DOM risultante
 *   3. Avvolge ogni sezione in un div con classe diplomatic-mode /
 *      interpretative-mode (replica il ruolo di body.X-mode del CSS)
 *   4. Apre una finestra di stampa → "Salva come PDF" = testo selezionabile
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
    fileNamePrefix: 'EVT3_export',
  };

  // ── CSS completo per la stampa ──────────────────────────────────
  // Incorpora tutte le regole da custom-styles-updated.css.
  // I selettori "body.X-mode" sono riscritti come ".pdf-section.X-mode"
  // per consentire la coesistenza di entrambe le edizioni nello stesso documento.
  const PRINT_CSS = `
    /* ══════════════════════════════════════════════════════════════
       @page e base
       ══════════════════════════════════════════════════════════════ */
    @page {
      size: A4;
      margin: 15mm;
    }

    * { box-sizing: border-box; }

    body {
      font-family: "Junicode", "Times New Roman", "DejaVu Serif", serif;
      font-size: 12pt;
      line-height: 1.5;
      color: #000;
      background: #fff;
      margin: 0;
      padding: 0;
    }

    /* ══════════════════════════════════════════════════════════════
       Intestazione e separatore edizioni
       ══════════════════════════════════════════════════════════════ */
    .pdf-edition-header {
      text-align: center;
      font-size: 14pt;
      font-weight: bold;
      padding: 8px 0 12px;
      margin-bottom: 12px;
      border-bottom: 1px solid #666;
    }

    .pdf-edition-separator {
      page-break-before: always;
    }

    /* ══════════════════════════════════════════════════════════════
       Layout sezione edizione
       ══════════════════════════════════════════════════════════════ */
    .pdf-section {
      /* Padding laterale per fare spazio ai margini flottanti */
      padding: 0 65px;
      position: relative;
    }

    /* ══════════════════════════════════════════════════════════════
       Attributi rend generici
       ══════════════════════════════════════════════════════════════ */
    .ab[rend="align-center"] {
      display: block;
      text-align: center;
    }

    *[rend="strikethrough"] { text-decoration: line-through; }
    *[rend="overwritten"]   { font-weight: bold; }
    *[rend="underline"]     { text-decoration: underline; }
    *[rend="italic"]        { font-style: italic; }
    *[rend="cross"]         { text-decoration: line-through; }

    *[rend="erasure"] {
      background-color: rgb(70, 70, 70);
      color: rgb(70, 70, 70);
    }

    *[rend="gold_ink"] {
      color: rgb(184, 134, 11);
      font-weight: bold;
    }

    *[rend="line_full_width"] {
      margin-bottom: 0.1rem;
      border-bottom: 1px solid black;
      display: block;
    }

    *[rend="sup"]             { vertical-align: text-bottom; }
    *[place="superscript"]    { vertical-align: text-bottom; }

    .metamark[rend="line"] {
      display: block;
      border: 1px solid black;
      margin-top: -1em;
      margin-right: 70%;
    }

    .fw { display: block; }

    [type="pageNum"][place="top_right"] {
      float: right;
      margin-top: -1.5rem;
    }

    .ex { font-style: normal; }

    evt-reading evt-note,
    evt-addition evt-note {
      display: none;
    }

    evt-addition > span.add > evt-content-viewer + evt-content-viewer {
      margin-left: 0.3em;
    }

    evt-addition > span.add[data-place="margin_left"] > evt-content-viewer {
      display: block;
      margin-left: -3.5em;
    }

    /* ══════════════════════════════════════════════════════════════
       Modalità DIPLOMATICA  (.pdf-section.diplomatic-mode ...)
       ══════════════════════════════════════════════════════════════ */
    .pdf-section.diplomatic-mode evt-word[rend="silver_ink"] *[class~="unclear"] {
      color: rgb(120, 120, 120);
    }

    .pdf-section.diplomatic-mode evt-word[rend="gold_ink"] *[class~="unclear"] {
      color: rgb(184, 164, 11);
    }

    .pdf-section.diplomatic-mode evt-content-viewer.seg:has([data-type="corresp-text"]) {
      display: none !important;
    }

    /* ══════════════════════════════════════════════════════════════
       Modalità INTERPRETATIVA  (.pdf-section.interpretative-mode ...)
       ══════════════════════════════════════════════════════════════ */
    .pdf-section.interpretative-mode evt-word *[class~="unclear"] {
      border-bottom: 1px dotted rgba(0, 0, 0, 0.5);
      padding-bottom: 1px;
    }

    .pdf-section.interpretative-mode evt-content-viewer *[class~="gap"] {
      display: none !important;
    }

    .pdf-section.interpretative-mode evt-generic-element *[class~="num"] span {
      display: none !important;
    }

    .pdf-section.interpretative-mode evt-generic-element *[class~="num"] evt-content-viewer:first-of-type::before {
      content: attr(data-value);
    }

    .pdf-section.interpretative-mode *[data-id*="seg_2"] {
      display: none !important;
    }

    .pdf-section.interpretative-mode evt-content-viewer[class~="seg-primary"][class~="seg-hidden"]::after {
      content: "-";
    }

    .pdf-section.interpretative-mode evt-content-viewer[data-corresp-text="..."]:not(:has(evt-generic-element[type="corresp-text"])):not(:has([data-type="corresp-text"]))::after {
      content: " | ";
    }

    .pdf-section.interpretative-mode evt-generic-element[type="chapter"]::before {
      content: attr(n);
      font-weight: bold;
      font-size: 1.4em;
      color: #dc3545;
      margin-right: 0.5em;
      display: inline-block;
    }

    .pdf-section.interpretative-mode evt-generic-element[type="chapter"]:has(*[type="header"])::before {
      content: none !important;
    }

    .pdf-section.interpretative-mode evt-generic-element[type="verse"]::before {
      content: attr(n);
      vertical-align: super;
      font-size: 0.7em;
      color: #999;
      margin-right: 0.3em;
    }

    .pdf-section.interpretative-mode evt-generic-element[type="verse"]:has(*[type="header"])::before {
      content: none !important;
    }

    /* ══════════════════════════════════════════════════════════════
       Elementi marginali
       ══════════════════════════════════════════════════════════════ */
    *[place="margin_left"] {
      float: left;
      margin-left: -55px;
      max-width: 175px;
      overflow-wrap: anywhere;
      word-break: break-all;
    }

    *[place="margin_left"] evt-generic-element.w {
      margin-right: 0.3em;
    }

    evt-addition[place="margin_right"] *[data-edition="diplomatic"] {
      float: right;
      margin-right: -45px;
      max-width: 125px;
      overflow-wrap: anywhere;
      word-break: break-word;
    }

    evt-addition[place="margin_right"] evt-generic-element.w {
      margin-right: 0.3em;
    }

    evt-note {
      display: inline-block;
      margin-left: 20px;
    }

    /* ══════════════════════════════════════════════════════════════
       Tabelle Eusebiane (Eusebian Canons)
       ══════════════════════════════════════════════════════════════ */
    evt-generic-element[type="eusebian_canons"] {
      margin: 0.5rem 0;
      padding: 2rem;
      background-color: #faf8f3;
      border: 2px solid #8b7355;
      border-radius: 4px;
      display: block;
      page-break-inside: avoid;
    }

    evt-generic-element[type="eusebian_canons"] > evt-content-viewer {
      display: block;
      margin: 0;
      padding: 0;
    }

    evt-generic-element[type="eusebian_canons"] > evt-content-viewer:empty,
    evt-generic-element[type="eusebian_canons"] > evt-content-viewer:not(:has(evt-generic-element)) {
      display: none;
    }

    evt-generic-element.row {
      display: grid;
      grid-template-columns: auto auto auto auto;
      grid-auto-rows: auto;
      gap: 0.5rem;
      padding: 0;
      margin: 0 0 0.5rem 0;
    }

    evt-generic-element.row:last-of-type {
      margin-bottom: 0;
    }

    evt-generic-element.row[n="1"] {
      padding-bottom: 0.5rem;
      border-bottom: 1px solid #8b7355;
      margin-bottom: 0.75rem;
      font-weight: 600;
    }

    evt-generic-element.row > evt-content-viewer {
      text-align: center;
      padding: 0;
      white-space: nowrap;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    evt-generic-element.row > evt-content-viewer:empty,
    evt-generic-element.row > evt-content-viewer:not(:has(evt-word)):not(:has(evt-generic-element)) {
      display: none;
    }

    evt-generic-element.row:empty {
      display: none;
    }

    /* ══════════════════════════════════════════════════════════════
       Tabelle HTML standard (se presenti)
       ══════════════════════════════════════════════════════════════ */
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 8px 0;
      page-break-inside: avoid;
    }
    th, td {
      border: 1px solid #999;
      padding: 4px 8px;
      text-align: left;
      vertical-align: top;
    }
    th {
      background-color: #eee;
      font-weight: bold;
    }

    /* ══════════════════════════════════════════════════════════════
       Elementi EVT3 generici
       ══════════════════════════════════════════════════════════════ */
    evt-generic-element { display: inline; }

    .lineN {
      color: #888;
      font-size: 9pt;
      margin-right: 6px;
    }

    /* Nascondere widget UI in stampa */
    button, .btn, [role="button"],
    .toolbar, .navbar, nav,
    .ng-select, ng-select,
    .modal, .tooltip, .popover,
    .scroll-to-top,
    .pdf-export-no-print,
    #image-folder-selector,
    .evt-verse-nav {
      display: none !important;
    }

    a { color: #000; text-decoration: none; }
    img { max-width: 100%; height: auto; }

    p, div.text-line, .verse-line {
      margin: 2px 0;
    }

    /* Stampa: tabelle Eusebiane sfondo bianco */
    @media print {
      evt-generic-element[type="eusebian_canons"] {
        background-color: white;
        border-color: black;
      }
    }
  `;

  // ── Utility ─────────────────────────────────────────────────────
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
            element: sel,
            getCurrentEdition() {
              const val = sel.querySelector('.ng-value');
              return val ? val.textContent.trim().toLowerCase() : '';
            },
            async switchTo(targetEdition) {
              const input = sel.querySelector('.ng-select-container');
              if (input) input.click();
              await sleep(300);
              const options = document.querySelectorAll('.ng-dropdown-panel .ng-option');
              for (const opt of options) {
                if (opt.textContent.trim().toLowerCase().includes(targetEdition)) {
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

    const buttons = document.querySelectorAll('button, [role="tab"]');
    const editionButtons = {};
    for (const btn of buttons) {
      const text = btn.textContent.trim().toLowerCase();
      if (text.includes('diplom')) editionButtons.diplomatic = btn;
      if (text.includes('interpr')) editionButtons.interpretive = btn;
    }
    if (Object.keys(editionButtons).length > 0) {
      return {
        element: null,
        getCurrentEdition() {
          for (const [key, btn] of Object.entries(editionButtons)) {
            if (btn.classList.contains('active') || btn.classList.contains('btn-primary') ||
                btn.getAttribute('aria-selected') === 'true') {
              return key;
            }
          }
          return 'diplomatic';
        },
        async switchTo(targetEdition) {
          const btn = editionButtons[targetEdition];
          if (btn) {
            btn.click();
            await sleep(CONFIG.renderDelay);
            return true;
          }
          return false;
        },
      };
    }
    return null;
  }

  // ── Clonazione contenuto ────────────────────────────────────────
  function cloneContent() {
    const content = document.querySelector(CONFIG.contentSelector);
    if (!content) {
      throw new Error(
        `Elemento contenuto non trovato: ${CONFIG.contentSelector}\n` +
        `Verifica che il pannello sia visibile nella pagina.`
      );
    }

    const clone = content.cloneNode(true);

    // Rimuovi widget UI residui
    clone.querySelectorAll(
      'ng-select, .ng-select, [ng-reflect-model], ' +
      '#image-folder-selector, .evt-verse-nav'
    ).forEach(el => el.remove());

    // Preserva font custom
    copyComputedFonts(content, clone);

    return clone;
  }

  function copyComputedFonts(original, clone) {
    const origChildren = original.children;
    const cloneChildren = clone.children;
    const len = Math.min(origChildren.length, cloneChildren.length);

    for (let i = 0; i < len; i++) {
      try {
        const computed = window.getComputedStyle(origChildren[i]);
        const fontFamily = computed.fontFamily;

        if (fontFamily && !fontFamily.startsWith('"Times New Roman"')) {
          cloneChildren[i].style.fontFamily = fontFamily;
        }
        if (computed.fontWeight && computed.fontWeight !== '400') {
          cloneChildren[i].style.fontWeight = computed.fontWeight;
        }
        if (computed.fontStyle && computed.fontStyle !== 'normal') {
          cloneChildren[i].style.fontStyle = computed.fontStyle;
        }

        if (origChildren[i].children.length > 0) {
          copyComputedFonts(origChildren[i], cloneChildren[i]);
        }
      } catch (_e) { /* skip inaccessible elements */ }
    }
  }

  // ── Raccolta @font-face ─────────────────────────────────────────
  function collectFontFaceRules() {
    const fontRules = [];
    try {
      for (const sheet of document.styleSheets) {
        try {
          const rules = sheet.cssRules || sheet.rules;
          if (!rules) continue;
          for (const rule of rules) {
            if (rule instanceof CSSFontFaceRule) {
              fontRules.push(rule.cssText);
            }
          }
        } catch (_e) { /* cross-origin */ }
      }
    } catch (_e) { /* no access */ }
    return fontRules.join('\n');
  }

  // ── Finestra di stampa ──────────────────────────────────────────
  function openPrintWindow(sections) {
    const fontFaces = collectFontFaceRules();

    // Costruisci il body: ogni sezione è avvolta in un div
    // con classe .pdf-section + .diplomatic-mode/.interpretative-mode
    // così i selettori CSS funzionano senza dover cambiare classe al body
    let bodyHTML = '';
    sections.forEach((section, index) => {
      if (index > 0) {
        bodyHTML += '<div class="pdf-edition-separator"></div>';
      }
      bodyHTML += `
        <div class="pdf-edition-header">${section.title}</div>
        <div class="pdf-section ${section.modeClass}">
          ${section.html}
        </div>
      `;
    });

    const fullHTML = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>${CONFIG.fileNamePrefix}</title>
  <style>
/* ── Font-face dalla pagina originale ── */
${fontFaces}

/* ── Stili di stampa ── */
${PRINT_CSS}
  </style>
</head>
<body>
  ${bodyHTML}
</body>
</html>`;

    const printWin = window.open('', '_blank', 'width=800,height=1000');
    if (!printWin) {
      throw new Error(
        'Impossibile aprire la finestra di stampa.\n' +
        'Verifica che il browser non blocchi i popup per questo sito.'
      );
    }

    printWin.document.open();
    printWin.document.write(fullHTML);
    printWin.document.close();

    // Attendi caricamento font, poi apri dialog di stampa
    printWin.onload = () => {
      setTimeout(() => {
        printWin.focus();
        printWin.print();
      }, 600);
    };
  }

  // ── Flusso principale ───────────────────────────────────────────
  async function generatePDF() {
    const editionCtrl = getEditionController();
    let originalEdition = null;
    let canSwitchEditions = false;

    if (editionCtrl) {
      originalEdition = editionCtrl.getCurrentEdition();
      canSwitchEditions = true;
    }

    // Nome pagina corrente
    const pbEl =
      document.querySelector('evt-generic-element.pb[data-id]') ||
      document.querySelector('[class*="pb"]');
    const pageId = pbEl ? pbEl.getAttribute('data-id') || pbEl.getAttribute('n') || '' : '';
    const pageLabel = pageId.replace(/^CArg_pb_\d+_/, '') || 'page';

    const sections = [];

    // ── 1. Diplomatica ──
    showOverlay('Cattura vista diplomatica…');

    if (canSwitchEditions) {
      const current = editionCtrl.getCurrentEdition();
      if (!current.includes('diplom')) {
        await editionCtrl.switchTo('diplomatic');
      }
    }
    await sleep(500);

    const diplClone = cloneContent();
    sections.push({
      title: `Edizione Diplomatica — ${pageLabel}`,
      html: diplClone.innerHTML,
      modeClass: 'diplomatic-mode',
    });

    // ── 2. Interpretativa ──
    updateOverlay('Cattura vista interpretativa…');

    if (canSwitchEditions) {
      const switched = await editionCtrl.switchTo('interpretive');
      if (!switched) {
        await editionCtrl.switchTo('interpretative');
      }
    }
    await sleep(500);

    const interpClone = cloneContent();
    sections.push({
      title: `Edizione Interpretativa — ${pageLabel}`,
      html: interpClone.innerHTML,
      modeClass: 'interpretative-mode',
    });

    // ── Ripristina stato originale ──
    updateOverlay('Preparazione stampa…');
    if (canSwitchEditions && originalEdition) {
      await editionCtrl.switchTo(originalEdition);
    }

    hideOverlay();
    openPrintWindow(sections);

    console.log(`[EVT3 PDF Export] Finestra di stampa aperta per: ${pageLabel}`);
  }

  // ── Overlay UI ──────────────────────────────────────────────────
  function showOverlay(message) {
    let overlay = document.getElementById('pdf-export-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'pdf-export-overlay';
      overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); z-index: 99999;
        display: flex; align-items: center; justify-content: center;
      `;
      const box = document.createElement('div');
      box.id = 'pdf-export-overlay-box';
      box.style.cssText = `
        background: white; padding: 24px 40px; border-radius: 8px;
        font-family: sans-serif; font-size: 15px; color: #333;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3); text-align: center;
      `;
      overlay.appendChild(box);
      document.body.appendChild(overlay);
    }
    const box = document.getElementById('pdf-export-overlay-box');
    box.innerHTML = `
      <div style="margin-bottom:12px">
        <svg width="40" height="40" viewBox="0 0 50 50" style="animation: spin 1s linear infinite">
          <circle cx="25" cy="25" r="20" fill="none" stroke="#6c63ff" stroke-width="4"
                  stroke-dasharray="90 60" stroke-linecap="round"/>
        </svg>
      </div>
      <div>${message}</div>
    `;
    if (!document.getElementById('pdf-export-spin-style')) {
      const spinStyle = document.createElement('style');
      spinStyle.id = 'pdf-export-spin-style';
      spinStyle.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
      document.head.appendChild(spinStyle);
    }
  }

  function updateOverlay(message) {
    const box = document.getElementById('pdf-export-overlay-box');
    if (box) box.querySelector('div:last-child').textContent = message;
  }

  function hideOverlay() {
    const overlay = document.getElementById('pdf-export-overlay');
    if (overlay) overlay.remove();
  }

  // ── Pulsante ────────────────────────────────────────────────────
  function createExportButton() {
    if (document.getElementById('evt3-pdf-export-btn')) return;

    const footer = document.querySelector(CONFIG.footerSelector);
    if (!footer) {
      console.warn('[EVT3 PDF Export] Footer non trovato. Riprovo tra 2s…');
      setTimeout(createExportButton, 2000);
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'd-inline-block';
    wrapper.style.marginLeft = '4px';

    const btn = document.createElement('button');
    btn.id = 'evt3-pdf-export-btn';
    btn.type = 'button';
    btn.className = 'btn btn-sm d-flex align-items-center me-1 btn-light shadow-sm';
    btn.setAttribute('aria-label', 'Export PDF');
    btn.title = 'Esporta pagina in PDF (Diplomatica + Interpretativa)';
    btn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"
           width="14" height="14" fill="currentColor" style="margin-right:5px">
        <path d="M64 0C28.7 0 0 28.7 0 64V448c0 35.3 28.7 64 64 64H320c35.3 0
        64-28.7 64-64V160H256c-17.7 0-32-14.3-32-32V0H64zM256 0V128H384L256
        0zM112 256H272c8.8 0 16 7.2 16 16s-7.2 16-16 16H112c-8.8 0-16-7.2-16-16s7.2-16
        16-16zm0 64H272c8.8 0 16 7.2 16 16s-7.2 16-16 16H112c-8.8 0-16-7.2-16-16s7.2-16
        16-16zm0 64H272c8.8 0 16 7.2 16 16s-7.2 16-16 16H112c-8.8 0-16-7.2-16-16s7.2-16
        16-16z"/>
      </svg>
      PDF
    `;

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.style.opacity = '0.6';
      try {
        await generatePDF();
      } catch (err) {
        hideOverlay();
        console.error('[EVT3 PDF Export] Errore:', err);
        alert("Errore durante l'esportazione PDF:\n" + err.message);
      } finally {
        btn.disabled = false;
        btn.style.opacity = '1';
      }
    });

    wrapper.appendChild(btn);
    footer.appendChild(wrapper);
    console.log('[EVT3 PDF Export] Pulsante aggiunto con successo.');
  }

  // ── Inizializzazione ────────────────────────────────────────────
  function init() {
    createExportButton();
    const observer = new MutationObserver(() => {
      if (!document.getElementById('evt3-pdf-export-btn')) {
        createExportButton();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    console.log('[EVT3 PDF Export] Script v3 inizializzato. Observer attivo.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
