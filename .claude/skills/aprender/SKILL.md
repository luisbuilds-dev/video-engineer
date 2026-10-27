---
name: aprender
description: Learn from each delivered video so the next edit fits the user better. Runs automatically at the end of /revisar when a video is delivered, or when the user types /aprender or gives feedback about their style ("I don't like…", "more effects", "always…").
---

# /aprender

The guide `estilos/<style>.guia.md` is the user's living editing guide. Read it at the start of every /editar and follow it.

1. Look at what the user changed during this edit compared with your first proposal (hook, cards, effects density, caption position, cuts) and what they said about the result.
2. Ask ONE short question: "¿Qué cambiarías de este vídeo para los próximos?" (in their language). If they answer "nada", that's fine.
3. Update the guide sections by hand, short bullets with the date:
   - **Le gusta / No le gusta**: concrete and reusable ("cards in sentence case, never ALL CAPS", "fewer whooshes").
   - **Ganchos que funcionaron**: the hook used and its category, when the user liked it.
   If a bullet already exists, add `(×2)`, `(×3)` instead of repeating it.
4. Run `npm run aprender -- --proyecto <id> --nota "<their answer, short>"` to save the numbers (history and «Tus números»). Put the hook category in `decisiones.json` → `gancho.categoria` before running it.
5. When a preference reaches `(×3)` and maps to a style field (font, colors, `efectos.densidad`, `ritmo.maxPlanoMs`, `subtitulos.maxPalabras`…), propose changing the style and apply it only with their yes (via /estilo).
Keep the guide under ~60 lines: merge similar bullets, delete what the user later contradicted.
