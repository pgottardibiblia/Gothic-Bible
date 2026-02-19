(function () {
  'use strict';

  // ── Configuration ──────────────────────────────────────────────────
  const TEI_XML_PATH = 'assets/data/CGis_Lc_TEI.xml'; // <-- CHANGE IF NEEDED
  const TEI_NS = 'http://www.tei-c.org/ns/1.0';
  const XI_NS  = 'http://www.w3.org/2001/XInclude';
  const XML_NS = 'http://www.w3.org/XML/1998/namespace';

  const POLL_INTERVAL = 500;
  const MAX_POLLS = 30;

  // Book display names (abbreviation → full name)
  const BOOK_NAMES = {
    'Mt': 'Matthew (Mt)',
    'Mc': 'Mark (Mc)',
    'Lc': 'Luke (Lc)',
    'Gv': 'John (Gv)',
    'Ne': 'Nehemiah (Ne)',
    'Rm': 'Romans (Rm)',
  };

  // ── Helpers ────────────────────────────────────────────────────────

  function getXmlId(el) {
    return el.getAttributeNS(XML_NS, 'id')
        || el.getAttribute('xml:id')
        || null;
  }

  /**
   * Parse "CArg_Mt_5_verse_15" → { sigla: "CArg", book: "Mt", chapter: "5", verse: "15" }
   */
  function parseVerseId(xmlId) {
    const m = xmlId.match(/^([A-Za-z]+)_([A-Za-z]+)_(\d+)_verse_(\d+)$/);
    if (!m) return null;
    return { sigla: m[1], book: m[2], chapter: m[3], verse: m[4] };
  }

  function verseIdToLabel(xmlId) {
    const p = parseVerseId(xmlId);
    if (p) return `${p.book}, ${p.chapter}:${p.verse}`;
    return xmlId.replace(/_/g, ' ');
  }

  function findPageForVerse(abEl) {
    // Check for <pb> inside this <ab>
    const innerPbs = abEl.getElementsByTagNameNS(TEI_NS, 'pb');
    if (innerPbs.length > 0) {
      const pb = innerPbs[0];
      return { pageN: pb.getAttribute('n'), pageId: getXmlId(pb) };
    }
    // Walk backwards through siblings / parents
    let node = abEl;
    while (node) {
      let prev = node.previousElementSibling;
      while (prev) {
        if (prev.localName === 'pb' &&
            (prev.namespaceURI === TEI_NS || !prev.namespaceURI)) {
          return { pageN: prev.getAttribute('n'), pageId: getXmlId(prev) };
        }
        const pbs = prev.getElementsByTagNameNS(TEI_NS, 'pb');
        if (pbs.length > 0) {
          const last = pbs[pbs.length - 1];
          return { pageN: last.getAttribute('n'), pageId: getXmlId(last) };
        }
        prev = prev.previousElementSibling;
      }
      node = node.parentElement;
    }
    return null;
  }

  /**
   * Extract verses from a parsed XML document.
   */
  function extractVerses(xmlDoc) {
    const verses = [];
    let abEls = xmlDoc.getElementsByTagNameNS(TEI_NS, 'ab');
    if (abEls.length === 0) {
      abEls = xmlDoc.querySelectorAll('ab[type="verse"]');
    }
    for (let i = 0; i < abEls.length; i++) {
      const ab = abEls[i];
      if (ab.getAttribute('type') !== 'verse') continue;
      const xmlId = getXmlId(ab);
      if (!xmlId) continue;
      const page = findPageForVerse(ab);
      if (!page) continue;
      verses.push({
        verseId: xmlId,
        label: verseIdToLabel(xmlId),
        pageId: page.pageId,
        pageN: page.pageN,
      });
    }
    return verses;
  }

  // ── XInclude resolution ────────────────────────────────────────────

  /**
   * Resolve the base URL for relative href resolution.
   */
  function resolveBaseUrl(xmlPath) {
    const idx = xmlPath.lastIndexOf('/');
    return idx >= 0 ? xmlPath.substring(0, idx + 1) : '';
  }

  /**
   * Load a TEI XML, detect xi:include elements, load referenced files,
   * and return all extracted verses combined.
   */
  async function loadAndParseAll(xmlPath) {
    console.log('[VerseNav] 📖 Loading main TEI:', xmlPath);
    const mainResp = await fetch(xmlPath);
    if (!mainResp.ok) throw new Error(`HTTP ${mainResp.status} loading ${xmlPath}`);
    const mainText = await mainResp.text();
    const parser = new DOMParser();
    const mainDoc = parser.parseFromString(mainText, 'application/xml');

    const parseError = mainDoc.querySelector('parsererror');
    if (parseError) throw new Error('XML parse error: ' + parseError.textContent);

    // Check for xi:include elements
    const xiIncludes = mainDoc.getElementsByTagNameNS(XI_NS, 'include');
    console.log('[VerseNav] Found', xiIncludes.length, 'xi:include elements');

    if (xiIncludes.length === 0) {
      // No XInclude — single file mode
      const verses = extractVerses(mainDoc);
      console.log('[VerseNav] Single-file mode:', verses.length, 'verses');
      return verses;
    }

    // Multi-file mode: collect unique href values
    const baseUrl = resolveBaseUrl(xmlPath);
    const hrefs = new Set();
    for (let i = 0; i < xiIncludes.length; i++) {
      const href = xiIncludes[i].getAttribute('href');
      if (href) hrefs.add(href);
    }

    console.log('[VerseNav] XInclude files to load:', [...hrefs].join(', '));

    // Also extract any verses from the main doc itself (unlikely but safe)
    let allVerses = extractVerses(mainDoc);

    // Load each included file in parallel
    const loadPromises = [...hrefs].map(async (href) => {
      const fullUrl = baseUrl + href;
      try {
        console.log('[VerseNav]   ↳ Loading', fullUrl);
        const resp = await fetch(fullUrl);
        if (!resp.ok) {
          console.warn('[VerseNav]   ⚠️ HTTP', resp.status, 'for', fullUrl);
          return [];
        }
        const text = await resp.text();
        const doc = parser.parseFromString(text, 'application/xml');
        const pErr = doc.querySelector('parsererror');
        if (pErr) {
          console.warn('[VerseNav]   ⚠️ Parse error in', href);
          return [];
        }
        const verses = extractVerses(doc);
        console.log('[VerseNav]   ✅', href, '→', verses.length, 'verses');
        return verses;
      } catch (e) {
        console.warn('[VerseNav]   ❌ Failed to load', href, e);
        return [];
      }
    });

    const results = await Promise.all(loadPromises);
    results.forEach((vv) => { allVerses = allVerses.concat(vv); });

    return allVerses;
  }

  // ── UI Construction ────────────────────────────────────────────────

  /**
   * Build hierarchical structure: book → chapter → verses
   */
  function buildHierarchy(verses) {
    const books = {};
    verses.forEach((v) => {
      const p = parseVerseId(v.verseId);
      if (!p) return;
      if (!books[p.book]) books[p.book] = {};
      if (!books[p.book][p.chapter]) books[p.book][p.chapter] = [];
      books[p.book][p.chapter].push(v);
    });

    // Sort chapters numerically within each book
    Object.keys(books).forEach((book) => {
      const sorted = {};
      Object.keys(books[book])
        .sort((a, b) => parseInt(a) - parseInt(b))
        .forEach((ch) => { sorted[ch] = books[book][ch]; });
      books[book] = sorted;
    });

    return books;
  }

  function buildNavigator(verses) {
    const hierarchy = buildHierarchy(verses);
    const bookKeys = Object.keys(hierarchy);

    // ── Wrapper ──
    const wrapper = document.createElement('div');
    wrapper.id = 'evt-verse-navigator';
    wrapper.className = 'evt-verse-nav me-1';

    // ── Trigger ──
    const trigger = document.createElement('div');
    trigger.className = 'verse-nav-trigger';
    trigger.setAttribute('role', 'combobox');
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('tabindex', '0');
    trigger.innerHTML = `
      <svg class="verse-nav-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="14" height="14">
        <path fill="currentColor" d="M96 0C43 0 0 43 0 96V416c0 53 43 96 96 96H384h32c17.7 0 32-14.3 32-32s-14.3-32-32-32V384c17.7 0 32-14.3 32-32V32c0-17.7-14.3-32-32-32H384 96zm0 384H352v64H96c-17.7 0-32-14.3-32-32s14.3-32 32-32zm32-240c0-8.8 7.2-16 16-16H336c8.8 0 16 7.2 16 16s-7.2 16-16 16H144c-8.8 0-16-7.2-16-16zm16 48H336c8.8 0 16 7.2 16 16s-7.2 16-16 16H144c-8.8 0-16-7.2-16-16s7.2-16 16-16z"/>
      </svg>
      <span class="verse-nav-label">Verse</span>
      <span class="verse-nav-arrow"><span class="ng-arrow"></span></span>
    `;

    // ── Panel ──
    const panel = document.createElement('div');
    panel.className = 'verse-nav-panel';
    panel.setAttribute('role', 'listbox');

    // Search
    const searchBox = document.createElement('div');
    searchBox.className = 'verse-nav-search';
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search (e.g. Mt, 5:15 or Lc, 1:3)';
    searchInput.setAttribute('autocomplete', 'off');
    searchInput.setAttribute('autocorrect', 'off');
    searchInput.setAttribute('aria-label', 'Search verse');
    searchBox.appendChild(searchInput);
    panel.appendChild(searchBox);

    // Book tabs
    const tabBar = document.createElement('div');
    tabBar.className = 'verse-nav-tabs';
    bookKeys.forEach((book, idx) => {
      const tab = document.createElement('button');
      tab.className = 'verse-nav-tab' + (idx === 0 ? ' active' : '');
      tab.dataset.book = book;
      tab.textContent = book;
      tab.type = 'button';
      tabBar.appendChild(tab);
    });
    panel.appendChild(tabBar);

    // Content area (one per book, with chapters)
    const contentArea = document.createElement('div');
    contentArea.className = 'verse-nav-content';

    bookKeys.forEach((book, idx) => {
      const bookPane = document.createElement('div');
      bookPane.className = 'verse-nav-book-pane' + (idx === 0 ? ' active' : '');
      bookPane.dataset.book = book;

      const chapters = hierarchy[book];
      Object.keys(chapters).forEach((chNum) => {
        // Chapter header (collapsible)
        const chHeader = document.createElement('div');
        chHeader.className = 'verse-nav-chapter-header';
        chHeader.dataset.chapter = chNum;
        chHeader.innerHTML = `<span class="ch-toggle">▶</span> Chapter ${chNum}`;

        const chContent = document.createElement('div');
        chContent.className = 'verse-nav-chapter-content collapsed';
        chContent.dataset.chapter = chNum;

        chapters[chNum].forEach((v) => {
          const opt = document.createElement('div');
          opt.className = 'verse-nav-option';
          opt.setAttribute('role', 'option');
          opt.dataset.verseId = v.verseId;
          opt.dataset.pageId = v.pageId;
          opt.dataset.pageN = v.pageN;
          opt.dataset.book = book;
          opt.dataset.chapter = chNum;
          opt.textContent = v.label;
          chContent.appendChild(opt);
        });

        bookPane.appendChild(chHeader);
        bookPane.appendChild(chContent);
      });

      contentArea.appendChild(bookPane);
    });

    panel.appendChild(contentArea);
    wrapper.appendChild(trigger);
    wrapper.appendChild(panel);

    // ── Interaction ──

    let isOpen = false;
    let activeBook = bookKeys[0] || null;

    function togglePanel(open) {
      isOpen = typeof open === 'boolean' ? open : !isOpen;
      panel.classList.toggle('open', isOpen);
      trigger.setAttribute('aria-expanded', String(isOpen));
      if (isOpen) {
        searchInput.value = '';
        clearFilter();
        setTimeout(() => searchInput.focus(), 50);
      }
    }

    function switchBook(book) {
      activeBook = book;
      tabBar.querySelectorAll('.verse-nav-tab').forEach((t) => {
        t.classList.toggle('active', t.dataset.book === book);
      });
      contentArea.querySelectorAll('.verse-nav-book-pane').forEach((p) => {
        p.classList.toggle('active', p.dataset.book === book);
      });
    }

    function toggleChapter(chHeader) {
      const pane = chHeader.parentElement;
      const chNum = chHeader.dataset.chapter;
      const content = pane.querySelector(
        `.verse-nav-chapter-content[data-chapter="${chNum}"]`
      );
      if (!content) return;
      const isCollapsed = content.classList.contains('collapsed');
      content.classList.toggle('collapsed', !isCollapsed);
      chHeader.querySelector('.ch-toggle').textContent = isCollapsed ? '▼' : '▶';
    }

    function clearFilter() {
      // Show tabs, reset chapter visibility
      tabBar.style.display = '';
      contentArea.querySelectorAll('.verse-nav-book-pane').forEach((p) => {
        p.classList.toggle('active', p.dataset.book === activeBook);
      });
      contentArea.querySelectorAll('.verse-nav-chapter-header').forEach((h) => {
        h.style.display = '';
      });
      contentArea.querySelectorAll('.verse-nav-chapter-content').forEach((c) => {
        c.classList.add('collapsed');
        c.style.display = '';
      });
      contentArea.querySelectorAll('.verse-nav-option').forEach((o) => {
        o.style.display = '';
      });
      contentArea.querySelectorAll('.ch-toggle').forEach((t) => {
        t.textContent = '▶';
      });
    }

    function filterOptions(query) {
      const q = query.toLowerCase().trim();
      if (!q) { clearFilter(); return; }

      // In search mode: show all books, hide tabs, expand matching
      tabBar.style.display = 'none';
      contentArea.querySelectorAll('.verse-nav-book-pane').forEach((p) => {
        p.classList.add('active'); // show all
      });

      contentArea.querySelectorAll('.verse-nav-book-pane').forEach((bookPane) => {
        let bookHasMatch = false;

        bookPane.querySelectorAll('.verse-nav-chapter-content').forEach((chContent) => {
          let chHasMatch = false;
          chContent.querySelectorAll('.verse-nav-option').forEach((opt) => {
            const matches = opt.textContent.toLowerCase().includes(q);
            opt.style.display = matches ? '' : 'none';
            if (matches) chHasMatch = true;
          });

          // Show/hide chapter header and content
          const chNum = chContent.dataset.chapter;
          const chHeader = bookPane.querySelector(
            `.verse-nav-chapter-header[data-chapter="${chNum}"]`
          );
          if (chHeader) chHeader.style.display = chHasMatch ? '' : 'none';
          chContent.style.display = chHasMatch ? '' : 'none';
          chContent.classList.toggle('collapsed', !chHasMatch);
          if (chHeader) {
            const toggle = chHeader.querySelector('.ch-toggle');
            if (toggle) toggle.textContent = chHasMatch ? '▼' : '▶';
          }

          if (chHasMatch) bookHasMatch = true;
        });

        bookPane.style.display = bookHasMatch ? '' : 'none';
      });
    }

    function navigateToPage(pageId) {
      const currentHash = window.location.hash || '';
      console.log('[VerseNav] Navigating to page:', pageId, '| current hash:', currentHash);

      if (currentHash.includes('?')) {
        const [path, queryStr] = currentHash.replace('#/', '').split('?');
        const params = new URLSearchParams(queryStr);
        params.set('p', pageId);
        window.location.hash = `#/${path}?${params.toString()}`;
      } else {
        const parts = currentHash.replace('#/', '').split('/');
        const currentEdition = parts.length > 1 ? parts[1] : 'diplomatic';
        window.location.hash = `#/${pageId}/${currentEdition}`;
      }

      // Fallback: click in page selector
      setTimeout(() => {
        try {
          const pageSelector = document.querySelector('evt-page-selector ng-select');
          if (!pageSelector) return;
          const container = pageSelector.querySelector('.ng-select-container');
          if (!container) return;
          container.click();
          setTimeout(() => {
            const pageN = pageId.replace(/^.*_(\d+[rv])$/, '$1');
            document.querySelectorAll('evt-page-selector .ng-option').forEach((opt) => {
              const t = opt.textContent.trim();
              if (t === pageN || t.includes(pageN)) {
                console.log('[VerseNav] Fallback click on page:', t);
                opt.click();
              }
            });
          }, 200);
        } catch (e) {
          console.warn('[VerseNav] Fallback failed:', e);
        }
      }, 200);
    }

    // ── Events ──

    trigger.addEventListener('click', (e) => { e.stopPropagation(); togglePanel(); });
    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePanel(true); }
      if (e.key === 'Escape') togglePanel(false);
    });

    searchInput.addEventListener('input', () => filterOptions(searchInput.value));
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { togglePanel(false); trigger.focus(); }
    });

    tabBar.addEventListener('click', (e) => {
      const tab = e.target.closest('.verse-nav-tab');
      if (tab) switchBook(tab.dataset.book);
    });

    contentArea.addEventListener('click', (e) => {
      // Chapter header click → toggle
      const chHeader = e.target.closest('.verse-nav-chapter-header');
      if (chHeader) { toggleChapter(chHeader); return; }

      // Verse option click → navigate
      const opt = e.target.closest('.verse-nav-option');
      if (!opt) return;
      trigger.querySelector('.verse-nav-label').textContent = opt.textContent;
      trigger.classList.add('has-value');
      togglePanel(false);
      navigateToPage(opt.dataset.pageId);
    });

    document.addEventListener('click', (e) => {
      if (!wrapper.contains(e.target) && isOpen) togglePanel(false);
    });

    return wrapper;
  }

  // ── DOM insertion ──────────────────────────────────────────────────

  function insertNavigator(verses) {
    let polls = 0;
    function tryInsert() {
      const editionSelector = document.querySelector('evt-edition-level-selector');
      if (editionSelector) {
        if (document.getElementById('evt-verse-navigator')) return;
        const nav = buildNavigator(verses);
        editionSelector.parentNode.insertBefore(nav, editionSelector.nextSibling);
        console.log('[VerseNav] ✅ Verse navigator inserted with', verses.length, 'verses.');
        return;
      }
      polls++;
      if (polls < MAX_POLLS) {
        setTimeout(tryInsert, POLL_INTERVAL);
      } else {
        console.warn('[VerseNav] ❌ Navbar not found after', MAX_POLLS * POLL_INTERVAL, 'ms.');
      }
    }
    tryInsert();
  }

  // ── Bootstrap ──────────────────────────────────────────────────────

  async function init() {
    console.log('[VerseNav] 🚀 Initializing verse navigator v3 (XInclude support)...');
    try {
      const verses = await loadAndParseAll(TEI_XML_PATH);

      if (verses.length === 0) {
        console.warn('[VerseNav] ⚠️ No verses found! Check XML path and structure.');
        return;
      }

      // Summary
      const summary = {};
      verses.forEach((v) => {
        const p = parseVerseId(v.verseId);
        if (p) summary[p.book] = (summary[p.book] || 0) + 1;
      });
      console.log('[VerseNav] 📊 Verses by book:', summary);
      console.log('[VerseNav] Total:', verses.length, 'verses');

      insertNavigator(verses);
    } catch (err) {
      console.error('[VerseNav] ❌ Initialization failed:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();