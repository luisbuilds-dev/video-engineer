// npm run cortar -- --proyecto ID
// Lee aprobadas.json (los índices de las palabras que se quedan, el texto que aprobaste) y monta limpio.mp4:
// solo esos tramos, con el aire del estilo entre frases y, si el estilo lo pide, un poco más rápido sin cambiar
// el tono de la voz. También deja palabras.json recolocadas para los subtítulos. El crudo no se modifica.
import { join } from "node:path";
import { leerEstilo } from "../lib/estilo";
import { config } from "../lib/config";
import { ffmpeg, silenciosAudio } from "../lib/ffmpeg";
import { carpeta, escribir, leer, opcion, RAIZ } from "../lib/proyecto";
import { conservar, duracion, palabrasCortadas, restarSilencios, type Palabra } from "../lib/tiempos";

const id = opcion("proyecto");
if (!id) throw new Error("uso: npm run cortar -- --proyecto ID");
const dir = carpeta(id);
const leido = leer<{ palabras: Palabra[]; duracionMs: number; crudo: string }>(id, "palabras.json");
const { duracionMs: total, crudo } = leido;
// aprobadas.json: índices que se quedan; {"i": 3, "texto": "reels"} corrige lo que Whisper entendió mal
const lista = leer<(number | { i: number; texto: string })[]>(id, "aprobadas.json");
const palabras = leido.palabras.map((p) => ({ ...p }));
const aprobadas = lista.map((x) => {
  if (typeof x === "number") return x;
  palabras[x.i].texto = x.texto;
  return x.i;
});
const estilo = leerEstilo(join(RAIZ, "estilos", `${opcion("estilo", config().estilo)}.json`));
const v = estilo.ritmo.velocidad;

// Palabras aprobadas con su margen, menos los silencios REALES del audio (Whisper estira las palabras sobre las pausas)
const pausas = silenciosAudio(join(dir, "audio.wav"), estilo.ritmo.silencioMaxMs, total);
const tramos = restarSilencios(conservar(palabras, aprobadas, estilo.ritmo.margenMs, total), pausas, estilo.ritmo.margenMs);
if (!tramos.length) throw new Error("aprobadas.json no deja ninguna palabra");

// Un solo filtro: recorta cada tramo (vídeo y audio), los une y aplica la velocidad
const partes = tramos.map((t, i) => {
  const [a, b] = [(t.desdeMs / 1000).toFixed(3), (t.hastaMs / 1000).toFixed(3)];
  return `[0:v]trim=${a}:${b},setpts=PTS-STARTPTS[v${i}];[0:a]atrim=${a}:${b},asetpts=PTS-STARTPTS[a${i}]`;
});
const union = tramos.map((_, i) => `[v${i}][a${i}]`).join("") + `concat=n=${tramos.length}:v=1:a=1[vc][ac]`;
const velocidad = `[vc]setpts=PTS/${v}[vo];[ac]atempo=${v}[ao]`;
ffmpeg(["-loglevel", "error", "-y", "-i", join(dir, crudo), "-filter_complex", [...partes, union, velocidad].join(";"),
  "-map", "[vo]", "-map", "[ao]", "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p",
  "-c:a", "aac", "-b:a", "192k", join(dir, "limpio.mp4")]);

const recolocadas = palabrasCortadas(palabras, aprobadas, tramos).map((p) => ({
  texto: p.texto, desdeMs: Math.round(p.desdeMs / v), hastaMs: Math.round(p.hastaMs / v),
}));
escribir(id, "cortadas.json", { duracionMs: Math.round(duracion(tramos) / v), palabras: recolocadas });
console.log(`limpio.mp4: ${(total / 1000).toFixed(1)} s → ${(duracion(tramos) / v / 1000).toFixed(1)} s ` +
  `(${tramos.length} tramos, velocidad ${v}). Subtítulos recolocados en cortadas.json`);
