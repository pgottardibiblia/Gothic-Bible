# 📘 GUIDA CSS: Tabelle Eusebian Canons

**Progetto:** Codex Argenteus - EVT3  
**File:** custom-styles.css  
**Data:** 2025-12-14  
**Autore:** Documentazione tecnica

---

## 📋 INDICE

1. [Panoramica](#panoramica)
2. [Struttura TEI supportata](#struttura-tei)
3. [Funzionalità CSS](#funzionalita)
4. [Layout e colori](#layout-colori)
5. [Responsive design](#responsive)
6. [Print styles](#print)
7. [Personalizzazione](#personalizzazione)
8. [Esempi d'uso](#esempi)

---

## 📌 PANORAMICA {#panoramica}

Il CSS aggiunto a `custom-styles.css` implementa la visualizzazione completa delle **tabelle Eusebian Canons** del Codex Argenteus. Queste tabelle mostrano le concordanze tra i quattro Vangeli (Giovanni, Luca, Marco, Matteo) con layout a griglia 4 colonne.

### Caratteristiche principali

✅ **Layout grid 4 colonne** - CSS Grid per struttura perfetta  
✅ **Colori oro/argento** - Gold ink per evangelisti, silver ink per numeri  
✅ **Bordi colorati evangelisti** - Orange (Gv), Green (Lc), Red (Mc), Blue (Mt)  
✅ **Responsive design** - 4→2→1 colonne (desktop→tablet→mobile)  
✅ **Print styles** - Ottimizzato per stampa in bianco/nero  
✅ **Celle vuote gestite** - Opacity ridotta per `value="·"`

---

## 🏗️ STRUTTURA TEI SUPPORTATA {#struttura-tei}

### Markup XML

```xml
<fw type="footer" place="bottom_center">
  <table type="eusebian_canons" xml:id="CArg_90r_tb">
    <!-- Header row - Evangelist names in gold -->
    <row xml:id="CArg_90r_tb_row_1" n="1">
      <w xml:id="CArg_90r_tb_ana_Gv" ana="Gv" rend="gold_ink">ïoh(annes)</w>
      <w xml:id="CArg_90r_tb_ana_Lc" ana="Lc" rend="gold_ink">luk(a)</w>
      <w xml:id="CArg_90r_tb_ana_Mc" ana="Mc" rend="gold_ink">m(a)r(kus)</w>
      <w xml:id="CArg_90r_tb_ana_Mt" ana="Mt" rend="gold_ink">m(a)þ(þaius)</w>
    </row>
    
    <!-- Data rows - Numbers in silver -->
    <row xml:id="CArg_90r_tb_row_2" n="2">
      <num rend="silver_ink" value="46">
        <w xml:id="CArg_90r_tb_Mt_1">kg</w>
      </num>
      <num rend="silver_ink" value="45">
        <w xml:id="CArg_90r_tb_Mt_1">kg</w>
      </num>
      <num rend="silver_ink" value="27">
        <w xml:id="CArg_90r_tb_Mt_1">kg</w>
      </num>
      <num rend="silver_ink" value="23">
        <w xml:id="CArg_90r_tb_Mt_1">kg</w>
      </num>
    </row>
    
    <!-- More rows... -->
  </table>
</fw>
```

### Elementi chiave

| Elemento | Attributo | Ruolo |
|----------|-----------|-------|
| `<table>` | `type="eusebian_canons"` | Contenitore tabella |
| `<row>` | `n="1"` (header), `n="2+"` (data) | Righe |
| `<w>` | `ana="Gv|Lc|Mc|Mt"` | Nomi evangelisti (header) |
| `<w>` | `rend="gold_ink"` | Testo in oro |
| `<num>` | `rend="silver_ink"` | Numeri in argento |
| `<num>` | `value="·"` | Celle vuote |

---

## 🎨 FUNZIONALITÀ CSS {#funzionalita}

### 1. Table Container

```css
table[type="eusebian_canons"] {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.5rem;
  margin: 1rem 0;
  padding: 1rem;
  background-color: #faf8f3;
  border: 2px solid #8b7355;
  border-radius: 4px;
}
```

**Features:**
- Display grid (una colonna per le righe)
- Background beige (#faf8f3) - simula pergamena
- Bordo marrone (#8b7355)
- Padding e margini bilanciati
- Border radius per angoli smussati

### 2. Row Layout

```css
table[type="eusebian_canons"] > row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
  align-items: center;
}
```

**Features:**
- 4 colonne uguali (1fr ciascuna)
- Gap 0.75rem tra celle
- Allineamento verticale centrato

### 3. Header Row (n="1")

```css
table[type="eusebian_canons"] > row[n="1"] {
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #8b7355;
  margin-bottom: 0.5rem;
  font-weight: 600;
}
```

**Features:**
- Bordo inferiore per separare header da dati
- Font-weight bold (600)
- Padding/margin per spaziatura

### 4. Gold Ink (Evangelisti)

```css
table[type="eusebian_canons"] *[rend~="gold_ink"] {
  color: #d4af37;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

**Features:**
- Colore oro (#d4af37)
- Maiuscole (text-transform: uppercase)
- Letter-spacing aumentato (0.05em)
- Bold

### 5. Silver Ink (Numeri)

```css
table[type="eusebian_canons"] *[rend~="silver_ink"] {
  color: #c0c0c0;
  font-family: 'Times New Roman', serif;
  font-size: 1.1em;
}
```

**Features:**
- Colore argento (#c0c0c0)
- Font serif (Times New Roman)
- Size aumentato (1.1em)

### 6. Evangelist Colors (Border Left)

```css
/* Giovanni/John - Orange */
table[type="eusebian_canons"] > row > w[ana="Gv"],
table[type="eusebian_canons"] > row > num:nth-child(1) {
  border-left: 3px solid #f39c12;
}

/* Luca/Luke - Green */
table[type="eusebian_canons"] > row > w[ana="Lc"],
table[type="eusebian_canons"] > row > num:nth-child(2) {
  border-left: 3px solid #2ecc71;
}

/* Marco/Mark - Red */
table[type="eusebian_canons"] > row > w[ana="Mc"],
table[type="eusebian_canons"] > row > num:nth-child(3) {
  border-left: 3px solid #e74c3c;
}

/* Matteo/Matthew - Blue */
table[type="eusebian_canons"] > row > w[ana="Mt"],
table[type="eusebian_canons"] > row > num:nth-child(4) {
  border-left: 3px solid #3498db;
}
```

**Features:**
- Bordo sinistro 3px colorato per colonna evangelista
- Colori distintivi per identificazione rapida
- Applicato sia a header che a celle dati

### 7. Empty Cells

```css
table[type="eusebian_canons"] num[value="·"],
table[type="eusebian_canons"] num:empty {
  opacity: 0.5;
}
```

**Features:**
- Opacity ridotta (50%) per celle vuote o con "·"
- Indica visivamente assenza di concordanza

---

## 📱 RESPONSIVE DESIGN {#responsive}

### Tablet (max-width: 768px)

```css
@media (max-width: 768px) {
  table[type="eusebian_canons"] > row {
    grid-template-columns: repeat(2, 1fr);
  }
  
  table[type="eusebian_canons"] > row > w[ana="Mc"],
  table[type="eusebian_canons"] > row > w[ana="Mt"],
  table[type="eusebian_canons"] > row > num:nth-child(3),
  table[type="eusebian_canons"] > row > num:nth-child(4) {
    margin-top: 0.5rem;
  }
}
```

**Layout:**
- 4 colonne → 2 colonne
- Prima riga: Gv + Lc
- Seconda riga: Mc + Mt
- Margin-top per separazione visiva

### Mobile (max-width: 480px)

```css
@media (max-width: 480px) {
  table[type="eusebian_canons"] > row {
    grid-template-columns: 1fr;
  }
  
  table[type="eusebian_canons"] > row > w,
  table[type="eusebian_canons"] > row > num {
    margin-top: 0.25rem;
  }
}
```

**Layout:**
- 2 colonne → 1 colonna
- Ogni cella su riga separata
- Margin-top tra celle (0.25rem)

---

## 🖨️ PRINT STYLES {#print}

```css
@media print {
  table[type="eusebian_canons"] {
    page-break-inside: avoid;
    background-color: white;
    border-color: black;
  }
  
  table[type="eusebian_canons"] *[rend~="gold_ink"] {
    color: #000;
    font-weight: bold;
  }
  
  table[type="eusebian_canons"] *[rend~="silver_ink"] {
    color: #666;
  }
}
```

**Features:**
- **page-break-inside: avoid** - Tabella non spezzata tra pagine
- **Background bianco** - Risparmio inchiostro
- **Bordi neri** - Contrasto massimo
- **Gold ink → nero bold** - Leggibilità
- **Silver ink → grigio (#666)** - Contrasto preservato

---

## 🎨 PERSONALIZZAZIONE {#personalizzazione}

### Cambiare colori evangelisti

```css
/* Cambia da orange a purple per Giovanni */
table[type="eusebian_canons"] > row > w[ana="Gv"],
table[type="eusebian_canons"] > row > num:nth-child(1) {
  border-left: 3px solid #9b59b6; /* Purple */
}
```

### Cambiare background tabella

```css
/* Da beige a purple parchment (Codex Argenteus) */
table[type="eusebian_canons"] {
  background-color: #4a1850; /* Purple */
}

/* Gold ink più chiaro per contrasto */
table[type="eusebian_canons"] *[rend~="gold_ink"] {
  color: #ffd700; /* Brighter gold */
}
```

### Aggiungere ombra

```css
table[type="eusebian_canons"] {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
```

### Cambiare font numeri

```css
table[type="eusebian_canons"] *[rend~="silver_ink"] {
  font-family: 'Georgia', 'Garamond', serif;
}
```

---

## 💡 ESEMPI D'USO {#esempi}

### Esempio 1: Tabella Standard

```xml
<table type="eusebian_canons" xml:id="table_1">
  <row n="1">
    <w ana="Gv" rend="gold_ink">John</w>
    <w ana="Lc" rend="gold_ink">Luke</w>
    <w ana="Mc" rend="gold_ink">Mark</w>
    <w ana="Mt" rend="gold_ink">Matthew</w>
  </row>
  <row n="2">
    <num rend="silver_ink" value="46"><w>46</w></num>
    <num rend="silver_ink" value="45"><w>45</w></num>
    <num rend="silver_ink" value="27"><w>27</w></num>
    <num rend="silver_ink" value="23"><w>23</w></num>
  </row>
</table>
```

**Risultato:**
- Header con nomi evangelisti in oro maiuscolo
- Bordi colorati per colonna (orange, green, red, blue)
- Numeri in argento, font serif
- Layout grid 4 colonne

### Esempio 2: Con celle vuote

```xml
<row n="3">
  <num rend="silver_ink" value="47"><w>47</w></num>
  <num rend="silver_ink" value="·"><w>·</w></num>
  <num rend="silver_ink" value="64"><w>64</w></num>
  <num rend="silver_ink" value="147"><w>147</w></num>
</row>
```

**Risultato:**
- Seconda colonna (Luca) con opacity 50%
- Indica assenza di concordanza in quel vangelo

---

## 🔧 INSTALLAZIONE

### 1. Copia CSS

Aggiungi il contenuto del file `custom-styles.css` al tuo progetto EVT3:

```
/path/to/evt3/src/assets/css/custom-styles.css
```

### 2. Link nel progetto

Assicurati che EVT3 carichi il CSS custom:

```html
<!-- In index.html o nel componente principale -->
<link rel="stylesheet" href="assets/css/custom-styles.css">
```

### 3. Verifica TEI

Controlla che le tue tabelle TEI usino la struttura corretta:
- `<table type="eusebian_canons">`
- `<row n="X">`
- `<w ana="Gv|Lc|Mc|Mt" rend="gold_ink">`
- `<num rend="silver_ink">`

---

## 📊 SPECIFICHE TECNICHE

### Browser Support

✅ Chrome/Edge 88+  
✅ Firefox 85+  
✅ Safari 14+  
✅ Opera 74+

**Features usate:**
- CSS Grid (full support)
- Media queries (full support)
- Attribute selectors (full support)
- nth-child() (full support)

### Performance

- **Rendering:** Molto veloce (CSS Grid nativo)
- **Responsiveness:** Smooth (media queries CSS)
- **Print:** Ottimizzato (no background by default)

### File Size

- **CSS aggiunto:** ~2.5 KB
- **Total custom-styles.css:** ~4 KB
- **Impact:** Minimo

---

## ✅ CHECKLIST TESTING

**Visual testing:**
- [ ] Tabella renderizza con 4 colonne su desktop
- [ ] Header row ha bordo inferiore
- [ ] Evangelisti in oro (gold_ink)
- [ ] Numeri in argento (silver_ink)
- [ ] Bordi colorati per colonna (orange, green, red, blue)
- [ ] Celle vuote con opacity ridotta
- [ ] Background beige, bordo marrone

**Responsive testing:**
- [ ] 2 colonne su tablet (768px)
- [ ] 1 colonna su mobile (480px)
- [ ] Margin/padding corretti su tutti breakpoints

**Print testing:**
- [ ] Tabella non spezzata tra pagine
- [ ] Background bianco
- [ ] Testo nero/grigio (no colori)
- [ ] Bordi neri

---

## 🎯 BEST PRACTICES

### DO ✅

- Usa sempre `type="eusebian_canons"` per attivare gli stili
- Mantieni struttura `<row>` → `<w>` o `<num>`
- Usa `rend="gold_ink"` per header
- Usa `rend="silver_ink"` per numeri
- Aggiungi `value="·"` per celle vuote
- Testa su mobile/tablet/desktop
- Verifica print styles

### DON'T ❌

- Non usare `<cell>` invece di `<w>/<num>`
- Non omettere `type="eusebian_canons"`
- Non cambiare struttura row/cell senza aggiornare CSS
- Non usare colori inline style (usa rend attributes)
- Non nidificare tabelle
- Non usare table layout (non CSS Grid)

---

## 📚 RIFERIMENTI

**TEI Guidelines:**
- [TEI Tables](https://tei-c.org/release/doc/tei-p5-doc/en/html/FT.html#FTTAB1)
- [TEI @rend attribute](https://tei-c.org/release/doc/tei-p5-doc/en/html/ref-att.global.rendition.html)

**CSS Reference:**
- [CSS Grid Layout](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Grid_Layout)
- [CSS Media Queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Media_Queries)
- [CSS Attribute Selectors](https://developer.mozilla.org/en-US/docs/Web/CSS/Attribute_selectors)

**EVT3 Documentation:**
- [EVT3 GitHub](https://github.com/evt-project/evt-viewer-angular)
- [EVT3 Custom Styles](https://evt-project.github.io/evt-viewer-angular/docs/configuration/custom-styles)

---

## 🎉 CONCLUSIONI

Il CSS implementato fornisce una **visualizzazione completa e professionale** delle tabelle Eusebian Canons del Codex Argenteus in EVT3.

**Features complete:**
✅ Layout grid 4 colonne  
✅ Colori oro/argento  
✅ Bordi colorati evangelisti  
✅ Responsive design (4→2→1)  
✅ Print optimization  
✅ Celle vuote gestite  
✅ Personalizzabile  
✅ Browser compatible  
✅ Performance ottimale

**Pronto per produzione!** 🚀

---

**Fine documento**
