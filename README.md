<p align="center"><img src="assets/banner.png" alt="Video Engineer" width="100%"></p>

<h1 align="center">Video Engineer</h1>

<p align="center"><b>Your video editing engineer for Claude Code: Reels, TikTok, Shorts and YouTube.</b><br>
You record. It cleans the raw take, adds captions that never cover your face, graphics, effects and music, renders with Remotion and checks the result before handing it over.</p>

<p align="center">
  <img src="https://img.shields.io/badge/Claude_Code-kit-D97757" alt="Claude Code">
  <img src="https://img.shields.io/badge/Remotion-4-0B84F3" alt="Remotion 4">
  <img src="https://img.shields.io/badge/Windows_·_macOS_·_Linux-informational" alt="Windows, macOS and Linux">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT">
</p>

<p align="center"><a href="README.es.md">🇪🇸 Español</a> · <a href="https://luisbuilds.com/h/video-engineer">Step-by-step guide (ES)</a></p>

---

## What it does

1. **Transcribes** your raw take word by word with Whisper, on your computer, offline.
2. **Cleans** it: proposes the text without retakes, fillers or long pauses. **You approve it** before anything is cut.
3. **Edits**: a hook in the first seconds, word-by-word captions, cards, graphics, illustrations, sound effects and music. Claude decides; Remotion draws.
4. **Renders** vertical (1080×1920) or horizontal (1920×1080) video, bt709 color, loudness at -14 LUFS (what Instagram, TikTok and YouTube use).
5. **Reviews** loudness, frozen shots, black frames, readability and leaked personal data **before** delivering anything.

Your original recording is never touched: the kit works on a copy, and a hook blocks any attempt to delete or overwrite it.

## Quick start

You need **Node.js 20+**, **ffmpeg** and **Claude Code**. The doctor tells you what is missing and how to install it.

```bash
git clone https://github.com/luisbuilds-dev/video-engineer.git
cd video-engineer
npm ci
claude
```

Inside Claude Code type **`/empezar`** ("start"). It checks your setup, installs what is missing with your permission and asks a short style questionnaire. The commands have Spanish names, but the engineer talks to you in your own language.

## Features

- **Captions that never cover you**: every frame is analyzed (face and motion) and each caption, card and graphic is placed where it covers nothing, without jumping around.
- **Smart framing**: record vertical and publish on YouTube (or the other way round). The frame follows your face so it is always complete, with a blurred fill on the sides when needed.
- **Animated graphics**: counting numbers, compared bars, checklists that tick as you say them, stamps.
- **Illustrations of what you say**: 2,000+ icons that draw themselves and animated scenes (process with arrows, chaos → order, before / after, parts snapping together). Missing an icon? It finds one on Iconify (free licenses only) and saves it with its credit.
- **Real brand logos** from 3,000+ brands (in their color, with a soft glow) and **diagrams** that draw as you speak (flow, radial or tree).
- **Header**: a section bar that fills up like a timer and a waveform that moves with your voice.
- **Screen recordings** with smooth zooms to what you talk about, while you appear in a floating bubble.
- **Your data stays private**: a local OCR finds emails, phone numbers, ID numbers, cards, bank accounts, API keys, IPs, passwords and any phrase you mark as private in your screen recordings. It **asks you** before blurring them, the blur follows scrolls and zooms, and the final video is read again: if anything is still legible, it is not delivered.
- **14 original sound effects** and **10 camera effects**, placed automatically according to your style and always below your voice.
- **24 background tracks** by Kevin MacLeod (CC BY 4.0): the engineer picks the most energetic part, ducks it while you talk and writes the credit for your post.
- **YouTube chapters** with transition cards and the timestamps ready for the description.
- **13 fonts**, your own styles, and a **guide that learns from every video** what you like.
- **Virality advice**: a retention score from 8 signals, what to fix, and the caption and hashtags.

## Commands

| In Claude Code | What for |
|---|---|
| `/empezar` | First run: checks the setup and configures you |
| `/limpiar` | A new raw take: transcribe, propose the clean text, cut |
| `/editar` | Hook, graphics, render and review |
| `/revisar` | Review a render again |
| `/estilo` | Your own style: fonts, colors, captions, pace, effects |
| `/consejos` | Retention score, what to improve and texts for the post |
| `/aprender` | Updates your style guide after each delivered video |
| `/ampliar` | Ask for something the kit can't do yet: it researches it, builds it with tests and adds it |

The scripts also work on their own: `npm run doctor`, `transcribir`, `cortar`, `analizar`, `componer`, `render`, `revisar`.

## Why it uses few tokens

- The math (timings, cuts, loudness, placement, OCR) is done by scripts, not by the model.
- To review, Claude **doesn't watch the video**: it looks at one image with 12 frames and a numeric report.

## Requirements

| | Windows | macOS | Linux |
|---|---|---|---|
| Node.js 20+ | [nodejs.org](https://nodejs.org) | [nodejs.org](https://nodejs.org) | package manager |
| ffmpeg | `winget install Gyan.FFmpeg` | `brew install ffmpeg` | `sudo apt install ffmpeg` |
| To build whisper.cpp | — | `xcode-select --install` | `sudo apt install build-essential git` |

Whisper (~466 MB with the `small` model) is installed inside the project folder with `npm run instalar -- --si`.

## FAQ

**Do my videos leave my computer?**
No. Transcription, cuts, OCR and rendering happen on your machine. Claude only reads the transcript and a contact sheet.

**Which languages?**
Any language Whisper understands. With a strong accent or noise, the `medium` model is more accurate.

**Do I have to pay?**
The kit is free and open source. You need Claude Code with your account. Remotion is free for individuals and companies of up to 3 people; bigger companies should check its [license](https://www.remotion.dev/license).

## Support

Provided **as is**, free and without guaranteed support. Security issues: please report them privately (see [SECURITY.md](SECURITY.md)).

---

<p align="center">Made by <a href="https://luisbuilds.com">Luis Cabrera</a> · <a href="LICENSE">MIT License</a> · Built on <a href="https://www.remotion.dev">Remotion</a> and <a href="https://github.com/ggml-org/whisper.cpp">whisper.cpp</a> · <a href="NOTICE.md">Third-party notices</a></p>
