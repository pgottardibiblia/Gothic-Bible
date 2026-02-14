console.log('Custom EVT script loaded');

// Funzione per aggiornare la classe del body in base alla modalità attiva
function updateViewMode() {
    // Selettore SPECIFICO per la modalità di visualizzazione
    const modeSelector = document.querySelector('evt-edition-level-selector .ng-value');
    
    if (!modeSelector) {
        console.log('Selettore modalità non trovato');
        return;
    }
    
    // Estrai il testo e puliscilo (rimuove spazi extra prima/dopo)
    const modeText = modeSelector.textContent.trim();
    console.log('Modalità attiva:', modeText);
    
    // Rimuovi tutte le classi modalità precedenti
    document.body.classList.remove('diplomatic-mode', 'interpretative-mode', 'reading-mode');
    
    // Aggiungi la classe appropriata in base alla modalità
    if (modeText.includes('Diplomatic')) {
        document.body.classList.add('diplomatic-mode');
    } else if (modeText.includes('Interpretative')) {
        document.body.classList.add('interpretative-mode');
    } else if (modeText.includes('Reading')) {
        document.body.classList.add('reading-mode');
    }
}

// Funzione per gestire i <seg> correlati
function handleCorrelatedSegments() {
    console.log('=== Gestione segmenti correlati (cercando nel DOM) ===');
    
    // Trova tutti gli evt-content-viewer con classe seg e attributo data-corresp
    const segments = document.querySelectorAll('evt-content-viewer.seg[data-corresp]');
    console.log('Trovati', segments.length, 'segmenti con corresp');
    
    segments.forEach(seg => {
        const correspId = seg.getAttribute('data-corresp');
        const segId = seg.getAttribute('data-id');
        
        if (!correspId) {
            return;
        }
        
        // Marca sempre il seg come "principale"
        seg.classList.add('seg-primary');
        
        // Cerca il seg correlato tramite data-id
        const correlatedSeg = document.querySelector(`evt-content-viewer.seg[data-id="${correspId}"]`);
        
        if (!correlatedSeg) {
            // Seg correlato non trovato (probabilmente su altra pagina)
            console.log(`Seg ${segId}: correlato ${correspId} non trovato, uso placeholder`);
            seg.setAttribute('data-corresp-text', '...');
        } else {
            // Prendi il testo dal seg correlato
            const correlatedText = correlatedSeg.textContent.trim();
            seg.setAttribute('data-corresp-text', correlatedText);
            
            // Marca il secondo seg come "nascosto"
            correlatedSeg.classList.add('seg-hidden');
            
            console.log(`Seg ${segId}: correlato trovato "${correlatedText}"`);
        }
    });
    
    console.log('=== Fine gestione segmenti ===');
}

// Attendi che il DOM sia completamente caricato
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, inizializzazione script...');
    
    // Aspetta un attimo che Angular finisca di renderizzare
    setTimeout(() => {
        updateViewMode();
        handleCorrelatedSegments();
        
        // Osserva i cambiamenti nel DOM per rilevare i cambi
        const observer = new MutationObserver(function(mutations) {
            updateViewMode();
            handleCorrelatedSegments();
        });
        
        // Osserva SOLO il contenitore della modalità, non tutto il body
        const editionSelector = document.querySelector('evt-edition-level-selector');
        if (editionSelector) {
            observer.observe(editionSelector, {
                childList: true,
                subtree: true,
                characterData: true
            });
            console.log('Observer attivo su evt-edition-level-selector');
        } else {
            console.log('evt-edition-level-selector non trovato!');
        }
        
        // Osserva anche il pannello del testo per quando cambiano pagine
        const textPanel = document.querySelector('evt-text-panel');
        if (textPanel) {
            observer.observe(textPanel, {
                childList: true,
                subtree: true
            });
            console.log('Observer attivo anche su evt-text-panel');
        }
    }, 500);
});


console.log('🔧 Script colonne caricato');

// Funzione per creare il layout a 2 colonne
function createTwoColumnLayout() {
    console.log('🔍 Cerco evt-page...');
    const page = document.querySelector('evt-page[data-id*="256r"]');
    
    if (!page) {
        console.log('❌ evt-page non trovato');
        return false;
    }
    console.log('✅ evt-page trovato:', page);
    
    // Verifica se già processato
    if (page.classList.contains('two-column-layout')) {
        console.log('⚠️ Layout già applicato');
        return true;
    }
    
    // Trova il column break
    const cb = page.querySelector('evt-generic-element.cb');
    if (!cb) {
        console.log('❌ Column break non trovato');
        return false;
    }
    console.log('✅ Column break trovato:', cb);
    
    // Trova il verso che contiene il cb
    const verseWithCb = cb.closest('evt-content-viewer');
    if (!verseWithCb) {
        console.log('❌ Verso con cb non trovato');
        return false;
    }
    console.log('✅ Verso con cb trovato:', verseWithCb);
    
    // Raccogli tutti i versi figli diretti di evt-page
    const allVerses = Array.from(page.querySelectorAll(':scope > evt-content-viewer'));
    console.log(`📊 Trovati ${allVerses.length} versi totali`);
    
    // Trova l'indice del verso con cb
    const cbIndex = allVerses.indexOf(verseWithCb);
    console.log(`📍 Indice verso con cb: ${cbIndex}`);
    
    if (cbIndex === -1) {
        console.log('❌ Impossibile trovare indice del verso con cb');
        return false;
    }
    
    // Crea wrapper per le colonne
    const wrapper = document.createElement('div');
    wrapper.className = 'two-column-wrapper';
    wrapper.style.display = 'flex';
    wrapper.style.gap = '2rem';
    wrapper.style.alignItems = 'flex-start';
    
    const col1 = document.createElement('div');
    const col2 = document.createElement('div');
    col1.className = 'text-column column-left';
    col2.className = 'text-column column-right';
    col1.style.flex = '1';
    col1.style.minWidth = '0';
    col2.style.flex = '1';
    col2.style.minWidth = '0';
    
    // Sposta versi in colonna 1 (prima del cb)
    allVerses.slice(0, cbIndex).forEach(verse => {
        col1.appendChild(verse);
    });
    console.log(`➡️ ${cbIndex} versi in colonna 1`);
    
    // Sposta versi in colonna 2 (dal cb in poi)
    allVerses.slice(cbIndex).forEach(verse => {
        col2.appendChild(verse);
    });
    console.log(`➡️ ${allVerses.length - cbIndex} versi in colonna 2`);
    
    // Assembla il layout
    wrapper.appendChild(col1);
    wrapper.appendChild(col2);
    page.appendChild(wrapper);
    
    // Nascondi il cb visivamente
    if (cb) cb.style.display = 'none';
    
    // Marca come processato
    page.classList.add('two-column-layout');
    
    console.log('✅ Layout a 2 colonne applicato!');
    return true;
}

// Prova subito
setTimeout(() => {
    console.log('⏰ Primo tentativo dopo 1s...');
    createTwoColumnLayout();
}, 1000);

// Osserva il DOM per quando Angular renderizza il contenuto
const observer = new MutationObserver((mutations) => {
    console.log('🔄 DOM cambiato, riprovo...');
    if (createTwoColumnLayout()) {
        observer.disconnect();
        console.log('🎉 Observer disconnesso, layout completato!');
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

console.log('👀 MutationObserver attivo');