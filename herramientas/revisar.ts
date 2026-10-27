// npm run revisar -- --proyecto ID
// Control de calidad del reel final ANTES de entregarlo, gastando pocos tokens:
//   • una sola imagen (revision.jpg) con 12 fotogramas repartidos: Claude la mira en vez de ver el vídeo entero
//   • volumen integrado y pico real (objetivo: los LUFS del estilo, pico ≤ -1 dBTP)
//   • planos congelados (> 0,5 s sin cambios) y tramos en negro
//   • datos sensibles: vuelve a leer con OCR las grabaciones de pantalla YA RENDERIZADAS; si algo se lee, no se entrega
// Escribe revision.json y sale con código 1 si algo no cumple.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { leerCongelados, leerEbur128 } from "../lib/audio";
import { duracionMs, ffmpeg } from "../lib/ffmpeg";
import { config } from "../lib/config";
import { leerVideo } from "../lib/ocr";
import { carpeta, escribir, leer, opcion } from "../lib/proyecto";
import { detectar, enmascarar, type Sensibles } from "../lib/sensibles";
import type { Edicion } from "../src/tipos";

const id = opcion("proyecto");
if (!id) throw new Error("uso: npm run revisar -- --proyecto ID");
const dir = carpeta(id);
const video = join(dir, "salida.mp4");
const edicion = leer<Edicion>(id, "edicion.json");
const objetivo = edicion.estilo.audio.lufs;
// tramos quietos A PROPÓSITO (tarjetas de capítulo, grabaciones de pantalla): ahí un plano fijo no es un fallo
const quietos = [...(edicion.capitulos ?? []).filter((c) => c.desdeMs > 0).map((c) => [c.desdeMs / 1000 - 0.2, c.desdeMs / 1000 + 1.5]),
  ...(edicion.pantallas ?? []).map((p) => [p.desdeMs / 1000 - 0.2, p.hastaMs / 1000 + 0.2])];
const total = duracionMs(video) / 1000;

const fotogramas = 12;
ffmpeg(["-loglevel", "error", "-y", "-i", video, "-vf",
  `fps=${fotogramas}/${total.toFixed(3)},scale=270:-2,tile=4x3:padding=6:color=white`, "-frames:v", "1", "-q:v", "4",
  join(dir, "revision.jpg")]);

const audio = leerEbur128(ffmpeg(["-nostats", "-i", video, "-map", "0:a:0", "-af", "ebur128=peak=true", "-f", "null", "-"]));
const informe = ffmpeg(["-nostats", "-i", video, "-map", "0:v:0", "-vf", "freezedetect=n=0.003:d=0.5,blackdetect=d=0.3:pix_th=0.05",
  "-f", "null", "-"]);
const congelados = leerCongelados(informe).filter((c) => !quietos.some(([a, b]) => c.desde >= a && c.hasta <= b));
const negros = [...informe.matchAll(/black_start:([\d.]+) black_end:([\d.]+)/g)].map((m) => ({ desde: +m[1], hasta: +m[2] }));

const problemas: string[] = [];
if (!audio) problemas.push("no se pudo medir el audio (¿el vídeo no tiene sonido?)");
else {
  if (Math.abs(audio.lufs - objetivo) > 1) problemas.push(`volumen ${audio.lufs} LUFS (objetivo ${objetivo} ± 1)`);
  if (audio.pico > -1) problemas.push(`pico ${audio.pico} dBTP: puede distorsionar (máximo -1)`);
}
for (const c of congelados) problemas.push(`plano congelado de ${c.desde.toFixed(1)} s a ${Number.isFinite(c.hasta) ? c.hasta.toFixed(1) : "el final"} s`);
// datos sensibles que siguen legibles en el vídeo final (4 lecturas por segundo en cada tramo de pantalla)
const privado = config().privado ?? [];
const legibles: { t: number; tipo: string; muestra: string }[] = [];
for (const p of edicion.pantallas ?? []) {
  const lecturas = await leerVideo(video, join(dir, ".ocr-revision"), { fps: 4, desde: p.desdeMs / 1000, hasta: p.hastaMs / 1000 });
  for (const l of lecturas) for (const h of detectar(l.lineas, l.ancho, l.alto, privado)) legibles.push({ t: +l.t.toFixed(2), tipo: h.tipo, muestra: enmascarar(h.texto) });
}
// lo que el usuario decidió dejar a la vista no es un fallo: solo se avisa
const rutaS = join(dir, "sensibles.json");
const decision = existsSync(rutaS) ? (JSON.parse(readFileSync(rutaS, "utf8")) as Sensibles).decision : null;
const aVista = (tipo: string) => decision !== null && (!decision.difuminar || decision.excepto.includes(tipo));
const avisos = legibles.filter((d) => aVista(d.tipo)).map((d) => `${d.tipo} visible en ${d.t.toFixed(1)} s (el usuario decidió no difuminarlo)`);
for (const d of legibles.filter((x) => !aVista(x.tipo))) problemas.push(`dato sensible legible (${d.tipo}, ${d.muestra}) en ${d.t.toFixed(1)} s`);
for (const n of negros) problemas.push(`negro de ${n.desde.toFixed(1)} s a ${n.hasta.toFixed(1)} s`);

const resultado = { duracionS: +total.toFixed(2), audio, congelados, negros, sensibles: legibles, avisos, problemas, ok: problemas.length === 0 };
escribir(id, "revision.json", resultado);
console.log(JSON.stringify(resultado, null, 2));
console.log(`hoja de control: proyectos/${id}/revision.jpg`);
process.exit(resultado.ok ? 0 : 1);
