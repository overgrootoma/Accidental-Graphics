# Accidental Graphics

Experimentele browsertools om "per ongeluk" grafisch werk te maken, door Jorne Scholiers.
Live via GitHub Pages vanaf `main`. Netlify (project `accidentalgraphics`) bouwt per PR een
deploy preview op `https://deploy-preview-<nr>--accidentalgraphics.netlify.app`: gebruik die om een PR
in een echte browser of op je telefoon te bekijken. Jorne schrijft Nederlands: antwoord in het Nederlands.
Code, commentaar en commitberichten zijn in het Engels.

## Stack

- Pure HTML/CSS/vanilla JS. **Geen build-stap, geen package.json, geen frameworks.**
  Elk bestand moet werken zoals het op GitHub Pages staat. Voeg geen bundler of npm-dependency toe
  zonder dat Jorne erom vraagt.
- Externe bronnen alleen waar al gebruikt (Google Fonts "Doto"). Liever system fonts.
- Content komt uit `content/*.json`, bewerkt via **Pages CMS** (`.pages.yml`,
  handleiding `.github/CMS-HANDLEIDING.md`). Elke CMS-save is een commit op `main`:
  pull altijd eerst voor je verder werkt.

## Structuur

| Pad | Wat |
| --- | --- |
| `index.html`, `archive.html`, `gallery.html`, `about.html` | Site-pagina's, gevuld vanuit `content/*.json` |
| `inspiration.html` | Bestaat nog, maar niet meer gelinkt |
| `apps/*.html` | Actieve tools, elk één zelfstandig HTML-bestand (Swing, ColorRangeLab, MotionStills, IMAGEine, fotogrid) |
| `apps/Isolation/` | Grootste tool (~7000 regels `app.js`), eigen `styles.css` en `encoders.js` (video-export) |
| `archiveApps/` | Oudere tools, op de Archive-pagina |
| `scripts/navConfig.js` | Laadt `content/*.json` → `window.AGContent`; gedeeld door alle pagina's |
| `scripts/navMenu.js` | Zwarte menubalk bovenaan |
| `scripts/settingsToggle.js` | Verberg/toon het instellingenpaneel (knop + H-toets) |
| `scripts/sampleMedia.js` | Voorbeeldbeelden/-video's in de tools |
| `css/style.css`, `css/nav.css` | Gedeelde stijl |
| `images/covers/` | Korte mp4-covers per tool (vervangen de oude GIF's) |
| `tools/` | MIDI-brug voor Safari (`midi-bridge.py`, Nederlandse uitleg in `MIDI-BRUG.md`) en `smoke-test.js` |

## Een nieuwe tool toevoegen

1. Maak `apps/NaamTool.html` (of een map `apps/NaamTool/` als het groot wordt). Kopieer de `<head>`
   van een bestaande tool: `../css/style.css`, `../css/nav.css`, favicon, en de scripts
   `navConfig.js`, `navMenu.js` en `settingsToggle.js` met `data-panel="#jouwPaneel"`.
2. Zet een entry in `content/tools.json` (name, link, year, cover, description, archived, in_menu, hidden).
   De volgorde daar is de volgorde op de homepage. Hou `in_menu` op max. ~5 tools.
3. Cover: korte, vierkante mp4 in `images/covers/` (zie agent `asset-prep`).

## Conventies

- Paden altijd relatief (`../images/...`), nooit met leading slash: de site moet ook in een submap werken.
  In CSS zijn `url()`'s relatief aan het CSS-bestand.
- Alles draait lokaal in de browser; niets wordt naar een server gestuurd.
- Performance telt: tools tekenen live op canvas. Let op allocaties in de render-loop.
- Commitstijl: `Toolnaam: wat er verandert` (bv. `Isolation: loop mode`), of `All apps: ...`.
- `.DS_Store` hoort niet in git.

## Testen

Er zijn geen unit tests. Controleer elke wijziging in een echte browser:

```
python3 -m http.server 8765        # in de repo-root
node tools/smoke-test.js           # alle pagina's: JS-fouten, console-fouten, 404's
node tools/smoke-test.js apps/Swing.html   # één pagina
```

Voor interactie (tekenen, sliders, export) laat je de agent `tool-tester` de tool echt bedienen.
Safari heeft geen Web MIDI; MIDI test je in Chromium of via de brug in `tools/`.

## Subagents (`.claude/agents/`)

- `tool-tester`: start de site lokaal, bedient een tool met Playwright, maakt screenshots en meldt fouten.
- `figma-to-tool`: zet een Figma-ontwerp om naar een tool-pagina of UI-onderdeel in de stijl van deze repo.
- `asset-prep`: covers, galerijbeelden en voorbeeldmedia klaarmaken (ffmpeg, Adobe-connector).

Gebruik ze voor werk dat los van de hoofdtaak kan; kleine wijzigingen doe je gewoon zelf.
