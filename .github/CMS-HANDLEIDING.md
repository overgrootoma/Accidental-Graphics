# Accidental Graphics bewerken met Pages CMS

Met Pages CMS pas je de tools op de homepage, het archief, de galerij en de about-tekst aan
in je browser. Elke keer dat je iets opslaat, komt dat als een commit op GitHub terecht.
GitHub Pages zet de site daarna automatisch online (na 1 à 2 minuten).

## 1. Eenmalig: inloggen

1. Ga naar **https://app.pagescms.org** en kies **Sign in with GitHub**.
2. Geef Pages CMS toegang tot de repository **overgrootoma/Accidental-Graphics**
   (kies "Only select repositories" en voeg deze repository toe, naast je portfolio).
3. Open de repository en kies de branch **main**.

Links zie je nu: **Tools**, **Gallery**, **About** en **Media**.

## 2. Tools: homepage, menu en archief

Onder **Tools** staat één lijst met alle tools. De volgorde van de lijst is de volgorde op de
homepage (en in het archief). **Sleep** een rij om een tool te verplaatsen.

Per tool:

- **Name**: de naam op de kaart en in het menu.
- **Link to the tool**: het pad naar de pagina van de tool, bv. `apps/Swing.html`.
- **Year**: verschijnt als "Since 2025".
- **Cover**: de bewegende achtergrond van de kaart. Een GIF werkt, maar een korte **mp4** is
  tot 10 keer lichter en ziet er hetzelfde uit (alle huidige covers zijn mp4).
  Vierkant werkt het best.
- **Short description**: één zin over wat de tool doet. Staat op de Archive-pagina.
- **In the archive**: aangevinkt = weg van de homepage, wel op de Archive-pagina.
- **Show in the top bar**: aangevinkt = de tool staat in de zwarte balk bovenaan.
  Hou het bij een vijftal, anders worden de namen heel klein.
- **Hide this tool**: verbergt de tool overal (homepage, menu, archief) zonder ze te wissen.

Klik **Save**. Na 1 à 2 minuten staat het online.

**De homepage groeit vanzelf mee.** Twee rijen vullen het scherm. Komen er meer tools bij,
dan komt er een rij bij en kan je scrollen. De Archive-kaart vult altijd de rest van de
laatste rij.

### Een nieuwe tool toevoegen

1. De tool zelf (de HTML-pagina) zet je in de map `apps/` op GitHub (of laat je maken).
2. Upload een cover onder **Media → Covers**.
3. Ga naar **Tools**, klik onderaan de lijst op **Add** (+) en vul naam, link, jaar en cover in.
4. Sleep de tool naar de juiste plek en klik **Save**.

## 3. Gallery

1. Upload de afbeelding onder **Media → Gallery images**.
2. Ga naar **Gallery → Works**, klik onderaan op **Add** (+), kies de afbeelding en vul in wie het maakte
   en met welke tool (de naam precies zoals bij Tools, bv. `Swing`: dan wordt het een link).
3. Klik **Save**.

Tip: exporteer galerijbeelden liefst als JPG van max. ±1600 px breed. De huidige PNG's zijn
elk ±2 MB, terwijl ze op de site maar ±400 px groot getoond worden.

## 4. About

Onder **About** pas je de tekst en de links aan. Laat een lege regel tussen twee alinea's.

## Wat staat niet in het CMS?

- De tools zelf (de code van elke tool).
- De verborgen Inspiration-pagina (`inspiration.html`): die bestaat nog, maar staat niet meer
  in het menu en wordt niet door Google opgenomen. Terugzetten = de link terug in
  `scripts/navMenu.js` zetten.
