---
name: consejos
description: Virality advice for an edited video. Runs at the end of /revisar and when the user asks how to make a video perform better ("¿qué le falta?", "consejos", "¿se hará viral?"). Combines measured retention signals with an expert read of the hook, structure and caption.
---

# /consejos

1. Run `npm run consejos -- --proyecto <id>`. It scores retention 0-100 from measurable signals (start, hook text, first-3-seconds pace, re-hook, flat stretches, length, fillers, call to action) and writes `consejos.json`.
2. Read `cortadas.json` (what is said) and `decisiones.json` (hook, cards, moments). Judge what a script can't:
   - Does the first spoken line deliver the promise of the on-screen hook? Does the video close the open loop?
   - Value ladder: partial value → next question → example → re-hook → mechanism → payoff (never hook → full answer → generic tips).
   - Is there a moment worth rewatching or sending to a friend (a number, a reveal, a before/after)?
   - Loop: could the last line flow back into the first?
3. Answer in the user's language with **at most 5 tips, most impactful first**, each one: what to change + where (second) + how. Say which ones you can fix now automatically (cards, moments, cuts, zooms) and offer to do it; the rest need re-recording (say so honestly).
4. Write 2 caption options for the post (the caption is a second hook: name the mechanism or invite a comment on the open question; never repeat the spoken line) and 3-5 specific hashtags.
5. Never promise virality or views. If the content itself is weak (no clear payoff), say it kindly and propose a better angle for the next recording.
If the user keeps a file of viral patterns from their niche (they will give you the path), read it and compare against it.
