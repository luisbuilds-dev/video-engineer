---
name: limpiar
description: Turn a raw talking-head video into a clean take. Use when the user gives a raw video or types /limpiar. Transcribes locally, proposes the clean text (no repeated takes, fillers or long pauses), waits for approval and cuts.
---

# /limpiar

1. Choose a short project id from the topic (lowercase, dashes) and run:
   `npm run transcribir -- --proyecto <id> --video "<path>"`
   It prints every word with its index (`12:word`). The original video is copied, never touched.
2. Read the indexed transcript and build the clean version:
   - Remove repeated takes (keep the LAST good one), false starts, fillers (eh, este, o sea, um, uh, like…) and anything the user says to themselves.
   - Fix words Whisper misheard, especially names and brands: `{"i": 3, "texto": "Remotion"}`.
   - Never reword. Never reorder.
3. Show the user the clean text as plain prose, then one line: "Quité: …" listing what you removed. Ask for approval or changes.
4. When approved, write `proyectos/<id>/aprobadas.json`: the ordered list of kept indices, with `{"i": n, "texto": "..."}` objects for corrected words.
5. Run `npm run cortar -- --proyecto <id>` and report the before → after duration.
6. Offer `/editar`.
