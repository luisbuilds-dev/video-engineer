// Leer el texto de un vídeo, en local y gratis (tesseract.js, Apache-2.0). Los modelos de idioma (~8 MB) se descargan
// la primera vez a models/tessdata y se quedan ahí. Solo se leen los fotogramas que cambian (mpdecimate): una pantalla
// quieta cuesta una lectura, no cien.
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { cpus } from "node:os";
import { join } from "node:path";
import { createScheduler, createWorker } from "tesseract.js";
import { ffmpeg } from "./ffmpeg";
import { RAIZ } from "./proyecto";
import type { PalabraOcr } from "./sensibles";

export type Lectura = { t: number; ancho: number; alto: number; lineas: PalabraOcr[][] };
type Palabra = { text: string; confidence: number; bbox: { x0: number; y0: number; x1: number; y1: number } };
type Bloque = { paragraphs: { lines: { words: Palabra[] }[] }[] };

/**
 * Lee `video` a `fps` muestras por segundo (solo las que cambian) entre `desde` y `hasta` (segundos).
 * `t` de cada lectura es el segundo del vídeo original.
 */
export async function leerVideo(video: string, temporal: string, opciones: { fps?: number; desde?: number; hasta?: number; idiomas?: string[] } = {}): Promise<Lectura[]> {
  const { fps = 3, desde = 0, hasta, idiomas = ["spa", "eng"] } = opciones;
  rmSync(temporal, { recursive: true, force: true });
  mkdirSync(temporal, { recursive: true });
  const rango = [...(desde ? ["-ss", String(desde)] : []), "-i", video, ...(hasta !== undefined ? ["-t", String(hasta - desde)] : [])];
  // select (y no el filtro fps) para que cada muestra conserve la marca de tiempo EXACTA de su fotograma: fps reetiqueta
  // fotogramas de hasta medio intervalo antes, y el difuminado iba un renglón por delante del texto al desplazarse.
  // showinfo da el instante de cada fotograma que sobrevive a mpdecimate.
  const cada = (1 / fps - 0.001).toFixed(4);
  const log = ffmpeg(["-loglevel", "info", "-y", ...rango, "-vf",
    `select='isnan(prev_selected_t)+gte(t-prev_selected_t\\,${cada})',mpdecimate=hi=768:lo=320:frac=0.2,showinfo`,
    "-fps_mode", "vfr", join(temporal, "%06d.png")]);
  const tiempos = [...log.matchAll(/pts_time:([\d.]+)/g)].map((m) => desde + Number(m[1]));
  const [ancho, alto] = (/(\d{3,5})x(\d{3,5})/.exec(log.split("Output #0")[1] ?? "") ?? [0, 1920, 1080]).slice(1).map(Number);
  const archivos = readdirSync(temporal).filter((f) => f.endsWith(".png")).sort();

  const trabajadores = Math.max(1, Math.min(4, Math.floor(cpus().length / 2)));
  const cache = join(RAIZ, "models", "tessdata");
  mkdirSync(cache, { recursive: true });
  const planificador = createScheduler();
  for (let i = 0; i < trabajadores; i++) planificador.addWorker(await createWorker(idiomas, 1, { cachePath: cache }));
  try {
    let hechas = 0;
    const lecturas = await Promise.all(archivos.map(async (f, i) => {
      const r = await planificador.addJob("recognize", join(temporal, f), {}, { blocks: true });
      if (++hechas % 10 === 0) process.stdout.write(`  OCR ${hechas}/${archivos.length}\r`);
      const lineas = ((r.data.blocks ?? []) as Bloque[]).flatMap((b) => b.paragraphs.flatMap((p) => p.lines))
        .map((l) => l.words.filter((w) => w.confidence > 30 && w.text.trim())
          .map((w) => ({ texto: w.text.trim(), x0: w.bbox.x0, y0: w.bbox.y0, x1: w.bbox.x1, y1: w.bbox.y1 })))
        .filter((l) => l.length);
      return { t: tiempos[i] ?? desde + i / fps, ancho, alto, lineas };
    }));
    return lecturas.sort((a, b) => a.t - b.t);
  } finally {
    await planificador.terminate();
    rmSync(temporal, { recursive: true, force: true });
  }
}
