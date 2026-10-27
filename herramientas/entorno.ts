// npm run entorno — primer paso de /empezar: reconoce el equipo y recomienda cómo trabajar en ÉL.
// Solo lee (no instala nada). Escribe entorno.json para que el resto de herramientas y Claude lo usen.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, statfsSync, writeFileSync } from "node:fs";
import { cpus, freemem, platform, release, totalmem, arch } from "node:os";
import { join } from "node:path";
import { WHISPER_DIR } from "../lib/config";
import { RAIZ } from "../lib/proyecto";

// en Windows, npm y claude son scripts .cmd: Node solo los ejecuta a través de la consola (shell)
const corre = (cmd: string, args: string[], consola = false) => {
  const opciones = { encoding: "utf8" as const, timeout: 15000 };
  // con consola, una sola cadena (los argumentos son fijos de este archivo, nunca vienen del usuario)
  const r = consola && process.platform === "win32" ? spawnSync([cmd, ...args].join(" "), { ...opciones, shell: true }) : spawnSync(cmd, args, opciones);
  return r.error || r.status !== 0 ? null : (r.stdout || r.stderr).trim();
};
const primera = (s: string | null) => s?.split("\n")[0].trim() ?? null;
const GB = (b: number) => +(b / 1024 ** 3).toFixed(1);

const so = platform(); // win32 | darwin | linux
const nucleos = cpus().length;
const ram = GB(totalmem());
const nvidia = primera(corre("nvidia-smi", ["--query-gpu=name,memory.total", "--format=csv,noheader"]));
const appleSilicon = so === "darwin" && arch() === "arm64";
const ffmpegV = primera(corre("ffmpeg", ["-version"]));
const encoders = corre("ffmpeg", ["-hide_banner", "-encoders"]) ?? "";
const aceleracion = ["h264_nvenc", "h264_videotoolbox", "h264_qsv", "h264_amf"].filter((e) => encoders.includes(e));
let libreGB = 0;
try { const s = statfsSync(RAIZ); libreGB = GB(s.bavail * s.bsize); } catch { /* sin datos */ }
const modelos = existsSync(WHISPER_DIR) ? readdirSync(WHISPER_DIR).filter((f) => /^ggml-.*\.bin$/.test(f)) : [];

// Recomendaciones para ESTE equipo
const modelo = ram < 8 || nucleos < 4 ? "base" : ram >= 16 && (nucleos >= 8 || nvidia || appleSilicon) ? "medium" : "small";
const concurrencia = Math.max(1, Math.min(8, Math.floor(nucleos / 2)));
const avisos: string[] = [];
if (libreGB && libreGB < 5) avisos.push(`solo quedan ${libreGB} GB libres: cada proyecto ocupa 0,5-2 GB y Whisper ~0,5-1,5 GB`);
if (ram < 8) avisos.push("menos de 8 GB de RAM: renders más lentos; usa vídeos cortos o cierra otras apps al renderizar");
if (!ffmpegV) avisos.push("falta ffmpeg (imprescindible)");

const entorno = {
  fecha: new Date().toISOString().slice(0, 10),
  sistema: { so, version: release(), arquitectura: arch(), appleSilicon },
  cpu: { modelo: cpus()[0]?.model.trim(), nucleos }, ramGB: ram, ramLibreGB: GB(freemem()),
  gpu: nvidia ?? (appleSilicon ? "Apple Silicon (Metal)" : null), discoLibreGB: libreGB,
  herramientas: {
    node: process.versions.node, npm: primera(corre("npm", ["--version"], true)), ffmpeg: ffmpegV,
    aceleracionVideo: aceleracion, git: primera(corre("git", ["--version"])),
    make: so === "win32" ? "no hace falta" : primera(corre("make", ["--version"])),
    ytdlp: primera(corre("yt-dlp", ["--version"])), claude: primera(corre("claude", ["--version"], true)),
    whisper: existsSync(WHISPER_DIR), modelosWhisper: modelos,
  },
  recomendado: { modeloWhisper: modelo, concurrenciaRender: concurrencia },
  avisos,
};
writeFileSync(join(RAIZ, "entorno.json"), JSON.stringify(entorno, null, 2) + "\n", "utf8");

const s = (v: unknown) => (v ? "✓" : "✗");
console.log(`Equipo: ${so} ${entorno.sistema.arquitectura} · ${entorno.cpu.modelo} (${nucleos} núcleos) · ${ram} GB RAM · ` +
  `GPU: ${entorno.gpu ?? "no detectada"} · ${libreGB} GB libres`);
console.log(`${s(ffmpegV)} ffmpeg${aceleracion.length ? ` (aceleración: ${aceleracion.join(", ")})` : ""}  ${s(entorno.herramientas.git)} git  ` +
  `${s(entorno.herramientas.whisper)} whisper.cpp  ${s(entorno.herramientas.ytdlp)} yt-dlp (opcional: aprender estilo de reels)  ${s(entorno.herramientas.claude)} Claude Code`);
console.log(`Recomendado para este equipo: Whisper «${modelo}», ${concurrencia} fotogramas en paralelo al renderizar.`);
for (const a of avisos) console.log(`⚠ ${a}`);
