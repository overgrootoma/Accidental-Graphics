# MIDI in Safari

Safari kan zelf geen MIDI-controllers lezen (Apple heeft Web MIDI nooit ingebouwd). Chrome en Firefox
wel: daar werkt MIDI Learn zonder iets extra.

Voor Safari is er een kleine brug: een script dat je controller via macOS leest en doorgeeft aan de
app. Er hoeft niets geïnstalleerd te worden, het gebruikt alleen de Python die al op je Mac staat.
Alles blijft op je eigen computer.

## Starten

1. Sluit je controller aan (mag ook later).
2. Dubbelklik in deze map op **MIDI-brug.command**.
   Terminal opent, de brug start en Safari opent `http://localhost:8765/apps/Isolation/`.
   (De eerste keer kan macOS vragen of Terminal de map Documenten mag openen: kies Sta toe.)
3. Laat het Terminal-venster open zolang je speelt. Sluit het om te stoppen.

Liever zelf in Terminal, vanuit de map van de site:

```
python3 tools/midi-bridge.py
```

## Gebruiken

- Rechtsklik op een slider, kies **Learn MIDI** en draai aan een knop of schuif een fader.
- In de groep **Live** staat "MIDI via bridge". Als je met de muis op die regel blijft staan, zie je
  welke controllers de brug ziet.
- Stop je de brug en start je ze opnieuw, dan verbindt de app vanzelf weer.

## Goed om te weten

- Werk in Safari via het `localhost`-adres. Dat is je eigen map: wat je hier aanpast zie je meteen,
  ook als het nog niet online staat.
- De online site (github.io) probeert in Safari ook met de brug te verbinden, maar Safari kan dat
  blokkeren. Het `localhost`-adres werkt altijd.
- Koppelingen tussen knoppen en sliders worden per browser en per adres bewaard. Op `localhost` link
  je ze dus één keer opnieuw.
