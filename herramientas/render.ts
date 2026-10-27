// npm run render -- --proyecto ID [--capturas 120,340]
// Con --capturas solo dibuja esos fotogramas (captura-<n>.png): para revisar un detalle sin renderizar todo el vídeo.
// edicion.json → Remotion (H.264, color bt709) → volumen a los LUFS del estilo → proyectos/ID/salida.mp4
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { Estilo } from "../lib/estilo";
import { normalizar } from "../lib/ffmpeg";
import { carpeta, leer, opcion, RAIZ } from "../lib/proyecto";
import type { Edicion } from "../src/tipos";

const id = opcion("proyecto");
if (!id) throw new Error("uso: npm run render -- --proyecto ID");
const dir = carpeta(id);
const edicion = leer<Edicion>(id, "edicion.json");
edicion.estilo = Estilo.parse(edicion.estilo); // un estilo roto se detecta aquí, no a mitad del render

console.log("Preparando la composición…");
const servido = await bundle({ entryPoint: join(RAIZ, "src", "index.ts"), publicDir: dir });
const composicion = await selectComposition({ serveUrl: servido, id: "Video", inputProps: edicion });
const capturas = opcion("capturas");
if (capturas) {
  for (const n of capturas.split(",").map(Number)) {
    await renderStill({ composition: composicion, serveUrl: servido, frame: n, inputProps: edicion, output: join(dir, `captura-${n}.png`) });
    console.log(`proyectos/${id}/captura-${n}.png`);
  }
  process.exit(0);
}
const bruto = join(dir, "render.mp4");
// fotogramas en paralelo según el equipo (npm run entorno); sin entorno.json, lo que decida Remotion
const entorno = existsSync(join(RAIZ, "entorno.json")) ? JSON.parse(readFileSync(join(RAIZ, "entorno.json"), "utf8")) : null;
let ultimo = -1;
await renderMedia({
  composition: composicion, serveUrl: servido, codec: "h264", outputLocation: bruto, inputProps: edicion,
  crf: 18, pixelFormat: "yuv420p", colorSpace: "bt709", audioCodec: "aac", concurrency: entorno?.recomendado?.concurrenciaRender ?? null,
  onProgress: ({ progress }) => {
    const pct = Math.floor(progress * 10) * 10;
    if (pct !== ultimo) { ultimo = pct; console.log(`render ${pct}%`); }
  },
});

// Volumen estándar de las redes (Instagram, TikTok y YouTube rondan -14 LUFS)
normalizar(bruto, join(dir, "salida.mp4"), edicion.estilo.audio.lufs);
rmSync(bruto);
console.log(`listo: proyectos/${id}/salida.mp4 (volumen a ${edicion.estilo.audio.lufs} LUFS). ` +
  `Siguiente: npm run revisar -- --proyecto ${id}`);
