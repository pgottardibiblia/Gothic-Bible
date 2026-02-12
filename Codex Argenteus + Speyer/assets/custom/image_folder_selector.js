console.log('Image folder selector loaded');

// Variabile globale per tenere traccia della cartella corrente
let currentImageFolder = null;

// Flag per prevenire inizializzazioni multiple
let selectorInitialized = false;

// Funzione per caricare il config e inizializzare il selettore
async function initImageFolderSelector() {
    console.log('=== INIT IMAGE FOLDER SELECTOR ===');
    
    // Controlla se già inizializzato
    if (selectorInitialized) {
        console.log('⚠️ Selettore già inizializzato, skip');
        return;
    }
    
    // Controlla se il selettore esiste già nel DOM
    if (document.getElementById('image-folder-selector')) {
        console.log('⚠️ Selettore già presente nel DOM, skip');
        selectorInitialized = true;
        return;
    }
    
    // Prova diversi path possibili per il config
    const possiblePaths = [
        'file_config.json',           // root
        './file_config.json',         // root esplicito
        'assets/config/file_config.json',  // dentro assets/config
        'config/file_config.json',    // dentro config
        '../file_config.json'         // un livello sopra
    ];
    
    let config = null;
    let configPath = null;
    
    for (const path of possiblePaths) {
        try {
            console.log(`Tentativo di caricamento da: ${path}...`);
            const response = await fetch(path);
            console.log(`  Response status:`, response.status);
            
            if (response.ok) {
                config = await response.json();
                configPath = path;
                console.log(`✅ Config caricato da: ${path}`);
                break;
            }
        } catch (error) {
            console.log(`  ❌ Fallito: ${error.message}`);
        }
    }
    
    if (!config) {
        console.error('❌ Impossibile caricare file_config.json da nessun path');
        console.log('Path provati:', possiblePaths);
        return;
    }
    
    console.log('✅ Config caricato:', config);
    
    try {
        // Verifica se ci sono cartelle definite
        console.log('imagesFolderUrls:', config.imagesFolderUrls);
        const folders = config.imagesFolderUrls?.folders;
        
        if (!folders) {
            console.error('❌ Nessuna proprietà "folders" trovata in imagesFolderUrls');
            console.log('Struttura trovata:', config.imagesFolderUrls);
            return;
        }
        
        if (folders.length === 0) {
            console.log('⚠️ Array folders è vuoto');
            return;
        }
        
        console.log('✅ Trovate', folders.length, 'cartelle immagini:', folders);
        
        // Aspetta che la navbar sia renderizzata
        console.log('Attendo 2 secondi per renderizzazione navbar...');
        setTimeout(() => {
            console.log('Timeout scaduto, aggiungo selettore...');
            addFolderSelectorToNavbar(folders);
        }, 2000);
        
    } catch (error) {
        console.error('❌ ERRORE nel processamento del config:', error);
        console.error('Stack:', error.stack);
    }
}

// Funzione per aggiungere il selettore alla navbar
function addFolderSelectorToNavbar(folders) {
    console.log('=== ADD FOLDER SELECTOR TO NAVBAR ===');
    console.log('Ricevute', folders.length, 'cartelle');
    
    // RIMUOVI EVENTUALI SELETTORI ESISTENTI
    const existingSelectors = document.querySelectorAll('#image-folder-selector');
    if (existingSelectors.length > 0) {
        console.log(`⚠️ Trovati ${existingSelectors.length} selettori esistenti, rimuovo...`);
        existingSelectors.forEach(sel => sel.parentElement?.remove());
    }
    
    // Trova il container header-left nella navbar
    console.log('Cerco nav.navbar...');
    const navbar = document.querySelector('nav.navbar');
    console.log('navbar trovata:', navbar);
    
    console.log('Cerco nav.navbar div[header-left]...');
    const headerLeft = document.querySelector('nav.navbar div[header-left]');
    console.log('header-left trovato:', headerLeft);
    
    if (!headerLeft) {
        console.error('❌ header-left NON trovato nella navbar');
        console.log('Proviamo selettori alternativi...');
        
        // Prova selettori alternativi
        const alt1 = document.querySelector('nav.navbar [header-left]');
        console.log('Tentativo con [header-left]:', alt1);
        
        const alt2 = document.querySelector('.navbar [header-left]');
        console.log('Tentativo con .navbar [header-left]:', alt2);
        
        const alt3 = document.querySelector('div[header-left]');
        console.log('Tentativo con div[header-left]:', alt3);
        
        // Mostra tutta la struttura navbar
        if (navbar) {
            console.log('Struttura navbar:', navbar.innerHTML.substring(0, 500));
        }
        
        return;
    }
    
    console.log('✅ header-left trovato!');
    
    // Crea il container per il selettore
    const selectorWrapper = document.createElement('div');
    selectorWrapper.className = 'd-inline-block me-2';
    selectorWrapper.style.cssText = 'display: inline-block; margin-right: 0.5rem;';
    
    // Crea il selettore
    const select = document.createElement('select');
    select.className = 'form-select form-select-sm';
    select.style.cssText = 'width: auto; font-size: 0.875rem; padding: 0.25rem 0.5rem;';
    select.id = 'image-folder-selector';
    
    console.log('Aggiungo opzioni al select...');
    
    // Aggiungi le opzioni
    folders.forEach((folder, index) => {
        const option = document.createElement('option');
        option.value = folder.path;
        option.textContent = folder.label;
        option.setAttribute('data-folder-id', folder.id);
        select.appendChild(option);
        console.log(`  Opzione ${index + 1}: ${folder.label} (${folder.path})`);
        
        // Imposta la prima cartella come default
        if (index === 0) {
            currentImageFolder = folder.path;
        }
    });
    
    // Event listener per il cambio selezione
    select.addEventListener('change', function(e) {
        const newFolder = e.target.value;
        console.log('Cambio cartella immagini:', currentImageFolder, '→', newFolder);
        switchImageFolder(currentImageFolder, newFolder);
        currentImageFolder = newFolder;
    });
    
    selectorWrapper.appendChild(select);
    
    // Inserisci all'inizio di header-left
    console.log('Inserisco selettore in header-left...');
    headerLeft.insertBefore(selectorWrapper, headerLeft.firstChild);
    
    // IMPOSTA IL FLAG A TRUE
    selectorInitialized = true;
    
    console.log('✅ Selettore cartelle immagini aggiunto alla navbar');
    console.log('Verifica: getElementById("image-folder-selector"):', document.getElementById('image-folder-selector'));
}

