// npm run analizar -- --proyecto ID [--video limpio.mp4]
// Mira el vídeo fotograma a fotograma (10 por segundo) EN TU EQUIPO: dónde está tu cara (detector UltraFace, ~1 MB)
// y cuánto movimiento hay en cada franja del encuadre. Escribe analisis.json y ritmo.json, que /editar usa para
// que los subtítulos no te tapen y para meter zooms donde el plano se queda quieto demasiado tiempo.
import { spawn } from "node:child_process";
import { join } from "node:path";
import * as ort from "onnxruntime-node";
import { duracionMs } from "../lib/ffmpeg";
import { carpeta, escribir, leer, opcion, RAIZ } from "../lib/proyecto";
import { FRANJAS, informeRitmo, nms, type Caja, type Fotograma } from "../lib/vision";
import { spawnSync } from "node:child_process";

const id = opcion("proyecto");
if (!id) throw new Error("uso: npm run analizar -- --proyecto ID");
const dir = carpeta(id);
const video = join(dir, opcion("video", "limpio.mp4")!);
const FPS = 10, W = 320, H = 240; // entrada fija del modelo RFB-320

// Tamaño real ya girado (los móviles guardan el vertical como horizontal + rotación)
const sonda = spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries",
  "stream=width,height:stream_side_data=rotation", "-of", "json", video], { encoding: "utf8" });
const st = JSON.parse(sonda.stdout).streams[0];
const girado = Math.abs(Number(st.side_data_list?.[0]?.rotation ?? 0)) === 90;
const [ancho, alto] = girado ? [st.height, st.width] : [st.width, st.height];
const s = Math.min(W / ancho, H / alto), cw = ancho * s, ch = alto * s, ox = (W - cw) / 2, oy = (H - ch) / 2;

const sesion = await ort.InferenceSession.create(join(RAIZ, "modelos", "ultraface-rfb-320.onnx"), { logSeverityLevel: 3 });
const fotos: Fotograma[] = [];
let previo: Float32Array | null = null;

async function procesar(rgb: Buffer, n: number) {
  const tensor = new Float32Array(3 * W * H), gris = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const r = rgb[i * 3], g = rgb[i * 3 + 1], b = rgb[i * 3 + 2];
    tensor[i] = (r - 127) / 128; tensor[W * H + i] = (g - 127) / 128; tensor[2 * W * H + i] = (b - 127) / 128;
    gris[i] = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }
  const out = await sesion.run({ input: new ort.Tensor("float32", tensor, [1, 3, H, W]) });
  const scores = out.scores.data as Float32Array, boxes = out.boxes.data as Float32Array;
  const cajas: Caja[] = [];
  for (let i = 0; i < scores.length / 2; i++) {
    const p = scores[i * 2 + 1];
    if (p < 0.75) continue;
    // de coordenadas del modelo (con bandas) a coordenadas del fotograma original
    const x1 = (boxes[i * 4] * W - ox) / cw, y1 = (boxes[i * 4 + 1] * H - oy) / ch;
    const x2 = (boxes[i * 4 + 2] * W - ox) / cw, y2 = (boxes[i * 4 + 3] * H - oy) / ch;
    if (x2 - x1 > 0.02) cajas.push({ x: x1, y: y1, w: x2 - x1, h: y2 - y1, score: p });
  }
  // movimiento por franja horizontal: diferencia media con el fotograma anterior (solo dentro de la imagen)
  const movimiento = new Array(FRANJAS).fill(0);
  if (previo) {
    const cuentas = new Array(FRANJAS).fill(0);
    for (let y = Math.ceil(oy); y < oy + ch - 1; y++) {
      const f = Math.min(FRANJAS - 1, Math.floor(((y - oy) / ch) * FRANJAS));
      for (let x = Math.ceil(ox); x < ox + cw - 1; x += 2) {
        movimiento[f] += Math.abs(gris[y * W + x] - previo[y * W + x]); cuentas[f]++;
      }
    }
    for (let f = 0; f < FRANJAS; f++) movimiento[f] = +Math.min(1, (movimiento[f] / (cuentas[f] || 1)) * 8).toFixed(3);
  }
  previo = gris;
  fotos.push({ tMs: Math.round((n / FPS) * 1000), caras: nms(cajas).map((c) => ({
    x: +c.x.toFixed(4), y: +c.y.toFixed(4), w: +c.w.toFixed(4), h: +c.h.toFixed(4), score: +(c.score ?? 0).toFixed(3) })), movimiento });
}

const ff = spawn("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", video, "-vf",
  `fps=${FPS},scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2`,
  "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]);
const tam = W * H * 3;
let resto = Buffer.alloc(0), n = 0;
for await (const trozo of ff.stdout) {
  resto = Buffer.concat([resto, trozo]);
  while (resto.length >= tam) {
    await procesar(resto.subarray(0, tam), n++);
    resto = resto.subarray(tam);
  }
}

const total = duracionMs(video);
escribir(id, "analisis.json", { video: opcion("video", "limpio.mp4"), fps: FPS, ancho, alto, fotogramas: fotos });
let palabras: { desdeMs: number }[] = [];
try { palabras = leer<{ palabras: { desdeMs: number }[] }>(id, "cortadas.json").palabras; } catch { /* sin cortar aún */ }
const ritmo = informeRitmo(fotos, palabras, total);
escribir(id, "ritmo.json", ritmo);
const conCara = fotos.filter((f) => f.caras.length).length;
console.log(`${fotos.length} fotogramas analizados (${ancho}×${alto}): cara visible en ${Math.round((conCara / fotos.length) * 100)} %`);
console.log("segundo · movimiento · palabras");
for (const r of ritmo) console.log(`${String(r.segundo).padStart(3)}s  ${"█".repeat(Math.round(r.movimiento * 40)).padEnd(20)} ${r.palabras} pal${r.cara ? "" : "  (sin cara)"}`);
