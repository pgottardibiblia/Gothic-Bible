(function () {
  'use strict';

  /**
   * Remove a node and all its following siblings,
   * then recurse up removing only the following siblings of each ancestor
   * (the ancestor itself is preserved because it holds wanted content).
   */
  function removeNodeAndAllAfter(node, stopAncestor) {
    if (!node || node === stopAncestor) return;

    const parent = node.parentNode;

    // Remove all following siblings of the target node
    while (node.nextSibling) {
      node.nextSibling.remove();
    }

    // Remove the target node itself (cb2 or its first wrapper)
    node.remove();

    // Now walk up: at each ancestor level, remove only FOLLOWING siblings
    let current = parent;
    while (current && current !== stopAncestor) {
      while (current.nextSibling) {
        current.nextSibling.remove();
      }
      current = current.parentNode;
    }
  }

  /**
   * Remove a node and all its preceding siblings,
   * then recurse up removing only the preceding siblings of each ancestor
   * (the ancestor itself is preserved).
   */
  function removeNodeAndAllBefore(node, stopAncestor) {
    if (!node || node === stopAncestor) return;

    const parent = node.parentNode;

    // Remove all preceding siblings of the target node
    while (node.previousSibling) {
      node.previousSibling.remove();
    }

    // Remove the target node itself (cb2)
    node.remove();

    // Walk up: at each ancestor level, remove only PRECEDING siblings
    let current = parent;
    while (current && current !== stopAncestor) {
      while (current.previousSibling) {
        current.previousSibling.remove();
      }
      current = current.parentNode;
    }
  }

  /**
   * Build a text fingerprint of the Angular-managed content
   * (ignoring our injected wrapper) to detect page changes.
   */
  function getContentFingerprint(page) {
    let text = '';
    for (const child of page.children) {
      if (child.classList && child.classList.contains('two-col-wrapper')) continue;
      text += child.textContent || '';
    }
    // Use first 120 chars as a lightweight fingerprint
    return text.trim().substring(0, 120);
  }

  function splitPage(page) {
    // Find cb n="2" in the live DOM
    const cb2 = page.querySelector('evt-generic-element.cb[n="2"]');
    if (!cb2) return;

    // Check if we already split this exact content
    const fingerprint = getContentFingerprint(page);
    if (page.dataset.columnsSplit && page.dataset.colFingerprint === fingerprint) {
      return; // same content, already split
    }

    // --- Clean up any previous split ---
    const oldWrapper = page.querySelector('.two-col-wrapper');
    if (oldWrapper) oldWrapper.remove();

    // Restore visibility of Angular children that we previously hid
    Array.from(page.children).forEach(child => {
      if (child.style.display === 'none') {
        child.style.display = '';
      }
    });

    // Also find cb n="1" selector for hiding
    const cb1Selector = 'evt-generic-element.cb[n="1"]';

    // --- Clone A: Gothic (left column) ---
    const cloneA = page.cloneNode(true);
    // Remove any leftover wrapper in the clone
    const oldWrapperA = cloneA.querySelector('.two-col-wrapper');
    if (oldWrapperA) oldWrapperA.remove();

    const cb2inA = cloneA.querySelector('evt-generic-element.cb[n="2"]');
    if (cb2inA) {
      removeNodeAndAllAfter(cb2inA, cloneA);
    }
    // Hide cb n="1" marker in clone A
    const cb1inA = cloneA.querySelector(cb1Selector);
    if (cb1inA) cb1inA.style.display = 'none';

    // --- Clone B: Latin (right column) ---
    const cloneB = page.cloneNode(true);
    const oldWrapperB = cloneB.querySelector('.two-col-wrapper');
    if (oldWrapperB) oldWrapperB.remove();

    const cb2inB = cloneB.querySelector('evt-generic-element.cb[n="2"]');
    if (cb2inB) {
      removeNodeAndAllBefore(cb2inB, cloneB);
    }

    // Verify both columns have content
    if (cloneA.textContent.trim().length === 0 ||
        cloneB.textContent.trim().length === 0) {
      console.warn('[columns.js] Split produced empty column, aborting.',
        'A:', cloneA.textContent.trim().substring(0, 50),
        'B:', cloneB.textContent.trim().substring(0, 50));
      return;
    }

    // --- Hide original Angular children ---
    Array.from(page.children).forEach(child => {
      child.style.display = 'none';
    });

    // --- Build the two-column wrapper ---
    const wrapper = document.createElement('div');
    wrapper.className = 'two-col-wrapper';

    const colA = document.createElement('div');
    colA.className = 'col-gothic';
    while (cloneA.firstChild) {
      colA.appendChild(cloneA.firstChild);
    }

    const colB = document.createElement('div');
    colB.className = 'col-latin';
    while (cloneB.firstChild) {
      colB.appendChild(cloneB.firstChild);
    }

    wrapper.appendChild(colA);
    wrapper.appendChild(colB);
    page.appendChild(wrapper);

    // Mark as split with fingerprint
    page.dataset.columnsSplit = 'true';
    page.dataset.colFingerprint = fingerprint;

    console.log('[columns.js] ✅ Colonne create per', page.getAttribute('data-id') || 'page',
      '— Gotico:', colA.textContent.trim().substring(0, 40) + '...',
      '— Latino:', colB.textContent.trim().substring(0, 40) + '...');
  }

  function processAllPages() {
    document.querySelectorAll('evt-page').forEach(page => {
      const fingerprint = getContentFingerprint(page);
      // Process if never split, or if Angular has swapped the content
      if (!page.dataset.columnsSplit || page.dataset.colFingerprint !== fingerprint) {
        splitPage(page);
      }
    });
  }

  // --- MutationObserver ---
  let debounceTimer = null;
  const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(processAllPages, 600);
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Also run on load
  setTimeout(processAllPages, 1500);

  console.log('[columns.js] Script caricato — in attesa del rendering EVT3...');
})();