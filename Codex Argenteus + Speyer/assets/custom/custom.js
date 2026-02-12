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
    console.log('=== Gestione segmenti correlati ===');
    
    // Trova tutti gli evt-content-viewer con classe seg e attributo data-corresp
    const segments = document.querySelectorAll('evt-content-viewer.seg[data-corresp]');
    console.log('Trovati', segments.length, 'segmenti con corresp');
    
    // DEBUG: mostra tutti i seg con data-id presenti nel DOM
    const allSegs = document.querySelectorAll('evt-content-viewer.seg[data-id]');
    console.log('Totale seg con data-id nel DOM:', allSegs.length);
    allSegs.forEach(s => {
        console.log('  - Seg disponibile:', s.getAttribute('data-id'), '=', s.textContent.trim());
    });
    
    segments.forEach(seg => {
        const correspId = seg.getAttribute('data-corresp');
        const segId = seg.getAttribute('data-id');
        console.log('\n--- Processando seg:', segId);
        console.log('    Cerca correlato:', correspId);
        console.log('    Testo:', seg.textContent.trim());
        
        if (!correspId) {
            console.log('    ⚠️ Nessun data-corresp trovato');
            return;
        }
        
        // Marca sempre il seg come "principale"
        seg.classList.add('seg-primary');
        
        // Trova il seg correlato tramite data-id
        const correlatedSeg = document.querySelector(`evt-content-viewer.seg[data-id="${correspId}"]`);
        
        if (!correlatedSeg) {
            // Se il seg correlato non è trovato, usa placeholder "..."
            console.log('    ❌ Seg correlato NON trovato per:', correspId, '- usando placeholder');
            seg.setAttribute('data-corresp-text', '...');
        } else {
            // Crea l'attributo con il testo del seg correlato
            const correlatedText = correlatedSeg.textContent.trim();
            seg.setAttribute('data-corresp-text', correlatedText);
            
            // Marca il secondo seg come "nascosto"
            correlatedSeg.classList.add('seg-hidden');
            
            console.log('    ✅ Correlazione trovata:', seg.textContent.trim(), '|', correlatedText);
        }
    });
    
    console.log('=== Fine gestione segmenti ===\n');
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