// Funzione per switchare la cartella delle immagini
function switchImageFolder(oldPath, newPath) {
    console.log('Switch da:', oldPath, 'a:', newPath);
    
    // Trova tutti gli elementi img nel DOM
    const images = document.querySelectorAll('img[src*="assets/data/images"]');
    console.log('Trovate', images.length, 'immagini da aggiornare');
    
    images.forEach(img => {
        const currentSrc = img.src;
        // Sostituisci il path della cartella
        const newSrc = currentSrc.replace(oldPath, newPath);
        
        if (currentSrc !== newSrc) {
            console.log('Aggiorno:', currentSrc, '→', newSrc);
            img.src = newSrc;
        }
    });
    
    // Aggiorna anche eventuali elementi con background-image
    const elementsWithBg = document.querySelectorAll('[style*="background-image"]');
    elementsWithBg.forEach(el => {
        const style = el.style.backgroundImage;
        if (style.includes(oldPath)) {
            const newStyle = style.replace(oldPath, newPath);
            el.style.backgroundImage = newStyle;
            console.log('Aggiornato background-image');
        }
    });
    
    // Se EVT usa OpenSeadragon, aggiorna anche quello
    updateOpenSeadragonImages(oldPath, newPath);
}

// Funzione per aggiornare immagini in OpenSeadragon
function updateOpenSeadragonImages(oldPath, newPath) {
    // OpenSeadragon potrebbe essere accessibile tramite window.viewer
    if (window.viewer && window.viewer.world) {
        console.log('Trovato OpenSeadragon viewer, aggiornamento immagini...');
        
        // Forza il reload del viewer con nuovi path
        // Questo è un placeholder - dipende da come EVT gestisce OpenSeadragon
        const currentPage = getCurrentPageId();
        if (currentPage) {
            console.log('Ricarica pagina corrente:', currentPage);
            // Triggera il reload della pagina
            triggerPageReload();
        }
    }
}

// Helper per ottenere l'ID della pagina corrente
function getCurrentPageId() {
    const pageSelector = document.querySelector('evt-page-selector .ng-value');
    return pageSelector ? pageSelector.textContent.trim() : null;
}

// Helper per triggerare il reload della pagina
function triggerPageReload() {
    // Simula un click sul selettore pagina per forzare il reload
    const pageSelector = document.querySelector('evt-page-selector ng-select');
    if (pageSelector) {
        // Triggera change event
        pageSelector.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

// Inizializza quando il DOM è pronto
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== DOM CONTENT LOADED ===');
    console.log('DOM loaded, inizializzazione selettore cartelle immagini...');
    initImageFolderSelector();
});

// Observer per reinizializzare se la navbar viene ricaricata
const navbarObserver = new MutationObserver(function(mutations) {
    // Se già inizializzato, non fare nulla
    if (selectorInitialized) {
        return;
    }
    
    const navbar = document.querySelector('nav.navbar');
    const selector = document.getElementById('image-folder-selector');
    
    if (navbar && !selector) {
        console.log('⚠️ Navbar presente ma selettore mancante, reinizializzo...');
        initImageFolderSelector();
    }
});

// Avvia l'observer quando possibile
setTimeout(() => {
    const body = document.body;
    if (body) {
        console.log('✅ Observer attivato su body');
        navbarObserver.observe(body, {
            childList: true,
            subtree: true
        });
    } else {
        console.error('❌ body non trovato per observer');
    }
}, 500);
