---
name: revisar
description: Quality check of a rendered reel before delivering it. Use after every render or when the user types /revisar. Checks loudness, frozen or black frames and readability from a single contact-sheet image, and fixes what it can.
---

# /revisar

1. Run `npm run revisar -- --proyecto <id>`. It writes `revision.json` and `revision.jpg` (12 frames, one image).
2. Delegate the visual check to the `revisor` subagent with the path of `revision.jpg` and the hook and card texts. Do not open the video.
3. Decide:
   - **All good** (exit 0 and the revisor found nothing): deliver. Tell the user the path `proyectos/<id>/salida.mp4`, the duration and the loudness. Then run `/consejos` and `/aprender`.
   - **Fixable**: frozen frames → check the cut points in `aprobadas.json`; text overlapping or cut off → shorten the hook/card or move it in time; loudness off → render again. Fix, render and review again, at most twice.
   - **Not fixable by you** (e.g. the raw video itself is frozen or silent): explain it in one or two sentences.
4. Never deliver a reel that failed the check without saying exactly what failed.
