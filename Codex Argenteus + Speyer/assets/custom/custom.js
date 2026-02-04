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
    console.log('Gestione segmenti correlati...');
    
    // Trova tutti gli evt-generic-element con classe seg e attributo corresp
    const segments = document.querySelectorAll('evt-generic-element.seg[corresp]');
    console.log('Trovati', segments.length, 'segmenti con corresp');
    
    segments.forEach(seg => {
        const correspId = seg.getAttribute('corresp');
        if (!correspId) return;
        
        // Trova il seg correlato tramite id
        const correlatedSeg = document.querySelector(`evt-generic-element.seg[id="${correspId}"]`);
        
        if (!correlatedSeg) {
            console.log('Seg correlato non trovato per:', correspId);
            return;
        }
        
        // Marca il primo seg come "principale"
        seg.classList.add('seg-primary');
        seg.setAttribute('data-corresp-text', correlatedSeg.textContent.trim());
        
        // Marca il secondo seg come "nascosto"
        correlatedSeg.classList.add('seg-hidden');
        
        console.log('Correlazione:', seg.textContent.trim(), '|', correlatedSeg.textContent.trim());
    });
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
