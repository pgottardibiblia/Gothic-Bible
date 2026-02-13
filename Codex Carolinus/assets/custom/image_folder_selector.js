// ============================================================================
// IMAGE FOLDER SELECTOR - Versione Definitiva
// ============================================================================

console.log('🚀 Image Folder Selector v3 loaded');

// Leggi la cartella salvata SUBITO (prima che EVT carichi il config)
let currentImageFolder = sessionStorage.getItem('selectedImageFolder') || null;
console.log('📂 Cartella iniziale:', currentImageFolder || 'nessuna (userà default)');

// ============================================================================
// STEP 1: INTERCETTA IL FILE CONFIG CON PROXY GETTER
// ============================================================================

const originalXHROpen = XMLHttpRequest.prototype.open;

XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this._url = url; // Salva l'URL
    
    // Se è file_config.json, intercetta la risposta
    if (url && url.includes('file_config.json')) {
        console.log('🎯 Intercetto file_config.json:', url);
        
        // Salva i getter originali
        const originalResponseTextGetter = Object.getOwnPropertyDescriptor(XMLHttpRequest.prototype, 'responseText').get;
        const originalResponseGetter = Object.getOwnPropertyDescriptor(XMLHttpRequest.prototype, 'response').get;
        
        // Variabile per cachare il JSON modificato
        let modifiedJSON = null;
        
        // Override del getter responseText
        Object.defineProperty(this, 'responseText', {
            get: function() {
                const original = originalResponseTextGetter.call(this);
                
                // Se non c'è una cartella selezionata, restituisci l'originale
                if (!currentImageFolder || this.readyState !== 4) {
                    return original;
                }
                
                // Se già modificato, restituisci il cache
                if (modifiedJSON) {
                    return modifiedJSON;
                }
                
                try {
                    // Parse e modifica
                    const config = JSON.parse(original);
                    
                    if (config.imagesFolderUrls) {
                        console.log('📝 Modifico imagesFolderUrls:');
                        console.log('   DA:', config.imagesFolderUrls.single);
                        console.log('   A:', currentImageFolder);
                        
                        config.imagesFolderUrls.single = currentImageFolder;
                        
                        // Aggiungi double se manca
                        if (!config.imagesFolderUrls.double) {
                            config.imagesFolderUrls.double = currentImageFolder;
                        } else {
                            config.imagesFolderUrls.double = currentImageFolder;
                        }
                        
                        // Salva nel cache
                        modifiedJSON = JSON.stringify(config);
                        
                        console.log('✅ Config modificato!');
                        return modifiedJSON;
                    }
                } catch (e) {
                    console.error('❌ Errore modifica config:', e);
                }
                
                return original;
            }
        });
        
        // Override del getter response (per sicurezza)
        Object.defineProperty(this, 'response', {
            get: function() {
                // Se responseType è text o vuoto, usa responseText
                if (!this.responseType || this.responseType === 'text') {
                    return this.responseText;
                }
                return originalResponseGetter.call(this);
            }
        });
    }
    
    return originalXHROpen.call(this, method, url, ...rest);
};

console.log('✅ Intercettazione XHR attivata (proxy getter)');

// ============================================================================
// STEP 2: CARICA IL CONFIG PER OTTENERE LE CARTELLE DISPONIBILI
// ============================================================================

function loadConfigAndAddSelector() {
    fetch('assets/config/file_config.json')
        .then(response => response.json())
        .then(config => {
            console.log('📥 Config caricato per selettore');
            
            const folders = config.imagesFolderUrls?.folders || [];
            
            if (folders.length === 0) {
                console.warn('⚠️ Nessuna cartella trovata nel config');
                return;
            }
            
            console.log('📁 Cartelle disponibili:', folders.map(f => f.label).join(', '));
            
            // Se non c'è una cartella salvata, usa la prima
            if (!currentImageFolder) {
                currentImageFolder = folders[0].path;
                console.log('📂 Imposto cartella default:', currentImageFolder);
            }
            
            // Aspetta che la navbar sia pronta
            setTimeout(() => {
                addSelectorToNavbar(folders);
            }, 2000);
        })
        .catch(err => {
            console.error('❌ Errore caricamento config:', err);
        });
}

// ============================================================================
// STEP 3: AGGIUNGI IL SELETTORE ALLA NAVBAR
// ============================================================================

function addSelectorToNavbar(folders) {
    console.log('🔨 Aggiungo selettore alla navbar');
    
    // Cerca direttamente div[header-left] invece di cercare la navbar prima
    const headerLeft = document.querySelector('div[header-left]');
    
    if (!headerLeft) {
        console.warn('⚠️ header-left non trovato');
        return;
    }
    
    console.log('✅ header-left trovato:', headerLeft);
    
    // Rimuovi selettore esistente
    const existing = document.getElementById('image-folder-selector');
    if (existing) {
        existing.remove();
    }
    
    // Crea il select
    const select = document.createElement('select');
    select.id = 'image-folder-selector';
    select.className = 'form-select form-select-sm me-1'; // Aggiungo me-1 come gli altri
    select.style.cssText = `
        display: inline-flex;
        vertical-align: middle;
        align-items: center;
        font-size: 0.8rem;
        height: 31px;
        padding: 5px 10px;
        background-color: #f5ead4;
        color: #362d28;
        border: 1px solid #ccc;
        border-radius: 4px;
        width: auto;
        line-height: 1.5;
        cursor: pointer;
        appearance: none;
        -webkit-appearance: none;
        -moz-appearance: none;
        background-image: 
            linear-gradient(to right, transparent calc(100% - 25px), #ccc4ba calc(100% - 25px)),
            url('data:image/svg+xml;utf8,<svg fill="%23666" height="10" viewBox="0 0 24 24" width="12" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/></svg>');
        background-repeat: no-repeat, no-repeat;
        background-position: right, right 0.5rem center;
        background-size: auto, 12px 10px;
        padding-right: 2rem;
    `.replace(/\s+/g, ' ').trim();
    
    // Aggiungi le opzioni
    folders.forEach(folder => {
        const option = document.createElement('option');
        option.value = folder.path;
        option.textContent = folder.label;
        
        // Seleziona la cartella corrente
        if (folder.path === currentImageFolder) {
            option.selected = true;
            console.log('  ✓ Selezionata:', folder.label);
        }
        
        select.appendChild(option);
    });
    
    // Event listener per il cambio
    select.addEventListener('change', (e) => {
        const newFolder = e.target.value;
        console.log('🔄 Cambio cartella:', currentImageFolder, '→', newFolder);
        
        // Salva in sessionStorage
        sessionStorage.setItem('selectedImageFolder', newFolder);
        
        // Ricarica la pagina
        console.log('♻️ Ricarico la pagina...');
        window.location.reload();
    });
    
    // Aggiungi alla navbar DOPO l'ultimo selettore esistente (evt-ms-desc-selector)
    const msDescSelector = headerLeft.querySelector('evt-ms-desc-selector');
    if (msDescSelector) {
        // Inserisci dopo evt-ms-desc-selector
        msDescSelector.insertAdjacentElement('afterend', select);
        console.log('✅ Selettore inserito dopo evt-ms-desc-selector');
    } else {
        // Fallback: aggiungi alla fine
        headerLeft.appendChild(select);
        console.log('✅ Selettore aggiunto alla fine di header-left');
    }
    
    console.log('✅ Selettore cartelle immagini aggiunto alla navbar!');
}

// ============================================================================
// STEP 4: INIZIALIZZA QUANDO IL DOM È PRONTO
// ============================================================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadConfigAndAddSelector);
} else {
    loadConfigAndAddSelector();
}
