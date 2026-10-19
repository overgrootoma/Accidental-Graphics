#!/bin/bash
# Dubbelklik om de MIDI-brug te starten en Isolation in Safari te openen.
# Laat het Terminal-venster open zolang je speelt; sluit het om te stoppen.
cd "$(dirname "$0")/.." || exit 1
(sleep 1 && open -a Safari "http://localhost:8765/apps/Isolation/") &
exec python3 -B tools/midi-bridge.py
