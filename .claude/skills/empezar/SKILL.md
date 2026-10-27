---
name: empezar
description: First run of the engineer on a new machine and for a new user. Use when the user types /empezar, when config.json or entorno.json is missing, or when npm run doctor fails. Recognizes the computer, installs what is missing with permission, then interviews the user to build their personal editing style.
---

# /empezar

Two parts. One question per message, in the user's language. Never install system software yourself.

## Part 1 · Recognize the environment

1. Ask which language to work in.
2. `npm ci` if `node_modules` is missing (tell them it takes a minute).
3. `npm run entorno`: OS, CPU, RAM, GPU, video acceleration, free disk, and which tools exist (ffmpeg, git, make, yt-dlp, whisper.cpp, Claude Code). It writes `entorno.json` with recommendations for THIS machine (Whisper model, render parallelism) and warnings (low disk, low RAM).
4. Summarize in 3-4 lines what you found and what's missing.
5. Missing system tools (ffmpeg, git, make, Node): give the exact command for their OS from `npm run doctor`, wait for "done", re-check. Missing project pieces (whisper.cpp, model): `npm run instalar` shows the plan and size → after a yes, set `"modelo"` in `config.json` to the recommended model and run `npm run instalar -- --si`.
6. Music library (optional, ~150 MB): `npm run musica` → ask → `npm run musica -- --si`.
7. `npm run doctor` must end with everything ✓ (except optional pieces they declined).

## Part 2 · Build their style

8. Ask the questions in `CUESTIONARIO.md`, one by one, offering short options with the recommended one first (recommendations by tone are at the end of that file). If they share brand colors or fonts, use them. If they have a brand guide file, ask for its path and read it.
9. Write `respuestas.json` and run `npm run crear-estilo`. It creates `estilos/<name>.json` (vertical) and/or `estilos/<name>-h.json` (horizontal) in test mode, their living guide, and activates them in `config.json`.
10. Ask for the path of their first raw video and continue with `/limpiar`. After the first delivered video, offer to approve the style (`/estilo`) and run `/aprender`.
