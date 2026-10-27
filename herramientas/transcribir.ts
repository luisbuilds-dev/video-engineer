// npm run transcribir -- --proyecto ID --video RUTA
// Copia el crudo al proyecto (el original no se toca), saca el audio a 16 kHz y lo transcribe EN TU EQUIPO con
// whisper.cpp: palabras.json con cada palabra y su tiempo. Sin internet y sin coste.
import { toCaptions, transcribe } from "@remotion/install-whisper-cpp";
import { copyFileSync, existsSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { config, WHISPER_DIR, WHISPER_VERSION } from "../lib/config";
import { duracionMs, ffmpeg, silenciosAudio } from "../lib/ffmpeg";
import { carpeta, escribir, opcion } from "../lib/proyecto";
import { alinear } from "../lib/tiempos";

const id = opcion("proyecto");
const video = opcion("video");
if (!id) throw new Error("uso: npm run transcribir -- --proyecto ID --video RUTA");
const dir = carpeta(id);

let crudo = join(dir, "crudo" + (video ? extname(video).toLowerCase() : ".mp4"));
if (video) {
  if (!existsSync(video)) throw new Error(`no encuentro el vídeo: ${video}`);
  copyFileSync(resolve(video), crudo);
} else if (!existsSync(crudo)) throw new Error("falta --video la primera vez");

const wav = join(dir, "audio.wav");
ffmpeg(["-loglevel", "error", "-y", "-i", crudo, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", wav]);

const { idioma, modelo } = config();
console.log(`Transcribiendo con whisper.cpp (${modelo}, ${idioma})…`);
const salida = await transcribe({
  inputPath: wav, whisperPath: WHISPER_DIR, whisperCppVersion: WHISPER_VERSION, model: modelo,
  tokenLevelTimestamps: true, language: idioma as never, splitOnWord: true,
  onProgress: (p) => process.stdout.write(`\r${Math.round(p * 100)}%`),
});
const { captions } = toCaptions({ whisperCppOutput: salida });
// El centro DTW de cada palabra es fiable; su inicio y su final no (Whisper los estira sobre las pausas):
// se rehacen con los silencios reales del audio. Ver alinear() en lib/tiempos.ts.
const centros = captions
  .map((c) => ({ texto: c.text.trim(), centroMs: Math.round(c.timestampMs ?? (c.startMs + c.endMs) / 2) }))
  .filter((p) => p.texto && !/^\[.*\]$/.test(p.texto)); // fuera marcas como [MÚSICA]
const total = duracionMs(crudo);
const palabras = alinear(centros, silenciosAudio(wav, 250, total), total);

escribir(id, "palabras.json", { duracionMs: total, crudo: crudo.split(/[\\/]/).pop(), palabras });
console.log(`\n${palabras.length} palabras → proyectos/${id}/palabras.json`);
console.log(palabras.map((p, i) => `${i}:${p.texto}`).join(" "));
