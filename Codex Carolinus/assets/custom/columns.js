function splitIntoColumns() {
  document.querySelectorAll('evt-page').forEach(page => {
    // Evita di processare due volte
    if (page.dataset.columnsSplit) return;

    const cb2 = page.querySelector('evt-generic-element.cb[n="2"]');
    if (!cb2) return;

    // Crea i due contenitori colonna
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex; gap:2em; width:100%;';

    const colA = document.createElement('div');
    colA.style.cssText = 'flex:1; min-width:0;';
    colA.className = 'column-a';

    const colB = document.createElement('div');
    colB.style.cssText = 'flex:1; min-width:0;';
    colB.className = 'column-b';

    // Raccogli tutti i figli diretti di evt-page
    const children = Array.from(page.childNodes);

    children.forEach(child => {
      // compareDocumentPosition: bit 4 (FOLLOWING) = il cb2 segue child
      // bit 2 (PRECEDING) = il cb2 precede child
      const pos = child.compareDocumentPosition
        ? child.compareDocumentPosition(cb2)
        : 0;

      if (pos & Node.DOCUMENT_POSITION_CONTAINED_BY) {
        // Questo nodo CONTIENE il cb2 — caso limite
        // Lo mettiamo nella colonna A (il gotico finisce qui)
        // ma il contenuto latino dopo cb2 resterà dentro
        colA.appendChild(child);
      } else if (pos & Node.DOCUMENT_POSITION_FOLLOWING) {
        // cb2 viene DOPO questo nodo → colonna A (gotico)
        colA.appendChild(child);
      } else {
        // cb2 viene PRIMA → colonna B (latino)
        colB.appendChild(child);
      }
    });

    wrapper.appendChild(colA);
    wrapper.appendChild(colB);
    page.appendChild(wrapper);
    page.dataset.columnsSplit = 'true';
  });
}

// Osserva i cambiamenti nel DOM per intercettare il rendering di EVT
const observer = new MutationObserver(() => {
  const pages = document.querySelectorAll('evt-page:not([data-columns-split])');
  if (pages.length) {
    // Piccolo delay per aspettare che Angular finisca
    setTimeout(splitIntoColumns, 300);
  }
});

observer.observe(document.body, { childList: true, subtree: true });