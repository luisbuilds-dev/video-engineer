---
name: estilo
description: Create or adjust an editing style (caption font, size, colors, position, words per caption, cards, hook, pace, loudness). Use when the user types /estilo or asks to change how their reels look.
---

# /estilo

A style is `estilos/<id>.json`, validated by `lib/estilo.ts` (read it for the allowed values: 13 fonts: Inter, Anton, Montserrat, Bebas Neue, Poppins, Oswald, Archivo Black, Barlow Condensed, Space Grotesk, Bricolage Grotesque, DM Serif Display, Permanent Marker, JetBrains Mono).

1. Ask what they want to change, or for a new style ask, one at a time: caption font; caption color and highlight color (hex or a description you convert); words per caption (1-8); caption position (lower third, center); card colors; pace (`velocidad` 1.0-1.3, `silencioMaxMs`).
2. Copy the closest existing style to `estilos/<new-id>.json` with `"estado": "en-prueba"` and apply the changes. Never edit `base-neutra.json`.
3. Validate: `npx tsx -e "import('./lib/estilo.ts').then(m => m.leerEstilo('estilos/<new-id>.json'))"` must not throw.
4. Re-render their last project with the new style (put the style object in its `edicion.json`), run `/revisar` and show them `revision.jpg`.
5. When they approve, set `"estado": "aprobado"` and `"estilo": "<new-id>"` in `config.json`.
