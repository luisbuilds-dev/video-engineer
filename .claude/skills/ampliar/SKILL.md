---
name: ampliar
description: Add a capability the engineer doesn't have yet. Use when the user asks for an effect, graphic, transition, sound, format or workflow that doesn't exist in this kit ("quiero un efecto de …", "¿puedes hacer …?", "como el de este reel"). Researches how to build it, proposes a plan, implements it with tests and registers it so future edits can use it.
---

# /ampliar

The kit is meant to grow with each request. Never fake a feature with a one-off hack in a project file.

1. **Check first**: is it already possible? Look at `lib/camara.ts` (camera effects), `lib/efectos.ts` (moments: cifra, barras, lista, sello, sonido, camara), `src/componentes/`, `sonidos/catalogo.json` and the style schema `lib/estilo.ts`. If it exists, just use it and tell the user where it lives.
2. **Research** (this is the only skill that browses): the Remotion docs (remotion.dev/docs: animations, `interpolate`, `spring`, `@remotion/transitions`, `@remotion/paths`, `@remotion/noise`…), official package docs and, for a look the user showed you, describe it in 3-4 concrete visual steps. Prefer what Remotion already provides over new dependencies.
3. **Propose** in 3-5 lines: what it will look/sound like, where it plugs in (a new camera effect, a new moment type, a new component, a style option, a new sound recipe in `herramientas/sintetizar-sfx.ts`), new dependencies (if any: name, license, size) and the cost. Wait for a yes.
4. **Build** following the existing patterns:
   - Pure logic in `lib/` with a test in `tests/` (deterministic: no `Math.random`, Remotion renders frames in parallel).
   - Visuals in `src/componentes/`, sizes multiplied by `escala` so they work in vertical and horizontal.
   - Anything placed on screen goes through `componer` so it never covers the face or other text.
   - Sounds: only original (synthesized), CC0 or licenses that allow redistribution; record the origin in `sonidos/catalogo.json` and `NOTICE.md`.
   - Update the docs: the moment list in `.claude/skills/editar/SKILL.md` and the table in `README.md`.
5. **Prove it**: `npm test`, `node tests/prueba-render.mjs`, then render the user's last project with the new feature, run `/revisar` and show the contact sheet.
6. Commit with a clear message. Tell the user in one line how to ask for it next time.
